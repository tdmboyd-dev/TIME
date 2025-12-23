'use client';

import { useState, useEffect } from 'react';

interface TimeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

/**
 * TIME Logo Component
 *
 * - T: Solid letter
 * - I: Animated trading candle (bullish ↔ bearish)
 * - M: Consolidation pattern (zigzag chart)
 * - E: Support/resistance levels
 */
export function TimeLogo({
  size = 'md',
  animated = true,
  showText = true,
  className = ''
}: TimeLogoProps) {
  const [isBullish, setIsBullish] = useState(true);

  // Animate candle between bullish and bearish
  useEffect(() => {
    if (!animated) return;

    const interval = setInterval(() => {
      setIsBullish(prev => !prev);
    }, 3000);

    return () => clearInterval(interval);
  }, [animated]);

  const sizes = {
    sm: { width: 80, height: 24, fontSize: 18 },
    md: { width: 120, height: 36, fontSize: 28 },
    lg: { width: 180, height: 54, fontSize: 42 },
    xl: { width: 240, height: 72, fontSize: 56 },
  };

  const { width, height, fontSize } = sizes[size];
  const letterWidth = width / 4;
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
          {/* Gradient for T and E */}
          <linearGradient id="timeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Glow filter for candle */}
          <filter id="candleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* T - Solid with gradient */}
        <g transform={`translate(${letterWidth * 0.1}, 0)`}>
          {/* Horizontal bar */}
          <rect
            x="0"
            y={height * 0.1}
            width={letterWidth * 0.8}
            height={height * 0.15}
            rx="2"
            fill="url(#timeGradient)"
          />
          {/* Vertical bar */}
          <rect
            x={letterWidth * 0.3}
            y={height * 0.1}
            width={letterWidth * 0.2}
            height={height * 0.8}
            rx="2"
            fill="url(#timeGradient)"
          />
        </g>

        {/* I - Animated Candlestick */}
        <g
          transform={`translate(${letterWidth * 1.1}, 0)`}
          filter="url(#candleGlow)"
          className="transition-all duration-700 ease-in-out"
        >
          {/* Wick (top and bottom) */}
          <line
            x1={letterWidth * 0.4}
            y1={height * 0.1}
            x2={letterWidth * 0.4}
            y2={height * 0.9}
            stroke={candleColor}
            strokeWidth="2"
            className="transition-all duration-700"
          />

          {/* Candle body */}
          <rect
            x={letterWidth * 0.2}
            y={isBullish ? height * 0.45 : height * 0.25}
            width={letterWidth * 0.4}
            height={height * 0.3}
            rx="2"
            fill={candleColor}
            className="transition-all duration-700"
          />

          {/* Glow effect */}
          <rect
            x={letterWidth * 0.2}
            y={isBullish ? height * 0.45 : height * 0.25}
            width={letterWidth * 0.4}
            height={height * 0.3}
            rx="2"
            fill={candleColor}
            opacity="0.3"
            className="transition-all duration-700 animate-pulse"
          />
        </g>

        {/* M - Consolidation Pattern (zigzag) */}
        <g transform={`translate(${letterWidth * 2}, 0)`}>
          <polyline
            points={`
              ${letterWidth * 0.05},${height * 0.85}
              ${letterWidth * 0.15},${height * 0.15}
              ${letterWidth * 0.35},${height * 0.55}
              ${letterWidth * 0.55},${height * 0.15}
              ${letterWidth * 0.75},${height * 0.85}
            `}
            fill="none"
            stroke="url(#timeGradient)"
            strokeWidth={height * 0.12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Consolidation zones (horizontal dashed lines) */}
          <line
            x1={letterWidth * 0.1}
            y1={height * 0.35}
            x2={letterWidth * 0.7}
            y2={height * 0.35}
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="3,2"
            opacity="0.5"
          />
          <line
            x1={letterWidth * 0.1}
            y1={height * 0.55}
            x2={letterWidth * 0.7}
            y2={height * 0.55}
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="3,2"
            opacity="0.5"
          />
        </g>

        {/* E - Support/Resistance Levels */}
        <g transform={`translate(${letterWidth * 2.95}, 0)`}>
          {/* Vertical bar */}
          <rect
            x="0"
            y={height * 0.1}
            width={letterWidth * 0.2}
            height={height * 0.8}
            rx="2"
            fill="url(#timeGradient)"
          />
          {/* Top horizontal (resistance) */}
          <rect
            x="0"
            y={height * 0.1}
            width={letterWidth * 0.65}
            height={height * 0.12}
            rx="2"
            fill="#ef4444"
            opacity="0.9"
          />
          {/* Middle horizontal */}
          <rect
            x="0"
            y={height * 0.44}
            width={letterWidth * 0.5}
            height={height * 0.12}
            rx="2"
            fill="url(#timeGradient)"
          />
          {/* Bottom horizontal (support) */}
          <rect
            x="0"
            y={height * 0.78}
            width={letterWidth * 0.65}
            height={height * 0.12}
            rx="2"
            fill="#22c55e"
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * TIME Icon (for favicon, small displays)
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
    }, 3000);

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
        <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="8" fill="#0f172a" />

      {/* Chart line (M pattern) */}
      <polyline
        points="4,22 8,10 12,18 16,8 20,20"
        fill="none"
        stroke="url(#iconGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Candlestick (I) */}
      <g className="transition-all duration-700">
        <line
          x1="24" y1="6"
          x2="24" y2="26"
          stroke={candleColor}
          strokeWidth="1.5"
          className="transition-all duration-700"
        />
        <rect
          x="21"
          y={isBullish ? 14 : 10}
          width="6"
          height="8"
          rx="1"
          fill={candleColor}
          className="transition-all duration-700"
        />
      </g>

      {/* Support/Resistance lines */}
      <line x1="2" y1="8" x2="18" y2="8" stroke="#ef4444" strokeWidth="1" opacity="0.4" strokeDasharray="2,1" />
      <line x1="2" y1="24" x2="18" y2="24" stroke="#22c55e" strokeWidth="1" opacity="0.4" strokeDasharray="2,1" />
    </svg>
  );
}

export default TimeLogo;
