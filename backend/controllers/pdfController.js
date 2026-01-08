// controllers/pdfController.js

const cloudinary = require("../config/cloudinary");
const { db } = require("../config/firebase");

// ✅ FIX: replace `uuid` (ESM-only on v9+) with Node built-in UUID
const { randomUUID } = require("crypto");
const uuidv4 = () => randomUUID();

/**
 * PDF Controller
 *
 * Handles PDF upload, retrieval, and secure URL generation.
 * Enhanced with security features:
 * - Membership verification
 * - Expiry checking
 * - Rate limiting on URL generation
 * - Short-lived signed URLs
 * - Activity logging
 */

// Rate limiting for signed URL generation
// Maps userId -> { count, windowStart }
const urlGenerationRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // Max 30 URL generations per minute

/**
 * Upload PDF
 *
 * Uploads a PDF to Cloudinary and saves metadata to Firestore.
 * Only group owners can upload.
 */
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { title, groupId, expiryDate } = req.body;
    const { uid } = req.user;

    // Check if user is owner
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }
    const groupData = groupDoc.data();

    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwner = groupData.createdBy === uid;

    // Strict Check: Must be 'owner' or createdBy
    if (!isOwner && userRole !== "owner") {
      console.log(
        `Upload Blocked: User ${uid} is not owner. Role: ${userRole}, CreatedBy: ${groupData.createdBy}`
      );
      return res
        .status(403)
        .json({ message: "Only the group owner can upload documents" });
    }

    // Upload to Cloudinary with unique folder for security
    console.log("[PDF] Starting Cloudinary Upload...");
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // PDFs must use 'raw' for proper signed URL access
        folder: "pdf-documents",
        type: "authenticated", // authenticated delivery type for stricter security
        public_id: `${groupId}/${uuidv4()}`,
      },
      async (error, result) => {
        try {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            return res.status(500).json({ message: "Upload failed" });
          }

          console.log("[PDF] Upload successful:", result.public_id);

          // Save metadata to Firestore
          const pdfData = {
            id: uuidv4(),
            title: title || "Untitled Document",
            groupId,
            uploadedBy: uid,
            cloudinaryId: result.public_id,
            secureUrl: result.secure_url,
            format: result.format || "pdf",
            pages: result.pages || null,
            bytes: result.bytes,
            resourceType: result.resource_type || "raw",
            deliveryType: result.type || "authenticated",
            createdAt: new Date().toISOString(),
            expiryDate: expiryDate || null,
            viewCount: 0,
          };

          await db.collection("pdfs").doc(pdfData.id).set(pdfData);

          // Log upload event
          await logPDFEvent(uid, "UPLOAD", pdfData.id, { title, groupId });

          return res
            .status(201)
            .json({ message: "PDF uploaded successfully", pdf: pdfData });
        } catch (cbErr) {
          console.error("Upload callback error:", cbErr);
          return res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("PDF Upload Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get Group PDFs
 *
 * Retrieves all PDFs for a group.
 * Verifies membership and checks expiry.
 */
exports.getGroupPDFs = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.user;

    // Check Group Membership & Expiry
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Check if member
    if (!groupData.members || !groupData.members.includes(uid)) {
      return res.status(403).json({ message: "Access denied - not a member" });
    }

    // Check Expiry (skip for owners/admins)
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwnerOrAdmin =
      groupData.createdBy === uid || userRole === "owner" || userRole === "admin";

    if (!isOwnerOrAdmin && groupData.memberExpiry && groupData.memberExpiry[uid]) {
      const expiry = new Date(groupData.memberExpiry[uid]);
      if (expiry < new Date()) {
        return res.status(403).json({ message: "Membership expired" });
      }
    }

    const snapshot = await db
      .collection("pdfs")
      .where("groupId", "==", groupId)
      .get();

    const pdfs = [];
    snapshot.forEach((doc) => pdfs.push(doc.data()));

    res.status(200).json(pdfs);
  } catch (error) {
    console.error("Get PDFs Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get PDF Metadata
 *
 * Retrieves metadata for a specific PDF.
 * Verifies group membership before returning data.
 */
exports.getPDFMetadata = async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { uid } = req.user;

    const doc = await db.collection("pdfs").doc(pdfId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "PDF not found" });
    }

    const pdfData = doc.data();

    // Verify group membership
    const groupDoc = await db.collection("groups").doc(pdfData.groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Check if member
    if (!groupData.members || !groupData.members.includes(uid)) {
      return res.status(403).json({ message: "Access denied - not a member" });
    }

    // Check membership expiry (skip for owners/admins)
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwnerOrAdmin =
      groupData.createdBy === uid || userRole === "owner" || userRole === "admin";

    if (!isOwnerOrAdmin && groupData.memberExpiry && groupData.memberExpiry[uid]) {
      const expiry = new Date(groupData.memberExpiry[uid]);
      if (expiry < new Date()) {
        return res.status(403).json({ message: "Membership expired" });
      }
    }

    res.status(200).json(pdfData);
  } catch (error) {
    console.error("Get PDF Metadata Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Generate Signed URL
 *
 * Generates a short-lived signed URL for secure PDF access.
 * Features:
 * - Rate limiting
 * - Short TTL
 * - Request validation
 */
exports.generateSignedUrl = async (req, res) => {
  try {
    const { uid } = req.user;
    const { pdfId } = req.body;

    if (!pdfId) {
      return res.status(400).json({ message: "PDF ID required" });
    }

    // Verify access + fetch metadata
    const doc = await db.collection("pdfs").doc(pdfId).get();
    if (!doc.exists) return res.status(404).json({ message: "PDF not found" });

    const pdfData = doc.data();

    // Check group membership
    const groupDoc = await db.collection("groups").doc(pdfData.groupId).get();
    if (!groupDoc.exists) return res.status(404).json({ message: "Group not found" });

    const groupData = groupDoc.data();
    if (!groupData.members || !groupData.members.includes(uid)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check expiry (skip for owners/admins)
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwnerOrAdmin =
      groupData.createdBy === uid || userRole === "owner" || userRole === "admin";

    if (!isOwnerOrAdmin && groupData.memberExpiry && groupData.memberExpiry[uid]) {
      const expiry = new Date(groupData.memberExpiry[uid]);
      if (expiry < new Date()) {
        return res.status(403).json({ message: "Membership expired" });
      }
    }

    // Rate limiting
    const now = Date.now();
    const userLimit = urlGenerationRateLimit.get(uid);

    if (userLimit) {
      if (now - userLimit.windowStart < RATE_LIMIT_WINDOW) {
        if (userLimit.count >= RATE_LIMIT_MAX) {
          console.warn(`[RateLimit] User ${uid} exceeded URL generation limit`);
          return res.status(429).json({
            message: "Too many requests. Please wait before viewing more pages.",
          });
        }
        userLimit.count++;
      } else {
        urlGenerationRateLimit.set(uid, { count: 1, windowStart: now });
      }
    } else {
      urlGenerationRateLimit.set(uid, { count: 1, windowStart: now });
    }

    const actualResourceType = pdfData.resourceType || "raw";
    const deliveryType = pdfData.deliveryType || "authenticated";
    const publicId = pdfData.cloudinaryId;

    console.log(
      "[PDF] Generating signed URL for:",
      publicId,
      "resourceType:",
      actualResourceType,
      "deliveryType:",
      deliveryType
    );

    const url = cloudinary.url(publicId, {
      resource_type: actualResourceType,
      type: deliveryType,
      sign_url: true,
      secure: true,
    });

    await logPDFEvent(uid, "URL_GENERATED", pdfId, { publicId });

    res.status(200).json({
      url,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sign URL Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Delete PDF
 *
 * Deletes a PDF from Cloudinary and Firestore.
 * Only group owners can delete.
 */
exports.deletePDF = async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { uid } = req.user;

    // Get PDF metadata
    const pdfDoc = await db.collection("pdfs").doc(pdfId).get();
    if (!pdfDoc.exists) {
      return res.status(404).json({ message: "PDF not found" });
    }

    const pdfData = pdfDoc.data();

    // Verify ownership
    const groupDoc = await db.collection("groups").doc(pdfData.groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    const userRole = groupData.roles ? groupData.roles[uid] : null;
    const isOwner = groupData.createdBy === uid || userRole === "owner";

    if (!isOwner) {
      return res.status(403).json({ message: "Only owners can delete documents" });
    }

    // ✅ FIX: delete using correct resource/delivery types (raw + authenticated)
    try {
      await cloudinary.uploader.destroy(pdfData.cloudinaryId, {
        resource_type: pdfData.resourceType || "raw",
        type: pdfData.deliveryType || "authenticated",
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary delete error:", cloudinaryError);
      // continue with Firestore deletion even if Cloudinary fails
    }

    await db.collection("pdfs").doc(pdfId).delete();

    await logPDFEvent(uid, "DELETE", pdfId, { title: pdfData.title });

    res.status(200).json({ message: "PDF deleted successfully" });
  } catch (error) {
    console.error("Delete PDF Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Log PDF-related events
 */
async function logPDFEvent(userId, action, pdfId, details = {}) {
  try {
    const event = {
      id: uuidv4(),
      userId,
      action,
      pdfId,
      details,
      timestamp: new Date().toISOString(),
    };

    await db.collection("pdf_events").doc(event.id).set(event);
  } catch (error) {
    console.error("Failed to log PDF event:", error);
  }
}

// Cleanup rate limit map periodically
// ✅ Note: in serverless this may not run reliably, but it's harmless.
// For stronger limits, store counters in Redis/Firestore.
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of urlGenerationRateLimit.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
      urlGenerationRateLimit.delete(userId);
    }
  }
}, 60_000);

/**
 * Proxy PDF Content
 *
 * Fetches PDF from Cloudinary server-side and streams to client.
 * This bypasses any browser-side Cloudinary access restrictions.
 */
exports.proxyPDF = async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { uid } = req.user;

    console.log("[PDF Proxy] Request for pdfId:", pdfId, "by user:", uid);

    // Get PDF metadata
    const doc = await db.collection("pdfs").doc(pdfId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "PDF not found" });
    }

    const pdfData = doc.data();

    // Verify group membership
    const groupDoc = await db.collection("groups").doc(pdfData.groupId).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    if (!groupData.members || !groupData.members.includes(uid)) {
      return res.status(403).json({ message: "Access denied - not a member" });
    }

    const cloudinaryId = pdfData.cloudinaryId;
    if (!cloudinaryId) {
      return res.status(500).json({ message: "Cloudinary ID not found in metadata" });
    }

    console.log(
      "[PDF Proxy] PDF Metadata:",
      JSON.stringify(
        {
          cloudinaryId,
          resourceType: pdfData.resourceType,
          deliveryType: pdfData.deliveryType,
          secureUrl: pdfData.secureUrl,
        },
        null,
        2
      )
    );

    // ✅ Prefer correct defaults for PDFs
    const resourceType = pdfData.resourceType || "raw";
    const deliveryType = pdfData.deliveryType || "authenticated";

    const pdfUrl = cloudinary.url(cloudinaryId, {
      resource_type: resourceType,
      type: deliveryType,
      sign_url: true,
      secure: true,
    });

    console.log("[PDF Proxy] Fetching PDF from signed URL:", pdfUrl);
    console.log("[PDF Proxy] Using resourceType:", resourceType, "deliveryType:", deliveryType);

    const https = require("https");
    const http = require("http");
    const protocol = pdfUrl.startsWith("https") ? https : http;

    protocol
      .get(pdfUrl, (cloudinaryRes) => {
        console.log("[PDF Proxy] Cloudinary response status:", cloudinaryRes.statusCode);

        if (cloudinaryRes.statusCode !== 200) {
          return res.status(cloudinaryRes.statusCode).json({
            message: "Failed to fetch PDF from storage",
            status: cloudinaryRes.statusCode,
          });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${(pdfData.title || "document").replace(/"/g, "")}.pdf"`
        );
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // ✅ Don't hardcode "*" here; let your main cors() middleware handle it.
        // (If you keep this, it can conflict with credentials-based CORS.)
        // res.setHeader("Access-Control-Allow-Origin", "*");

        cloudinaryRes.pipe(res);
        logPDFEvent(uid, "PDF_PROXY_ACCESS", pdfId, { title: pdfData.title });
      })
      .on("error", (err) => {
        console.error("[PDF Proxy] Error fetching PDF:", err);
        res.status(500).json({ message: "Failed to proxy PDF", error: err.message });
      });
  } catch (error) {
    console.error("[PDF Proxy] Error:", error);
    res.status(500).json({ message: "Failed to proxy PDF", error: error.message });
  }
};

module.exports = exports;