'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Check if US stock market is open
function getMarketStatus(): { isOpen: boolean; status: string; detail: string } {
  const now = new Date();
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = etNow.getDay();
  const hours = etNow.getHours();
  const minutes = etNow.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) {
    return { isOpen: false, status: 'Closed', detail: 'Weekend' };
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (timeInMinutes >= 240 && timeInMinutes < 570) {
    return { isOpen: true, status: 'Pre-Market', detail: 'Pre-market trading' };
  }

  // Regular: 9:30 AM - 4:00 PM ET
  if (timeInMinutes >= 570 && timeInMinutes < 960) {
    return { isOpen: true, status: 'Open', detail: 'NYSE: Open • NASDAQ: Open' };
  }

  // After-hours: 4:00 PM - 8:00 PM ET
  if (timeInMinutes >= 960 && timeInMinutes < 1200) {
    return { isOpen: true, status: 'After-Hours', detail: 'Extended trading' };
  }

  // Closed
  return { isOpen: false, status: 'Closed', detail: 'Opens 9:30 AM ET' };
}

// Visited pages storage key
const VISITED_PAGES_KEY = 'time_visited_pages';

// Get visited pages from localStorage
function getVisitedPages(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(VISITED_PAGES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save visited page to localStorage
function markPageVisited(href: string): void {
  if (typeof window === 'undefined') return;
  try {
    const visited = getVisitedPages();
    visited.add(href);
    localStorage.setItem(VISITED_PAGES_KEY, JSON.stringify(Array.from(visited)));
  } catch {
    // Ignore storage errors
  }
}

import { TimeLogo, TimeIcon } from '@/components/branding/TimeLogo';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  ArrowRightLeft,
  Wallet,
  Layers,
  Bot,
  Coins,
  PiggyBank,
  Settings,
  Activity,
  Cpu,
  Link2,
  Bell,
  Zap,
  Play,
  Leaf,
  Target,
  Building2,
  Shield,
  Users,
  GraduationCap,
  Eye,
  History,
  Umbrella,
  Download,
  Crown,
  CreditCard,
  HeartPulse,
  Lock,
  Rocket,
  Brain,
  Landmark,
  Store,
  FlaskConical,
  Gift,
  Gem,
} from 'lucide-react';
import clsx from 'clsx';
import { TradingModeIndicator } from '@/components/trading/TradingModeToggle';

const navigation = [
  // Core
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Ultimate Money Machine', href: '/ultimate', icon: Gem, isNew: true, isPremium: true },
  { name: 'LIVE Bot Trading', href: '/live-trading', icon: Play, isNew: true },
  { name: 'Big Moves Alerts', href: '/alerts', icon: Bell, isNew: true },
  { name: 'AI Trade God', href: '/ai-trade-god', icon: Zap, isNew: true },
  { name: 'Bot Dropzone', href: '/dropzone', icon: Download, isNew: true },
  // Trading
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Trade', href: '/trade', icon: ArrowRightLeft },
  { name: 'Execution Engine', href: '/execution', icon: Cpu },
  { name: 'Trade History', href: '/history', icon: History },
  { name: 'Backtesting', href: '/backtest', icon: FlaskConical, isNew: true },
  // Investments
  { name: 'Portfolio', href: '/portfolio', icon: Wallet },
  { name: 'Strategies', href: '/strategies', icon: Layers },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Bot Marketplace', href: '/marketplace', icon: Store, isNew: true },
  { name: 'Social Trading', href: '/social', icon: Users },
  { name: 'Robo Advisor', href: '/robo', icon: Bot },
  { name: 'Invest', href: '/invest', icon: PiggyBank },
  { name: 'DeFi', href: '/defi', icon: Coins },
  // Analysis
  { name: 'AI Vision', href: '/vision', icon: Eye },
  { name: 'Risk Profile', href: '/risk', icon: Shield },
  { name: 'Learn', href: '/learn', icon: GraduationCap },
  // Connections
  { name: 'Broker Connect', href: '/brokers', icon: Link2 },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  // Wealth & Planning
  { name: 'Wealth Management', href: '/wealth', icon: Landmark, isNew: true },
  { name: 'Retirement', href: '/retirement', icon: Umbrella, isNew: true },
  { name: 'Account Transfers', href: '/transfers', icon: Building2, isNew: true },
  { name: 'Tax Optimization', href: '/tax', icon: Leaf, isNew: true },
  { name: 'Investment Goals', href: '/goals', icon: Target, isNew: true },
  // Settings & Admin
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Control Panel', href: '/admin', icon: Settings },
  { name: 'System Health', href: '/admin/health', icon: HeartPulse },
  { name: 'Admin Portal', href: '/admin-portal', icon: Crown, isNew: true },
  // Admin-Only Features
  { name: 'TIMEBEUNUS', href: '/timebeunus', icon: Brain, adminOnly: true },
  { name: 'DROPBOT AutoPilot', href: '/autopilot', icon: Rocket, adminOnly: true },
  { name: 'Gift Access', href: '/gift-access', icon: Gift, adminOnly: true, isNew: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set());

  // Load visited pages on mount
  useEffect(() => {
    setVisitedPages(getVisitedPages());
  }, []);

  // Mark current page as visited when pathname changes
  useEffect(() => {
    if (pathname) {
      markPageVisited(pathname);
      setVisitedPages(prev => {
        const next = new Set(prev);
        next.add(pathname);
        return next;
      });
    }
  }, [pathname]);

  // Update market status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if page should show NEW badge (isNew flag + not visited yet)
  const shouldShowNew = useCallback((item: typeof navigation[0]) => {
    return (item as any).isNew && !visitedPages.has(item.href);
  }, [visitedPages]);

  return (
    <div className="w-64 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <TimeIcon size={36} animated />
          <div>
            <TimeLogo size="sm" animated />
            <p className="text-[10px] text-slate-500 -mt-1">Meta-Intelligence</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const showNewBadge = shouldShowNew(item);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-time-primary/20 text-time-primary border border-time-primary/30'
                  : (item as any).adminOnly
                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30'
                  : showNewBadge
                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <item.icon className={clsx('w-5 h-5', (item as any).adminOnly && !isActive && 'text-red-400', (item as any).isPremium && !isActive && 'text-purple-400', showNewBadge && !isActive && !(item as any).isPremium && 'text-amber-400')} />
              {item.name}
              {(item as any).isPremium && (
                <span className="ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                  <Gem className="w-3 h-3" />
                  $59
                </span>
              )}
              {(item as any).adminOnly && (
                <span className="ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                  <Lock className="w-3 h-3" />
                  ADMIN
                </span>
              )}
              {showNewBadge && !(item as any).adminOnly && !(item as any).isPremium && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold animate-pulse">
                  NEW
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Trading Mode Indicator */}
      <div className="px-4 pt-4 border-t border-slate-700/50">
        <Link href="/settings" className="block">
          <div className="flex items-center justify-center mb-2">
            <TradingModeIndicator />
          </div>
          <p className="text-[10px] text-slate-500 text-center hover:text-slate-400 transition-colors">
            Click to change mode
          </p>
        </Link>
      </div>

      {/* Market Status */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Market Status</span>
            <span className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${marketStatus.isOpen ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-sm font-semibold text-white">{marketStatus.status}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{marketStatus.detail}</p>
        </div>
      </div>
    </div>
  );
}
