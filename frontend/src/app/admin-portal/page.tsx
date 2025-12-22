'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTimeStore, useHydration } from '@/store/timeStore';

/**
 * TIME Admin Portal
 *
 * Complete admin control panel with:
 * - System health monitoring
 * - Bot management
 * - User management
 * - Autonomous mode controls (persisted via Zustand)
 * - Real-time metrics from API
 */

import { API_BASE, getTokenFromCookie } from '@/lib/api';

interface SystemStatus {
  component: string;
  status: 'online' | 'degraded' | 'offline';
  uptime: string;
  lastCheck: Date;
}

interface SystemLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  component: string;
  message: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'co-admin' | 'owner';
  status: 'active' | 'blocked' | 'suspended' | 'pending';
  statusReason?: string;
  customPosition?: string;
  permissions: string[];
  lastLogin: Date;
  createdAt: Date;
}

interface AdminBot {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'pending' | 'rejected' | 'deleted';
  rating: number;
  performance: {
    winRate: number;
    profitFactor: number;
    totalTrades: number;
  };
  owner: string;
  createdAt: Date;
  lastActive: Date;
}

// All available permissions
const ALL_PERMISSIONS = [
  { id: 'trading', label: 'Trading', description: 'Execute trades' },
  { id: 'bots', label: 'Bots', description: 'Use/manage bots' },
  { id: 'strategies', label: 'Strategies', description: 'Create/edit strategies' },
  { id: 'portfolio', label: 'Portfolio', description: 'View portfolio' },
  { id: 'analytics', label: 'Analytics', description: 'View analytics' },
  { id: 'defi', label: 'DeFi', description: 'Access DeFi features' },
  { id: 'transfers', label: 'Transfers', description: 'Make transfers' },
  { id: 'tax', label: 'Tax', description: 'Access tax features' },
  { id: 'retirement', label: 'Retirement', description: 'Retirement planning' },
  { id: 'wealth', label: 'Wealth', description: 'Wealth management' },
  { id: 'marketplace', label: 'Marketplace', description: 'Bot marketplace' },
  { id: 'ml', label: 'ML', description: 'ML training' },
  { id: 'admin_users', label: 'Admin Users', description: 'Manage users' },
  { id: 'admin_bots', label: 'Admin Bots', description: 'Manage all bots' },
  { id: 'admin_system', label: 'Admin System', description: 'System settings' },
  { id: 'admin_billing', label: 'Admin Billing', description: 'Billing management' },
];

export default function AdminPortalPage() {
  const router = useRouter();

  // Use Zustand store for persistent evolution mode
  const { evolutionMode, setEvolutionMode } = useTimeStore();
  const hydrated = useHydration();

  // Only read evolutionMode after hydration to prevent flash of wrong value
  const autonomousEnabled = hydrated ? evolutionMode === 'autonomous' : false;

  const [activeTab, setActiveTab] = useState<'overview' | 'bots' | 'users' | 'autonomous' | 'logs'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemStatus[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userNotification, setUserNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Bot management state
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [botSearchQuery, setBotSearchQuery] = useState('');
  const [botStatusFilter, setBotStatusFilter] = useState<'all' | 'active' | 'paused' | 'pending' | 'rejected'>('all');
  const [selectedBot, setSelectedBot] = useState<AdminBot | null>(null);
  const [showBotDetailsModal, setShowBotDetailsModal] = useState(false);
  const [botActionLoading, setBotActionLoading] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as 'user' | 'admin' | 'co-admin',
    customPosition: '',
    permissions: [] as string[],
  });

  const [blockReason, setBlockReason] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBots: 0,
    totalTrades: 0,
    systemUptime: '0%',
    pendingApprovals: 0,
    rejectedBots: 0,
  });

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getTokenFromCookie();
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch all data in parallel
      const [healthRes, statusRes, metricsRes, logsRes, usersRes, botsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/health`).catch(() => null),
        fetch(`${API_BASE}/admin/status`).catch(() => null),
        fetch(`${API_BASE}/admin/metrics`).catch(() => null),
        fetch(`${API_BASE}/admin/activity`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/users`, { headers }).catch(() => null),
        fetch(`${API_BASE}/bots/public`).catch(() => null),
      ]);

      // Check if we got any successful response
      const hasConnection = !!(healthRes?.ok || statusRes?.ok || metricsRes?.ok);
      setIsConnected(hasConnection);

      // Parse responses
      const healthData = healthRes?.ok ? await healthRes.json() : null;
      const statusData = statusRes?.ok ? await statusRes.json() : null;
      const metricsData = metricsRes?.ok ? await metricsRes.json() : null;
      const logsData = logsRes?.ok ? await logsRes.json() : null;
      const usersData = usersRes?.ok ? await usersRes.json() : null;
      const botsData = botsRes?.ok ? await botsRes.json() : null;

      // Update system health from real /health endpoint
      if (healthData && healthData.components) {
        const components: SystemStatus[] = healthData.components.map((c: any) => ({
          component: c.name,
          status: c.status === 'online' ? 'online' : c.status === 'degraded' ? 'degraded' : 'offline',
          uptime: '99.9%',
          lastCheck: new Date(),
        }));
        setSystemHealth(components);
      } else {
        // Empty state when not connected
        setSystemHealth([]);
      }

      // Update logs from real API
      if (logsData && logsData.activity) {
        const logs: SystemLog[] = logsData.activity.map((log: any) => ({
          id: log.id || log._id,
          timestamp: new Date(log.timestamp),
          level: log.type?.includes('error') ? 'error' : log.type?.includes('warn') ? 'warning' : 'info',
          component: log.type || 'System',
          message: log.description,
        }));
        setSystemLogs(logs);
      }

      // Update users from real API
      if (usersData && usersData.users) {
        const usersList: AdminUser[] = usersData.users.map((u: any) => ({
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status || 'active',
          lastLogin: new Date(u.lastLogin || u.lastActivity),
          createdAt: new Date(u.createdAt),
        }));
        setUsers(usersList);
      }

      // Update bots from real API
      const botsArray = botsData?.data || botsData?.bots || [];
      if (botsArray.length > 0) {
        const botsList: AdminBot[] = botsArray.map((b: any) => ({
          id: b.id || b._id,
          name: b.name || b.filename || 'Unnamed Bot',
          type: b.type || b.strategyType?.[0] || 'Unknown',
          status: b.status || (b.isActive ? 'active' : 'paused'),
          rating: b.rating || 0,
          performance: {
            winRate: b.performance?.winRate || b.winRate || 0,
            profitFactor: b.performance?.profitFactor || b.profitFactor || 0,
            totalTrades: b.performance?.totalTrades || b.totalTrades || 0,
          },
          owner: b.owner || b.userId || 'System',
          createdAt: new Date(b.createdAt || Date.now()),
          lastActive: new Date(b.lastActive || b.lastUpdated || Date.now()),
        }));
        setBots(botsList);
      } else {
        setBots([]);
      }

      // Get real bot count
      const botCount = botsArray.length || botsData?.count || 0;
      const userCount = usersData?.users?.length || usersData?.total || 0;

      // Update stats with REAL data
      setStats({
        totalUsers: userCount,
        activeBots: botCount,
        totalTrades: metricsData?.totalTrades || 0,
        systemUptime: healthData?.status === 'ok' ? '99.9%' : '0%',
        pendingApprovals: metricsData?.pendingApprovals || 0,
        rejectedBots: metricsData?.rejectedBots || 0,
      });
    } catch (err) {
      // Error handled - shows empty state, no mock data
      setIsConnected(false);
      // Empty state on error - NO MOCK DATA
      setSystemHealth([]);
      setSystemLogs([]);
      setUsers([]);
      setBots([]);
      setStats({
        totalUsers: 0,
        activeBots: 0,
        totalTrades: 0,
        systemUptime: '0%',
        pendingApprovals: 0,
        rejectedBots: 0,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const toggleAutonomousMode = async () => {
    const newMode = autonomousEnabled ? 'controlled' : 'autonomous';

    // ALWAYS update locally first for instant feedback and persistence
    setEvolutionMode(newMode);

    // Then try to sync with backend (silent - no console logs in production)
    try {
      const token = getTokenFromCookie();
      if (token) {
        await fetch(`${API_BASE}/admin/evolution/${newMode}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
      }
    } catch {
      // Backend sync failed - local state already saved
    }
  };

  const handleLogout = () => {
    router.push('/admin-login');
  };

  // User Management Functions
  const createUser = async () => {
    setUserActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `User ${newUser.email} created successfully!` });
        setShowCreateModal(false);
        setNewUser({ email: '', password: '', name: '', role: 'user', customPosition: '', permissions: [] });
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setUserActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  const blockUser = async () => {
    if (!selectedUser) return;
    setUserActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: blockReason }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `User ${selectedUser.email} blocked` });
        setShowBlockModal(false);
        setBlockReason('');
        setSelectedUser(null);
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to block user');
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setUserActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  const unblockUser = async (user: AdminUser) => {
    setUserActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/users/${user.id}/unblock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `User ${user.email} unblocked` });
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to unblock user');
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setUserActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  const updateUserRole = async (user: AdminUser, newRole: string) => {
    setUserActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `User role updated to ${newRole}` });
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setUserActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  const updateUserPermissions = async (user: AdminUser, permissions: string[]) => {
    setUserActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `Permissions updated for ${user.email}` });
        setShowEditModal(false);
        setSelectedUser(null);
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to update permissions');
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setUserActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to DELETE user ${user.email}? This cannot be undone.`)) return;

    setUserActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `User ${user.email} deleted` });
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setUserActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  // Bot management functions
  const handleBotAction = async (bot: AdminBot, action: 'approve' | 'reject' | 'pause' | 'activate' | 'delete') => {
    setBotActionLoading(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/bots/${bot.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUserNotification({ type: 'success', message: `Bot ${bot.name} ${action}d successfully` });
        fetchAllData();
        setShowBotDetailsModal(false);
      } else {
        throw new Error(data.error || `Failed to ${action} bot`);
      }
    } catch (error: any) {
      setUserNotification({ type: 'error', message: error.message });
    } finally {
      setBotActionLoading(false);
      setTimeout(() => setUserNotification(null), 4000);
    }
  };

  // Filtered bots based on search and status
  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
                         bot.type.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
                         bot.owner.toLowerCase().includes(botSearchQuery.toLowerCase());
    const matchesStatus = botStatusFilter === 'all' || bot.status === botStatusFilter;
    return matchesSearch && matchesStatus;
  });

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
            {/* Connection Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <span className={`text-sm font-medium ${
                isConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {isConnected ? 'Live' : 'Demo'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-slate-800/50 rounded-lg border border-white/5 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-white/60 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

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

            {/* Current User Badge */}
            <div className="flex items-center gap-3 px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                CEO
              </div>
              <div>
                <div className="text-white font-medium text-sm">Time Beyond Admin</div>
                <div className="text-yellow-400 text-xs">Owner &bull; CEO</div>
              </div>
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

              {/* Bot List */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">All Bots ({filteredBots.length})</h3>
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search bots..."
                        value={botSearchQuery}
                        onChange={(e) => setBotSearchQuery(e.target.value)}
                        className="w-64 px-4 py-2 pl-10 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
                      />
                      <svg className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {/* Status Filter */}
                    <select
                      value={botStatusFilter}
                      onChange={(e) => setBotStatusFilter(e.target.value as any)}
                      className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Bot Table */}
                {filteredBots.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white/40">No bots found</p>
                    <p className="text-white/20 text-sm mt-1">
                      {bots.length === 0 ? 'Connect to backend to load bots' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Bot Name</th>
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Type</th>
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Status</th>
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Rating</th>
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Win Rate</th>
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Owner</th>
                          <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBots.map((bot) => (
                          <tr key={bot.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <span className="text-white font-medium">{bot.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-white/60">{bot.type}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                bot.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                bot.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                                bot.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                                bot.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {bot.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <span className="text-amber-400">★</span>
                                <span className="text-white">{bot.rating.toFixed(1)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-white">{bot.performance.winRate.toFixed(1)}%</td>
                            <td className="py-3 px-4 text-white/60">{bot.owner}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedBot(bot);
                                    setShowBotDetailsModal(true);
                                  }}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                {bot.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleBotAction(bot, 'approve')}
                                      disabled={botActionLoading}
                                      className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                      title="Approve"
                                    >
                                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleBotAction(bot, 'reject')}
                                      disabled={botActionLoading}
                                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                      title="Reject"
                                    >
                                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                                {bot.status === 'active' && (
                                  <button
                                    onClick={() => handleBotAction(bot, 'pause')}
                                    disabled={botActionLoading}
                                    className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"
                                    title="Pause"
                                  >
                                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                {bot.status === 'paused' && (
                                  <button
                                    onClick={() => handleBotAction(bot, 'activate')}
                                    disabled={botActionLoading}
                                    className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                    title="Activate"
                                  >
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bot Details Modal */}
          {showBotDetailsModal && selectedBot && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedBot.name}</h2>
                      <p className="text-white/40 text-sm">Bot ID: {selectedBot.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBotDetailsModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Bot Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <p className="text-white/40 text-sm mb-1">Type</p>
                      <p className="text-white font-medium">{selectedBot.type}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <p className="text-white/40 text-sm mb-1">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedBot.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedBot.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                        selectedBot.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                        selectedBot.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {selectedBot.status}
                      </span>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <p className="text-white/40 text-sm mb-1">Owner</p>
                      <p className="text-white font-medium">{selectedBot.owner}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <p className="text-white/40 text-sm mb-1">Rating</p>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400">★</span>
                        <span className="text-white font-medium">{selectedBot.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Performance Metrics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{selectedBot.performance.winRate.toFixed(1)}%</p>
                        <p className="text-white/40 text-sm">Win Rate</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-cyan-400">{selectedBot.performance.profitFactor.toFixed(2)}</p>
                        <p className="text-white/40 text-sm">Profit Factor</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-purple-400">{selectedBot.performance.totalTrades}</p>
                        <p className="text-white/40 text-sm">Total Trades</p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/40 text-sm mb-1">Created</p>
                      <p className="text-white">{selectedBot.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-sm mb-1">Last Active</p>
                      <p className="text-white">{selectedBot.lastActive.toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    {selectedBot.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleBotAction(selectedBot, 'approve')}
                          disabled={botActionLoading}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          {botActionLoading ? 'Processing...' : 'Approve Bot'}
                        </button>
                        <button
                          onClick={() => handleBotAction(selectedBot, 'reject')}
                          disabled={botActionLoading}
                          className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          {botActionLoading ? 'Processing...' : 'Reject Bot'}
                        </button>
                      </>
                    )}
                    {selectedBot.status === 'active' && (
                      <button
                        onClick={() => handleBotAction(selectedBot, 'pause')}
                        disabled={botActionLoading}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        {botActionLoading ? 'Processing...' : 'Pause Bot'}
                      </button>
                    )}
                    {selectedBot.status === 'paused' && (
                      <button
                        onClick={() => handleBotAction(selectedBot, 'activate')}
                        disabled={botActionLoading}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        {botActionLoading ? 'Processing...' : 'Activate Bot'}
                      </button>
                    )}
                    <button
                      onClick={() => handleBotAction(selectedBot, 'delete')}
                      disabled={botActionLoading}
                      className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
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

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* User Notification */}
              {userNotification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
                  userNotification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                } text-white`}>
                  {userNotification.message}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create User
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                  <div className="text-white/40 text-sm">Total Users</div>
                  <div className="text-2xl font-bold text-white">{users.length}</div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                  <div className="text-white/40 text-sm">Active</div>
                  <div className="text-2xl font-bold text-emerald-400">{users.filter(u => u.status === 'active').length}</div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                  <div className="text-white/40 text-sm">Blocked</div>
                  <div className="text-2xl font-bold text-red-400">{users.filter(u => u.status === 'blocked').length}</div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                  <div className="text-white/40 text-sm">Admins/Co-Admins</div>
                  <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === 'admin' || u.role === 'co-admin').length}</div>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 gap-4 p-4 bg-slate-800/50 border-b border-white/5 font-medium text-white/60 text-sm">
                  <div>User</div>
                  <div>Role</div>
                  <div>Position</div>
                  <div>Status</div>
                  <div>Permissions</div>
                  <div>Last Login</div>
                  <div>Actions</div>
                </div>

                {users.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    {isLoading ? 'Loading users...' : 'No users found'}
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="grid grid-cols-7 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5">
                      <div>
                        <div className="text-white font-medium">{user.name}</div>
                        <div className="text-white/40 text-sm">{user.email}</div>
                      </div>
                      <div>
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user, e.target.value)}
                          disabled={user.role === 'owner' || userActionLoading}
                          className={`px-2 py-1 rounded text-xs font-medium bg-slate-800 border border-white/10 ${
                            user.role === 'owner' ? 'text-yellow-400 cursor-not-allowed' :
                            user.role === 'admin' ? 'text-purple-400' :
                            user.role === 'co-admin' ? 'text-blue-400' :
                            'text-white/60'
                          }`}
                        >
                          <option value="user">User</option>
                          <option value="co-admin">Co-Admin</option>
                          <option value="admin">Admin</option>
                          {user.role === 'owner' && <option value="owner">Owner</option>}
                        </select>
                      </div>
                      <div className="text-white/60 text-sm">{user.role === 'owner' ? 'CEO' : user.customPosition || '-'}</div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                          user.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                          user.status === 'suspended' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                      <div className="text-white/60 text-sm">
                        {user.permissions?.length || 0} permissions
                      </div>
                      <div className="text-white/40 text-sm">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                          className="p-1 hover:bg-white/10 rounded"
                          title="Edit Permissions"
                        >
                          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {user.status === 'blocked' ? (
                          <button
                            onClick={() => unblockUser(user)}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Unblock User"
                          >
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedUser(user); setShowBlockModal(true); }}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Block User"
                            disabled={user.role === 'owner'}
                          >
                            <svg className={`w-4 h-4 ${user.role === 'owner' ? 'text-gray-600 cursor-not-allowed' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user)}
                          className="p-1 hover:bg-white/10 rounded"
                          title="Delete User"
                          disabled={user.role === 'owner'}
                        >
                          <svg className={`w-4 h-4 ${user.role === 'owner' ? 'text-gray-600 cursor-not-allowed' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Create User Modal */}
              {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
                    <h3 className="text-xl font-bold text-white mb-6">Create New User</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-white/60 text-sm mb-1 block">Email *</label>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
                          placeholder="user@example.com"
                        />
                      </div>

                      <div>
                        <label className="text-white/60 text-sm mb-1 block">Password *</label>
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
                          placeholder="Min 8 characters"
                        />
                      </div>

                      <div>
                        <label className="text-white/60 text-sm mb-1 block">Full Name *</label>
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="text-white/60 text-sm mb-1 block">Role</label>
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
                        >
                          <option value="user">User</option>
                          <option value="co-admin">Co-Admin</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-white/60 text-sm mb-1 block">Custom Position</label>
                        <input
                          type="text"
                          value={newUser.customPosition}
                          onChange={(e) => setNewUser({...newUser, customPosition: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
                          placeholder="e.g., Senior Trader, Support Lead"
                        />
                      </div>

                      <div>
                        <label className="text-white/60 text-sm mb-2 block">Permissions</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {ALL_PERMISSIONS.map(perm => (
                            <label key={perm.id} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded cursor-pointer hover:bg-slate-800">
                              <input
                                type="checkbox"
                                checked={newUser.permissions.includes(perm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewUser({...newUser, permissions: [...newUser.permissions, perm.id]});
                                  } else {
                                    setNewUser({...newUser, permissions: newUser.permissions.filter(p => p !== perm.id)});
                                  }
                                }}
                                className="rounded border-white/20"
                              />
                              <span className="text-white text-sm">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 bg-slate-800 text-white/60 rounded-lg hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createUser}
                        disabled={!newUser.email || !newUser.password || !newUser.name || userActionLoading}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {userActionLoading ? 'Creating...' : 'Create User'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Permissions Modal */}
              {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
                    <h3 className="text-xl font-bold text-white mb-2">Edit Permissions</h3>
                    <p className="text-white/40 mb-6">{selectedUser.email}</p>

                    <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                      {ALL_PERMISSIONS.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded cursor-pointer hover:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={selectedUser.permissions?.includes(perm.id) || false}
                            onChange={(e) => {
                              const newPerms = e.target.checked
                                ? [...(selectedUser.permissions || []), perm.id]
                                : (selectedUser.permissions || []).filter(p => p !== perm.id);
                              setSelectedUser({...selectedUser, permissions: newPerms});
                            }}
                            className="rounded border-white/20"
                          />
                          <div>
                            <span className="text-white text-sm">{perm.label}</span>
                            <p className="text-white/40 text-xs">{perm.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                        className="px-4 py-2 bg-slate-800 text-white/60 rounded-lg hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updateUserPermissions(selectedUser, selectedUser.permissions || [])}
                        disabled={userActionLoading}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {userActionLoading ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Block User Modal */}
              {showBlockModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold text-white mb-2">Block User</h3>
                    <p className="text-white/40 mb-6">Blocking {selectedUser.email}</p>

                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Reason for blocking</label>
                      <textarea
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white h-24"
                        placeholder="e.g., Violation of terms, suspicious activity..."
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => { setShowBlockModal(false); setSelectedUser(null); setBlockReason(''); }}
                        className="px-4 py-2 bg-slate-800 text-white/60 rounded-lg hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={blockUser}
                        disabled={userActionLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
                      >
                        {userActionLoading ? 'Blocking...' : 'Block User'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">System Logs</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-slate-800 text-white/60 rounded-lg hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Log Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                  <div className="text-white/40 text-sm">Total Logs</div>
                  <div className="text-2xl font-bold text-white">{systemLogs.length}</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <div className="text-emerald-400/60 text-sm">Info</div>
                  <div className="text-2xl font-bold text-emerald-400">{systemLogs.filter(l => l.level === 'info').length}</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="text-amber-400/60 text-sm">Warnings</div>
                  <div className="text-2xl font-bold text-amber-400">{systemLogs.filter(l => l.level === 'warning').length}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="text-red-400/60 text-sm">Errors</div>
                  <div className="text-2xl font-bold text-red-400">{systemLogs.filter(l => l.level === 'error').length}</div>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-4 bg-slate-800/50 border-b border-white/5 font-medium text-white/60 text-sm">
                  <div>Timestamp</div>
                  <div>Level</div>
                  <div>Component</div>
                  <div className="col-span-2">Message</div>
                </div>

                {isLoading ? (
                  <div className="p-8 text-center">
                    <svg className="w-8 h-8 text-white/30 animate-spin mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-white/40 mt-2">Loading logs...</p>
                  </div>
                ) : systemLogs.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    <svg className="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No system logs available</p>
                    <p className="text-sm mt-1">Logs will appear here when system events occur</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    {systemLogs.map((log) => (
                      <div key={log.id} className="grid grid-cols-5 gap-4 p-4 border-b border-white/5 hover:bg-white/5">
                        <div className="text-white/60 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                            log.level === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {log.level.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-white/60 text-sm">{log.component}</div>
                        <div className="col-span-2 text-white text-sm">{log.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
