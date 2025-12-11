'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Layers,
  GraduationCap,
  History,
  Settings,
  Shield,
  Activity,
  Cpu
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Strategies', href: '/strategies', icon: Layers },
  { name: 'Learn', href: '/learn', icon: GraduationCap },
  { name: 'History', href: '/history', icon: History },
  { name: 'Market Vision', href: '/vision', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
  { name: 'System Health', href: '/admin/health', icon: Cpu },
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Main
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
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

        {/* Admin Section */}
        <div className="pt-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Admin
          </div>
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href;
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
        </div>
      </nav>

      {/* Evolution Mode Indicator */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Evolution Mode</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>
          <div className="text-sm font-semibold text-white">Controlled</div>
          <p className="text-xs text-slate-500 mt-1">Admin approval required</p>
        </div>
      </div>
    </div>
  );
}
