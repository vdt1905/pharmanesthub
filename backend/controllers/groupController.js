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
    const { name, description, year } = req.body;
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
    snapshot.forEach((doc) => groups.push(doc.data()));

    res.status(200).json(groups);
  } catch (error) {
    console.error("Get User Groups Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const doc = await db.collection("groups").doc(groupId).get();
    if (!doc.exists) return res.status(404).json({ message: "Group not found" });

    const groupData = doc.data();

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
    const durationDays = Number(req.body?.durationDays ?? 30);

    const inviteData = {
      groupId,
      code: inviteCode,
      durationDays: Number.isFinite(durationDays) ? Math.max(0, Math.floor(durationDays)) : 30,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      used: false,
    };

    await db.collection("invites").doc(inviteCode).set(inviteData);

    res.json({ inviteCode });
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

    let groupId, durationDays;
    let isNewSystem = false;

    if (inviteDoc.exists) {
      const inviteData = inviteDoc.data();

      if (inviteData.used) {
        return res
          .status(403)
          .json({ message: "This link is expired or has already been used." });
      }

      groupId = inviteData.groupId;
      durationDays = inviteData.durationDays;
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
      durationDays = legacyDoc.data().inviteDuration;
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

    // Apply duration from invite used
    const days = Number(durationDays);
    if (Number.isFinite(days) && days > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + Math.floor(days));
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
    if (email !== "tandelvansh0511@gmail.com") {
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
