// const { db, admin } = require('../config/firebase');
// const { v4: uuidv4 } = require('uuid');
// const nodemailer = require('nodemailer');

// // Initialize Email Transporter
// const transporter = nodemailer.createTransport({
//     service: process.env.SMTP_SERVICE || 'gmail',
//     auth: {
//         user: process.env.SMTP_EMAIL,
//         pass: process.env.SMTP_PASSWORD
//     }
// });

// // Helper: Send Email (Safe wrapper)
// const sendSecurityEmail = async (to, subject, html) => {
//     if (!process.env.SMTP_EMAIL || !to) {
//         console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
//         return;
//     }
//     try {
//         await transporter.sendMail({
//             from: process.env.SMTP_EMAIL,
//             to,
//             subject,
//             html
//         });
//         console.log(`[EMAIL SENT] Security alert to ${to}`);
//     } catch (err) {
//         console.error('Email send failed:', err.message);
//     }
// };

// /**
//  * Security Controller
//  *
//  * Handles security-related operations:
//  * - Session heartbeat validation
//  * - Security event logging
//  * - Single session enforcement
//  * - Anomaly detection
//  */

// // In-memory session store (in production, use Redis or similar)
// // Maps userId -> { sessionId, lastHeartbeat, pdfId }
// const activeSessions = new Map();

// /**
//  * Session Heartbeat
//  *
//  * Validates that a viewing session is still active.
//  * Enforces single active session per user.
//  *
//  * POST /api/security/heartbeat
//  * Body: { sessionId, pdfId }
//  */
// exports.heartbeat = async (req, res) => {
//     try {
//         const { uid } = req.user;
//         const { sessionId, pdfId } = req.body;

//         if (!sessionId) {
//             return res.status(400).json({ valid: false, message: 'Session ID required' });
//         }

//         const now = Date.now();
//         const existingSession = activeSessions.get(uid);

//         // Check if this is a new session or the same session
//         if (existingSession && existingSession.sessionId !== sessionId) {
//             // Different session exists - check if it's stale (> 2 minutes old)
//             const sessionAge = now - existingSession.lastHeartbeat;
//             const isStale = sessionAge > 120000; // 2 minutes

//             if (!isStale) {
//                 // Active session on another device - invalidate this one
//                 console.log(`[Security] User ${uid} has active session on another device`);

//                 // Log the event
//                 await logSecurityEvent(uid, {
//                     type: 'SESSION_CONFLICT',
//                     existingSession: existingSession.sessionId.slice(0, 8),
//                     newSession: sessionId.slice(0, 8),
//                     timestamp: new Date().toISOString()
//                 });

//                 // Option A: Kick the new session (current implementation)
//                 // return res.status(200).json({
//                 //     valid: false,
//                 //     message: 'Another session is active'
//                 // });

//                 // Option B: Kick the old session (new device takes over)
//                 // This is more user-friendly
//                 console.log(`[Security] New session takes over for user ${uid}`);
//             }
//         }

//         // Update/create session
//         activeSessions.set(uid, {
//             sessionId,
//             pdfId,
//             lastHeartbeat: now,
//             userAgent: req.headers['user-agent'],
//             ip: req.ip || req.connection?.remoteAddress
//         });

//         res.status(200).json({
//             valid: true,
//             message: 'Session active',
//             serverTime: new Date().toISOString()
//         });

//     } catch (error) {
//         console.error('Heartbeat Error:', error);
//         res.status(500).json({ valid: false, message: 'Internal Server Error' });
//     }
// };

// /**
//  * Log Security Event
//  *
//  * Records security-related events for audit trail.
//  *
//  * POST /api/security/log-event
//  * Body: { type, details, sessionId, pdfId, groupId, ... }
//  */
// exports.logEvent = async (req, res) => {
//     try {
//         const { uid, email } = req.user;
//         const eventData = req.body;

//         const event = {
//             id: uuidv4(),
//             userId: uid,
//             userEmail: email,
//             type: eventData.type || 'UNKNOWN',
//             sessionId: eventData.sessionId || null,
//             pdfId: eventData.pdfId || null,
//             groupId: eventData.groupId || null,
//             details: eventData.details || {},
//             userAgent: req.headers['user-agent'],
//             ip: req.ip || req.connection?.remoteAddress,
//             timestamp: eventData.timestamp || new Date().toISOString(),
//             serverTimestamp: new Date().toISOString()
//         };

//         // Log to console for debugging
//         console.log('[Security Event]', JSON.stringify(event, null, 2));

//         // Store in Firestore
//         await db.collection('security_events').doc(event.id).set(event);

//         // Check for suspicious patterns
//         await checkAnomalies(uid, event);

//         res.status(200).json({ logged: true, eventId: event.id });

//     } catch (error) {
//         console.error('Log Event Error:', error);
//         // Don't fail the request - logging should be non-blocking
//         res.status(200).json({ logged: false, error: 'Failed to log' });
//     }
// };

// /**
//  * Check Session
//  *
//  * Verifies if user's session is the currently active one.
//  *
//  * POST /api/security/check-session
//  * Body: { sessionId }
//  */
// exports.checkSession = async (req, res) => {
//     try {
//         const { uid } = req.user;
//         const { sessionId } = req.body;

//         const activeSession = activeSessions.get(uid);

//         if (!activeSession) {
//             // No active session recorded - this could be first access
//             return res.status(200).json({
//                 valid: true,
//                 isActive: false,
//                 message: 'No active session'
//             });
//         }

//         const isCurrentSession = activeSession.sessionId === sessionId;
//         const isStale = (Date.now() - activeSession.lastHeartbeat) > 120000;

//         res.status(200).json({
//             valid: true,
//             isActive: isCurrentSession || isStale,
//             message: isCurrentSession ? 'Current session' : isStale ? 'Session stale' : 'Different session active'
//         });

//     } catch (error) {
//         console.error('Check Session Error:', error);
//         res.status(500).json({ valid: false, message: 'Internal Server Error' });
//     }
// };

// /**
//  * Get User Security Events
//  *
//  * Retrieves security events for a specific user (admin only).
//  *
//  * GET /api/security/events/:userId
//  */
// exports.getUserEvents = async (req, res) => {
//     try {
//         const { uid } = req.user;
//         const { userId } = req.params;
//         const { limit = 50 } = req.query;

//         // For now, users can only see their own events
//         // TODO: Add admin role check for viewing other users' events
//         if (uid !== userId) {
//             return res.status(403).json({ message: 'Access denied' });
//         }

//         const snapshot = await db.collection('security_events')
//             .where('userId', '==', userId)
//             .orderBy('serverTimestamp', 'desc')
//             .limit(parseInt(limit))
//             .get();

//         const events = [];
//         snapshot.forEach(doc => events.push(doc.data()));

//         res.status(200).json(events);

//     } catch (error) {
//         console.error('Get Events Error:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

// /**
//  * End Session
//  *
//  * Explicitly ends a viewing session.
//  *
//  * POST /api/security/end-session
//  * Body: { sessionId }
//  */
// exports.endSession = async (req, res) => {
//     try {
//         const { uid } = req.user;
//         const { sessionId } = req.body;

//         const activeSession = activeSessions.get(uid);

//         if (activeSession && activeSession.sessionId === sessionId) {
//             activeSessions.delete(uid);
//             console.log(`[Security] Session ended for user ${uid}`);
//         }

//         res.status(200).json({ ended: true });

//     } catch (error) {
//         console.error('End Session Error:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

// // ============================================
// // Helper Functions
// // ============================================

// /**
//  * Log security event to Firestore
//  */
// async function logSecurityEvent(userId, eventData) {
//     try {
//         const event = {
//             id: uuidv4(),
//             userId,
//             ...eventData,
//             serverTimestamp: new Date().toISOString()
//         };

//         await db.collection('security_events').doc(event.id).set(event);
//     } catch (error) {
//         console.error('Failed to log security event:', error);
//     }
// }

// /**
//  * Check for anomalous patterns that might indicate security issues
//  */
// async function checkAnomalies(userId, event) {
//     try {
//         // Check for rapid DevTools detection events (indicates persistence)
//         if (event.type === 'DEVTOOLS_DETECTED') {
//             const recentEvents = await db.collection('security_events')
//                 .where('userId', '==', userId)
//                 .where('type', '==', 'DEVTOOLS_DETECTED')
//                 .where('serverTimestamp', '>', new Date(Date.now() - 3600000).toISOString()) // Last hour
//                 .get();

//             if (recentEvents.size >= 3) {
//                 console.warn(`[ALERT] User ${userId} has opened DevTools ${recentEvents.size} times in the last hour!`);

//                 // Store alert for admin review
//                 await db.collection('security_alerts').add({
//                     userId,
//                     type: 'REPEATED_DEVTOOLS',
//                     count: recentEvents.size,
//                     timestamp: new Date().toISOString(),
//                     reviewed: false
//                 });
//             }
//         }

//         // Check for unusual viewing patterns
//         if (event.type === 'VIEW_START') {
//             const recentViews = await db.collection('security_events')
//                 .where('userId', '==', userId)
//                 .where('type', '==', 'VIEW_START')
//                 .where('serverTimestamp', '>', new Date(Date.now() - 3600000).toISOString())
//                 .get();

//             if (recentViews.size >= 10) {
//                 console.warn(`[ALERT] User ${userId} has started ${recentViews.size} viewing sessions in the last hour!`);

//                 await db.collection('security_alerts').add({
//                     userId,
//                     type: 'EXCESSIVE_VIEWS',
//                     count: recentViews.size,
//                     timestamp: new Date().toISOString(),
//                     reviewed: false
//                 });
//             }
//         }

//         // ===================================
//         // SCREENSHOT PROTECTION MONITORING
//         // ===================================
//         if (event.type === 'PRINTSCREEN_BLOCKED' || (event.type === 'KEYBOARD_BLOCKED' && event.details?.action === 'screenshot')) {
//             const WARN_THRESHOLD = 10;
//             const BAN_THRESHOLD = 20;

//             // 1. Count ALL screenshot attempts by this user (Lifetime count)
//             // Query Firestore for past events
//             const attemptsQuery = await db.collection('security_events')
//                 .where('userId', '==', userId)
//                 .where('type', 'in', ['PRINTSCREEN_BLOCKED', 'KEYBOARD_BLOCKED'])
//                 .get();

//             let attemptCount = 0;
//             attemptsQuery.forEach(doc => {
//                 const d = doc.data();
//                 if (d.type === 'PRINTSCREEN_BLOCKED') attemptCount++;
//                 else if (d.type === 'KEYBOARD_BLOCKED' && d.details?.action === 'screenshot') attemptCount++;
//             });

//             console.log(`[SECURITY] User ${userId} Screenshot Attempts: ${attemptCount}`);

//             // 2. Fetch User Data
//             const userRef = db.collection('users').doc(userId);
//             const userSnap = await userRef.get();

//             if (userSnap.exists) {
//                 const userData = userSnap.data();

//                 // 3. CHECK FOR BAN (>= 20)
//                 if (attemptCount >= BAN_THRESHOLD && !userData.disabled) {
//                     console.warn(`[BAN] User ${userId} banned for ${attemptCount} screenshot attempts.`);

//                     // Ban and record reason
//                     await userRef.set({
//                         disabled: true,
//                         disabledReason: 'Excessive screenshot attempts detected (Auto-Ban).',
//                         disabledAt: new Date().toISOString()
//                     }, { merge: true });

//                     // Terminate active session immediately
//                     const activeSession = activeSessions.get(userId);
//                     if (activeSession) {
//                         activeSessions.delete(userId);
//                     }

//                     // Email User
//                     await sendSecurityEmail(
//                         userData.email || event.userEmail,
//                         'Account Suspended - Security Violation',
//                         `<h3>Account Suspended</h3>
//                          <p>Your account has been suspended due to <b>${attemptCount}</b> confirmed screenshot attempts.</p>
//                          <p>This violates our security policy. Your groups and documents are no longer accessible.</p>
//                          <p>Please contact the administrator to appeal.</p>`
//                     );

//                     // Email Admin
//                     await sendSecurityEmail(
//                         process.env.ADMIN_EMAIL || 'admin@example.com',
//                         `[URGENT] User Banned: ${userData.email}`,
//                         `<p>User <b>${userData.email}</b> (${userId}) was automatically banned.</p>
//                          <p>Reason: ${attemptCount} screenshot/capture attempts.</p>
//                          <p>Action Required: Review user activity.</p>`
//                     );
//                 }
//                 // 4. CHECK FOR WARNING (>= 10)
//                 else if (attemptCount >= WARN_THRESHOLD && !userData.disabled) {
//                     // Only warn if we haven't warned for this threshold yet (avoid spam)
//                     const lastWarnCount = userData.lastScreenshotWarnCount || 0;

//                     if (lastWarnCount < WARN_THRESHOLD) {
//                         console.warn(`[WARN] User ${userId} warned for ${attemptCount} screenshot attempts.`);

//                         // Update warning flag
//                         await userRef.set({
//                             lastScreenshotWarnCount: attemptCount
//                         }, { merge: true });

//                         // Send Warning Email
//                         await sendSecurityEmail(
//                             userData.email || event.userEmail,
//                             'Security Warning - Prohibited Action Detected',
//                             `<h3>Security Warning</h3>
//                              <p>We have detected <b>${attemptCount}</b> attempts to capture content from your account.</p>
//                              <p>This is a violation of our terms of service.</p>
//                              <p style="color: red; font-weight: bold;">If this continues (Limit: 20), your account will be automatically suspended.</p>`
//                         );
//                     }
//                 }
//             }
//         }

//     } catch (error) {
//         console.error('Anomaly check error:', error);
//         // Don't throw - this is a non-critical background check
//     }
// }

// /**
//  * Cleanup stale sessions (call periodically)
//  */
// function cleanupStaleSessions() {
//     const now = Date.now();
//     const staleThreshold = 300000; // 5 minutes

//     for (const [userId, session] of activeSessions.entries()) {
//         if (now - session.lastHeartbeat > staleThreshold) {
//             console.log(`[Security] Cleaning up stale session for user ${userId}`);
//             activeSessions.delete(userId);
//         }
//     }
// }

// // Run cleanup every 5 minutes
// setInterval(cleanupStaleSessions, 300000);

// module.exports = exports;
