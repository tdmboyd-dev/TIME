'use client';

import { useState } from 'react';
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
  Unlock
} from 'lucide-react';
import clsx from 'clsx';

type EvolutionMode = 'controlled' | 'autonomous';

interface SystemEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  component: string;
}

const mockEvents: SystemEvent[] = [
  { id: '1', type: 'success', message: 'New strategy synthesized: TIME Synthesis #48', timestamp: new Date(Date.now() - 300000), component: 'Recursive Synthesis' },
  { id: '2', type: 'info', message: 'Market regime changed to trending_up', timestamp: new Date(Date.now() - 600000), component: 'Regime Detector' },
  { id: '3', type: 'warning', message: 'Approaching daily loss limit (4.2%)', timestamp: new Date(Date.now() - 900000), component: 'Risk Engine' },
  { id: '4', type: 'success', message: 'Bot absorbed: Momentum Hunter V3', timestamp: new Date(Date.now() - 1800000), component: 'Bot Ingestion' },
  { id: '5', type: 'info', message: 'Learning cycle completed - 47 patterns identified', timestamp: new Date(Date.now() - 3600000), component: 'Learning Engine' },
];

export default function AdminPage() {
  const [evolutionMode, setEvolutionMode] = useState<EvolutionMode>('controlled');
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<EvolutionMode | null>(null);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400">Control TIME's evolution and monitor system status</p>
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
            <button className="text-sm text-time-primary hover:text-time-primary/80">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {mockEvents.map((event) => (
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
                      <button className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
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
            <button className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <Play className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-sm font-medium text-white">Start All Bots</p>
              <p className="text-xs text-slate-500">Activate trading</p>
            </button>
            <button className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <Pause className="w-5 h-5 text-yellow-400 mb-2" />
              <p className="text-sm font-medium text-white">Pause All Bots</p>
              <p className="text-xs text-slate-500">Halt trading</p>
            </button>
            <button className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
              <RefreshCw className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-sm font-medium text-white">Force Sync</p>
              <p className="text-xs text-slate-500">Sync all brokers</p>
            </button>
            <button className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-left">
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
    </div>
  );
}
