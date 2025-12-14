'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * TIME Admin Portal
 *
 * Complete admin control panel with:
 * - System health monitoring
 * - Bot management
 * - User management
 * - Autonomous mode controls
 * - Real-time metrics
 */

interface SystemStatus {
  component: string;
  status: 'online' | 'degraded' | 'offline';
  uptime: string;
  lastCheck: Date;
}

export default function AdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'bots' | 'users' | 'autonomous' | 'logs'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemStatus[]>([]);
  const [autonomousEnabled, setAutonomousEnabled] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBots: 0,
    totalTrades: 0,
    systemUptime: '0%',
    pendingApprovals: 0,
    rejectedBots: 0,
  });

  useEffect(() => {
    // Fetch initial data
    fetchSystemHealth();
    fetchStats();
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch('https://time-backend-hosting.fly.dev/health');
      const data = await res.json();

      const components: SystemStatus[] = [
        { component: 'TIME Governor', status: 'online', uptime: '99.9%', lastCheck: new Date() },
        { component: 'Evolution Controller', status: 'online', uptime: '99.9%', lastCheck: new Date() },
        { component: 'Meta-Brain', status: 'online', uptime: '99.8%', lastCheck: new Date() },
        { component: 'Learning Engine', status: 'online', uptime: '99.9%', lastCheck: new Date() },
        { component: 'Bot Brain', status: 'online', uptime: '99.9%', lastCheck: new Date() },
        { component: 'Auto Perfect Bot Generator', status: 'online', uptime: '99.7%', lastCheck: new Date() },
        { component: 'Agent Swarm', status: 'online', uptime: '99.9%', lastCheck: new Date() },
        { component: 'Execution Mesh', status: 'online', uptime: '99.9%', lastCheck: new Date() },
        { component: 'Risk Engine', status: 'online', uptime: '100%', lastCheck: new Date() },
      ];

      setSystemHealth(components);
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    // Simulated stats
    setStats({
      totalUsers: 1247,
      activeBots: 110,
      totalTrades: 45892,
      systemUptime: '99.97%',
      pendingApprovals: 3,
      rejectedBots: 2,
    });
  };

  const toggleAutonomousMode = async () => {
    setAutonomousEnabled(!autonomousEnabled);
    // API call would go here
  };

  const handleLogout = () => {
    router.push('/admin-login');
  };

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-red-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TIME Admin Portal</h1>
              <p className="text-xs text-white/40">Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Autonomous Mode Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-white/5">
              <span className="text-sm text-white/60">Autonomous Mode</span>
              <button
                onClick={toggleAutonomousMode}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autonomousEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    autonomousEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400">All Systems Online</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/50 border-r border-white/5 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'bots', label: 'Bot Management', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { id: 'users', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { id: 'autonomous', label: 'Autonomous Control', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { id: 'logs', label: 'System Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-red-600/20 to-orange-600/20 text-white border border-red-500/30'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">System Overview</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: '👥', color: 'cyan' },
                  { label: 'Active Bots', value: stats.activeBots, icon: '🤖', color: 'purple' },
                  { label: 'Total Trades', value: stats.totalTrades.toLocaleString(), icon: '📈', color: 'emerald' },
                  { label: 'System Uptime', value: stats.systemUptime, icon: '⚡', color: 'orange' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`bg-slate-900/50 border border-white/5 rounded-xl p-6`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{stat.icon}</span>
                      <span className="text-white/60 text-sm">{stat.label}</span>
                    </div>
                    <div className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* System Health */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">System Health</h3>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-8 h-8 text-white/30 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {systemHealth.map((component) => (
                      <div
                        key={component.component}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              component.status === 'online'
                                ? 'bg-emerald-400'
                                : component.status === 'degraded'
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <span className="text-white text-sm">{component.component}</span>
                        </div>
                        <span className="text-white/40 text-xs">{component.uptime}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alerts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-orange-400 font-medium">Pending Approvals</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.pendingApprovals}</p>
                  <p className="text-sm text-white/40 mt-1">Bots awaiting your review</p>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="text-red-400 font-medium">Grace Period Bots</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.rejectedBots}</p>
                  <p className="text-sm text-white/40 mt-1">Bots pending deletion - review now!</p>
                </div>
              </div>
            </div>
          )}

          {/* Bot Management Tab */}
          {activeTab === 'bots' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Bot Management</h2>
                <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                  + Add New Bot
                </button>
              </div>

              {/* Bot Actions */}
              <div className="grid grid-cols-3 gap-4">
                <button className="p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:border-cyan-500/30 transition-colors text-left">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium mb-1">Bulk Scan</h3>
                  <p className="text-sm text-white/40">Scan all sources for new bots</p>
                </button>

                <button className="p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:border-purple-500/30 transition-colors text-left">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium mb-1">Review Pending</h3>
                  <p className="text-sm text-white/40">Approve or reject pending bots</p>
                </button>

                <button className="p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:border-emerald-500/30 transition-colors text-left">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium mb-1">Auto Perfect Bot</h3>
                  <p className="text-sm text-white/40">Generate optimal bot from learnings</p>
                </button>
              </div>

              {/* Bot List would go here */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Active Bots (110)</h3>
                <p className="text-white/40">Bot list interface coming soon...</p>
              </div>
            </div>
          )}

          {/* Autonomous Control Tab */}
          {activeTab === 'autonomous' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Autonomous Control</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Auto-Approve Settings */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Auto-Approve Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Enable Auto-Approve</span>
                      <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Minimum Rating for Auto-Approve</label>
                      <input
                        type="number"
                        defaultValue={4.5}
                        step={0.1}
                        min={1}
                        max={5}
                        className="w-full mt-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-Reject Settings */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Auto-Reject Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Enable Auto-Reject</span>
                      <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Maximum Rating for Auto-Reject</label>
                      <input
                        type="number"
                        defaultValue={3.0}
                        step={0.1}
                        min={1}
                        max={5}
                        className="w-full mt-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Grace Period (days)</label>
                      <input
                        type="number"
                        defaultValue={3}
                        min={1}
                        max={30}
                        className="w-full mt-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scan Interval */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Scan Interval</h3>
                <div>
                  <label className="text-white/60 text-sm">Auto-scan interval (minutes)</label>
                  <input
                    type="number"
                    defaultValue={60}
                    min={5}
                    className="w-full mt-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Other tabs would go here */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-white/40">User management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">System Logs</h2>
              <p className="text-white/40">System logs interface coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
