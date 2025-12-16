'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, User, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useTimeStore } from '@/store/timeStore';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';

// Health endpoint is at root level, not under /api/v1
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

export function TopNav() {
  const { regime, evolutionMode, isConnected, setConnected } = useTimeStore();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check connection on mount and periodically
  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setConnected(response.ok);
      return response.ok;
    } catch {
      setConnected(false);
      return false;
    }
  }, [setConnected]);

  // Check connection on mount and every 30 seconds
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Reconnect handler
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      const success = await checkConnection();
      if (!success) {
        // Try once more after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        await checkConnection();
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  const getRegimeIcon = () => {
    if (regime?.includes('up')) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (regime?.includes('down')) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-blue-400" />;
  };

  const getRegimeColor = () => {
    if (regime?.includes('up')) return 'text-green-400 bg-green-400/10';
    if (regime?.includes('down')) return 'text-red-400 bg-red-400/10';
    if (regime?.includes('volatility')) return 'text-orange-400 bg-orange-400/10';
    return 'text-blue-400 bg-blue-400/10';
  };

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        {/* Global Search Bar - Real Market Data */}
        <GlobalSearchBar />

        {/* Market Regime Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getRegimeColor()}`}>
          {getRegimeIcon()}
          <span className="text-sm font-medium capitalize">
            {regime?.replace(/_/g, ' ') || 'Unknown Regime'}
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Connection Status with Reconnect Button */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isReconnecting ? 'Reconnecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {!isConnected && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="ml-1 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all disabled:opacity-50"
              title="Reconnect to server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Time */}
        <div className="text-sm text-slate-400" suppressHydrationWarning>
          {mounted ? currentTime : '--:--:--'}
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-time-danger rounded-full"></span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-700/50">
          <div className="text-right">
            <div className="text-sm font-medium text-white">Timebeunus</div>
            <div className="text-xs text-slate-400">Admin</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
