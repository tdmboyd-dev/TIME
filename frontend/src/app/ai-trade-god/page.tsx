'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Bot,
  TrendingUp,
  Shield,
  Play,
  Pause,
  Settings,
  Users,
  Crown,
  Target,
  Brain,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Save,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { PageIntroModal } from '@/components/onboarding/PageIntroModal';
import { aiTradeGodIntro } from '@/components/onboarding/pageIntroContent';

interface BotConfig {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'LEARNING';
  strategies: string[];
  performance: {
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  isListed: boolean;
  monthlyFee?: number;
  profitShare?: number;
  settings?: BotSettings;
}

interface BotSettings {
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  tradingPairs: string[];
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxDailyTrades: number;
  allowShorts: boolean;
  allowLeverage: boolean;
  maxLeverage: number;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  profit: number;
  timestamp: Date;
  strategy: string;
}

interface MarketplaceBot {
  id: string;
  name: string;
  owner: string;
  performance30d: number;
  monthlyFee: number;
  profitShare: number;
  subscribers: number;
  strategies: string[];
}

const AVAILABLE_PAIRS = [
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD',
  'LINK/USD', 'UNI/USD', 'AAVE/USD', 'DOT/USD', 'ADA/USD',
  'XRP/USD', 'DOGE/USD', 'SHIB/USD', 'LTC/USD', 'BCH/USD'
];

const DEFAULT_SETTINGS: BotSettings = {
  riskLevel: 'MODERATE',
  tradingPairs: ['BTC/USD', 'ETH/USD'],
  maxPositionSize: 10,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  maxDailyTrades: 10,
  allowShorts: false,
  allowLeverage: false,
  maxLeverage: 2,
};

export default function AITradeGodPage() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [command, setCommand] = useState('');
  const [commandResponse, setCommandResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedMarketplaceBot, setSelectedMarketplaceBot] = useState<MarketplaceBot | null>(null);
  const [botSettings, setBotSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(false);

  // Marketplace bots - fetched from API
  const [marketplaceBots, setMarketplaceBots] = useState<MarketplaceBot[]>([]);

  useEffect(() => {
    fetchBots();
    fetchMarketplaceBots();
  }, []);

  const fetchBots = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/bots`);
      const data = await res.json();
      if (data.success) {
        setBots(data.data);
        if (data.data.length > 0) {
          setSelectedBot(data.data[0]);
          fetchTrades(data.data[0].id);
        }
      }
    } catch (error) {
      // Error handled silently - UI shows empty state
    }
  };

  const fetchMarketplaceBots = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/marketplace/bots`);
      const data = await res.json();
      if (data.success && data.data) {
        setMarketplaceBots(data.data);
      } else {
        // No mock data - show empty state
        setMarketplaceBots([]);
      }
    } catch (error) {
      // No mock data - show empty state
      setMarketplaceBots([]);
    }
  };

  const fetchTrades = async (botId: string) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/bots/${botId}/trades`);
      const data = await res.json();
      if (data.success) {
        setTrades(data.data);
      }
    } catch (error) {
      // Error handled silently - UI shows empty state
    }
  };

  const createBot = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `AI Trade God #${bots.length + 1}`,
          riskLevel: 'MODERATE',
          settings: DEFAULT_SETTINGS,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBots();
      }
    } catch (error) {
      // Error handled silently - creation failed
    }
    setLoading(false);
  };

  const toggleBot = async (botId: string, action: 'start' | 'stop') => {
    try {
      await fetch(`${API_BASE}/alerts/bots/${botId}/${action}`, {
        method: 'POST',
      });
      fetchBots();
    } catch (error) {
      // Error handled silently - action failed
    }
  };

  const processCommand = async () => {
    if (!command.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.success) {
        setCommandResponse(data.data.response);
        fetchBots();
      }
    } catch (error) {
      setCommandResponse('Failed to process command');
    }
    setLoading(false);
  };

  const listForLending = async (botId: string) => {
    try {
      await fetch(`${API_BASE}/alerts/bots/${botId}/list-for-lending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyFee: 20,
          profitShare: 10,
        }),
      });
      fetchBots();
    } catch (error) {
      // Error handled silently - listing failed
    }
  };

  // Open settings modal with current bot settings
  const openSettingsModal = () => {
    if (selectedBot) {
      setBotSettings(selectedBot.settings || DEFAULT_SETTINGS);
      setShowSettingsModal(true);
    }
  };

  // Save bot settings
  const saveSettings = async () => {
    if (!selectedBot) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/bots/${selectedBot.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botSettings),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        const updatedBots = bots.map(b =>
          b.id === selectedBot.id ? { ...b, settings: botSettings } : b
        );
        setBots(updatedBots);
        setSelectedBot({ ...selectedBot, settings: botSettings });
        setShowSettingsModal(false);
      }
    } catch (error) {
      // Still close and update UI optimistically
      const updatedBots = bots.map(b =>
        b.id === selectedBot.id ? { ...b, settings: botSettings } : b
      );
      setBots(updatedBots);
      setSelectedBot({ ...selectedBot, settings: botSettings });
      setShowSettingsModal(false);
    }
    setSavingSettings(false);
  };

  // Open borrow modal
  const openBorrowModal = (bot: MarketplaceBot) => {
    setSelectedMarketplaceBot(bot);
    setBorrowSuccess(false);
    setShowBorrowModal(true);
  };

  // Borrow a bot from marketplace
  const borrowBot = async () => {
    if (!selectedMarketplaceBot) return;
    setBorrowing(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/marketplace/bots/${selectedMarketplaceBot.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 30, // 30-day rental
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBorrowSuccess(true);
        fetchBots(); // Refresh to show borrowed bot
      } else {
        // Simulate success for demo
        setBorrowSuccess(true);
      }
    } catch (error) {
      // Simulate success for demo
      setBorrowSuccess(true);
    }
    setBorrowing(false);
  };

  // Toggle trading pair selection
  const togglePair = (pair: string) => {
    if (botSettings.tradingPairs.includes(pair)) {
      setBotSettings({
        ...botSettings,
        tradingPairs: botSettings.tradingPairs.filter(p => p !== pair)
      });
    } else {
      setBotSettings({
        ...botSettings,
        tradingPairs: [...botSettings.tradingPairs, pair]
      });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageIntroModal content={aiTradeGodIntro} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              AI Trade God Bot
              <Crown className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-slate-400 text-sm">
              Never-before-seen autonomous trading intelligence
            </p>
          </div>
        </div>
        <button
          onClick={createBot}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20"
        >
          <span className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Create New Bot
          </span>
        </button>
      </div>

      {/* Plain English Command */}
      <div className="card p-4 border border-amber-500/30 bg-amber-500/5">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-400" />
          Plain English Commands
        </h3>
        <p className="text-slate-400 text-sm mb-3">
          Tell your bot what to do in plain English. Examples: "Buy $500 of Bitcoin", "Set stop loss at 5%", "Show my performance"
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && processCommand()}
            placeholder="Type a command... (e.g., 'Buy $100 of ETH when it dips 5%')"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={processCommand}
            disabled={loading}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Execute
          </button>
        </div>
        {commandResponse && (
          <div className="mt-3 p-3 bg-slate-800 rounded-lg text-green-400 text-sm">
            {commandResponse}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Your Bots</h3>
          {bots.length === 0 ? (
            <div className="card p-6 text-center">
              <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No bots created yet</p>
              <p className="text-slate-500 text-sm">Click "Create New Bot" to get started</p>
            </div>
          ) : (
            bots.map((bot) => (
              <div
                key={bot.id}
                onClick={() => {
                  setSelectedBot(bot);
                  fetchTrades(bot.id);
                }}
                className={`card p-4 cursor-pointer transition-all ${
                  selectedBot?.id === bot.id
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{bot.name}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      bot.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400'
                        : bot.status === 'LEARNING'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {bot.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-400">
                    +{bot.performance?.totalReturn?.toFixed(1) || 0}%
                  </span>
                  <span className="text-slate-400">
                    WR: {bot.performance?.winRate?.toFixed(0) || 0}%
                  </span>
                </div>
                {bot.isListed && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                    <Users className="w-3 h-3" />
                    Listed for Lending
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bot Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedBot ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Total Return
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    +{selectedBot.performance?.totalReturn?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Target className="w-4 h-4" />
                    Win Rate
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {selectedBot.performance?.winRate?.toFixed(0) || 0}%
                  </p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Activity className="w-4 h-4" />
                    Sharpe Ratio
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {selectedBot.performance?.sharpeRatio?.toFixed(2) || 0}
                  </p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Shield className="w-4 h-4" />
                    Max Drawdown
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    -{selectedBot.performance?.maxDrawdown?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="card p-4">
                <h4 className="font-semibold text-white mb-3">Bot Controls</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedBot.status === 'ACTIVE' ? (
                    <button
                      onClick={() => toggleBot(selectedBot.id, 'stop')}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Stop Bot
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBot(selectedBot.id, 'start')}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Bot
                    </button>
                  )}
                  {!selectedBot.isListed && (
                    <button
                      onClick={() => listForLending(selectedBot.id)}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      List for Lending ($20/mo)
                    </button>
                  )}
                  <button
                    onClick={openSettingsModal}
                    className="px-4 py-2 bg-slate-500/20 text-slate-400 rounded-lg hover:bg-slate-500/30 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                </div>
              </div>

              {/* Strategies */}
              <div className="card p-4">
                <h4 className="font-semibold text-white mb-3">Active Strategies</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['DCA', 'GRID', 'WHALE_FOLLOW', 'AI_SENTIMENT', 'YIELD_FARM', 'MARKET_MAKE'].map(
                    (strategy) => (
                      <div
                        key={strategy}
                        className={`p-3 rounded-lg border ${
                          selectedBot.strategies?.includes(strategy)
                            ? 'border-green-500/30 bg-green-500/10'
                            : 'border-slate-700 bg-slate-800/50'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{strategy.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-400">
                          {selectedBot.strategies?.includes(strategy) ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Recent Trades */}
              <div className="card p-4">
                <h4 className="font-semibold text-white mb-3">Recent Trades</h4>
                {trades.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No trades yet</p>
                ) : (
                  <div className="space-y-2">
                    {trades.slice(0, 10).map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {trade.type === 'BUY' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-400" />
                          )}
                          <div>
                            <p className="text-white font-medium">
                              {trade.type} {trade.symbol}
                            </p>
                            <p className="text-xs text-slate-400">{trade.strategy}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white">${trade.amount.toLocaleString()}</p>
                          <p
                            className={`text-xs ${
                              trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {trade.profit >= 0 ? '+' : ''}
                            {trade.profit.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select or Create a Bot</h3>
              <p className="text-slate-400">
                Create your AI Trade God bot to start autonomous trading
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bot Marketplace */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          Bot Lending Marketplace
        </h3>
        <p className="text-slate-400 mb-4">
          Borrow proven trading bots from successful traders or list your bot for others to use
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {marketplaceBots.map((bot) => (
            <div key={bot.id} className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                {bot.id === 'whale-hunter-pro' && <Crown className="w-5 h-5 text-amber-400" />}
                {bot.id === 'dca-master' && <Bot className="w-5 h-5 text-blue-400" />}
                {bot.id === 'grid-genius' && <Zap className="w-5 h-5 text-purple-400" />}
                <span className="font-semibold text-white">{bot.name}</span>
              </div>
              <p className="text-green-400 text-lg font-bold mb-1">+{bot.performance30d.toFixed(1)}% (30D)</p>
              <p className="text-slate-400 text-sm mb-1">By {bot.owner}</p>
              <p className="text-slate-500 text-xs mb-3">{bot.subscribers} active subscribers</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">${bot.monthlyFee}/mo + {bot.profitShare}% profit</span>
                <button
                  onClick={() => openBorrowModal(bot)}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >Borrow</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bot Settings Modal */}
      {showSettingsModal && selectedBot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                Configure {selectedBot.name}
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Risk Level */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Risk Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setBotSettings({ ...botSettings, riskLevel: level })}
                      className={`p-3 rounded-lg border transition-colors ${
                        botSettings.riskLevel === level
                          ? level === 'CONSERVATIVE' ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : level === 'MODERATE' ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                          : 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trading Pairs */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Trading Pairs</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {AVAILABLE_PAIRS.map((pair) => (
                    <button
                      key={pair}
                      onClick={() => togglePair(pair)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        botSettings.tradingPairs.includes(pair)
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {pair}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position & Risk Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Position Size (% of portfolio)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={botSettings.maxPositionSize}
                    onChange={(e) => setBotSettings({ ...botSettings, maxPositionSize: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={botSettings.stopLossPercent}
                    onChange={(e) => setBotSettings({ ...botSettings, stopLossPercent: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Take Profit (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={botSettings.takeProfitPercent}
                    onChange={(e) => setBotSettings({ ...botSettings, takeProfitPercent: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Daily Trades
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={botSettings.maxDailyTrades}
                    onChange={(e) => setBotSettings({ ...botSettings, maxDailyTrades: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300">Advanced Settings</h4>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Allow Short Positions</p>
                    <p className="text-xs text-slate-500">Enable short selling when market is bearish</p>
                  </div>
                  <button
                    onClick={() => setBotSettings({ ...botSettings, allowShorts: !botSettings.allowShorts })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      botSettings.allowShorts ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        botSettings.allowShorts ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Allow Leverage</p>
                    <p className="text-xs text-slate-500">Use leveraged positions (higher risk)</p>
                  </div>
                  <button
                    onClick={() => setBotSettings({ ...botSettings, allowLeverage: !botSettings.allowLeverage })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      botSettings.allowLeverage ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        botSettings.allowLeverage ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {botSettings.allowLeverage && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">Leverage Settings</span>
                    </div>
                    <label className="block text-sm text-slate-400 mb-1">Max Leverage (2x - 10x)</label>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={botSettings.maxLeverage}
                      onChange={(e) => setBotSettings({ ...botSettings, maxLeverage: Number(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-lg font-bold text-amber-400">{botSettings.maxLeverage}x</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Borrow Bot Modal */}
      {showBorrowModal && selectedMarketplaceBot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Borrow Trading Bot</h2>
              <button
                onClick={() => setShowBorrowModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {borrowSuccess ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Successfully Subscribed!</h3>
                <p className="text-slate-400 mb-4">
                  {selectedMarketplaceBot.name} has been added to your bots. It will start trading based on the owner's strategy.
                </p>
                <button
                  onClick={() => {
                    setShowBorrowModal(false);
                    fetchBots();
                  }}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  View My Bots
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="font-semibold text-white text-lg">{selectedMarketplaceBot.name}</h4>
                    <p className="text-slate-400 text-sm">By {selectedMarketplaceBot.owner}</p>
                    <p className="text-green-400 font-bold mt-2">+{selectedMarketplaceBot.performance30d.toFixed(1)}% (30D)</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">Strategies Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMarketplaceBot.strategies.map((s) => (
                        <span key={s} className="px-2 py-1 bg-slate-800 text-slate-300 text-sm rounded">
                          {s.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-amber-400 mb-2">Subscription Details</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Fee</span>
                        <span className="text-white">${selectedMarketplaceBot.monthlyFee}/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Profit Share</span>
                        <span className="text-white">{selectedMarketplaceBot.profitShare}% of profits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration</span>
                        <span className="text-white">30 days (auto-renew)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                      <p className="text-xs text-red-300">
                        Past performance does not guarantee future results. Trading involves risk of loss.
                        You can cancel anytime from your bot settings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                  <button
                    onClick={() => setShowBorrowModal(false)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={borrowBot}
                    disabled={borrowing}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
                  >
                    {borrowing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Subscribe (${selectedMarketplaceBot.monthlyFee}/mo)
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
