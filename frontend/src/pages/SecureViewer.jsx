import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import React from 'react';
import ThemeToggle from '../components/ThemeToggle';

// Components
import Watermark from '../components/Watermark';
import SecurityOverlay from '../components/SecurityOverlay';

// Hooks
import { useSecurityLayers } from '../hooks/useSecurityLayers';

// Set worker source locally to avoid CDN/CORS issues
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * SecureViewer Component
 * 
 * A highly secure PDF viewer with multiple layers of anti-piracy protection:
 * 
 * 1. Canvas-only rendering (no selectable text)
 * 2. Dynamic watermark with user info
 * 3. Focus detection with content blur
 * 4. DevTools detection
 * 5. Keyboard/mouse blocking
 * 6. Print prevention
 * 7. Session heartbeat
 * 8. Activity logging
 */
const SecureViewer = () => {
    const { pdfId, groupId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    // PDF State
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pdfMetadata, setPdfMetadata] = useState(null);
    // Session State
    const [sessionId, setSessionId] = useState('');
    const [sessionValid, setSessionValid] = useState(true);
    // Refs
    const heartbeatInterval = useRef(null);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    // Generate unique session ID on mount
    useEffect(() => {
        const sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        setSessionId(sid);
    }, []);
    // User info for security tracking
    const userInfo = useMemo(() => ({
        uid: currentUser?.uid,
        email: currentUser?.email,
        sessionId,
        pdfId,
        groupId
    }), [currentUser, sessionId, pdfId, groupId]);
    // Security event handler - log to backend
    const handleSecurityEvent = useCallback(async (event) => {
        if (!currentUser || !sessionId) return;
        try {
            const token = await currentUser.getIdToken();
            await axios.post(`${API_BASE}/api/security/log-event`, {
                ...event,
                sessionId,
                pdfId,
                groupId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            // Silently fail - don't disrupt user experience
            console.warn('[Security] Failed to log event:', err.message);
        }
    }, [currentUser, sessionId, pdfId, groupId]);
    // Initialize security layers
    const {
        isSecure,
        isFocused,
        devToolsOpen,
        securityViolation,
        triggerCount
    } = useSecurityLayers({
        userInfo,
        onSecurityEvent: handleSecurityEvent,
        enabled: true,
        contentRef // Pass ref for instant DOM manipulation
    });
    // Load PDF content securely
    useEffect(() => {
        const loadSecureContent = async () => {
            if (!pdfId || !currentUser) {
                setLoading(false);
                if (!pdfId) setError('Document ID is missing.');
                return;
            }
            try {
                const token = await currentUser.getIdToken();
                const authHeader = { Authorization: `Bearer ${token}` };
                // 1. Fetch PDF Metadata
                const metaRes = await axios.get(
                    `${API_BASE}/api/pdfs/metadata/${pdfId}`,
                    { headers: authHeader }
                );
                setPdfMetadata(metaRes.data);
                // 2. Use backend proxy to fetch PDF (bypasses Cloudinary browser restrictions)
                // Use Authorization header instead of query param for security
                const proxyUrl = `${API_BASE}/api/pdfs/proxy/${pdfId}`;
                setPdfUrl({
                    url: proxyUrl,
                    httpHeaders: { 'Authorization': `Bearer ${token}` }
                });
                // Log view start
                handleSecurityEvent({
                    type: 'VIEW_START',
                    timestamp: new Date().toISOString(),
                    details: { pdfId, title: metaRes.data.title }
                });
            } catch (err) {
                console.error('Error fetching secure content:', err);
                if (err.response?.status === 403) {
                    // Use server message if available (e.g., "Account suspended")
                    setError(err.response?.data?.message || 'Access denied. Your membership may have expired.');
                } else if (err.response?.status === 404) {
                    setError('Document not found.');
                } else {
                    setError('Failed to load document. ' + (err.response?.data?.message || err.message));
                }
                setLoading(false);
            }
        };
        loadSecureContent();
    }, [pdfId, currentUser, handleSecurityEvent]);
    // Session heartbeat - validates session every 30 seconds
    useEffect(() => {
        if (!currentUser || !sessionId) return;
        const sendHeartbeat = async () => {
            try {
                const token = await currentUser.getIdToken();
                const res = await axios.post(
                    `${API_BASE}/api/security/heartbeat`,
                    { sessionId, pdfId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.data.valid) {
                    setSessionValid(false);
                    // Session invalidated (possibly logged in elsewhere)
                }
            } catch (err) {
                // Check if account was banned during session
                if (err.response?.status === 403) {
                    setSessionValid(false);
                    setError(err.response?.data?.message || 'Session terminated due to security violation.');
                }
                // If backend is merely unreachable, don't immediately invalidate
                console.warn('[Heartbeat] Failed:', err.message);
            }
        };
        // Initial heartbeat
        sendHeartbeat();
        // Heartbeat every 30 seconds
        heartbeatInterval.current = setInterval(sendHeartbeat, 30000);
        return () => {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
        };
    }, [currentUser, sessionId, pdfId]);
    // Cleanup on unmount - log view end
    useEffect(() => {
        return () => {
            if (sessionId && currentUser) {
                handleSecurityEvent({
                    type: 'VIEW_END',
                    timestamp: new Date().toISOString(),
                    details: { pdfId, pagesViewed: pageNumber }
                });
            }
        };
    }, [sessionId, currentUser, handleSecurityEvent, pdfId, pageNumber]);
    // PDF load handlers
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
    };
    const onDocumentLoadError = (error) => {
        console.error('PDF Load Error:', error);
        setError('Failed to render document. Please try refreshing.');
        setLoading(false);
    };
    // Page navigation
    const goToPrevPage = () => {
        setPageNumber(prev => Math.max(1, prev - 1));
        handleSecurityEvent({
            type: 'PAGE_TURN',
            details: { from: pageNumber, to: pageNumber - 1 }
        });
    };
    const goToNextPage = () => {
        setPageNumber(prev => Math.min(numPages, prev + 1));
        handleSecurityEvent({
            type: 'PAGE_TURN',
            details: { from: pageNumber, to: pageNumber + 1 }
        });
    };
    const handleJumpToPage = (e) => {
        e.preventDefault();
        const targetPage = parseInt(e.currentTarget.pageJump.value, 10);
        if (targetPage >= 1 && targetPage <= numPages) {
            setPageNumber(targetPage);
            handleSecurityEvent({
                type: 'PAGE_JUMP',
                details: { to: targetPage }
            });
        }
    };
    // Handle focus restoration
    const handleFocusRestore = () => {
        // Focus is automatically detected by the hook
        // This just serves as a click handler for the overlay
        containerRef.current?.focus();
    };
    // Determine overlay state
    const getOverlayType = () => {
        if (!sessionValid) return 'session';
        if (devToolsOpen) return 'devtools';
        if (!isFocused) return 'blur';
        if (securityViolation) return 'violation';
        return null;
    };
    const overlayType = getOverlayType();
    const showOverlay = overlayType !== null;
    // Calculate PDF width based on viewport
    const pdfWidth = useMemo(() => {
        if (typeof window !== 'undefined') {
            return Math.min(window.innerWidth * 0.9, 900);
        }
        return 800;
    }, []);
    return (
        <div
            ref={containerRef}
            className={`secure-viewer min-h-screen bg-main flex flex-col items-center justify-start pt-8 pb-24 relative overflow-hidden transition-colors duration-300 ${!isFocused ? 'blurred' : ''}`}
            tabIndex={0}
        >
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-50 dark:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Watermark Layer - Always visible */}
            <Watermark
                text="PharmanestHub"
                userEmail={currentUser?.email || 'user'}
                sessionId={sessionId}
                opacity={0.05}
                fontSize={60}
                color="#ffffff"
                animated={true}
            />
            {/* Security Overlay - Shown when security is compromised */}
            <SecurityOverlay
                type={overlayType}
                isVisible={showOverlay}
                onRetry={overlayType === 'blur' ? handleFocusRestore :
                    overlayType === 'session' ? () => navigate('/login') : null}
            />
            {/* Header Bar */}
            <div className="w-full max-w-4xl mb-6 px-4 flex items-center justify-between z-20">
                <Link
                    to={`/group/${groupId}`}
                    className="flex items-center gap-2 text-secondary hover:text-primary transition-colors group px-4 py-2 rounded-lg hover:bg-white/5"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-medium">Back to Group</span>
                </Link>
                {/* Document Title */}
                {pdfMetadata && (
                    <div className="glass-panel px-6 py-2 rounded-xl border-white/5">
                        <h1 className="text-primary font-bold text-lg truncate max-w-md tracking-tight">
                            {pdfMetadata.title}
                        </h1>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {/* Security Status */}
                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                        <span className={`relative flex h-2.5 w-2.5`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSecure ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSecure ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </span>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            {isSecure ? 'Secure' : 'Warning'}
                        </span>
                    </div>
                </div>
            </div>
            {/* PDF Content Area */}
            <div className="pdf-content relative z-10 w-full max-w-4xl flex justify-center">
                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-8 rounded-2xl max-w-md text-center backdrop-blur-md">
                        <div className="text-5xl mb-6 opacity-80">⚠️</div>
                        <p className="mb-8 text-lg">{error}</p>
                        <button
                            onClick={() => navigate(`/group/${groupId}`)}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-600/20"
                        >
                            Return to Group
                        </button>
                    </div>
                )}
                {/* Loading State */}
                {loading && !error && (
                    <div className="pdf-loading flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6" />
                        <p className="text-slate-400 font-medium animate-pulse">Establishing Secure Connection...</p>
                    </div>
                )}
                {/* PDF Document */}
                {pdfUrl && !error && (
                    <div className="shadow-2xl shadow-black/50 rounded-lg overflow-hidden border border-white/5">
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                                <div className="p-20 text-center">
                                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-slate-500">Decrypting page content...</p>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                renderTextLayer={false}      // CRITICAL: No text layer = cannot select text
                                renderAnnotationLayer={false} // No clickable links
                                width={pdfWidth}
                                className="pdf-canvas"
                                loading={
                                    <div
                                        className="bg-slate-800 rounded-lg flex items-center justify-center"
                                        style={{ width: pdfWidth, height: pdfWidth * 1.4 }}
                                    >
                                        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                    </div>
                                }
                            />
                        </Document>
                    </div>
                )}
                {/* PDF-Specific Watermark (Dark text for white paper) */}
                {pdfUrl && !error && (
                    <Watermark
                        text="PharmanestHub"
                        userEmail={currentUser?.email || 'user'}
                        sessionId={sessionId}
                        opacity={0.05}
                        fontSize={60}
                        color="#000000"
                        position="absolute"
                        zIndex={10}
                        animated={true}
                    />
                )}
            </div>
            {/* Navigation Controls */}
            {numPages && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl border-white/10">
                        <button
                            onClick={goToPrevPage}
                            disabled={pageNumber <= 1}
                            className={`p-2 rounded-full transition-all ${pageNumber <= 1 ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-white/10 hover:scale-110 active:scale-95'}`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <form onSubmit={handleJumpToPage} className="flex items-center gap-3">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Page</span>
                            <div className="relative group">
                                <input
                                    name="pageJump"
                                    type="number"
                                    min="1"
                                    max={numPages}
                                    defaultValue={pageNumber}
                                    key={pageNumber}
                                    className="w-16 bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-center text-white focus:border-indigo-500 outline-none text-sm font-mono transition-all group-hover:border-slate-600"
                                />
                            </div>
                            <span className="text-slate-500 text-sm font-medium">/ {numPages}</span>
                        </form>
                        <button
                            onClick={goToNextPage}
                            disabled={pageNumber >= numPages}
                            className={`p-2 rounded-full transition-all ${pageNumber >= numPages ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-white/10 hover:scale-110 active:scale-95'}`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Security Badge (bottom left) */}
            <div className="fixed bottom-6 left-6 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5 shadow-lg z-40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    Protected View
                </span>
                {triggerCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                        {triggerCount} Alerts
                    </span>
                )}
            </div>
        </div>
    );
};

export default SecureViewer;
