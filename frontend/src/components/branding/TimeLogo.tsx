'use client';

import { useState, useEffect } from 'react';

// ============================================
// BRAND TOKENS
// ============================================
const BRAND = {
  colors: {
    primary: '#8b5cf6',      // Purple
    secondary: '#06b6d4',    // Cyan
    accent: '#ec4899',       // Magenta
    success: '#22c55e',      // Green (support)
    danger: '#ef4444',       // Red (resistance)
    neutral: '#6366f1',      // Indigo
    background: '#0f172a',   // Dark slate
    foreground: '#f8fafc',   // Light
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #06b6d4 100%)',
    neon: 'linear-gradient(180deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
  },
};

interface TimeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

/**
 * TIME Logo — "The Temporal Pulse Mark"
 *
 * Premium, clean, iconic design:
 * - T: The Pulse Bar (vertical gradient bar with glow)
 * - I: The Candle Line (subtle animated candle)
 * - M: The Market Wave (smooth sine curve)
 * - E: The Horizon Levels (support/resistance bars)
 */
export function TimeLogo({
  size = 'md',
  animated = true,
  className = ''
}: TimeLogoProps) {
  const [isBullish, setIsBullish] = useState(true);

  // Subtle breathing animation for candle
  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setIsBullish(prev => !prev);
    }, 2500); // Slower, like breathing
    return () => clearInterval(interval);
  }, [animated]);

  const sizes = {
    sm: { width: 100, height: 28 },
    md: { width: 140, height: 40 },
    lg: { width: 200, height: 56 },
    xl: { width: 280, height: 80 },
  };

  const { width, height } = sizes[size];
  const letterWidth = width / 4.5;
  const candleColor = isBullish ? '#22c55e' : '#ef4444';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          {/* Primary gradient (purple → cyan) */}
          <linearGradient id="timePrimaryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Neon glow filter */}
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Pulse glow animation */}
          <filter id="pulseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur">
              {animated && (
                <animate
                  attributeName="stdDeviation"
                  values="2;4;2"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              )}
            </feGaussianBlur>
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Candle glow */}
          <filter id="candleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* T — The Pulse Bar */}
        <g transform={`translate(${letterWidth * 0.05}, 0)`} filter="url(#pulseGlow)">
          {/* Vertical bar */}
          <rect
            x={letterWidth * 0.35}
            y={height * 0.1}
            width={letterWidth * 0.18}
            height={height * 0.8}
            rx="2"
            fill="url(#timePrimaryGrad)"
          />
          {/* Top cap */}
          <rect
            x={letterWidth * 0.1}
            y={height * 0.1}
            width={letterWidth * 0.68}
            height={height * 0.12}
            rx="2"
            fill="url(#timePrimaryGrad)"
          />
        </g>

        {/* I — The Candle Line */}
        <g
          transform={`translate(${letterWidth * 1.1}, 0)`}
          filter="url(#candleGlow)"
          style={{ transition: 'all 0.7s ease-in-out' }}
        >
          {/* Wick */}
          <line
            x1={letterWidth * 0.44}
            y1={height * 0.12}
            x2={letterWidth * 0.44}
            y2={height * 0.88}
            stroke={candleColor}
            strokeWidth="2"
            style={{ transition: 'stroke 0.7s ease-in-out' }}
          />
          {/* Candle body - Green UP (top), Red DOWN (bottom) */}
          <rect
            x={letterWidth * 0.3}
            y={isBullish ? height * 0.3 : height * 0.5}
            width={letterWidth * 0.28}
            height={height * 0.2}
            rx="2"
            fill={candleColor}
            style={{ transition: 'all 0.7s ease-in-out' }}
          />
        </g>

        {/* M — The Market Wave (smooth sine curve) */}
        <g transform={`translate(${letterWidth * 2}, 0)`}>
          <path
            d={`
              M ${letterWidth * 0.05} ${height * 0.85}
              Q ${letterWidth * 0.2} ${height * 0.1}, ${letterWidth * 0.4} ${height * 0.5}
              Q ${letterWidth * 0.6} ${height * 0.9}, ${letterWidth * 0.8} ${height * 0.15}
              L ${letterWidth * 0.8} ${height * 0.85}
            `}
            fill="none"
            stroke="url(#timePrimaryGrad)"
            strokeWidth={height * 0.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />
        </g>

        {/* E — The Horizon Levels */}
        <g transform={`translate(${letterWidth * 3.05}, 0)`}>
          {/* Vertical spine */}
          <rect
            x="0"
            y={height * 0.1}
            width={letterWidth * 0.15}
            height={height * 0.8}
            rx="2"
            fill="url(#timePrimaryGrad)"
          />
          {/* Top level - green (bullish = UP) */}
          <rect
            x="0"
            y={height * 0.1}
            width={letterWidth * 0.6}
            height={height * 0.1}
            rx="2"
            fill="#22c55e"
            opacity="0.85"
            filter="url(#neonGlow)"
          />
          {/* Middle level (neutral) */}
          <rect
            x="0"
            y={height * 0.45}
            width={letterWidth * 0.45}
            height={height * 0.1}
            rx="2"
            fill="#8b5cf6"
          />
          {/* Bottom level - red (bearish = DOWN) */}
          <rect
            x="0"
            y={height * 0.8}
            width={letterWidth * 0.6}
            height={height * 0.1}
            rx="2"
            fill="#ef4444"
            opacity="0.85"
            filter="url(#neonGlow)"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * TIME Icon — "The Pulse Icon"
 *
 * Clean favicon/app icon:
 * - Pulse bar (T)
 * - Candle inside (I)
 * - Wave curve behind (M)
 * - Horizon lines (E)
 */
export function TimeIcon({
  size = 32,
  animated = true,
  className = ''
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const [isBullish, setIsBullish] = useState(true);

  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setIsBullish(prev => !prev);
    }, 2500);
    return () => clearInterval(interval);
  }, [animated]);

  const candleColor = isBullish ? '#22c55e' : '#ef4444';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      <defs>
        <linearGradient id="iconPrimaryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="8" fill="#0f172a" />

      {/* Wave curve (M reference) */}
      <path
        d="M 4 22 Q 8 8, 14 16 Q 20 24, 22 10"
        fill="none"
        stroke="url(#iconPrimaryGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Pulse bar (T reference) */}
      <rect
        x="22"
        y="6"
        width="4"
        height="20"
        rx="2"
        fill="url(#iconPrimaryGrad)"
        filter="url(#iconGlow)"
      />

      {/* Candle (I reference) - Green UP (top), Red DOWN (bottom) */}
      <g style={{ transition: 'all 0.7s ease-in-out' }}>
        <line
          x1="24" y1="8"
          x2="24" y2="24"
          stroke={candleColor}
          strokeWidth="1"
          style={{ transition: 'stroke 0.7s ease-in-out' }}
        />
        <rect
          x="22"
          y={isBullish ? 10 : 14}
          width="4"
          height="6"
          rx="1"
          fill={candleColor}
          style={{ transition: 'all 0.7s ease-in-out' }}
        />
      </g>

      {/* Horizon lines (E reference) - green UP, red DOWN */}
      <line x1="3" y1="8" x2="18" y2="8" stroke="#22c55e" strokeWidth="1" opacity="0.5" />
      <line x1="3" y1="24" x2="18" y2="24" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export default TimeLogo;
