'use client';

import { useState, useEffect } from 'react';
import {
  Gem, Crown, Zap, Shield, Brain, Target, TrendingUp,
  Bot, Rocket, Star, Lock, CheckCircle, Play, Pause,
  ChevronDown, ChevronUp, Activity, DollarSign
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

interface SuperBot {
  id: string;
  name: string;
  codename: string;
  tier: 'LEGENDARY' | 'EPIC' | 'RARE';
  category: string;
  description: string;
  absorbedFrom: string[];
  abilities: { name: string; source: string; description: string }[];
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

interface UMMStatus {
  status: {
    isRunning: boolean;
    mode: string;
    config: any;
  };
  components: {
    autoRoleManager: { totalBots: number; roles: Record<string, number> };
    knowledgeBase: { patterns: number };
    attackStrategies: { totalStrategies: number; activeStrategies: number };
    institutional: { total: number; implemented: number; avgEdge: number };
    superBots: { totalBots: number; byTier: Record<string, number>; avgExpectedROI: number; totalAbilities: number };
  };
  subscription: { totalSubscribers: number; mrr: number };
}

interface Tier {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    maxBots: number;
    maxPositions: number;
    maxDailyTrades: number;
  };
}

export default function UltimatePage() {
  const [superBots, setSuperBots] = useState<SuperBot[]>([]);
  const [status, setStatus] = useState<UMMStatus | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('LEGENDARY');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [botsRes, statusRes, tiersRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/ultimate/super-bots`),
        fetch(`${API_BASE}/api/v1/ultimate/status`),
        fetch(`${API_BASE}/api/v1/ultimate/tiers`),
      ]);

      if (botsRes.ok) {
        const data = await botsRes.json();
        setSuperBots(data.bots || []);
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
      if (tiersRes.ok) {
        const data = await tiersRes.json();
        setTiers(data.tiers || []);
      }
    } catch (error) {
      console.error('Failed to fetch UMM data:', error);
    } finally {
      setLoading(false);
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
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Gem className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Ultimate Money Machine</h1>
            <p className="text-slate-400">The most advanced trading AI ever built • $59/month Premium</p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Crown className="w-5 h-5" />
              <span className="text-sm">Super Bots</span>
            </div>
            <p className="text-2xl font-bold text-white">{status?.components.superBots.totalBots || 25}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Brain className="w-5 h-5" />
              <span className="text-sm">Abilities</span>
            </div>
            <p className="text-2xl font-bold text-white">{status?.components.superBots.totalAbilities || 115}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Bot className="w-5 h-5" />
              <span className="text-sm">Regular Bots</span>
            </div>
            <p className="text-2xl font-bold text-white">{status?.components.autoRoleManager.totalBots || 133}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Attack Strategies</span>
            </div>
            <p className="text-2xl font-bold text-white">{status?.components.attackStrategies.totalStrategies || 12}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Avg ROI</span>
            </div>
            <p className="text-2xl font-bold text-white">{status?.components.superBots.avgExpectedROI?.toFixed(1) || 27}%</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Institutional</span>
            </div>
            <p className="text-2xl font-bold text-white">{status?.components.institutional.total || 19}</p>
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-400" />
          Subscription Tiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-xl p-4 border ${
                tier.id === 'premium'
                  ? 'bg-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'bg-slate-900/50 border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">{tier.name}</span>
                {tier.id === 'premium' && <Gem className="w-5 h-5 text-purple-400" />}
              </div>
              <p className="text-2xl font-bold text-white mb-2">
                ${tier.price}<span className="text-sm text-slate-400">/mo</span>
              </p>
              <ul className="space-y-1">
                {tier.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full mt-3 py-2 rounded-lg text-sm font-medium ${
                  tier.id === 'premium'
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tier.price === 0 ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
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
                <p className="text-xs text-slate-500">{bot.category.replace('_', ' ')}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-3 line-clamp-2">{bot.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">ROI</p>
                <p className="text-sm font-bold text-green-400">{bot.expectedROI}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">Win Rate</p>
                <p className="text-sm font-bold text-blue-400">{bot.performance.winRate.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">Sharpe</p>
                <p className="text-sm font-bold text-purple-400">{bot.performance.sharpeRatio.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">Max DD</p>
                <p className="text-sm font-bold text-red-400">{bot.performance.maxDrawdown.toFixed(1)}%</p>
              </div>
            </div>

            {/* Absorbed From */}
            <div className="flex flex-wrap gap-1 mb-3">
              {bot.absorbedFrom.slice(0, 3).map((source, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                  {source}
                </span>
              ))}
              {bot.absorbedFrom.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                  +{bot.absorbedFrom.length - 3} more
                </span>
              )}
            </div>

            {/* Expand/Collapse */}
            <button
              onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
              className="w-full flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {expandedBot === bot.id ? (
                <>Hide Abilities <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show {bot.abilities.length} Abilities <ChevronDown className="w-4 h-4" /></>
              )}
            </button>

            {/* Abilities */}
            {expandedBot === bot.id && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                {bot.abilities.map((ability, i) => (
                  <div key={i} className="bg-slate-800/30 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{ability.name}</span>
                      <span className="text-xs text-slate-500">{ability.source}</span>
                    </div>
                    <p className="text-xs text-slate-400">{ability.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Premium CTA */}
      <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 text-center">
        <Gem className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Unlock the Ultimate Money Machine</h2>
        <p className="text-slate-400 mb-4 max-w-2xl mx-auto">
          Get access to all 25 Super Bots, 133 regular bots, 12 attack strategies, 19 institutional techniques,
          and the self-learning AI system. Start your 7-day free trial today.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors">
            Start 7-Day Free Trial
          </button>
          <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors">
            View All Features
          </button>
        </div>
      </div>
    </div>
  );
}
