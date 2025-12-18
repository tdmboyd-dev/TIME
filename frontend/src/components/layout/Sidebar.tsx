'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import { TradingModeIndicator } from '@/components/trading/TradingModeToggle';

const navigation = [
  // Core
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'LIVE Bot Trading', href: '/live-trading', icon: Play, highlight: true },
  { name: 'Big Moves Alerts', href: '/alerts', icon: Bell, highlight: true },
  { name: 'AI Trade God', href: '/ai-trade-god', icon: Zap, highlight: true },
  { name: 'Bot Dropzone', href: '/dropzone', icon: Download, highlight: true },
  // Trading
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Trade', href: '/trade', icon: ArrowRightLeft },
  { name: 'Execution Engine', href: '/execution', icon: Cpu },
  { name: 'Trade History', href: '/history', icon: History },
  // Investments
  { name: 'Portfolio', href: '/portfolio', icon: Wallet },
  { name: 'Strategies', href: '/strategies', icon: Layers },
  { name: 'Bots', href: '/bots', icon: Bot },
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
  // Vanguard Features
  { name: 'Retirement', href: '/retirement', icon: Umbrella, highlight: true },
  { name: 'Account Transfers', href: '/transfers', icon: Building2, highlight: true },
  { name: 'Tax Optimization', href: '/tax', icon: Leaf, highlight: true },
  { name: 'Investment Goals', href: '/goals', icon: Target, highlight: true },
  // Settings & Admin
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Control Panel', href: '/admin', icon: Settings },
  { name: 'System Health', href: '/admin/health', icon: HeartPulse },
  { name: 'Admin Portal', href: '/admin-portal', icon: Crown, highlight: true },
  // Admin-Only Features
  { name: 'TIMEBEUNUS', href: '/timebeunus', icon: Brain, adminOnly: true },
  { name: 'DROPBOT AutoPilot', href: '/autopilot', icon: Rocket, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  // Update market status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-64 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">TIME</h1>
            <p className="text-xs text-slate-400">Meta-Intelligence</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
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
                  : (item as any).highlight
                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <item.icon className={clsx('w-5 h-5', (item as any).adminOnly && !isActive && 'text-red-400', (item as any).highlight && !isActive && 'text-amber-400')} />
              {item.name}
              {(item as any).adminOnly && (
                <span className="ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                  <Lock className="w-3 h-3" />
                  ADMIN
                </span>
              )}
              {(item as any).highlight && !(item as any).adminOnly && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
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
