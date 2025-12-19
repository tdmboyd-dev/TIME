'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gem, Crown, Zap, Shield, Brain, Target, TrendingUp,
  Bot, Rocket, Star, Lock, CheckCircle, Play, Pause,
  ChevronDown, ChevronUp, Activity, DollarSign, Clock,
  ArrowUpRight, ArrowDownRight, RefreshCw, Eye, MessageSquare
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

interface SuperBot {
  id: string;
  name: string;
  codename: string;
  tier: 'LEGENDARY' | 'EPIC' | 'RARE';
  category: string;
  description: string;
  abilities: { name: string; description: string; priority?: number }[];
  markets: string[];
  expectedROI: number;
  riskLevel: string;
  capitalRequired: number;
  isActive: boolean;
  performance: {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
    totalProfit: number;
  };
}

interface LiveTradingStatus {
  isEnabled: boolean;
  mode: 'paper' | 'live';
  activeBots: number;
  dailyTradeCount: number;
  maxDailyTrades: number;
  currentDrawdown: string;
  maxDrawdown: string;
  equity: {
    starting: number;
    current: number;
    pnl: number;
  };
}

interface Trade {
  id: string;
  botId: string;
  botName: string;
  signal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    symbol: string;
    confidence: number;
  };
  executedAt: string;
  status: string;
  fillPrice?: number;
  fillQuantity?: number;
}

interface ActivityItem {
  id: string;
  type: 'trade' | 'signal' | 'learning' | 'alert' | 'analysis';
  botName: string;
  message: string;
  detail: string;
  timestamp: Date;
  icon: 'up' | 'down' | 'brain' | 'alert' | 'eye';
}

export default function UltimatePage() {
  const router = useRouter();
  const [superBots, setSuperBots] = useState<SuperBot[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveTradingStatus | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('LEGENDARY');
  const [activatingBots, setActivatingBots] = useState(false);

  const handleRequestAccess = () => {
    // Navigate to contact/settings with access request
    router.push('/settings?tab=subscription&request=ultimate');
  };

  const handleViewDocumentation = () => {
    // Navigate to learn page with UMM documentation
    router.push('/learn?topic=ultimate-money-machine');
  };

  const fetchData = useCallback(async () => {
    try {
      const [botsRes, statusRes, tradesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/ultimate/super-bots`),
        fetch(`${API_BASE}/api/v1/ultimate/live/status`),
        fetch(`${API_BASE}/api/v1/ultimate/live/trades`),
      ]);

      if (botsRes.ok) {
        const data = await botsRes.json();
        setSuperBots(data.bots || []);
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setLiveStatus(data.status || null);
      }
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data.trades || []);

        // Generate activities from trades
        const newActivities: ActivityItem[] = (data.trades || []).slice(0, 10).map((trade: Trade) => ({
          id: trade.id,
          type: 'trade' as const,
          botName: trade.botName,
          message: `${trade.signal.action === 'BUY' ? 'Bought' : 'Sold'} ${trade.signal.symbol}`,
          detail: `Confidence: ${trade.signal.confidence?.toFixed(1)}% | Status: ${trade.status}`,
          timestamp: new Date(trade.executedAt),
          icon: trade.signal.action === 'BUY' ? 'up' : 'down' as const,
        }));
        setActivities(newActivities);
      }
    } catch (error) {
      console.error('Failed to fetch UMM data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activateLegendaryBots = async () => {
    setActivatingBots(true);
    try {
      // Enable paper trading first
      await fetch(`${API_BASE}/api/v1/ultimate/live/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'TIME_ADMIN_2025' },
        body: JSON.stringify({ mode: 'paper' }),
      });

      // Activate all legendary bots
      await fetch(`${API_BASE}/api/v1/ultimate/live/activate-all-legendary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'TIME_ADMIN_2025' },
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to activate bots:', error);
    } finally {
      setActivatingBots(false);
    }
  };

  const generateSignal = async (botId: string, botName: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/ultimate/live/generate-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'TIME_ADMIN_2025' },
        body: JSON.stringify({ botId, symbol: 'AAPL' }),
      });
      const data = await response.json();

      // Add to activities
      const newActivity: ActivityItem = {
        id: `signal-${Date.now()}`,
        type: 'signal',
        botName,
        message: data.trade ? `Executed ${data.trade.signal.action} ${data.trade.signal.symbol}` : 'Generated HOLD signal',
        detail: data.trade ? `Confidence: ${data.trade.signal.confidence?.toFixed(1)}%` : 'Market conditions suggest waiting',
        timestamp: new Date(),
        icon: data.trade?.signal.action === 'BUY' ? 'up' : data.trade?.signal.action === 'SELL' ? 'down' : 'eye',
      };
      setActivities(prev => [newActivity, ...prev.slice(0, 19)]);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to generate signal:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'LEGENDARY': return 'from-yellow-500 to-orange-500';
      case 'EPIC': return 'from-purple-500 to-pink-500';
      case 'RARE': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTierBgColor = (tier: string) => {
    switch (tier) {
      case 'LEGENDARY': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'EPIC': return 'bg-purple-500/10 border-purple-500/30';
      case 'RARE': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const getPlainEnglishExplanation = (bot: SuperBot) => {
    const explanations: Record<string, string> = {
      'ALPHA_HUNTER': `${bot.name} is searching for hidden profit opportunities that most traders miss. It analyzes patterns used by the world's top hedge funds.`,
      'MARKET_MAKER': `${bot.name} provides liquidity by placing buy and sell orders, earning the spread. It uses institutional market-making techniques.`,
      'TREND_FOLLOWER': `${bot.name} identifies and rides major market trends, using momentum and technical analysis to enter at optimal points.`,
      'MEAN_REVERSION': `${bot.name} bets that prices will return to their average. When prices deviate too far, it takes the opposite position.`,
      'ARBITRAGE': `${bot.name} exploits price differences across markets. It buys low in one place and sells high in another simultaneously.`,
      'SENTIMENT_ANALYZER': `${bot.name} reads news, social media, and market sentiment to predict price movements before they happen.`,
      'VOLATILITY_TRADER': `${bot.name} profits from market volatility, whether prices go up or down. It uses options and derivatives strategies.`,
      'SCALPER': `${bot.name} makes many small, quick trades to accumulate profits. It targets tiny price movements with high frequency.`,
    };
    return explanations[bot.category] || `${bot.name} uses advanced AI and machine learning to find profitable trading opportunities across ${bot.markets.join(', ')} markets.`;
  };

  const filteredBots = superBots.filter(bot => bot.tier === selectedTier);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Gem className="w-16 h-16 text-purple-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading Ultimate Money Machine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Gem className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Ultimate Money Machine</h1>
              <p className="text-slate-400">25 Super-Intelligent Trading Bots • Admin Approved Only</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Live Trading Status */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${liveStatus?.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
              <div>
                <h3 className="font-bold text-white">
                  Live Trading: {liveStatus?.isEnabled ? 'ACTIVE' : 'INACTIVE'}
                </h3>
                <p className="text-sm text-slate-400">
                  Mode: {liveStatus?.mode?.toUpperCase() || 'PAPER'} |
                  Active Bots: {liveStatus?.activeBots || 0} |
                  Daily Trades: {liveStatus?.dailyTradeCount || 0}/{liveStatus?.maxDailyTrades || 50}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">
                ${liveStatus?.equity?.current?.toLocaleString() || '99,983.96'}
              </p>
              <p className={`text-sm ${(liveStatus?.equity?.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(liveStatus?.equity?.pnl || 0) >= 0 ? '+' : ''}${liveStatus?.equity?.pnl?.toFixed(2) || '0.00'} P&L
              </p>
            </div>
          </div>
          {!liveStatus?.isEnabled && (
            <button
              onClick={activateLegendaryBots}
              disabled={activatingBots}
              className="mt-3 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {activatingBots ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Activating...</>
              ) : (
                <><Play className="w-4 h-4" /> Activate All LEGENDARY Bots</>
              )}
            </button>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Crown className="w-5 h-5" />
              <span className="text-sm">Super Bots</span>
            </div>
            <p className="text-2xl font-bold text-white">{superBots.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Brain className="w-5 h-5" />
              <span className="text-sm">Abilities</span>
            </div>
            <p className="text-2xl font-bold text-white">{superBots.reduce((sum, b) => sum + (b.abilities?.length || 0), 0)}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Avg Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {superBots.length > 0 ? (superBots.reduce((sum, b) => sum + (b.performance?.winRate || 0), 0) / superBots.length).toFixed(1) : 0}%
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-sm">Trades Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{liveStatus?.dailyTradeCount || 0}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Drawdown</span>
            </div>
            <p className="text-2xl font-bold text-white">{liveStatus?.currentDrawdown || '0.00%'}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Signal Queue</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
        </div>
      </div>

      {/* Plain English Activity Feed */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-400" />
          What's Happening Right Now
        </h2>
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 max-h-64 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No activity yet. Activate bots to start trading!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.icon === 'up' ? 'bg-green-500/20 text-green-400' :
                    activity.icon === 'down' ? 'bg-red-500/20 text-red-400' :
                    activity.icon === 'brain' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {activity.icon === 'up' ? <ArrowUpRight className="w-4 h-4" /> :
                     activity.icon === 'down' ? <ArrowDownRight className="w-4 h-4" /> :
                     activity.icon === 'brain' ? <Brain className="w-4 h-4" /> :
                     <Eye className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{activity.botName}</span>
                      <span className="text-xs text-slate-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{activity.message}</p>
                    <p className="text-xs text-slate-500">{activity.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tier Filter */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-400" />
          25 Super Bots
        </h2>
        <div className="flex gap-2">
          {['LEGENDARY', 'EPIC', 'RARE'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedTier === tier
                  ? `bg-gradient-to-r ${getTierColor(tier)} text-white`
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tier} ({superBots.filter(b => b.tier === tier).length})
            </button>
          ))}
        </div>
      </div>

      {/* Super Bots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBots.map((bot) => (
          <div
            key={bot.id}
            className={`rounded-xl border p-4 transition-all ${getTierBgColor(bot.tier)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTierColor(bot.tier)} flex items-center justify-center`}>
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{bot.name}</h3>
                  <p className="text-sm text-slate-400">{bot.codename}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold bg-gradient-to-r ${getTierColor(bot.tier)} bg-clip-text text-transparent`}>
                  {bot.tier}
                </span>
                <p className="text-xs text-slate-500">{bot.category.replace(/_/g, ' ')}</p>
              </div>
            </div>

            {/* Plain English Explanation */}
            <div className="bg-slate-800/30 rounded-lg p-3 mb-3">
              <p className="text-sm text-slate-300 italic">
                "{getPlainEnglishExplanation(bot)}"
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">ROI</p>
                <p className="text-sm font-bold text-green-400">{bot.expectedROI}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">Win Rate</p>
                <p className="text-sm font-bold text-blue-400">{bot.performance?.winRate?.toFixed(1) || 0}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">Sharpe</p>
                <p className="text-sm font-bold text-purple-400">{bot.performance?.sharpeRatio?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">Max DD</p>
                <p className="text-sm font-bold text-red-400">{bot.performance?.maxDrawdown?.toFixed(1) || 0}%</p>
              </div>
            </div>

            {/* Markets */}
            <div className="flex flex-wrap gap-1 mb-3">
              {bot.markets?.map((market, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                  {market}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => generateSignal(bot.id, bot.name)}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Zap className="w-4 h-4" /> Generate Signal
              </button>
              <button
                onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors flex items-center gap-1"
              >
                {expandedBot === bot.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Abilities
              </button>
            </div>

            {/* Abilities */}
            {expandedBot === bot.id && bot.abilities && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                {bot.abilities.map((ability, i) => (
                  <div key={i} className="bg-slate-800/30 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{ability.name}</span>
                      {ability.priority && (
                        <span className="text-xs text-slate-500">Priority: {ability.priority}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{ability.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            Recent Trades
          </h2>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left text-sm text-slate-400 px-4 py-3">Bot</th>
                  <th className="text-left text-sm text-slate-400 px-4 py-3">Action</th>
                  <th className="text-left text-sm text-slate-400 px-4 py-3">Symbol</th>
                  <th className="text-left text-sm text-slate-400 px-4 py-3">Confidence</th>
                  <th className="text-left text-sm text-slate-400 px-4 py-3">Status</th>
                  <th className="text-left text-sm text-slate-400 px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 10).map((trade) => (
                  <tr key={trade.id} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 text-white">{trade.botName}</td>
                    <td className={`px-4 py-3 font-medium ${trade.signal.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.signal.action}
                    </td>
                    <td className="px-4 py-3 text-white">{trade.signal.symbol}</td>
                    <td className="px-4 py-3 text-slate-300">{trade.signal.confidence?.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trade.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                        trade.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {new Date(trade.executedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Premium CTA */}
      <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 text-center">
        <Gem className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Ultimate Money Machine</h2>
        <p className="text-slate-400 mb-4 max-w-2xl mx-auto">
          25 Super-Intelligent Bots with advanced AI, real broker connections, and self-learning capabilities.
          Contact admin for access to this premium add-on.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRequestAccess}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors"
          >
            Request Access
          </button>
          <button
            onClick={handleViewDocumentation}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            View Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
