'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Network,
  Link2,
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Trade', href: '/trade', icon: ArrowRightLeft },
  { name: 'Broker Connect', href: '/brokers', icon: Link2 },
  { name: 'Execution Engine', href: '/execution', icon: Cpu },
  { name: 'Portfolio', href: '/portfolio', icon: Wallet },
  { name: 'Strategies', href: '/strategies', icon: Layers },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'DeFi', href: '/defi', icon: Coins },
  { name: 'Invest', href: '/invest', icon: PiggyBank },
  { name: 'Control Panel', href: '/admin', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Market Status */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Market Status</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Markets Open</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">NYSE: Open • NASDAQ: Open</p>
        </div>
      </div>
    </div>
  );
}
