'use client';

import { useState, useEffect } from 'react';
import { Bell, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTimeStore } from '@/store/timeStore';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';

export function TopNav() {
  const { regime, evolutionMode, isConnected } = useTimeStore();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-xs text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
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
