import React, { useState, useEffect, useMemo } from 'react';

/**
 * Watermark Component
 * 
 * Creates a dynamic, animated watermark overlay that displays:
 * - User's email/identifier
 * - Unique session ID
 * - Current timestamp
 * 
 * Features:
 * - Diagonal text pattern covering entire screen
 * - Semi-transparent (configurable opacity)
 * - Slight animation for anti-editing protection
 * - Updates timestamp every minute
 * - SVG-based for crispness at any resolution
 */
const Watermark = ({
    userEmail = 'user@example.com',
    sessionId = 'unknown',
    text = null,
    opacity = 0.15,  // 15% opacity by default
    fontSize = 14,
    color = '#000000',
    animated = true,
    position = 'fixed',
    zIndex = 9999,
    className = ''
}) => {
    const [timestamp, setTimestamp] = useState(new Date().toLocaleString());
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Update timestamp every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setTimestamp(new Date().toLocaleString());
        }, 60000); // 1 minute

        return () => clearInterval(interval);
    }, []);

    // Subtle position animation (makes video editing harder)
    useEffect(() => {
        if (!animated) return;

        const animationInterval = setInterval(() => {
            setOffset({
                x: Math.sin(Date.now() / 5000) * 3, // ±3px horizontal drift
                y: Math.cos(Date.now() / 5000) * 3  // ±3px vertical drift
            });
        }, 100);

        return () => clearInterval(animationInterval);
    }, [animated]);

    // Generate shortened session ID for display
    const shortSessionId = useMemo(() => {
        return sessionId.slice(0, 8).toUpperCase();
    }, [sessionId]);

    // Watermark text content
    const watermarkText = text || `${userEmail} • ID:${shortSessionId} • ${timestamp}`;

    // Create SVG pattern for tiled watermark
    const patternId = useMemo(() => `watermark-pattern-${Math.random().toString(36).slice(2)}`, []);

    return (
        <div
            className={`watermark-layer ${className}`}
            style={{
                position: position,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: zIndex,
                overflow: 'hidden',
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition: animated ? 'transform 0.5s ease-out' : 'none'
            }}
            aria-hidden="true"
        >
            <svg
                width="100%"
                height="100%"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                <defs>
                    <pattern
                        id={patternId}
                        patternUnits="userSpaceOnUse"
                        width="800"
                        height="400"
                        patternTransform="rotate(-30)"
                    >
                        <text
                            x="50"
                            y="100"
                            fill={color}
                            fillOpacity={opacity}
                            fontSize={fontSize}
                            fontFamily="monospace, 'Courier New', Courier"
                            fontWeight="500"
                        >
                            {watermarkText}
                        </text>
                        <text
                            x="450"
                            y="300"
                            fill={color}
                            fillOpacity={opacity}
                            fontSize={fontSize}
                            fontFamily="monospace, 'Courier New', Courier"
                            fontWeight="500"
                        >
                            {watermarkText}
                        </text>
                    </pattern>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill={`url(#${patternId})`}
                />
            </svg>

            {/* Center watermark for extra visibility */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-30deg)',
                    fontSize: fontSize * 1.5,
                    fontFamily: 'monospace',
                    color: color,
                    opacity: opacity * 1.5, // Slightly more visible in center
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                }}
            >
                {watermarkText}
            </div>
        </div>
    );
};

export default Watermark;
