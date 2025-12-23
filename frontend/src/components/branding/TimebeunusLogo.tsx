'use client';

import { useState, useEffect } from 'react';

// ============================================
// TIMEBEUNUS BRAND TOKENS — THE DESTROYER
// ============================================
const DESTROYER = {
  colors: {
    core: '#f8fafc',         // White-hot plasma
    blade: '#8b5cf6',        // Purple
    crimson: '#dc2626',      // Crimson red
    cyan: '#06b6d4',         // Cyan
    arc: '#ff0033',          // Electric red
    void: '#000000',         // Void black
    background: '#0a0a0a',   // Near black
  },
};

interface TimebeunusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  mode?: 'default' | 'stealth' | 'aggressive' | 'destroy';
  className?: string;
}

/**
 * TIMEBEUNUS Logo — "The Fang Singularity"
 *
 * The Destroyer Mark:
 * - Central Core: White-hot plasma column
 * - Twin Blades: Purple → crimson → cyan gradient
 * - Orbit Arcs: Electric red satellites (multi-agent swarm)
 * - Fractured Base: Breaking the market
 */
export function TimebeunusLogo({
  size = 'md',
  animated = true,
  mode = 'default',
  className = ''
}: TimebeunusLogoProps) {
  const [pulsePhase, setPulsePhase] = useState(0);
  const [orbitAngle, setOrbitAngle] = useState(0);

  // Reactor pulse animation
  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 12); // Fast pulse for aggressive feel
    return () => clearInterval(interval);
  }, [animated]);

  // Orbit animation
  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setOrbitAngle(prev => (prev + 2) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [animated]);

  const sizes = {
    sm: { width: 40, height: 48 },
    md: { width: 60, height: 72 },
    lg: { width: 90, height: 108 },
    xl: { width: 120, height: 144 },
  };

  const { width, height } = sizes[size];
  const centerX = width / 2;
  const centerY = height / 2;

  // Mode-based colors
  const modeColors = {
    default: { core: '#f8fafc', arc: '#ff0033', glow: '#8b5cf6' },
    stealth: { core: '#6366f1', arc: '#4c1d95', glow: '#1e1b4b' },
    aggressive: { core: '#fef2f2', arc: '#ff0033', glow: '#dc2626' },
    destroy: { core: '#ffffff', arc: '#ff0033', glow: '#f8fafc' },
  };

  const colors = modeColors[mode];
  const pulseScale = 1 + Math.sin(pulsePhase * 0.1) * 0.05;
  const glowIntensity = mode === 'destroy' ? 6 : mode === 'aggressive' ? 4 : 3;

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          {/* Destroyer gradient (purple → crimson → cyan) */}
          <linearGradient id="destroyerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Core plasma gradient */}
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.core} />
            <stop offset="70%" stopColor={colors.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Reactor glow filter */}
          <filter id="reactorGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={glowIntensity} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arc glow */}
          <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Chromatic aberration */}
          <filter id="chromatic" x="-10%" y="-10%" width="120%" height="120%">
            <feOffset in="SourceGraphic" dx="-1" dy="0" result="red">
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
            </feOffset>
            <feOffset in="SourceGraphic" dx="1" dy="0" result="cyan">
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
            </feOffset>
            <feBlend in="red" in2="cyan" mode="screen" />
          </filter>
        </defs>

        {/* Background void */}
        <rect x="0" y="0" width={width} height={height} fill="transparent" />

        {/* Orbit Arcs (Multi-agent swarm) */}
        {animated && (
          <g transform={`rotate(${orbitAngle}, ${centerX}, ${centerY})`}>
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={width * 0.45}
              ry={height * 0.35}
              fill="none"
              stroke={colors.arc}
              strokeWidth="1.5"
              strokeDasharray="4,8"
              opacity="0.7"
              filter="url(#arcGlow)"
            />
          </g>
        )}
        {animated && (
          <g transform={`rotate(${-orbitAngle * 0.7}, ${centerX}, ${centerY})`}>
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={width * 0.38}
              ry={height * 0.28}
              fill="none"
              stroke={colors.arc}
              strokeWidth="1"
              strokeDasharray="3,6"
              opacity="0.5"
              filter="url(#arcGlow)"
            />
          </g>
        )}

        {/* THE FANG */}
        <g
          transform={`translate(${centerX}, ${centerY}) scale(${pulseScale})`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Left blade */}
          <path
            d={`
              M ${-width * 0.15} ${height * 0.35}
              L ${-width * 0.02} ${-height * 0.4}
              L ${-width * 0.02} ${height * 0.35}
              Z
            `}
            fill="url(#destroyerGrad)"
            filter="url(#reactorGlow)"
          />

          {/* Right blade */}
          <path
            d={`
              M ${width * 0.15} ${height * 0.35}
              L ${width * 0.02} ${-height * 0.4}
              L ${width * 0.02} ${height * 0.35}
              Z
            `}
            fill="url(#destroyerGrad)"
            filter="url(#reactorGlow)"
          />

          {/* Central core */}
          <ellipse
            cx="0"
            cy="0"
            rx={width * 0.08}
            ry={height * 0.12}
            fill="url(#coreGrad)"
            filter="url(#reactorGlow)"
          />

          {/* Core hotspot */}
          <ellipse
            cx="0"
            cy="0"
            rx={width * 0.03}
            ry={height * 0.05}
            fill={colors.core}
            opacity={0.9 + Math.sin(pulsePhase * 0.2) * 0.1}
          />

          {/* Fractured base */}
          <g opacity={mode === 'destroy' ? 1 : 0.6}>
            <line
              x1={-width * 0.12}
              y1={height * 0.32}
              x2={-width * 0.08}
              y2={height * 0.38}
              stroke={colors.arc}
              strokeWidth="1"
            />
            <line
              x1={width * 0.12}
              y1={height * 0.32}
              x2={width * 0.08}
              y2={height * 0.38}
              stroke={colors.arc}
              strokeWidth="1"
            />
            <line
              x1="0"
              y1={height * 0.35}
              x2="0"
              y2={height * 0.4}
              stroke={colors.arc}
              strokeWidth="1.5"
            />
          </g>
        </g>

        {/* Shockwave (destroy mode only) */}
        {mode === 'destroy' && animated && (
          <circle
            cx={centerX}
            cy={centerY}
            r={width * 0.4 + (pulsePhase % 50) * 0.5}
            fill="none"
            stroke={colors.arc}
            strokeWidth="1"
            opacity={1 - (pulsePhase % 50) / 50}
          />
        )}
      </svg>
    </div>
  );
}

/**
 * TIMEBEUNUS Icon — "The Fang Core Icon"
 *
 * 32x32 favicon version:
 * - Single glowing fang
 * - White-hot core
 * - Red outer glow
 */
export function TimebeunusIcon({
  size = 32,
  animated = true,
  mode = 'default',
  className = ''
}: {
  size?: number;
  animated?: boolean;
  mode?: 'default' | 'stealth' | 'aggressive' | 'destroy';
  className?: string;
}) {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 20);
    return () => clearInterval(interval);
  }, [animated]);

  const modeColors = {
    default: { core: '#f8fafc', glow: '#8b5cf6', arc: '#ff0033' },
    stealth: { core: '#6366f1', glow: '#1e1b4b', arc: '#4c1d95' },
    aggressive: { core: '#fef2f2', glow: '#dc2626', arc: '#ff0033' },
    destroy: { core: '#ffffff', glow: '#f8fafc', arc: '#ff0033' },
  };

  const colors = modeColors[mode];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      <defs>
        <linearGradient id="fangGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="fangGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="fangCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.core} />
          <stop offset="100%" stopColor={colors.glow} />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="6" fill="#0a0a0a" />

      {/* Orbit arc */}
      {animated && (
        <ellipse
          cx="16"
          cy="16"
          rx="12"
          ry="8"
          fill="none"
          stroke={colors.arc}
          strokeWidth="1"
          strokeDasharray="3,4"
          opacity="0.5"
          transform={`rotate(${pulsePhase * 3.6}, 16, 16)`}
        />
      )}

      {/* Fang */}
      <path
        d="M 12 24 L 16 4 L 20 24 Z"
        fill="url(#fangGrad)"
        filter="url(#fangGlow)"
      />

      {/* Core */}
      <ellipse
        cx="16"
        cy="14"
        rx="3"
        ry="5"
        fill="url(#fangCore)"
        opacity={0.9 + Math.sin(pulsePhase * 0.15) * 0.1}
      />

      {/* Core hotspot */}
      <ellipse
        cx="16"
        cy="14"
        rx="1.5"
        ry="2.5"
        fill={colors.core}
      />

      {/* Fracture lines */}
      <g opacity="0.6">
        <line x1="14" y1="22" x2="13" y2="25" stroke={colors.arc} strokeWidth="0.5" />
        <line x1="18" y1="22" x2="19" y2="25" stroke={colors.arc} strokeWidth="0.5" />
      </g>
    </svg>
  );
}

/**
 * TIMEBEUNUS Wordmark
 *
 * The full "TIMEBEUNUS" text treatment
 */
export function TimebeunusWordmark({
  size = 'md',
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const fontSizes = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2.5rem',
  };

  return (
    <div
      className={`font-bold tracking-wider ${className}`}
      style={{
        fontSize: fontSizes[size],
        background: 'linear-gradient(90deg, #dc2626, #8b5cf6, #06b6d4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '0.15em',
      }}
    >
      TIMEBEUNUS
    </div>
  );
}

export default TimebeunusLogo;
