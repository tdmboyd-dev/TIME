'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Wallet,
  Coins,
  Shield,
  Zap,
  Bell,
  CheckCircle,
  Clock,
  ChevronRight,
  Play,
  Pause,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

interface AlertAction {
  id: string;
  label: string;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'YOLO';
  action: string;
  symbol?: string;
  description: string;
}

interface BigMovesAlert {
  id: string;
  timestamp: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  plainEnglish: string;
  whatItMeans: string;
  source: string;
  suggestedActions: AlertAction[];
  riskLevel: string;
  affectedAssets: string[];
  confidence: number;
  acknowledged: boolean;
  actionTaken?: string;
}

const priorityConfig = {
  CRITICAL: {
    color: 'bg-red-500/20 border-red-500 text-red-400',
    icon: AlertTriangle,
    badge: 'bg-red-500 text-white'
  },
  HIGH: {
    color: 'bg-orange-500/20 border-orange-500 text-orange-400',
    icon: Zap,
    badge: 'bg-orange-500 text-white'
  },
  MEDIUM: {
    color: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    icon: Bell,
    badge: 'bg-yellow-500 text-black'
  },
  LOW: {
    color: 'bg-blue-500/20 border-blue-500 text-blue-400',
    icon: TrendingUp,
    badge: 'bg-blue-500 text-white'
  }
};

const categoryIcons: Record<string, typeof TrendingUp> = {
  GOVERNMENT_POLICY: Building2,
  WHALE_MOVEMENT: Wallet,
  INSTITUTIONAL: Building2,
  STABLECOIN: Coins,
  DEFI_OPPORTUNITY: TrendingUp,
  PROTOCOL_HACK: AlertTriangle,
  MARKET_REGIME: TrendingDown,
  EARNINGS: TrendingUp,
  ETF_NEWS: TrendingUp
};

const riskColors = {
  CONSERVATIVE: 'bg-green-500/20 text-green-400 border-green-500',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  AGGRESSIVE: 'bg-orange-500/20 text-orange-400 border-orange-500',
  YOLO: 'bg-red-500/20 text-red-400 border-red-500'
};

// No mock data - show empty state when API unavailable

export function BigMovesAlerts() {
  const [alerts, setAlerts] = useState<BigMovesAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<BigMovesAlert | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  // Fetch alerts with fallback to mock data
  const fetchAlerts = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const url = filter === 'ALL'
        ? `${API_BASE}/alerts`
        : `${API_BASE}/alerts?priority=${filter}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setAlerts(data.data);
        setIsConnected(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Show empty state - no mock data
      setAlerts([]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  // Toggle monitoring
  const toggleMonitoring = async () => {
    try {
      const endpoint = isMonitoring ? 'stop' : 'start';
      await fetch(`${API_BASE}/alerts/monitoring/${endpoint}`, {
        method: 'POST'
      });
      setIsMonitoring(!isMonitoring);
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  // Execute action
  const executeAction = async (alertId: string, actionId: string) => {
    setExecuting(`${alertId}-${actionId}`);
    try {
      const response = await fetch(`${API_BASE}/alerts/${alertId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId })
      });
      const data = await response.json();

      if (data.success) {
        // Refresh alerts
        fetchAlerts();
        // Show success message
        alert(`Action executed: ${data.data.message}`);
      }
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setExecuting(null);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // Create test alerts
  const createTestAlert = async (type: 'whale' | 'government' | 'institutional' | 'defi') => {
    try {
      await fetch(`${API_BASE}/alerts/test/${type}`, {
        method: 'POST'
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error creating test alert:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(() => fetchAlerts(true), 30000);
    return () => clearInterval(interval);
  }, [filter, fetchAlerts]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Big Moves Alerts</h1>
            {/* Connection Status Badge */}
            <div className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
              isConnected
                ? 'bg-green-500/20 text-green-400 border border-green-500'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500'
            )}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  LIVE
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  DEMO
                </>
              )}
            </div>
          </div>
          <p className="text-slate-400 italic">"Never get left out again. The big boys' playbook is now YOUR playbook."</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh Button with Spinner */}
          <button
            onClick={() => fetchAlerts(true)}
            disabled={isRefreshing}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isRefreshing
                ? 'bg-slate-700 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700'
            )}
            title="Refresh"
          >
            <RefreshCw className={clsx(
              'w-4 h-4 text-slate-400',
              isRefreshing && 'animate-spin'
            )} />
          </button>
          <button
            onClick={toggleMonitoring}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              isMonitoring
                ? 'bg-green-500/20 text-green-400 border border-green-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            {isMonitoring ? (
              <>
                <Pause className="w-4 h-4" />
                Monitoring Active
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Monitoring
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => (
          <button
            key={priority}
            onClick={() => setFilter(priority)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === priority
                ? 'bg-time-primary text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            {priority}
            {priority !== 'ALL' && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-slate-700">
                {alerts.filter(a => a.priority === priority).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Test Buttons (Dev only) */}
      <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
        <span className="text-xs text-slate-500">Test:</span>
        <button
          onClick={() => createTestAlert('whale')}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          Whale Alert
        </button>
        <button
          onClick={() => createTestAlert('government')}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          Gov Alert
        </button>
        <button
          onClick={() => createTestAlert('institutional')}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          Institutional
        </button>
        <button
          onClick={() => createTestAlert('defi')}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          DeFi
        </button>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-slate-400">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">No alerts yet. Start monitoring to receive alerts.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = priorityConfig[alert.priority];
            const CategoryIcon = categoryIcons[alert.category] || Bell;
            const PriorityIcon = config.icon;

            return (
              <div
                key={alert.id}
                className={clsx(
                  'p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-[1.02]',
                  config.color,
                  alert.acknowledged && 'opacity-60'
                )}
                onClick={() => setSelectedAlert(alert)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50">
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded', config.badge)}>
                        {alert.priority}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{alert.category.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatTime(alert.timestamp)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold mb-2">{alert.title}</h3>

                {/* Plain English */}
                <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                  {alert.plainEnglish}
                </p>

                {/* Affected Assets */}
                {alert.affectedAssets.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    {alert.affectedAssets.slice(0, 4).map((asset) => (
                      <span
                        key={asset}
                        className="px-2 py-1 text-xs bg-slate-800 rounded"
                      >
                        {asset}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">
                      {alert.confidence}% confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-time-primary">
                    View Actions <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {alert.acknowledged && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    Acknowledged
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={clsx(
              'p-6 border-b-2',
              priorityConfig[selectedAlert.priority].color
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className={clsx(
                  'px-3 py-1 text-sm font-medium rounded',
                  priorityConfig[selectedAlert.priority].badge
                )}>
                  {selectedAlert.priority} PRIORITY
                </span>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-slate-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
              <h2 className="text-xl font-bold text-white">{selectedAlert.title}</h2>
              <p className="text-sm text-slate-400 mt-1">
                Source: {selectedAlert.source} | {formatTime(selectedAlert.timestamp)}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Plain English Explanation */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">WHAT HAPPENED</h3>
                <p className="text-white">{selectedAlert.plainEnglish}</p>
              </div>

              {/* What It Means */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">WHAT IT MEANS FOR YOU</h3>
                <p className="text-white">{selectedAlert.whatItMeans}</p>
              </div>

              {/* Affected Assets */}
              {selectedAlert.affectedAssets.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">AFFECTED ASSETS</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAlert.affectedAssets.map((asset) => (
                      <span
                        key={asset}
                        className="px-3 py-1.5 bg-slate-800 rounded-lg text-sm"
                      >
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions - ONE CLICK TRADING */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">ONE-CLICK ACTIONS</h3>
                <div className="space-y-3">
                  {selectedAlert.suggestedActions.map((action) => (
                    <div
                      key={action.id}
                      className={clsx(
                        'p-4 rounded-lg border-2',
                        riskColors[action.riskLevel],
                        selectedAlert.actionTaken === action.id && 'ring-2 ring-green-500'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{action.label}</span>
                        <span className={clsx(
                          'px-2 py-0.5 text-xs rounded',
                          riskColors[action.riskLevel]
                        )}>
                          {action.riskLevel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{action.description}</p>
                      <button
                        onClick={() => executeAction(selectedAlert.id, action.id)}
                        disabled={executing === `${selectedAlert.id}-${action.id}` || !!selectedAlert.actionTaken}
                        className={clsx(
                          'w-full py-2 rounded-lg font-medium transition-colors',
                          selectedAlert.actionTaken === action.id
                            ? 'bg-green-500 text-white cursor-not-allowed'
                            : selectedAlert.actionTaken
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-time-primary hover:bg-time-primary/80 text-white'
                        )}
                      >
                        {executing === `${selectedAlert.id}-${action.id}` ? (
                          'Executing...'
                        ) : selectedAlert.actionTaken === action.id ? (
                          <>
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                            Action Taken
                          </>
                        ) : selectedAlert.actionTaken ? (
                          'Another action was taken'
                        ) : (
                          `Execute: ${action.action}${action.symbol ? ` ${action.symbol}` : ''}`
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence & Acknowledge */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-400">
                    {selectedAlert.confidence}% confidence
                  </span>
                </div>
                {!selectedAlert.acknowledged && (
                  <button
                    onClick={() => {
                      acknowledgeAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BigMovesAlerts;
