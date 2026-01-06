import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import React from 'react';

// Components
import Watermark from '../components/Watermark';
import SecurityOverlay from '../components/SecurityOverlay';

// Hooks
import { useSecurityLayers } from '../hooks/useSecurityLayers';

// Set worker source locally to avoid CDN/CORS issues
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// API Base URL
const API_BASE = 'http://localhost:5000';

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
            className={`secure-viewer min-h-screen bg-gray-900 flex flex-col items-center justify-start pt-8 pb-24 relative ${!isFocused ? 'blurred' : ''}`}
            tabIndex={0}
        >
            {/* Watermark Layer - Always visible */}
            <Watermark
                userEmail={currentUser?.email || 'user'}
                sessionId={sessionId}
                opacity={0.12}
                fontSize={13}
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
            <div className="w-full max-w-4xl mb-6 px-4 flex items-center justify-between">
                <Link
                    to={`/group/${groupId}`}
                    className="interactive-element flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-medium">Back to Group</span>
                </Link>

                {/* Document Title */}
                {pdfMetadata && (
                    <h1 className="text-white font-semibold text-lg truncate max-w-md">
                        {pdfMetadata.title}
                    </h1>
                )}

                {/* Security Status */}
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSecure ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-gray-500">
                        {isSecure ? 'Secure' : 'Warning'}
                    </span>
                </div>
            </div>

            {/* Pref={contentRef} DF Content Area */}
            <div className="pdf-content relative">
                {/* Error State */}
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-6 rounded-lg max-w-md text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <p className="mb-4">{error}</p>
                        <button
                            onClick={() => navigate(`/group/${groupId}`)}
                            className="interactive-element px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            Return to Group
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && !error && (
                    <div className="pdf-loading">
                        <div className="pdf-loading-spinner mb-4" />
                        <p className="text-gray-400">Loading secure document...</p>
                    </div>
                )}

                {/* PDF Document */}
                {pdfUrl && !error && (
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                            <div className="pdf-loading">
                                <div className="pdf-loading-spinner mb-4" />
                                <p className="text-gray-400">Rendering page...</p>
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
                                    className="bg-gray-800 rounded-lg flex items-center justify-center"
                                    style={{ width: pdfWidth, height: pdfWidth * 1.4 }}
                                >
                                    <div className="pdf-loading-spinner" />
                                </div>
                            }
                        />
                    </Document>
                )}

                {/* PDF-Specific Watermark (Dark text for white paper) */}
                {pdfUrl && !error && (
                    <Watermark
                        userEmail={currentUser?.email || 'user'}
                        sessionId={sessionId}
                        opacity={0.08}
                        fontSize={14}
                        color="#000000"
                        position="absolute"
                        zIndex={10}
                        animated={true}
                    />
                )}
            </div>

            {/* Navigation Controls */}
            {numPages && (
                <div className="pdf-controls interactive-element" style={{ gap: '1rem' }}>
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                    >
                        ← Previous
                    </button>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm font-medium">Page</span>
                        <input
                            name="pageJump"
                            type="number"
                            min="1"
                            max={numPages}
                            defaultValue={pageNumber}
                            key={pageNumber}
                            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white focus:border-blue-500 outline-none text-sm"
                        />
                        <span className="text-gray-400 text-sm font-medium">of {numPages}</span>
                        <button
                            type="submit"
                            className="px-2 py-1 !bg-blue-600 !border-blue-500 hover:!bg-blue-700 text-white rounded text-sm font-medium ml-2"
                        >
                            Go
                        </button>
                    </form>

                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Security Badge (bottom left) */}
            <div className="fixed bottom-6 left-6 flex items-center gap-2 bg-gray-800/80 px-3 py-2 rounded-lg border border-gray-700">
                <span className="text-xs font-medium text-gray-400">
                    🔒 Protected View
                </span>
                {triggerCount > 0 && (
                    <span className="text-xs bg-red-600 px-2 py-0.5 rounded text-white">
                        {triggerCount} events
                    </span>
                )}
            </div>
        </div>
    );
};

export default SecureViewer;
