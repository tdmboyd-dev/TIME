'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Zap,
  TrendingUp,
  TrendingDown,
  Brain,
  Activity,
  Target,
  Shield,
  DollarSign,
  Play,
  Pause,
  Settings,
  ChevronRight,
  Sparkles,
  Eye,
  Users,
  BarChart3,
  Waves,
  Newspaper,
  Calendar,
  Leaf,
  Crown,
} from 'lucide-react';

interface InvestmentBot {
  id: string;
  name: string;
  codename: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  features: string[];
  stats: {
    apy: number;
    users: number;
    totalInvested: number;
    winRate: number;
  };
  isActive: boolean;
  isPremium: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  performanceFee: number; // % of profits only - FREE for TIMEBEUNUS Admin
}

const investmentBots: InvestmentBot[] = [
  {
    id: 'whale-shadow',
    name: 'Whale Shadow Bot',
    codename: 'WHALE_TRACKER',
    description: 'Tracks large institutional wallet movements and positions you alongside whales BEFORE major price moves. Uses on-chain analysis to detect accumulation patterns.',
    icon: <Waves className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    features: [
      'Real-time whale wallet monitoring',
      'On-chain accumulation detection',
      'Auto-position before whale moves',
      'Exit alerts when whales sell',
    ],
    stats: { apy: 47.2, users: 2847, totalInvested: 4200000, winRate: 73 },
    isActive: false,
    isPremium: true,
    riskLevel: 'high',
    performanceFee: 25, // 25% of profits only
  },
  {
    id: 'sentiment-pulse',
    name: 'Sentiment Pulse Bot',
    codename: 'AI_SENTIMENT',
    description: 'Scans news, social media, Reddit, Twitter/X in real-time. Buys during extreme fear, sells during extreme greed. Uses GPT-4 for sentiment analysis.',
    icon: <Newspaper className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
    features: [
      'Real-time news sentiment analysis',
      'Social media mood tracking',
      'Fear & Greed index integration',
      'Instant execution on sentiment shifts',
    ],
    stats: { apy: 38.5, users: 5123, totalInvested: 8900000, winRate: 68 },
    isActive: false,
    isPremium: false,
    riskLevel: 'medium',
    performanceFee: 20, // 20% of profits only
  },
  {
    id: 'smart-dca',
    name: 'Smart DCA Bot',
    codename: 'AI_DCA',
    description: 'AI-powered Dollar Cost Averaging that determines OPTIMAL buy times instead of fixed intervals. Buys more when fear is high, less when greed is high.',
    icon: <Calendar className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    features: [
      'AI-determined optimal buy times',
      'Dynamic position sizing',
      'Volatility-adjusted entries',
      'Historical pattern matching',
    ],
    stats: { apy: 29.8, users: 12456, totalInvested: 23000000, winRate: 81 },
    isActive: false,
    isPremium: false,
    riskLevel: 'low',
    performanceFee: 15, // 15% of profits only
  },
  {
    id: 'tax-harvester',
    name: 'Tax Harvester Bot',
    codename: 'TAX_OPTIMIZER',
    description: 'Automatically sells losing positions to offset capital gains, then instantly reinvests in similar assets to maintain market exposure. Saves you money on taxes.',
    icon: <Leaf className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    features: [
      'Auto tax-loss harvesting',
      'Wash-sale rule compliance',
      'Similar asset replacement',
      'Tax savings estimator',
    ],
    stats: { apy: 18.4, users: 8234, totalInvested: 156000000, winRate: 92 },
    isActive: false,
    isPremium: true,
    riskLevel: 'low',
    performanceFee: 20, // 20% of profits only
  },
];

export function AIInvestmentBots() {
  const [bots, setBots] = useState(investmentBots);
  const [selectedBot, setSelectedBot] = useState<InvestmentBot | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [investAmount, setInvestAmount] = useState('1000');

  const toggleBot = (botId: string) => {
    setBots(prev =>
      prev.map(b => (b.id === botId ? { ...b, isActive: !b.isActive } : b))
    );
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-emerald-400 bg-emerald-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              AI Investment Bots
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                NEW
              </span>
            </h2>
            <p className="text-sm text-slate-400">Never-before-seen AI-powered investment automation</p>
          </div>
        </div>
      </div>

      {/* Bot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bots.map(bot => (
          <div
            key={bot.id}
            className={`card p-5 transition-all cursor-pointer hover:border-purple-500/50 ${
              bot.isActive ? 'border-emerald-500/50 bg-emerald-500/5' : ''
            }`}
            onClick={() => {
              setSelectedBot(bot);
              setShowActivateModal(true);
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${bot.iconBg} flex items-center justify-center`}>
                  {bot.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{bot.name}</h3>
                    {bot.isPremium && (
                      <Crown className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{bot.codename}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(bot.riskLevel)}`}>
                  {bot.riskLevel.toUpperCase()}
                </span>
                {bot.isActive && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{bot.description}</p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {bot.features.slice(0, 4).map((feature, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="truncate">{feature}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">+{bot.stats.apy}%</p>
                <p className="text-[10px] text-slate-500">APY</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{bot.stats.winRate}%</p>
                <p className="text-[10px] text-slate-500">Win Rate</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{bot.stats.users.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-cyan-400">{formatCurrency(bot.stats.totalInvested)}</p>
                <p className="text-[10px] text-slate-500">Invested</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activate Modal */}
      {showActivateModal && selectedBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${selectedBot.iconBg} flex items-center justify-center`}>
                  {selectedBot.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedBot.name}</h3>
                  <p className="text-sm text-slate-400">Configure and activate</p>
                </div>
              </div>
              <button
                onClick={() => setShowActivateModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <p className="text-slate-300 mb-6">{selectedBot.description}</p>

            {/* Investment Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Investment Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="number"
                  value={investAmount}
                  onChange={e => setInvestAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="1000"
                  min="100"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000, 10000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setInvestAmount(amount.toString())}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Returns */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Projected Returns (Based on Historical Performance)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Monthly</p>
                  <p className="text-lg font-bold text-emerald-400">
                    +${((parseFloat(investAmount) || 0) * (selectedBot.stats.apy / 100 / 12)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Yearly</p>
                  <p className="text-lg font-bold text-emerald-400">
                    +${((parseFloat(investAmount) || 0) * (selectedBot.stats.apy / 100)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">APY</p>
                  <p className="text-lg font-bold text-cyan-400">{selectedBot.stats.apy}%</p>
                </div>
              </div>
            </div>

            {/* Fee Structure - Performance Based */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-purple-300">Fee Structure</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  NO UPFRONT COST
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{selectedBot.performanceFee}% of Profits</p>
                  <p className="text-xs text-slate-400">Only charged on winning trades - you only pay when you make money</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <p className="text-xs text-purple-300 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <strong>TIMEBEUNUS Admin:</strong> 0% fee (completely FREE)
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <p className="text-xs text-amber-300">
                <strong>Risk Warning:</strong> Past performance does not guarantee future results. Only invest what you can afford to lose.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowActivateModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleBot(selectedBot.id);
                  setShowActivateModal(false);
                }}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  selectedBot.isActive
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500'
                }`}
              >
                {selectedBot.isActive ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Deactivate Bot
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Activate Bot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIInvestmentBots;
