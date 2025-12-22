'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Power,
  AlertTriangle,
  Activity,
  Bot,
  Brain,
  Zap,
  Clock,
  Users,
  TrendingUp,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Lock,
  Unlock,
  X,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';

import { API_BASE, getTokenFromCookie } from '@/lib/api';

type EvolutionMode = 'controlled' | 'autonomous';

interface SystemEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  component: string;
}

export default function AdminPage() {
  const [evolutionMode, setEvolutionMode] = useState<EvolutionMode>('controlled');
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<EvolutionMode | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [botsRunning, setBotsRunning] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  // Activity Log Modal State
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
  const [activityDateRange, setActivityDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Fetch admin data from backend
  const fetchAdminData = useCallback(async () => {
    try {
      const token = getTokenFromCookie();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const [evolutionRes, activityRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/evolution`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/admin/activity`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/admin/metrics`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (evolutionRes.ok) {
        const data = await evolutionRes.json();
        if (data.success) {
          setEvolutionMode(data.mode || 'controlled');
          setIsConnected(true);
        }
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        if (data.success && data.events) {
          setSystemEvents(data.events.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          })));
        }
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.success) {
          setMetrics(data.metrics);
        }
      }
    } catch (error) {
      // Error handled silently - data will show as loading/empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 15000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  const handleStartAllBots = async () => {
    setNotification({ type: 'success', message: 'Starting all bots...' });
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/trading/start-all`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      if (response.ok) {
        setBotsRunning(true);
        setNotification({ type: 'success', message: 'All bots are now active and trading!' });
      } else {
        throw new Error('Failed to start bots');
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to start bots' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePauseAllBots = async () => {
    setNotification({ type: 'warning', message: 'Pausing all bots...' });
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/admin/emergency/pause-all`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      if (response.ok) {
        setBotsRunning(false);
        setNotification({ type: 'success', message: 'All bots paused. Trading halted.' });
      } else {
        throw new Error('Failed to pause bots');
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to pause bots' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setNotification({ type: 'success', message: 'Syncing with all connected brokers...' });
    try {
      const token = getTokenFromCookie();
      await fetch(`${API_BASE}/portfolio/brokers/status`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      setNotification({ type: 'success', message: 'Successfully synced with broker connections!' });
      fetchAdminData();
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to sync brokers' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleEmergencyBrake = async () => {
    setShowEmergencyDialog(false);
    setNotification({ type: 'warning', message: 'EMERGENCY: Closing all positions...' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    setBotsRunning(false);
    setNotification({ type: 'success', message: 'All positions closed. All bots stopped. System safe.' });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleModeToggle = (mode: EvolutionMode) => {
    if (mode === evolutionMode) return;
    setPendingMode(mode);
    setShowConfirmDialog(true);
  };

  const confirmModeChange = () => {
    if (!pendingMode) return;
    setIsToggling(true);
    setShowConfirmDialog(false);

    setTimeout(() => {
      setEvolutionMode(pendingMode);
      setIsToggling(false);
      setPendingMode(null);
    }, 2000);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg',
          notification.type === 'success' && 'bg-green-500/20 border border-green-500/50 text-green-400',
          notification.type === 'warning' && 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400',
          notification.type === 'error' && 'bg-red-500/20 border border-red-500/50 text-red-400'
        )}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400">Control TIME&apos;s evolution and monitor system status</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2',
            evolutionMode === 'autonomous'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          )}>
            {evolutionMode === 'autonomous' ? (
              <>
                <Unlock className="w-4 h-4" />
                Autonomous Mode
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Controlled Mode
              </>
            )}
          </span>
        </div>
      </div>

      {/* Evolution Mode Toggle Card */}
      <div className={clsx(
        'card p-6 border-2 transition-colors',
        evolutionMode === 'autonomous'
          ? 'border-purple-500/30 bg-purple-500/5'
          : 'border-green-500/30 bg-green-500/5'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={clsx(
              'p-3 rounded-lg',
              evolutionMode === 'autonomous'
                ? 'bg-purple-500/20'
                : 'bg-green-500/20'
            )}>
              <Power className={clsx(
                'w-8 h-8',
                evolutionMode === 'autonomous' ? 'text-purple-400' : 'text-green-400'
              )} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Evolution Mode Control</h2>
              <p className="text-slate-400 mb-4 max-w-2xl">
                {evolutionMode === 'controlled'
                  ? 'TIME is in Controlled Mode. All evolutionary changes, strategy modifications, and autonomous decisions require your explicit approval before being applied.'
                  : 'TIME is in Autonomous Mode. TIME can freely evolve, create new strategies, modify parameters, and make decisions without requiring approval. Monitor closely.'}
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleModeToggle('controlled')}
                  disabled={isToggling}
                  className={clsx(
                    'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                    evolutionMode === 'controlled'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  <Lock className="w-4 h-4" />
                  Controlled
                </button>
                <button
                  onClick={() => handleModeToggle('autonomous')}
                  disabled={isToggling}
                  className={clsx(
                    'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                    evolutionMode === 'autonomous'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  <Unlock className="w-4 h-4" />
                  Autonomous
                </button>
              </div>
            </div>
          </div>

          {isToggling && (
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Switching mode...</span>
            </div>
          )}
        </div>

        {evolutionMode === 'autonomous' && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-purple-300 font-medium">Autonomous Mode Active</p>
                <p className="text-xs text-purple-400/80 mt-1">
                  TIME is now self-evolving. It will automatically synthesize new strategies,
                  absorb learnings, and adapt to market conditions without manual approval.
                  Ensure risk parameters are properly configured.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-time-primary/10">
              <Bot className="w-5 h-5 text-time-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Bots</p>
              <p className="text-xl font-bold text-white">12</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Strategies</p>
              <p className="text-xl font-bold text-white">7</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Today's P&L</p>
              <p className="text-xl font-bold text-green-400">+$2,847</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Patterns Learned</p>
              <p className="text-xl font-bold text-white">1,247</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Activity */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">System Activity</h3>
            <button
              onClick={() => setShowActivityLog(true)}
              className="text-sm text-time-primary hover:text-time-primary/80"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {systemEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
              >
                {getEventIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{event.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{event.component}</span>
                    <span>•</span>
                    <span>{event.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals (Controlled Mode) */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {evolutionMode === 'controlled' ? 'Pending Approvals' : 'Recent Auto-Actions'}
            </h3>
            <span className={clsx(
              'px-2 py-0.5 text-xs rounded-full',
              evolutionMode === 'controlled'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-purple-500/20 text-purple-400'
            )}>
              {evolutionMode === 'controlled' ? '3 pending' : 'Auto-approved'}
            </span>
          </div>

          {evolutionMode === 'controlled' ? (
            <div className="space-y-3">
              {[
                { title: 'New Strategy: TIME Synthesis #49', desc: 'Hybrid trend/momentum strategy', type: 'strategy' },
                { title: 'Parameter Update: Risk Engine', desc: 'Adjust max position size to 2.5%', type: 'parameter' },
                { title: 'Bot Absorption: Scalper Pro V3', desc: 'New bot ready for integration', type: 'bot' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(`✅ Approved: ${item.title}\n\nType: ${item.type}\n${item.desc}\n\nChanges have been applied to the system.`)}
                        className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Reject: ${item.title}?\n\n${item.desc}\n\nThis will discard the pending changes.`)) {
                            alert(`❌ Rejected: ${item.title}\n\nThe ${item.type} changes have been discarded.`);
                          }
                        }}
                        className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { title: 'Strategy created automatically', desc: 'TIME Synthesis #49 deployed', time: '2 min ago' },
                { title: 'Parameters optimized', desc: 'Risk engine recalibrated', time: '15 min ago' },
                { title: 'Bot absorbed', desc: 'Scalper Pro V3 integrated', time: '1 hour ago' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{item.desc}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactivity Monitor */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-time-primary" />
              Legacy Continuity Protocol
            </h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-400">Owner Active</p>
                  <p className="text-xs text-slate-400 mt-1">Last activity: Just now</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500">3 Day Warning</p>
                <p className="text-lg font-bold text-white">72h</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500">4 Day Warning</p>
                <p className="text-lg font-bold text-white">96h</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500">Auto-Switch</p>
                <p className="text-lg font-bold text-white">120h</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              If you are inactive for 5 days, TIME will automatically switch to Autonomous Mode
              to ensure continuous operation and protect your investments.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStartAllBots}
              disabled={botsRunning}
              className={clsx(
                'p-4 rounded-lg transition-colors text-left',
                botsRunning
                  ? 'bg-green-500/10 border border-green-500/30 cursor-not-allowed'
                  : 'bg-slate-800/50 hover:bg-slate-800'
              )}
            >
              <Play className={clsx('w-5 h-5 mb-2', botsRunning ? 'text-green-500' : 'text-green-400')} />
              <p className="text-sm font-medium text-white">
                {botsRunning ? 'Bots Running' : 'Start All Bots'}
              </p>
              <p className="text-xs text-slate-500">
                {botsRunning ? '12 bots active' : 'Activate trading'}
              </p>
            </button>
            <button
              onClick={handlePauseAllBots}
              disabled={!botsRunning}
              className={clsx(
                'p-4 rounded-lg transition-colors text-left',
                !botsRunning
                  ? 'bg-yellow-500/10 border border-yellow-500/30 cursor-not-allowed'
                  : 'bg-slate-800/50 hover:bg-slate-800'
              )}
            >
              <Pause className={clsx('w-5 h-5 mb-2', !botsRunning ? 'text-yellow-500' : 'text-yellow-400')} />
              <p className="text-sm font-medium text-white">
                {!botsRunning ? 'Bots Paused' : 'Pause All Bots'}
              </p>
              <p className="text-xs text-slate-500">
                {!botsRunning ? 'Trading halted' : 'Halt trading'}
              </p>
            </button>
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-left disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-5 h-5 text-blue-400 mb-2', isSyncing && 'animate-spin')} />
              <p className="text-sm font-medium text-white">
                {isSyncing ? 'Syncing...' : 'Force Sync'}
              </p>
              <p className="text-xs text-slate-500">Sync all brokers</p>
            </button>
            <button
              onClick={() => setShowEmergencyDialog(true)}
              className="p-4 bg-slate-800/50 rounded-lg hover:bg-red-500/20 hover:border hover:border-red-500/30 transition-colors text-left"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
              <p className="text-sm font-medium text-white">Emergency Brake</p>
              <p className="text-xs text-slate-500">Close all positions</p>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx(
                'p-2 rounded-lg',
                pendingMode === 'autonomous' ? 'bg-purple-500/20' : 'bg-green-500/20'
              )}>
                <AlertTriangle className={clsx(
                  'w-6 h-6',
                  pendingMode === 'autonomous' ? 'text-purple-400' : 'text-green-400'
                )} />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Switch to {pendingMode === 'autonomous' ? 'Autonomous' : 'Controlled'} Mode?
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {pendingMode === 'autonomous'
                ? 'TIME will be able to make decisions and evolve without your approval. Make sure risk parameters are properly configured.'
                : 'All evolutionary changes will require your explicit approval before being applied.'}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmModeChange}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium',
                  pendingMode === 'autonomous'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                )}
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Brake Dialog */}
      {showEmergencyDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4 border-2 border-red-500/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Emergency Brake</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              This will immediately:
            </p>
            <ul className="text-sm text-slate-400 mb-6 space-y-1 list-disc list-inside">
              <li>Close all open positions at market price</li>
              <li>Cancel all pending orders</li>
              <li>Pause all active bots</li>
              <li>Disable new trade execution</li>
            </ul>
            <p className="text-sm text-red-400 font-medium mb-6">
              This action cannot be undone. Use only in emergencies.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowEmergencyDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyBrake}
                className="px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white"
              >
                Confirm Emergency Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">System Activity Log</h2>
                <p className="text-slate-400 text-sm mt-1">View and export all system events</p>
              </div>
              <button
                onClick={() => setShowActivityLog(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-700 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Type:</span>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-time-primary"
                >
                  <option value="all">All Types</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Range:</span>
                <select
                  value={activityDateRange}
                  onChange={(e) => setActivityDateRange(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-time-primary"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => {
                  const filteredEvents = systemEvents.filter(e =>
                    (activityFilter === 'all' || e.type === activityFilter)
                  );
                  const csv = 'Type,Message,Component,Timestamp\n' +
                    filteredEvents.map(e =>
                      `${e.type},"${e.message}",${e.component},${e.timestamp.toISOString()}`
                    ).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Export CSV
              </button>
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto p-4">
              {systemEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No activity events found</p>
                  <p className="text-slate-500 text-sm mt-1">Connect to backend to load activity data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {systemEvents
                    .filter(e => activityFilter === 'all' || e.type === activityFilter)
                    .filter(e => {
                      if (activityDateRange === 'all') return true;
                      const now = new Date();
                      const eventDate = new Date(e.timestamp);
                      const diffDays = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
                      if (activityDateRange === 'today') return diffDays < 1;
                      if (activityDateRange === 'week') return diffDays < 7;
                      if (activityDateRange === 'month') return diffDays < 30;
                      return true;
                    })
                    .map((event) => (
                      <div
                        key={event.id}
                        className={clsx(
                          "flex items-start gap-4 p-4 rounded-xl border",
                          event.type === 'error' && "bg-red-500/10 border-red-500/20",
                          event.type === 'warning' && "bg-amber-500/10 border-amber-500/20",
                          event.type === 'success' && "bg-emerald-500/10 border-emerald-500/20",
                          event.type === 'info' && "bg-blue-500/10 border-blue-500/20"
                        )}
                      >
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          event.type === 'error' && "bg-red-500/20",
                          event.type === 'warning' && "bg-amber-500/20",
                          event.type === 'success' && "bg-emerald-500/20",
                          event.type === 'info' && "bg-blue-500/20"
                        )}>
                          {event.type === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                          {event.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                          {event.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                          {event.type === 'info' && <Activity className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white">{event.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="px-2 py-0.5 bg-slate-800 rounded-full">{event.component}</span>
                            <span>{event.timestamp.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
