const { db, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');


exports.createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;
        const { uid } = req.user;

        const groupData = {
            id: uuidv4(),
            name,
            description,
            createdBy: uid,
            // Replaced admins array with roles map for better scalability
            roles: {
                [uid]: 'owner'
            },
            members: [uid],
            inviteCode: uuidv4().slice(0, 8), // Simple initial invite code
            createdAt: new Date().toISOString()
        };

        await db.collection('groups').doc(groupData.id).set(groupData);

        res.status(201).json({ message: 'Group created', group: groupData });
    } catch (error) {
        console.error('Create Group Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const { uid } = req.user;
        const snapshot = await db.collection('groups').where('members', 'array-contains', uid).get();

        const groups = [];
        snapshot.forEach(doc => {
            groups.push(doc.data());
        });

        res.status(200).json(groups);
    } catch (error) {
        console.error('Get User Groups Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const doc = await db.collection('groups').doc(groupId).get();
        if (!doc.exists) return res.status(404).json({ message: 'Group not found' });

        const groupData = doc.data();

        // Fetch creator details
        let creatorName = 'Unknown';
        if (groupData.createdBy) {
            const userDoc = await db.collection('users').doc(groupData.createdBy).get();
            if (userDoc.exists) {
                creatorName = userDoc.data().name || 'Unknown';
            }
        }

        res.status(200).json({ ...groupData, creatorName });
    } catch (error) {
        console.error('Get Group Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


exports.generateInvite = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { uid } = req.user;

        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const groupData = groupDoc.data();

        // Check if user is owner or admin via roles map
        const userRole = groupData.roles ? groupData.roles[uid] : null;

        // Backward compatibility: check createdBy if roles doesn't exist
        const isOwner = groupData.createdBy === uid;

        if (!isOwner && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can generate invites' });
        }

        // Generate a new unique invite code
        const inviteCode = uuidv4().slice(0, 8);
        const { durationDays = 30 } = req.body; // Default to 30 if not provided

        // Create invite document
        const inviteData = {
            groupId,
            code: inviteCode,
            durationDays: parseInt(durationDays),
            createdBy: uid,
            createdAt: new Date().toISOString(),
            // Optional: expiresAt for cleanup jobs
        };

        await db.collection('invites').doc(inviteCode).set(inviteData);

        res.json({ inviteCode });

    } catch (error) {
        console.error('Generate Invite Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.joinGroup = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const { uid } = req.user;

        if (!inviteCode) return res.status(400).json({ message: 'Invite code required' });

        // 1. Check new 'invites' collection first
        const inviteRef = db.collection('invites').doc(inviteCode);
        const inviteDoc = await inviteRef.get();
        let groupId, durationDays;
        let isNewSystem = false;

        if (inviteDoc.exists) {
            // New system
            const inviteData = inviteDoc.data();

            // Check if already used
            if (inviteData.used) {
                return res.status(403).json({ message: 'This link is expired or has already been used.' });
            }

            groupId = inviteData.groupId;
            durationDays = inviteData.durationDays;
            isNewSystem = true;
        } else {
            // 2. Fallback to old 'groups' collection search (Legacy support)
            const snapshot = await db.collection('groups').where('inviteCode', '==', inviteCode).limit(1).get();
            if (snapshot.empty) {
                return res.status(404).json({ message: 'Invalid invite code' });
            }
            let groupDoc;
            snapshot.forEach(doc => groupDoc = doc);
            groupId = groupDoc.id;
            durationDays = groupDoc.data().inviteDuration;
        }

        // Fetch Group Data to check membership
        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) return res.status(404).json({ message: 'Group not found' });

        const groupData = groupDoc.data();

        let message = 'Joined group successfully';
        if (groupData.members && groupData.members.includes(uid)) {
            message = 'Membership updated';
        }

        // Calculate expiry
        let updateData = {
            members: admin.firestore.FieldValue.arrayUnion(uid),
            [`roles.${uid}`]: 'member'
        };

        // Apply duration from the SPECIFIC invite used
        if (durationDays && durationDays > 0) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + parseInt(durationDays));
            updateData[`memberExpiry.${uid}`] = expiryDate.toISOString();
        }

        // Update Group
        await groupRef.update(updateData);

        // If new system, mark invite as used
        if (isNewSystem) {
            await inviteRef.update({
                used: true,
                usedBy: uid,
                usedAt: new Date().toISOString()
            });
        }

        res.status(200).json({ message, groupId });

    } catch (error) {
        console.error('Join Group Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Get all members of a group with their details
exports.getGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { uid } = req.user;

        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const groupData = groupDoc.data();

        // Check if requester is admin/owner
        const userRole = groupData.roles ? groupData.roles[uid] : null;
        const isOwner = groupData.createdBy === uid;

        if (!isOwner && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view members' });
        }

        // Fetch details for each member
        const memberDetails = [];
        for (const memberId of groupData.members) {
            const userDoc = await db.collection('users').doc(memberId).get();
            const userData = userDoc.exists ? userDoc.data() : {};

            memberDetails.push({
                uid: memberId,
                name: userData.name || userData.displayName || 'Unknown',
                email: userData.email || '',
                photoUrl: userData.photoUrl || userData.photoURL || null,
                role: groupData.roles ? groupData.roles[memberId] : (groupData.createdBy === memberId ? 'owner' : 'member'),
                expiryDate: groupData.memberExpiry ? groupData.memberExpiry[memberId] : null
            });
        }

        res.status(200).json(memberDetails);

    } catch (error) {
        console.error('Get Group Members Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Remove a member from the group (admin only)
exports.removeMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const { uid } = req.user;

        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const groupData = groupDoc.data();

        // Check if requester is admin/owner
        const userRole = groupData.roles ? groupData.roles[uid] : null;
        const isOwner = groupData.createdBy === uid;

        if (!isOwner && userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }

        // Cannot remove the owner
        if (memberId === groupData.createdBy || (groupData.roles && groupData.roles[memberId] === 'owner')) {
            return res.status(403).json({ message: 'Cannot remove the group owner' });
        }

        // Check if member exists in group
        if (!groupData.members || !groupData.members.includes(memberId)) {
            return res.status(404).json({ message: 'Member not found in group' });
        }

        // Remove member from group
        const updateData = {
            members: admin.firestore.FieldValue.arrayRemove(memberId)
        };

        // Also remove from roles and memberExpiry if they exist
        if (groupData.roles && groupData.roles[memberId]) {
            updateData[`roles.${memberId}`] = admin.firestore.FieldValue.delete();
        }
        if (groupData.memberExpiry && groupData.memberExpiry[memberId]) {
            updateData[`memberExpiry.${memberId}`] = admin.firestore.FieldValue.delete();
        }

        await groupRef.update(updateData);

        res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove Member Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
