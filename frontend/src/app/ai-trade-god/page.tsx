'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Bot,
  TrendingUp,
  Shield,
  DollarSign,
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
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

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

export default function AITradeGodPage() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [command, setCommand] = useState('');
  const [commandResponse, setCommandResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBots();
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
                  <button className="px-4 py-2 bg-slate-500/20 text-slate-400 rounded-lg hover:bg-slate-500/30 transition-colors flex items-center gap-2">
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
          <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Whale Hunter Pro</span>
            </div>
            <p className="text-green-400 text-lg font-bold mb-1">+127.4% (30D)</p>
            <p className="text-slate-400 text-sm mb-3">By @CryptoKing</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">$50/mo + 15% profit</span>
              <button className="text-amber-400 hover:text-amber-300">Borrow</button>
            </div>
          </div>
          <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">DCA Master</span>
            </div>
            <p className="text-green-400 text-lg font-bold mb-1">+45.2% (30D)</p>
            <p className="text-slate-400 text-sm mb-3">By @SteadyGains</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">$20/mo + 10% profit</span>
              <button className="text-amber-400 hover:text-amber-300">Borrow</button>
            </div>
          </div>
          <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">Grid Genius</span>
            </div>
            <p className="text-green-400 text-lg font-bold mb-1">+89.7% (30D)</p>
            <p className="text-slate-400 text-sm mb-3">By @GridMaster</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">$35/mo + 12% profit</span>
              <button className="text-amber-400 hover:text-amber-300">Borrow</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
