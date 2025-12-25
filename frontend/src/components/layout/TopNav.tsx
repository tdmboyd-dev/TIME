'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, User, TrendingUp, TrendingDown, Minus, RefreshCw, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useTimeStore } from '@/store/timeStore';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { TradingModeIndicator } from '@/components/TradingModeIndicator';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Health endpoint is at root level, not under /api/v1
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

export function TopNav() {
  const { regime, evolutionMode, isConnected, setConnected } = useTimeStore();
  const { unreadCount } = useNotifications();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logout handler
  const handleLogout = () => {
    // Clear all auth cookies
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    Cookies.remove('userRole');
    // Redirect to login
    router.push('/login');
  };

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
        {/* Trading Mode Indicator - Paper/Live */}
        <TradingModeIndicator compact showToggle />

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
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 text-slate-400 hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Dropdown */}
        <div className="relative pl-4 border-l border-slate-700/50" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-white">Timebeunus</div>
              <div className="text-xs text-slate-400">Admin</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/settings');
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="border-t border-slate-700 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
