'use client';

import { useState, useEffect } from 'react';
import {
  Crown, Zap, Target, Brain, TrendingUp, TrendingDown, Shield, Activity,
  BarChart3, Eye, Rocket, Flame, Trophy, Users, Play, Pause, Settings,
  RefreshCw, ChevronRight, AlertTriangle, CheckCircle, Clock, DollarSign,
  Percent, ArrowUpRight, ArrowDownRight, Loader2, X, Info, Wifi, WifiOff,
  Swords, Star
} from 'lucide-react';
import clsx from 'clsx';

type DominanceMode = 'stealth' | 'aggressive' | 'defensive' | 'balanced' | 'competition' | 'destroy';

interface AlphaSignal {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  strength: number;
  confidence: number;
  expectedReturn: number;
  strategy: string;
  timestamp: Date;
}

interface CompetitorAnalysis {
  name: string;
  company: string;
  annualReturn: number;
  ourAdvantage: number;
}

interface FusedStrategy {
  id: string;
  name: string;
  backtestReturn: number;
  backtestSharpe: number;
  status: 'live' | 'testing';
  vsRenaissance: number;
}

const dominanceModes = [
  { id: 'stealth' as DominanceMode, name: 'Stealth', description: 'Quiet accumulation', color: 'from-slate-500 to-slate-600', aggressiveness: 30 },
  { id: 'defensive' as DominanceMode, name: 'Defensive', description: 'Capital preservation', color: 'from-blue-500 to-blue-600', aggressiveness: 40 },
  { id: 'balanced' as DominanceMode, name: 'Balanced', description: 'Standard operation', color: 'from-green-500 to-green-600', aggressiveness: 70 },
  { id: 'aggressive' as DominanceMode, name: 'Aggressive', description: 'Maximum alpha extraction', color: 'from-orange-500 to-orange-600', aggressiveness: 85 },
  { id: 'competition' as DominanceMode, name: 'Competition', description: 'Beat the benchmarks', color: 'from-purple-500 to-purple-600', aggressiveness: 80 },
  { id: 'destroy' as DominanceMode, name: 'DESTROY', description: 'Full power - crush everything', color: 'from-red-500 to-red-600', aggressiveness: 100 },
];

export default function TIMEBEUNUSPage() {
  const [isActive, setIsActive] = useState(true);
  const [dominanceMode, setDominanceMode] = useState<DominanceMode>('balanced');
  const [performance, setPerformance] = useState({
    dailyReturn: 0.82, weeklyReturn: 4.23, monthlyReturn: 12.45, yearlyReturn: 156.78,
    sharpeRatio: 2.34, maxDrawdown: 8.5, winRate: 68.5, totalTrades: 1247,
    vsRenaissance: 45.2, vsTwoSigma: 128.5, vs3Commas: 312.8, dominanceScore: 87,
    isBeatingCompetitors: true
  });
  const [alphaSignals, setAlphaSignals] = useState<AlphaSignal[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([]);
  const [strategies, setStrategies] = useState<FusedStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModeModal, setShowModeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [tradeAmount, setTradeAmount] = useState('1000');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<AlphaSignal | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setAlphaSignals([
        { id: '1', symbol: 'AAPL', direction: 'long', strength: 78, confidence: 85, expectedReturn: 3.2, strategy: 'Mean Reversion King', timestamp: new Date() },
        { id: '2', symbol: 'ETH', direction: 'long', strength: 82, confidence: 79, expectedReturn: 5.8, strategy: 'Momentum Factor', timestamp: new Date(Date.now() - 300000) },
        { id: '3', symbol: 'TSLA', direction: 'short', strength: 68, confidence: 72, expectedReturn: 2.1, strategy: 'Statistical Arbitrage', timestamp: new Date(Date.now() - 600000) },
        { id: '4', symbol: 'GBP/USD', direction: 'long', strength: 75, confidence: 81, expectedReturn: 1.5, strategy: 'Forex Fury Range', timestamp: new Date(Date.now() - 900000) },
        { id: '5', symbol: 'SPY', direction: 'long', strength: 88, confidence: 90, expectedReturn: 1.8, strategy: 'Trend Following Master', timestamp: new Date(Date.now() - 1200000) },
      ]);
      setCompetitors([
        { name: 'Medallion Fund', company: 'Renaissance', annualReturn: 66, ourAdvantage: 45 },
        { name: 'Compass Fund', company: 'Two Sigma', annualReturn: 15, ourAdvantage: 128 },
        { name: 'SmartTrade Bot', company: '3Commas', annualReturn: 18, ourAdvantage: 312 },
        { name: 'AI Strategy', company: 'Cryptohopper', annualReturn: 15, ourAdvantage: 340 },
        { name: 'Forex Fury', company: 'Forex Fury', annualReturn: 60, ourAdvantage: 89 },
      ]);
      setStrategies([
        { id: '1', name: 'The Medallion Crusher', backtestReturn: 95, backtestSharpe: 2.8, status: 'live', vsRenaissance: 45 },
        { id: '2', name: 'The Crypto Dominator', backtestReturn: 120, backtestSharpe: 1.8, status: 'live', vsRenaissance: 80 },
        { id: '3', name: 'The Forex Fury Killer', backtestReturn: 80, backtestSharpe: 3.0, status: 'live', vsRenaissance: 20 },
        { id: '4', name: 'The Ultimate Yield Machine', backtestReturn: 35, backtestSharpe: 2.5, status: 'live', vsRenaissance: -50 },
        { id: '5', name: 'The YOLO Destroyer', backtestReturn: 250, backtestSharpe: 1.2, status: 'testing', vsRenaissance: 280 },
      ]);
      setIsLoading(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setPerformance(prev => ({
        ...prev,
        dailyReturn: prev.dailyReturn + (Math.random() - 0.4) * 0.1,
        dominanceScore: Math.min(100, Math.max(0, prev.dominanceScore + (Math.random() - 0.45) * 2)),
        totalTrades: prev.totalTrades + (Math.random() > 0.7 ? 1 : 0),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive]);

  const handleModeChange = (mode: DominanceMode) => {
    setDominanceMode(mode);
    setShowModeModal(false);
    setNotification({ type: 'success', message: `Dominance mode changed to ${mode.toUpperCase()}` });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTradeSignal = (signal: AlphaSignal) => {
    setSelectedSignal(signal);
    setShowTradeModal(true);
  };

  const executeTrade = () => {
    if (!selectedSignal) return;
    setNotification({ type: 'success', message: `Trade executed: ${selectedSignal.direction.toUpperCase()} ${selectedSignal.symbol} with $${parseFloat(tradeAmount).toLocaleString()}` });
    setShowTradeModal(false);
    setSelectedSignal(null);
    setTimeout(() => setNotification(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-pulse mb-6">TIMEBEUNUS</div>
          <Loader2 className="w-12 h-12 text-red-500 mx-auto animate-spin mb-4" />
          <p className="text-white font-medium">Awakening the Industry Destroyer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className={clsx('fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg',
          notification.type === 'success' && 'bg-green-500/20 border border-green-500/50 text-green-400',
          notification.type === 'error' && 'bg-red-500/20 border border-red-500/50 text-red-400',
          notification.type === 'info' && 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
        )}>
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/30 via-orange-900/20 to-yellow-900/10 border border-red-500/30 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400">TIMEBEUNUS</h1>
              <p className="text-red-300/80">The Industry Destroyer</p>
            </div>
            <div className="ml-4">
              {isActive ? (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />ONLINE
                </span>
              ) : (
                <span className="px-3 py-1.5 bg-slate-500/20 border border-slate-500/50 rounded-full text-slate-400 text-sm">OFFLINE</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowModeModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border bg-gradient-to-r ${dominanceModes.find(m => m.id === dominanceMode)?.color} border-transparent text-white`}>
              <Flame className="w-4 h-4" />{dominanceMode.toUpperCase()}
            </button>
            <button onClick={() => setIsActive(!isActive)} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-medium', isActive ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50')}>
              {isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}{isActive ? 'Active' : 'Paused'}
            </button>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-4 gap-4 mt-6">
          <div className="text-center"><p className="text-xs text-slate-400 mb-1">Daily Return</p><p className={clsx('text-2xl font-bold', performance.dailyReturn >= 0 ? 'text-green-400' : 'text-red-400')}>{performance.dailyReturn >= 0 ? '+' : ''}{performance.dailyReturn.toFixed(2)}%</p></div>
          <div className="text-center"><p className="text-xs text-slate-400 mb-1">Yearly Return</p><p className="text-2xl font-bold text-green-400">+{performance.yearlyReturn.toFixed(0)}%</p></div>
          <div className="text-center"><p className="text-xs text-slate-400 mb-1">Dominance Score</p><p className="text-2xl font-bold text-orange-400">{performance.dominanceScore.toFixed(0)}/100</p></div>
          <div className="text-center"><p className="text-xs text-slate-400 mb-1">vs Competitors</p><p className={clsx('text-2xl font-bold', performance.isBeatingCompetitors ? 'text-green-400' : 'text-red-400')}>{performance.isBeatingCompetitors ? 'WINNING' : 'LOSING'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alpha Signals */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Alpha Signals - Trade Now</h3>
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">LIVE</span>
          </div>
          <div className="space-y-3">
            {alphaSignals.map(signal => (
              <div key={signal.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 cursor-pointer" onClick={() => handleTradeSignal(signal)}>
                <div className="flex items-center gap-4">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', signal.direction === 'long' ? 'bg-green-500/20' : 'bg-red-500/20')}>
                    {signal.direction === 'long' ? <ArrowUpRight className="w-5 h-5 text-green-400" /> : <ArrowDownRight className="w-5 h-5 text-red-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{signal.symbol}</span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded', signal.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{signal.direction.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-slate-500">{signal.strategy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center"><p className="text-xs text-slate-500">Strength</p><p className="font-semibold text-white">{signal.strength.toFixed(0)}%</p></div>
                  <div className="text-center"><p className="text-xs text-slate-500">Confidence</p><p className="font-semibold text-blue-400">{signal.confidence.toFixed(0)}%</p></div>
                  <div className="text-center"><p className="text-xs text-slate-500">Expected</p><p className="font-semibold text-green-400">+{signal.expectedReturn.toFixed(1)}%</p></div>
                  <button onClick={(e) => { e.stopPropagation(); handleTradeSignal(signal); }} className="px-4 py-2 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white text-sm font-medium">Trade</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Tracking */}
        <div className="card p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Swords className="w-5 h-5 text-red-400" />Crushing Competitors</h3>
          <div className="space-y-3">
            {competitors.map((comp, i) => (
              <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div><p className="font-medium text-white text-sm">{comp.name}</p><p className="text-xs text-slate-500">{comp.company}</p></div>
                  <div className={clsx('px-2 py-1 rounded text-xs font-bold', comp.ourAdvantage > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{comp.ourAdvantage > 0 ? '+' : ''}{comp.ourAdvantage}%</div>
                </div>
                <p className="text-xs text-slate-500">Their return: {comp.annualReturn}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fused Strategies */}
      <div className="card p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Brain className="w-5 h-5 text-purple-400" />Fused Strategies</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {strategies.map(strategy => (
            <div key={strategy.id} className="p-4 bg-slate-800/50 rounded-lg">
              <span className={clsx('text-xs px-2 py-0.5 rounded mb-2 inline-block', strategy.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400')}>{strategy.status.toUpperCase()}</span>
              <h4 className="font-medium text-white text-sm mb-2">{strategy.name}</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Return</span><span className="text-green-400">+{strategy.backtestReturn}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sharpe</span><span className="text-blue-400">{strategy.backtestSharpe}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">vs Renaissance</span><span className={strategy.vsRenaissance >= 0 ? 'text-green-400' : 'text-red-400'}>{strategy.vsRenaissance >= 0 ? '+' : ''}{strategy.vsRenaissance}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mode Modal */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-6 h-6 text-orange-400" />Dominance Mode</h3>
              <button onClick={() => setShowModeModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {dominanceModes.map(mode => (
                <button key={mode.id} onClick={() => handleModeChange(mode.id)} className={clsx('p-4 rounded-xl border transition-all text-left', dominanceMode === mode.id ? `bg-gradient-to-br ${mode.color} border-transparent` : 'bg-slate-800/50 border-slate-700 hover:border-slate-600')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx('font-bold', dominanceMode === mode.id ? 'text-white' : 'text-slate-300')}>{mode.name}</span>
                    <span className={clsx('text-xs', dominanceMode === mode.id ? 'text-white/80' : 'text-slate-500')}>{mode.aggressiveness}%</span>
                  </div>
                  <p className={clsx('text-sm', dominanceMode === mode.id ? 'text-white/80' : 'text-slate-500')}>{mode.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeModal && selectedSignal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Execute Trade</h3>
              <button onClick={() => setShowTradeModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-white">{selectedSignal.symbol}</span>
                  <span className={clsx('px-3 py-1 rounded-full font-bold', selectedSignal.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{selectedSignal.direction.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-slate-500">Strength</p><p className="font-semibold text-white">{selectedSignal.strength.toFixed(0)}%</p></div>
                  <div><p className="text-xs text-slate-500">Confidence</p><p className="font-semibold text-blue-400">{selectedSignal.confidence.toFixed(0)}%</p></div>
                  <div><p className="text-xs text-slate-500">Expected</p><p className="font-semibold text-green-400">+{selectedSignal.expectedReturn.toFixed(1)}%</p></div>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Trade Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-xl text-white font-bold focus:outline-none focus:border-time-primary" />
                </div>
              </div>
              <div className="flex gap-2">
                {[500, 1000, 5000, 10000].map(amount => (
                  <button key={amount} onClick={() => setTradeAmount(amount.toString())} className={clsx('flex-1 py-2 rounded-lg text-sm font-medium', tradeAmount === amount.toString() ? 'bg-time-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>${amount.toLocaleString()}</button>
                ))}
              </div>
              <button onClick={executeTrade} className={clsx('w-full py-4 rounded-xl font-bold text-lg', selectedSignal.direction === 'long' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-500 to-orange-500 text-white')}>
                {selectedSignal.direction === 'long' ? 'BUY' : 'SELL'} {selectedSignal.symbol}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
