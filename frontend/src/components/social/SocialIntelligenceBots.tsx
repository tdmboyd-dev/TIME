'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Dna,
  Users,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  ChevronRight,
  Play,
  Pause,
  Crown,
  Eye,
  BarChart3,
  Activity,
  Gauge,
  Network,
  Scale,
  Lightbulb,
} from 'lucide-react';

interface SocialFeature {
  id: string;
  name: string;
  codename: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  features: string[];
  stats: {
    accuracy: number;
    users: number;
    avgReturn: number;
    signals: number;
  };
  isActive: boolean;
  isPremium: boolean;
  badge?: string;
  performanceFee: number; // % of profits only - FREE for TIMEBEUNUS Admin
}

const socialFeatures: SocialFeature[] = [
  {
    id: 'strategy-dna',
    name: 'Strategy DNA Matching',
    codename: 'DNA_MATCH',
    description: 'AI analyzes YOUR trading DNA - your risk tolerance, time horizon, preferred assets, and trading style. Then finds traders whose DNA is compatible with yours for MUCH better copy results.',
    icon: <Dna className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
    features: [
      'Personality-based matching',
      'Risk tolerance alignment',
      'Trading style compatibility',
      'Historical correlation analysis',
    ],
    stats: { accuracy: 89, users: 15234, avgReturn: 34.2, signals: 0 },
    isActive: false,
    isPremium: true,
    badge: 'EXCLUSIVE',
    performanceFee: 25, // 25% of profits only
  },
  {
    id: 'collective-intelligence',
    name: 'Collective Intelligence Bot',
    codename: 'HIVE_MIND',
    description: 'Aggregates and analyzes signals from the TOP 100 traders in real-time. When multiple top traders make the same move, you get instant alerts. Wisdom of the crowd, amplified by AI.',
    icon: <Network className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    features: [
      'Top 100 trader aggregation',
      'Consensus signal detection',
      'Multi-trader convergence alerts',
      'Smart entry timing',
    ],
    stats: { accuracy: 76, users: 8456, avgReturn: 28.5, signals: 147 },
    isActive: false,
    isPremium: false,
    badge: 'NEW',
    performanceFee: 20, // 20% of profits only
  },
  {
    id: 'ai-confidence',
    name: 'AI Confidence Scoring',
    codename: 'TRUST_SCORE',
    description: 'Every trader gets a real-time AI-generated confidence score. Analyzes consistency, drawdown behavior, risk management, and psychological patterns to predict future reliability.',
    icon: <Gauge className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    features: [
      'Behavioral pattern analysis',
      'Drawdown resilience scoring',
      'Consistency tracking',
      'Early warning signals',
    ],
    stats: { accuracy: 82, users: 23567, avgReturn: 0, signals: 892 },
    isActive: false,
    isPremium: false,
    performanceFee: 15, // 15% of profits only
  },
  {
    id: 'risk-adjusted-copy',
    name: 'Risk-Adjusted Copying',
    codename: 'SMART_COPY',
    description: 'AI dynamically adjusts your copy ratio based on real-time market conditions and trader performance. Copies MORE when trader is on a streak, LESS during volatile periods.',
    icon: <Scale className="w-6 h-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    features: [
      'Dynamic position sizing',
      'Volatility-based adjustments',
      'Streak detection & amplification',
      'Drawdown protection',
    ],
    stats: { accuracy: 0, users: 11234, avgReturn: 41.8, signals: 0 },
    isActive: false,
    isPremium: true,
    performanceFee: 22, // 22% of profits only
  },
];

export function SocialIntelligenceBots() {
  const [features, setFeatures] = useState(socialFeatures);
  const [selectedFeature, setSelectedFeature] = useState<SocialFeature | null>(null);
  const [showModal, setShowModal] = useState(false);

  const toggleFeature = (featureId: string) => {
    setFeatures(prev =>
      prev.map(f => (f.id === featureId ? { ...f, isActive: !f.isActive } : f))
    );
  };

  const formatNumber = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Social Intelligence
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                AI-POWERED
              </span>
            </h2>
            <p className="text-sm text-slate-400">Next-gen AI features for smarter social trading</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(feature => (
          <div
            key={feature.id}
            className={`card p-5 transition-all cursor-pointer hover:border-purple-500/50 ${
              feature.isActive ? 'border-emerald-500/50 bg-emerald-500/5' : ''
            }`}
            onClick={() => {
              setSelectedFeature(feature);
              setShowModal(true);
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center`}>
                  {feature.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{feature.name}</h3>
                    {feature.isPremium && (
                      <Crown className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{feature.codename}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {feature.badge && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                    {feature.badge}
                  </span>
                )}
                {feature.isActive && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{feature.description}</p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {feature.features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-700/50">
              {feature.stats.accuracy > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{feature.stats.accuracy}%</p>
                  <p className="text-[10px] text-slate-500">Accuracy</p>
                </div>
              )}
              {feature.stats.avgReturn > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400">+{feature.stats.avgReturn}%</p>
                  <p className="text-[10px] text-slate-500">Avg Return</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-lg font-bold text-white">{formatNumber(feature.stats.users)}</p>
                <p className="text-[10px] text-slate-500">Users</p>
              </div>
              {feature.stats.signals > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-400">{formatNumber(feature.stats.signals)}</p>
                  <p className="text-[10px] text-slate-500">Signals/Day</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Activate Modal */}
      {showModal && selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${selectedFeature.iconBg} flex items-center justify-center`}>
                  {selectedFeature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedFeature.name}</h3>
                  <p className="text-sm text-slate-400">Configure and activate</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <p className="text-slate-300 mb-6">{selectedFeature.description}</p>

            {/* Features List */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-400 mb-3">What you get:</h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedFeature.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Performance Metrics</h4>
              <div className="grid grid-cols-3 gap-4">
                {selectedFeature.stats.accuracy > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">AI Accuracy</p>
                    <p className="text-lg font-bold text-emerald-400">{selectedFeature.stats.accuracy}%</p>
                  </div>
                )}
                {selectedFeature.stats.avgReturn > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">Avg Return</p>
                    <p className="text-lg font-bold text-cyan-400">+{selectedFeature.stats.avgReturn}%</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Active Users</p>
                  <p className="text-lg font-bold text-white">{formatNumber(selectedFeature.stats.users)}</p>
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
                  <p className="text-lg font-bold text-white">{selectedFeature.performanceFee}% of Profits</p>
                  <p className="text-xs text-slate-400">Only charged when you make money from this feature</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <p className="text-xs text-purple-300 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <strong>TIMEBEUNUS Admin:</strong> 0% fee (completely FREE)
                </p>
              </div>
            </div>

            {/* Premium Badge */}
            {selectedFeature.isPremium && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Premium Feature</p>
                  <p className="text-xs text-amber-400/80">Upgrade to access this exclusive AI capability</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleFeature(selectedFeature.id);
                  setShowModal(false);
                }}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  selectedFeature.isActive
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
                }`}
              >
                {selectedFeature.isActive ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Disable Feature
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Enable Feature
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

export default SocialIntelligenceBots;
