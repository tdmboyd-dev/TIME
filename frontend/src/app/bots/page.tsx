'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Play,
  Pause,
  Trash2,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  ExternalLink,
  Github,
  Globe,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  FileCode,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';

import { API_BASE } from '@/lib/api';

// Helper for auth headers
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('time_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

interface BotData {
  id: string;
  name: string;
  description: string;
  source: 'github' | 'mql5' | 'user_uploaded' | 'synthesized' | 'ctrader' | 'user_upload' | 'time_generated';
  status: 'active' | 'paused' | 'stopped' | 'analyzing' | 'training' | 'pending_review' | 'testing';
  rating: number;
  performance: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    totalPnL: number;
  };
  absorbed: boolean;
  createdAt: string | Date;
  lastActive: string | Date;
}

interface ApiResponse {
  success: boolean;
  data?: BotData[];
  bots?: BotData[];
  count?: number;
  total?: number;
  error?: string;
  message?: string;
}

const sourceIcons: Record<string, typeof Github> = {
  github: Github,
  mql5: Globe,
  user_uploaded: Upload,
  user_upload: Upload,
  synthesized: Activity,
  time_generated: Activity,
  ctrader: TrendingUp,
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400' },
  paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  stopped: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  analyzing: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  training: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  pending_review: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  testing: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};

export default function BotsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [importSource, setImportSource] = useState<'github' | 'mql5' | 'ctrader' | 'file'>('github');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [bots, setBots] = useState<BotData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Bot form state
  const [newBotName, setNewBotName] = useState('');
  const [newBotDescription, setNewBotDescription] = useState('');
  const [newBotStrategy, setNewBotStrategy] = useState<'trend_following' | 'mean_reversion' | 'scalping' | 'arbitrage'>('trend_following');

  // Fetch bots from backend API
  const fetchBots = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/bots/public`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        const formattedBots: BotData[] = data.data.map((bot: any) => ({
          id: bot.id || bot._id || `bot-${Date.now()}-${Math.random()}`,
          name: bot.name || 'Unnamed Bot',
          description: bot.description || 'Trading bot',
          source: bot.source || 'github',
          status: bot.status || 'active',
          rating: bot.rating || 0,
          performance: {
            winRate: bot.performance?.winRate || 0,
            profitFactor: bot.performance?.profitFactor || 0,
            maxDrawdown: bot.performance?.maxDrawdown || 0,
            sharpeRatio: bot.performance?.sharpeRatio || 0,
            totalTrades: bot.performance?.totalTrades || 0,
            totalPnL: bot.performance?.totalPnL || 0,
          },
          absorbed: bot.absorbed || false,
          createdAt: bot.createdAt || new Date().toISOString(),
          lastActive: bot.lastActive || bot.updatedAt || new Date().toISOString(),
        }));
        setBots(formattedBots);
        setIsConnected(true);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error: any) {
      console.error('Failed to fetch bots:', error);
      setError(error.message || 'Failed to connect to backend');
      setIsConnected(false);
      setBots([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBots();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBots();
  };

  const handleImport = async () => {
    if (!importUrl.trim()) {
      setNotification({ type: 'error', message: 'Please enter a valid URL or path' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsImporting(true);

    try {
      const response = await fetch(`${API_BASE}/bots/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: `Imported Bot from ${importSource}`,
          description: `Bot imported from ${importUrl}`,
          code: `// Bot code from ${importUrl}`,
          source: importSource === 'file' ? 'user_upload' : importSource,
          config: {
            sourceUrl: importUrl,
          },
        }),
      });

      const result: ApiResponse = await response.json();

      if (response.ok && result.success) {
        setNotification({
          type: 'success',
          message: result.message || 'Bot imported successfully! Analyzing performance...'
        });
        setShowImportModal(false);
        setImportUrl('');
        // Refresh the bot list
        fetchBots();
      } else {
        throw new Error(result.error || 'Failed to import bot');
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to import bot'
      });
    } finally {
      setIsImporting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleAddBot = async () => {
    if (!newBotName.trim()) {
      setNotification({ type: 'error', message: 'Please enter a bot name' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsImporting(true);

    try {
      const response = await fetch(`${API_BASE}/bots/quick-add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newBotName,
          description: newBotDescription || `Custom ${newBotStrategy.replace('_', ' ')} bot`,
          strategyType: newBotStrategy,
          riskLevel: 'moderate',
          paperMode: true,
          symbols: [],
        }),
      });

      const result: ApiResponse = await response.json();

      if (response.ok && result.success) {
        setNotification({
          type: 'success',
          message: result.message || `Bot "${newBotName}" created! Training in progress...`
        });
        setShowAddBotModal(false);
        setNewBotName('');
        setNewBotDescription('');
        // Refresh the bot list
        fetchBots();
      } else {
        throw new Error(result.error || 'Failed to create bot');
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to create bot'
      });
    } finally {
      setIsImporting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleStartBot = async (botId: string) => {
    try {
      const response = await fetch(`${API_BASE}/bots/${botId}/activate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          paperMode: true,
        }),
      });

      const result: ApiResponse = await response.json();

      if (response.ok && result.success) {
        setNotification({
          type: 'success',
          message: result.message || 'Bot activated successfully!'
        });
        fetchBots();
      } else {
        throw new Error(result.error || 'Failed to start bot');
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to start bot'
      });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStopBot = async (botId: string) => {
    try {
      const response = await fetch(`${API_BASE}/bots/${botId}/deactivate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result: ApiResponse = await response.json();

      if (response.ok && result.success) {
        setNotification({
          type: 'success',
          message: result.message || 'Bot stopped successfully!'
        });
        fetchBots();
      } else {
        throw new Error(result.error || 'Failed to stop bot');
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to stop bot'
      });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' || bot.source === filterSource;
    const matchesStatus = filterStatus === 'all' || bot.status === filterStatus;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const toggleBotSelection = (botId: string) => {
    setSelectedBots(prev =>
      prev.includes(botId)
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    );
  };

  const handleBulkStart = async () => {
    for (const botId of selectedBots) {
      await handleStartBot(botId);
    }
    setSelectedBots([]);
  };

  const handleBulkStop = async () => {
    for (const botId of selectedBots) {
      await handleStopBot(botId);
    }
    setSelectedBots([]);
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bot Management</h1>
          <p className="text-slate-400">Manage, analyze, and absorb trading bots</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh bots"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowAddBotModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Bot
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-6 border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Connection Error</h3>
          </div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="btn-primary"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Retrying...' : 'Retry Connection'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-slate-400">Total Bots</p>
          <p className="text-2xl font-bold text-white">{bots.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Active</p>
          <p className="text-2xl font-bold text-green-400">
            {bots.filter(b => b.status === 'active').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Absorbed</p>
          <p className="text-2xl font-bold text-purple-400">
            {bots.filter(b => b.absorbed).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Total P&L</p>
          <p className="text-2xl font-bold text-green-400">
            ${bots.reduce((sum, b) => sum + b.performance.totalPnL, 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-time-primary/50"
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Sources</option>
            <option value="github">GitHub</option>
            <option value="mql5">MQL5</option>
            <option value="ctrader">cTrader</option>
            <option value="user_upload">User Uploaded</option>
            <option value="synthesized">Synthesized</option>
            <option value="time_generated">TIME Generated</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="training">Training</option>
            <option value="analyzing">Analyzing</option>
            <option value="stopped">Stopped</option>
            <option value="pending_review">Pending Review</option>
            <option value="testing">Testing</option>
          </select>

          {selectedBots.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {selectedBots.length} selected
              </span>
              <button
                onClick={handleBulkStart}
                className="btn-secondary text-sm py-1.5"
                title="Start selected bots"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkStop}
                className="btn-secondary text-sm py-1.5"
                title="Stop selected bots"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="card p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-time-primary animate-spin" />
          <h3 className="text-lg font-semibold text-white mb-2">Loading bots...</h3>
          <p className="text-slate-400">Fetching data from backend</p>
        </div>
      )}

      {/* Bots Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredBots.map((bot) => {
            const SourceIcon = sourceIcons[bot.source] || Globe;
            const statusStyle = statusColors[bot.status] || statusColors.stopped;

            return (
              <div
                key={bot.id}
                className={clsx(
                  'card p-4 cursor-pointer transition-all',
                  selectedBots.includes(bot.id) && 'ring-2 ring-time-primary'
                )}
                onClick={() => toggleBotSelection(bot.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-800">
                      <Bot className="w-5 h-5 text-time-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{bot.name}</h3>
                        {bot.absorbed && (
                          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                            Absorbed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <SourceIcon className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-500 capitalize">
                          {bot.source.replace('_', ' ')}
                        </span>
                        {bot.rating > 0 && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs text-yellow-400">★ {bot.rating}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={clsx(
                    'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                    statusStyle.bg,
                    statusStyle.text
                  )}>
                    {bot.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm text-slate-400 mb-4 line-clamp-1">
                  {bot.description}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Win Rate</p>
                    <p className={clsx(
                      'text-sm font-semibold',
                      bot.performance.winRate >= 60 ? 'text-green-400' :
                      bot.performance.winRate >= 50 ? 'text-yellow-400' :
                      bot.performance.winRate > 0 ? 'text-red-400' : 'text-slate-400'
                    )}>
                      {bot.performance.winRate > 0 ? `${bot.performance.winRate.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Profit Factor</p>
                    <p className={clsx(
                      'text-sm font-semibold',
                      bot.performance.profitFactor >= 2 ? 'text-green-400' :
                      bot.performance.profitFactor >= 1.5 ? 'text-yellow-400' :
                      bot.performance.profitFactor > 0 ? 'text-slate-300' : 'text-slate-400'
                    )}>
                      {bot.performance.profitFactor > 0 ? bot.performance.profitFactor.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Sharpe Ratio</p>
                    <p className={clsx(
                      'text-sm font-semibold',
                      bot.performance.sharpeRatio >= 2 ? 'text-green-400' :
                      bot.performance.sharpeRatio >= 1 ? 'text-yellow-400' :
                      bot.performance.sharpeRatio > 0 ? 'text-slate-300' : 'text-slate-400'
                    )}>
                      {bot.performance.sharpeRatio > 0 ? bot.performance.sharpeRatio.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{bot.performance.totalTrades.toLocaleString()} trades</span>
                    <span className="flex items-center gap-1">
                      {bot.performance.totalPnL >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <span className={bot.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ${Math.abs(bot.performance.totalPnL).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {bot.status === 'active' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStopBot(bot.id); }}
                        className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                        title="Stop bot"
                      >
                        <Pause className="w-4 h-4 text-yellow-400" />
                      </button>
                    ) : bot.status === 'paused' || bot.status === 'stopped' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartBot(bot.id); }}
                        className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                        title="Start bot"
                      >
                        <Play className="w-4 h-4 text-green-400" />
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                      title="Bot settings"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && filteredBots.length === 0 && (
        <div className="card p-12 text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No bots found</h3>
          <p className="text-slate-400 mb-4">
            {bots.length === 0
              ? 'No bots available. Try adding or importing a bot.'
              : 'Try adjusting your filters or add a new bot'}
          </p>
          <button onClick={() => setShowAddBotModal(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Bot
          </button>
        </div>
      )}

      {/* Import Bot Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Import Bot</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isImporting ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
                <p className="text-white font-medium">Importing Bot...</p>
                <p className="text-sm text-slate-400 mt-1">Analyzing strategy and performance metrics</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Import Source</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'github', label: 'GitHub', icon: Github },
                      { id: 'mql5', label: 'MQL5', icon: Globe },
                      { id: 'ctrader', label: 'cTrader', icon: TrendingUp },
                      { id: 'file', label: 'File', icon: FileCode },
                    ].map(source => (
                      <button
                        key={source.id}
                        onClick={() => setImportSource(source.id as typeof importSource)}
                        className={clsx(
                          'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                          importSource === source.id
                            ? 'bg-time-primary/20 border-time-primary text-time-primary'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        )}
                      >
                        <source.icon className="w-5 h-5" />
                        <span className="text-xs">{source.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    {importSource === 'file' ? 'File Path' : `${importSource === 'github' ? 'GitHub' : importSource === 'mql5' ? 'MQL5' : 'cTrader'} URL`}
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder={
                        importSource === 'github' ? 'https://github.com/user/trading-bot' :
                        importSource === 'mql5' ? 'https://www.mql5.com/en/market/product/...' :
                        importSource === 'ctrader' ? 'ctrader://algo/...' :
                        'C:\\path\\to\\bot.mq5'
                      }
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-400">
                    TIME will automatically analyze the bot&apos;s strategy, backtest it, and provide performance metrics before absorbing it into the system.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                  >
                    Import Bot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Bot Modal */}
      {showAddBotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Create New Bot</h3>
              <button onClick={() => setShowAddBotModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isImporting ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
                <p className="text-white font-medium">Creating Bot...</p>
                <p className="text-sm text-slate-400 mt-1">Initializing strategy and training model</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Bot Name</label>
                  <input
                    type="text"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                    placeholder="My Trading Bot"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Description (Optional)</label>
                  <textarea
                    value={newBotDescription}
                    onChange={(e) => setNewBotDescription(e.target.value)}
                    placeholder="Describe what your bot does..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Strategy Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'trend_following', label: 'Trend Following', desc: 'Follow market trends' },
                      { id: 'mean_reversion', label: 'Mean Reversion', desc: 'Trade price reversals' },
                      { id: 'scalping', label: 'Scalping', desc: 'Quick small profits' },
                      { id: 'arbitrage', label: 'Arbitrage', desc: 'Price discrepancies' },
                    ].map(strategy => (
                      <button
                        key={strategy.id}
                        onClick={() => setNewBotStrategy(strategy.id as typeof newBotStrategy)}
                        className={clsx(
                          'flex flex-col items-start p-3 rounded-lg border transition-colors text-left',
                          newBotStrategy === strategy.id
                            ? 'bg-time-primary/20 border-time-primary'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        )}
                      >
                        <span className={clsx(
                          'text-sm font-medium',
                          newBotStrategy === strategy.id ? 'text-time-primary' : 'text-white'
                        )}>{strategy.label}</span>
                        <span className="text-xs text-slate-500">{strategy.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddBotModal(false)}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBot}
                    className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                  >
                    Create Bot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
