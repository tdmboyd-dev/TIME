'use client';

/**
 * Connection Status Component
 *
 * Displays WebSocket/API connection status with reconnect button.
 * Shows in top-right corner when there are connection issues.
 */

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

interface ConnectionStatusProps {
  /** Custom className for positioning */
  className?: string;
  /** Always show, even when connected */
  alwaysShow?: boolean;
  /** WebSocket connection state from useWebSocket hook */
  wsConnected?: boolean;
  /** WebSocket reconnect function */
  wsReconnect?: () => void;
  /** WebSocket error message */
  wsError?: string | null;
}

export default function ConnectionStatus({
  className = '',
  alwaysShow = false,
  wsConnected,
  wsReconnect,
  wsError,
}: ConnectionStatusProps) {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Check API connection
  const checkApiConnection = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setApiConnected(response.ok);
    } catch (error) {
      setApiConnected(false);
    } finally {
      setIsChecking(false);
      setLastCheck(new Date());
    }
  };

  // Initial check and periodic checks
  useEffect(() => {
    checkApiConnection();

    // Check every 30 seconds
    const interval = setInterval(checkApiConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  // Determine overall status
  const isFullyConnected = apiConnected === true && (wsConnected === undefined || wsConnected === true);
  const hasIssue = apiConnected === false || wsConnected === false || wsError;

  // Handle reconnect
  const handleReconnect = async () => {
    // Reconnect API
    await checkApiConnection();

    // Reconnect WebSocket if provided
    if (wsReconnect) {
      wsReconnect();
    }
  };

  // Don't show if fully connected and not set to always show
  if (isFullyConnected && !alwaysShow) {
    return null;
  }

  return (
    <div className={`fixed z-50 ${className || 'top-4 right-4'}`}>
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-sm border shadow-lg
        ${isFullyConnected
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : hasIssue
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}
      `}>
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`
            w-2.5 h-2.5 rounded-full
            ${isFullyConnected
              ? 'bg-emerald-400 animate-pulse'
              : hasIssue
                ? 'bg-red-400 animate-pulse'
                : 'bg-yellow-400 animate-pulse'}
          `} />

          <span className="text-sm font-medium">
            {isChecking
              ? 'Checking...'
              : isFullyConnected
                ? 'Connected'
                : hasIssue
                  ? 'Disconnected'
                  : 'Connecting...'}
          </span>
        </div>

        {/* Status Details */}
        <div className="flex items-center gap-2 text-xs opacity-70">
          {/* API Status */}
          <span className={`flex items-center gap-1 ${apiConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2zM2 9a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1v-1a1 1 0 00-1-1H2zM2 15a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1v-1a1 1 0 00-1-1H2z" />
            </svg>
            API
          </span>

          {wsConnected !== undefined && (
            <span className={`flex items-center gap-1 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              WS
            </span>
          )}
        </div>

        {/* Reconnect Button */}
        {hasIssue && (
          <button
            onClick={handleReconnect}
            disabled={isChecking}
            className="
              ml-2 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-white/10 hover:bg-white/20 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-1.5
            "
          >
            <svg
              className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isChecking ? 'Reconnecting...' : 'Reconnect'}
          </button>
        )}

        {/* Error Message */}
        {wsError && (
          <span className="text-xs text-red-400/70 ml-2 max-w-[200px] truncate">
            {wsError}
          </span>
        )}
      </div>

      {/* Last Check Time */}
      {lastCheck && (
        <div className="mt-1 text-right text-[10px] text-white/30">
          Last checked: {lastCheck.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * Compact connection indicator for use in headers/navbars
 */
export function ConnectionIndicator({
  connected,
  onClick,
}: {
  connected: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
        ${connected
          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}
      `}
      title={connected ? 'Connected' : 'Disconnected - Click to reconnect'}
    >
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
      {connected ? 'Live' : 'Offline'}
    </button>
  );
}
