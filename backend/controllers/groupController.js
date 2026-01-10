// controllers/groupController.js

const { db, admin } = require("../config/firebase");

// ✅ FIX: replace ESM-only uuid package with Node built-in UUID
const { randomUUID } = require("crypto");
const uuidv4 = () => randomUUID();

// (Optional) helper for invite codes
function makeInviteCode(len = 8) {
  return uuidv4().replace(/-/g, "").slice(0, len);
}

exports.createGroup = async (req, res) => {
  try {
    console.log("Create Request Body DEBUG:", req.body); // DEBUG
    const { name, description, year, semester } = req.body;
    const { uid } = req.user;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const groupId = uuidv4();

    const groupData = {
      id: groupId,
      name: name.trim(),
      description: description ? String(description).trim() : "",
      year: year ? String(year).trim() : "",
      semester: semester ? String(semester).trim() : "1", // Default to 1 if not provided
      createdBy: uid,

      // roles map for scalability
      roles: {
        [uid]: "owner",
      },

      members: [uid],

      // Simple initial invite code
      inviteCode: makeInviteCode(8),

      createdAt: new Date().toISOString(),
    };

    console.log("Saving Group Data DEBUG:", groupData); // DEBUG

    await db.collection("groups").doc(groupData.id).set(groupData);

    res.status(201).json({ message: "Group created", group: groupData });
  } catch (error) {
    console.error("Create Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getUserGroups = async (req, res) => {
  try {
    const { uid } = req.user;

    const snapshot = await db
      .collection("groups")
      .where("members", "array-contains", uid)
      .get();

    const groups = [];
    const now = new Date();

    const updates = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      let isExpired = false;

      // Check expiry
      if (data.memberExpiry && data.memberExpiry[uid]) {
        const expiryDate = new Date(data.memberExpiry[uid]);
        if (expiryDate < now) {
          isExpired = true;
          // Schedule removal
          updates.push(
            db.collection("groups").doc(doc.id).update({
              members: admin.firestore.FieldValue.arrayRemove(uid),
              [`roles.${uid}`]: admin.firestore.FieldValue.delete(),
              [`memberExpiry.${uid}`]: admin.firestore.FieldValue.delete()
            })
          );
        }
      }

      if (!isExpired) {
        groups.push(data);
      }
    });

    // Execute cleanup
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`Cleaned up ${updates.length} expired memberships for user ${uid}`);
    }

    res.status(200).json(groups);
  } catch (error) {
    console.error("Get User Groups Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.user;

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Enforce Expiry Check on Access
    // Skip for owners/admins
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwnerOrAdmin = groupData.createdBy === uid || userRole === "owner" || userRole === "admin";

    if (!isOwnerOrAdmin && groupData.memberExpiry && groupData.memberExpiry[uid]) {
      const expiryDate = new Date(groupData.memberExpiry[uid]);
      if (expiryDate < new Date()) {
        // Remove user immediately
        await groupRef.update({
          members: admin.firestore.FieldValue.arrayRemove(uid),
          [`roles.${uid}`]: admin.firestore.FieldValue.delete(),
          [`memberExpiry.${uid}`]: admin.firestore.FieldValue.delete()
        });
        return res.status(403).json({ message: "Membership expired. You have been removed from this group." });
      }
    }

    // Fetch creator details
    let creatorName = "Unknown";
    if (groupData.createdBy) {
      const userDoc = await db.collection("users").doc(groupData.createdBy).get();
      if (userDoc.exists) {
        creatorName = userDoc.data().name || userDoc.data().displayName || "Unknown";
      }
    }

    res.status(200).json({ ...groupData, creatorName });
  } catch (error) {
    console.error("Get Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.generateInvite = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.user;

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Check if user is owner or admin via roles map
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwner = groupData.createdBy === uid;

    if (!isOwner && userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can generate invites" });
    }

    const inviteCode = makeInviteCode(8);

    // Parse inputs
    const days = Math.max(0, parseInt(req.body?.days || 0));
    const hours = Math.max(0, parseInt(req.body?.hours || 0));
    const minutes = Math.max(0, parseInt(req.body?.minutes || 0));

    // Convert all to minutes
    // Default to 1 day (1440 mins) if everything is 0
    let totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
    if (totalMinutes === 0 && !req.body?.durationDays) totalMinutes = 1440;

    // Legacy support if just durationDays is passed
    if (req.body?.durationDays && totalMinutes === 0) {
      totalMinutes = Number(req.body.durationDays) * 24 * 60;
    }

    const inviteData = {
      groupId,
      code: inviteCode,
      durationMinutes: totalMinutes,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      used: false,
    };

    await db.collection("invites").doc(inviteCode).set(inviteData);

    res.json({ inviteCode, totalMinutes });
  } catch (error) {
    console.error("Generate Invite Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const { uid } = req.user;

    if (!inviteCode) return res.status(400).json({ message: "Invite code required" });

    // 1) Check invites collection first
    const inviteRef = db.collection("invites").doc(inviteCode);
    const inviteDoc = await inviteRef.get();

    let groupId, durationMinutes;
    let isNewSystem = false;

    if (inviteDoc.exists) {
      const inviteData = inviteDoc.data();

      if (inviteData.used) {
        return res
          .status(403)
          .json({ message: "This link is expired or has already been used." });
      }

      groupId = inviteData.groupId;
      // Handle both new minute-based and old day-based invites
      if (inviteData.durationMinutes !== undefined) {
        durationMinutes = inviteData.durationMinutes;
      } else {
        durationMinutes = (inviteData.durationDays || 30) * 24 * 60;
      }
      isNewSystem = true;
    } else {
      // 2) Legacy fallback
      const snapshot = await db
        .collection("groups")
        .where("inviteCode", "==", inviteCode)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      const legacyDoc = snapshot.docs[0];
      groupId = legacyDoc.id;
      const days = legacyDoc.data().inviteDuration || 30;
      durationMinutes = days * 24 * 60;
    }

    // Fetch group
    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ message: "Group not found" });

    const groupData = groupDoc.data();

    let message = "Joined group successfully";
    if (groupData.members && groupData.members.includes(uid)) {
      message = "Membership updated";
    }

    const updateData = {
      members: admin.firestore.FieldValue.arrayUnion(uid),
      [`roles.${uid}`]: "member",
    };

    // Apply duration
    if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
      const expiryDate = new Date();
      // Add minutes to current time
      expiryDate.setMinutes(expiryDate.getMinutes() + Math.floor(durationMinutes));
      updateData[`memberExpiry.${uid}`] = expiryDate.toISOString();
    }

    await groupRef.update(updateData);

    if (isNewSystem) {
      await inviteRef.update({
        used: true,
        usedBy: uid,
        usedAt: new Date().toISOString(),
      });
    }

    res.status(200).json({ message, groupId });
  } catch (error) {
    console.error("Join Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.user;

    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Check if requester is admin/owner
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwner = groupData.createdBy === uid;

    if (!isOwner && userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can view members" });
    }

    const memberDetails = [];
    for (const memberId of groupData.members || []) {
      const userDoc = await db.collection("users").doc(memberId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      memberDetails.push({
        uid: memberId,
        name: userData.name || userData.displayName || "Unknown",
        email: userData.email || "",
        photoUrl: userData.photoUrl || userData.photoURL || null,
        role: groupData.roles
          ? groupData.roles[memberId]
          : groupData.createdBy === memberId
            ? "owner"
            : "member",
        expiryDate: groupData.memberExpiry ? groupData.memberExpiry[memberId] : null,
      });
    }

    res.status(200).json(memberDetails);
  } catch (error) {
    console.error("Get Group Members Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove a member from the group (admin only)
exports.removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { uid } = req.user;

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Check if requester is admin/owner
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwner = groupData.createdBy === uid;

    if (!isOwner && userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // Cannot remove the owner
    if (memberId === groupData.createdBy || (groupData.roles && groupData.roles[memberId] === "owner")) {
      return res.status(403).json({ message: "Cannot remove the group owner" });
    }

    // Check if member exists in group
    if (!groupData.members || !groupData.members.includes(memberId)) {
      return res.status(404).json({ message: "Member not found in group" });
    }

    const updateData = {
      members: admin.firestore.FieldValue.arrayRemove(memberId),
    };

    // Remove from roles + memberExpiry
    if (groupData.roles && groupData.roles[memberId]) {
      updateData[`roles.${memberId}`] = admin.firestore.FieldValue.delete();
    }
    if (groupData.memberExpiry && groupData.memberExpiry[memberId]) {
      updateData[`memberExpiry.${memberId}`] = admin.firestore.FieldValue.delete();
    }

    await groupRef.update(updateData);

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove Member Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.user;

    // Admin check
    const allowedAdmins = ["pharmanesthub@gmail.com", "tandelvansh0511@gmail.com", "pharmanesthub@gmail.com"]; // Keeping the old typo one just in case it was intended as a username, but adding the real ones.

    console.log("Delete Group Request by:", email); // DEBUG

    if (!allowedAdmins.includes(email)) {
      return res.status(403).json({ message: "Only the administrator can delete groups." });
    }

    await db.collection("groups").doc(groupId).delete();

    // Optionally delete related invites or sub-collections here if needed
    // For now, just deleting the group document


    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Delete Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, year, semester } = req.body;
    const { email } = req.user;

    // Admin check
    const allowedAdmins = ["pharmanesthub@gmail.com", "tandelvansh0511@gmail.com", "pharmanesthu@bgmail.com"];
    if (!allowedAdmins.includes(email)) {
      return res.status(403).json({ message: "Only the administrator can edit groups." });
    }

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const updateData = {
      name: name.trim(),
      description: description ? String(description).trim() : "",
      year: year ? String(year).trim() : "",
      semester: semester ? String(semester).trim() : "1",
    };

    await groupRef.update(updateData);

    res.status(200).json({ message: "Group updated successfully", group: { id: groupId, ...updateData } });
  } catch (error) {
    console.error("Update Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
