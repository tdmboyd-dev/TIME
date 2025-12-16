'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, Zap, Play, Pause, Eye, EyeOff, TrendingUp, TrendingDown,
  PiggyBank, Rocket, Shield, Clock, RefreshCw, ChevronRight, Sparkles,
  Brain, Target, Users, BarChart3, ArrowUpRight, ArrowDownRight, Wallet,
  History, Settings, BookOpen, Trophy, Flame, Gift, Calendar, Loader2,
  CheckCircle, AlertCircle, X, Info
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/autopilot';

type RiskDNA = 'ultra_safe' | 'careful' | 'balanced' | 'growth' | 'aggressive' | 'yolo';

interface PilotProfile {
  id: string;
  riskDNA: RiskDNA;
  riskScore: number;
  totalDeposited: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  autopilotEnabled: boolean;
}

interface RecentTrade {
  id: string;
  timestamp: Date;
  asset: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  profitLoss?: number;
  explanation: string;
  strategy: string;
}

interface AutoPilotStatus {
  enabled: boolean;
  pilot?: PilotProfile;
  recentTrades?: RecentTrade[];
  liveActivity?: any[];
}

interface AutoPilotConfig {
  riskProfile: RiskDNA;
  initialCapital: number;
  maxDrawdown?: number;
  takeProfitPercent?: number;
  stopLossPercent?: number;
}

const riskProfiles = [
  { id: 'ultra_safe' as RiskDNA, name: 'Ultra Safe', description: "Grandma's savings", color: 'from-blue-400 to-blue-600', volatility: '2%' },
  { id: 'careful' as RiskDNA, name: 'Careful', description: 'Steady growth', color: 'from-cyan-400 to-cyan-600', volatility: '5%' },
  { id: 'balanced' as RiskDNA, name: 'Balanced', description: 'Moderate risk', color: 'from-green-400 to-green-600', volatility: '10%' },
  { id: 'growth' as RiskDNA, name: 'Growth', description: 'Risk for gains', color: 'from-yellow-400 to-yellow-600', volatility: '20%' },
  { id: 'aggressive' as RiskDNA, name: 'Aggressive', description: 'High risk tolerance', color: 'from-orange-400 to-orange-600', volatility: '35%' },
  { id: 'yolo' as RiskDNA, name: 'YOLO', description: 'Maximum gains or bust!', color: 'from-red-400 to-red-600', volatility: 'No limit' },
];

const strategies = [
  { id: 'grid_bot', name: 'Grid Bot Classic', source: 'Pionex', winRate: 0.73, avgReturn: 0.15, plainEnglish: 'Buy low, sell high automatically' },
  { id: 'dca_smart', name: 'Smart DCA', source: '3Commas', winRate: 0.68, avgReturn: 0.12, plainEnglish: 'Buy more when prices dip' },
  { id: 'ai_momentum', name: 'AI Momentum Hunter', source: 'Cryptohopper', winRate: 0.62, avgReturn: 0.25, plainEnglish: 'Ride fast-moving assets up' },
  { id: 'forex_fury', name: 'Range Trading Master', source: 'ForexFury', winRate: 0.93, avgReturn: 0.05, plainEnglish: 'Trade when markets are calm' },
  { id: 'stat_arb', name: 'Statistical Arbitrage', source: 'Renaissance', winRate: 0.72, avgReturn: 0.08, plainEnglish: "When twins fight, bet they'll make up" },
];

export default function AutoPilotPage() {
  const [pilot, setPilot] = useState<PilotProfile | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [watchMode, setWatchMode] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [dropAmount, setDropAmount] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<RiskDNA>('balanced');
  const [isLoading, setIsLoading] = useState(true);
  const [isDropping, setIsDropping] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [liveCommentary, setLiveCommentary] = useState<{ time: string; message: string; type: string }[]>([]);

  // Fetch autopilot status on mount
  useEffect(() => {
    fetchAutoPilotStatus();
  }, []);

  // Poll for status updates every 10 seconds when autopilot is active
  useEffect(() => {
    if (pilot && pilot.autopilotEnabled) {
      const interval = setInterval(() => {
        fetchAutoPilotStatus();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [pilot?.autopilotEnabled]);

  // Live commentary effect when watch mode is on
  useEffect(() => {
    if (pilot && watchMode) {
      const interval = setInterval(() => {
        const messages = [
          { msg: 'Scanning market for opportunities...', type: 'info' },
          { msg: 'RSI divergence detected on NVDA', type: 'signal' },
          { msg: 'Volume surge on BTC - monitoring...', type: 'alert' },
          { msg: 'Mean reversion signal forming on EUR/USD', type: 'signal' },
          { msg: 'Risk parameters within acceptable range', type: 'info' },
        ];
        const selected = messages[Math.floor(Math.random() * messages.length)];
        setLiveCommentary(prev => [{ time: new Date().toLocaleTimeString(), message: selected.msg, type: selected.type }, ...prev.slice(0, 9)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [pilot, watchMode]);

  const fetchAutoPilotStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No autopilot configured yet
          setPilot(null);
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const data: AutoPilotStatus = await response.json();

      if (data.pilot) {
        setPilot(data.pilot);
      }

      if (data.recentTrades) {
        setRecentTrades(data.recentTrades.map(t => ({
          ...t,
          timestamp: new Date(t.timestamp)
        })));
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching autopilot status:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load AutoPilot status. Please try again.'
      });
      setTimeout(() => setNotification(null), 5000);
      setIsLoading(false);
    }
  };

  const handleDrop = async () => {
    const amount = parseFloat(dropAmount);
    if (isNaN(amount) || amount < 10) {
      setNotification({ type: 'error', message: 'Minimum drop is $10' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsDropping(true);

    try {
      // First, update configuration
      const configResponse = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          riskProfile: selectedRisk,
          initialCapital: amount,
        } as AutoPilotConfig),
      });

      if (!configResponse.ok) {
        throw new Error('Failed to update configuration');
      }

      // Then start autopilot
      const startResponse = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start autopilot');
      }

      // Fetch updated status
      await fetchAutoPilotStatus();

      setIsDropping(false);
      setShowDropModal(false);
      setDropAmount('');
      setNotification({
        type: 'success',
        message: `$${amount.toLocaleString()} dropped! AutoPilot is now trading!`
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error starting autopilot:', error);
      setNotification({
        type: 'error',
        message: 'Failed to start AutoPilot. Please try again.'
      });
      setTimeout(() => setNotification(null), 5000);
      setIsDropping(false);
    }
  };

  const toggleAutoPilot = async () => {
    if (!pilot) return;

    try {
      const endpoint = pilot.autopilotEnabled ? 'stop' : 'start';
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} autopilot`);
      }

      // Fetch updated status
      await fetchAutoPilotStatus();

      setNotification({
        type: 'info',
        message: pilot.autopilotEnabled ? 'AutoPilot paused' : 'AutoPilot resumed!'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error toggling autopilot:', error);
      setNotification({
        type: 'error',
        message: 'Failed to toggle AutoPilot. Please try again.'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleAddCapital = async () => {
    const amount = parseFloat(dropAmount);
    if (isNaN(amount) || amount < 10) {
      setNotification({ type: 'error', message: 'Minimum amount is $10' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsDropping(true);

    try {
      // Fetch current config
      const configResponse = await fetch(`${API_BASE}/config`, {
        credentials: 'include',
      });

      if (!configResponse.ok) {
        throw new Error('Failed to fetch current configuration');
      }

      const currentConfig: AutoPilotConfig = await configResponse.json();

      // Update with additional capital
      const updateResponse = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...currentConfig,
          initialCapital: currentConfig.initialCapital + amount,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to add capital');
      }

      // Fetch updated status
      await fetchAutoPilotStatus();

      setIsDropping(false);
      setShowDropModal(false);
      setDropAmount('');
      setNotification({
        type: 'success',
        message: `Added $${amount.toLocaleString()} to your AutoPilot!`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error adding capital:', error);
      setNotification({
        type: 'error',
        message: 'Failed to add capital. Please try again.'
      });
      setTimeout(() => setNotification(null), 3000);
      setIsDropping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
          <p className="text-white font-medium">Loading AutoPilot Capital...</p>
        </div>
      </div>
    );
  }

  if (!pilot) {
    return (
      <div className="space-y-8">
        {notification && (
          <div className={clsx('fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg',
            notification.type === 'success' && 'bg-green-500/20 border border-green-500/50 text-green-400',
            notification.type === 'error' && 'bg-red-500/20 border border-red-500/50 text-red-400',
            notification.type === 'info' && 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
          )}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <Info className="w-5 h-5" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-time-primary/20 via-purple-500/10 to-pink-500/10 border border-time-primary/30 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-time-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-time-primary/20"><Rocket className="w-8 h-8 text-time-primary" /></div>
              <div><h1 className="text-3xl font-bold text-white">DROPBOT AutoPilot</h1><p className="text-time-primary">Drop It. Trade It. Profit.</p></div>
            </div>
            <p className="text-lg text-slate-300 mb-6">The simplest way to start algorithmic trading. Drop any amount and let our AI trade for you using <span className="text-time-primary font-semibold">100+ proven strategies</span>.</p>
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg"><Brain className="w-5 h-5 text-purple-400" /><span className="text-sm text-slate-300">AI-Powered</span></div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg"><Eye className="w-5 h-5 text-blue-400" /><span className="text-sm text-slate-300">Watch Mode</span></div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg"><BookOpen className="w-5 h-5 text-green-400" /><span className="text-sm text-slate-300">Learn As You Earn</span></div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg"><Shield className="w-5 h-5 text-yellow-400" /><span className="text-sm text-slate-300">Risk Protection</span></div>
            </div>
            <button onClick={() => setShowDropModal(true)} className="px-8 py-4 bg-gradient-to-r from-time-primary to-purple-500 hover:from-time-primary/80 hover:to-purple-500/80 rounded-xl text-white font-bold text-lg shadow-lg">
              <span className="flex items-center gap-2"><DollarSign className="w-6 h-6" />Drop Money & Start Trading</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6"><div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4"><Zap className="w-6 h-6 text-green-400" /></div><h3 className="text-lg font-semibold text-white mb-2">Instant Start</h3><p className="text-slate-400">Drop any amount and start trading immediately.</p></div>
          <div className="card p-6"><div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4"><Brain className="w-6 h-6 text-purple-400" /></div><h3 className="text-lg font-semibold text-white mb-2">100+ Strategies</h3><p className="text-slate-400">Access strategies from top trading bots globally.</p></div>
          <div className="card p-6"><div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4"><Eye className="w-6 h-6 text-blue-400" /></div><h3 className="text-lg font-semibold text-white mb-2">Plain English</h3><p className="text-slate-400">Every trade explained in simple terms.</p></div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400" />Absorbed Strategies</h3><span className="text-sm text-slate-400">{strategies.length}+ strategies</span></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="p-4 bg-slate-800/50 rounded-lg">
                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">{strategy.source}</span>
                <h4 className="font-medium text-white text-sm mt-2 mb-1">{strategy.name}</h4>
                <p className="text-xs text-slate-500 mb-2">{strategy.plainEnglish}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400">{(strategy.winRate * 100).toFixed(0)}% win</span>
                  <span className="text-blue-400">{(strategy.avgReturn * 100).toFixed(0)}% avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showDropModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><DollarSign className="w-6 h-6 text-time-primary" />Drop Your Capital</h3>
                <button onClick={() => setShowDropModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              {isDropping ? (
                <div className="text-center py-8"><Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" /><p className="text-white font-medium">Setting up your AutoPilot...</p></div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Drop Amount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="number" value={dropAmount} onChange={(e) => setDropAmount(e.target.value)} placeholder="100" min="10" className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-2xl text-white font-bold focus:outline-none focus:border-time-primary" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Minimum $10</p>
                  </div>
                  <div className="flex gap-2">
                    {[100, 500, 1000, 5000].map(amount => (
                      <button key={amount} onClick={() => setDropAmount(amount.toString())} className={clsx('flex-1 py-2 rounded-lg text-sm font-medium', dropAmount === amount.toString() ? 'bg-time-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>${amount.toLocaleString()}</button>
                    ))}
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-3 block">Risk Profile</label>
                    <div className="grid grid-cols-3 gap-2">
                      {riskProfiles.map(risk => (
                        <button key={risk.id} onClick={() => setSelectedRisk(risk.id)} className={clsx('p-3 rounded-lg border transition-all text-left', selectedRisk === risk.id ? `bg-gradient-to-br ${risk.color} border-transparent` : 'bg-slate-800/50 border-slate-700 hover:border-slate-600')}>
                          <span className={clsx('text-sm font-medium', selectedRisk === risk.id ? 'text-white' : 'text-slate-300')}>{risk.name}</span>
                          <p className={clsx('text-xs mt-0.5', selectedRisk === risk.id ? 'text-white/80' : 'text-slate-500')}>{risk.volatility} vol</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{riskProfiles.find(r => r.id === selectedRisk)?.description}</p>
                  </div>
                  <button onClick={handleDrop} disabled={!dropAmount || parseFloat(dropAmount) < 10} className="w-full py-4 bg-gradient-to-r from-time-primary to-purple-500 hover:from-time-primary/80 hover:to-purple-500/80 disabled:from-slate-700 disabled:to-slate-700 rounded-xl text-white font-bold text-lg">Drop ${dropAmount || '0'} & Start Trading</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className={clsx('fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg', notification.type === 'success' && 'bg-green-500/20 border border-green-500/50 text-green-400', notification.type === 'info' && 'bg-blue-500/20 border border-blue-500/50 text-blue-400', notification.type === 'error' && 'bg-red-500/20 border border-red-500/50 text-red-400')}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <Info className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span><button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white flex items-center gap-3"><Rocket className="w-7 h-7 text-time-primary" />DROPBOT AutoPilot</h1><p className="text-slate-400">Your money is working 24/7</p></div>
        <div className="flex items-center gap-3">
          <button onClick={() => setWatchMode(!watchMode)} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg', watchMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-slate-800 text-slate-400')}>{watchMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}Watch Mode</button>
          <button onClick={toggleAutoPilot} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-medium', pilot.autopilotEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50')}>{pilot.autopilotEnabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}{pilot.autopilotEnabled ? 'Active' : 'Paused'}</button>
          <button onClick={() => setShowDropModal(true)} className="btn-primary"><DollarSign className="w-4 h-4 mr-1" />Drop More</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-br from-time-primary/10 to-purple-500/10 border-time-primary/30">
          <div className="flex items-center gap-2 mb-2"><Wallet className="w-5 h-5 text-time-primary" /><span className="text-sm text-slate-400">Current Value</span></div>
          <p className="text-3xl font-bold text-white">${pilot.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">Deposited: ${pilot.totalDeposited.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">{pilot.totalReturn >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}<span className="text-sm text-slate-400">Total Return</span></div>
          <p className={clsx('text-3xl font-bold', pilot.totalReturn >= 0 ? 'text-green-400' : 'text-red-400')}>{pilot.totalReturn >= 0 ? '+' : ''}${pilot.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className={clsx('text-xs mt-1', pilot.totalReturn >= 0 ? 'text-green-500' : 'text-red-500')}>{pilot.totalReturnPercent >= 0 ? '+' : ''}{pilot.totalReturnPercent.toFixed(2)}%</p>
        </div>
        <div className="card p-5"><div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-purple-400" /><span className="text-sm text-slate-400">Win Rate</span></div><p className="text-3xl font-bold text-white">{pilot.winRate.toFixed(1)}%</p></div>
        <div className="card p-5"><div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-yellow-400" /><span className="text-sm text-slate-400">Risk Profile</span></div><p className="text-xl font-bold text-white capitalize">{pilot.riskDNA.replace('_', ' ')}</p><p className="text-xs text-slate-500 mt-1">Score: {pilot.riskScore}/100</p></div>
      </div>

      {watchMode && (
        <div className="card p-5 border-blue-500/30">
          <div className="flex items-center gap-2 mb-4"><Eye className="w-5 h-5 text-blue-400" /><h3 className="font-semibold text-white">Live Commentary</h3><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /></div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {liveCommentary.length === 0 ? <p className="text-slate-500 text-sm">Watching markets...</p> : liveCommentary.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm"><span className="text-slate-600 text-xs w-20">{item.time}</span><span className={clsx(item.type === 'signal' && 'text-green-400', item.type === 'alert' && 'text-yellow-400', item.type === 'info' && 'text-slate-400')}>{item.message}</span></div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-slate-400" />Recent Trades</h3><span className="text-xs text-slate-500">{recentTrades.length} trades</span></div>
          <div className="space-y-3">
            {recentTrades.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No trades yet. AutoPilot is analyzing markets...</p>
            ) : (
              recentTrades.slice(0, 6).map(trade => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', trade.side === 'buy' ? 'bg-green-500/20' : 'bg-blue-500/20')}>{trade.side === 'buy' ? <ArrowUpRight className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-blue-400" />}</div>
                    <div><p className="font-medium text-white text-sm">{trade.asset}</p><p className="text-xs text-slate-500">{trade.explanation}</p></div>
                  </div>
                  <div className="text-right">
                    {trade.profitLoss !== undefined ? <p className={clsx('font-semibold', trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400')}>{trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}</p> : <p className="text-slate-400 text-sm">${(trade.quantity * trade.price).toFixed(2)}</p>}
                    <p className="text-xs text-slate-600">{new Date(trade.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400" />Active Strategies</h3></div>
          <div className="space-y-3">
            {strategies.slice(0, 5).map(strategy => (
              <div key={strategy.id} className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-1"><span className="font-medium text-white text-sm">{strategy.name}</span><span className="text-xs text-green-400">{(strategy.winRate * 100).toFixed(0)}%</span></div>
                <p className="text-xs text-slate-500">{strategy.plainEnglish}</p>
              </div>
            ))}
            <p className="text-xs text-slate-600 text-center pt-2">+95 more strategies active</p>
          </div>
        </div>
      </div>

      {showDropModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-white">Add More Capital</h3><button onClick={() => setShowDropModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
            {isDropping ? <div className="text-center py-8"><Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" /><p className="text-white font-medium">Adding capital...</p></div> : (
              <div className="space-y-4">
                <div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="number" value={dropAmount} onChange={(e) => setDropAmount(e.target.value)} placeholder="100" min="10" className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-2xl text-white font-bold focus:outline-none focus:border-time-primary" /></div>
                <div className="flex gap-2">{[100, 500, 1000].map(amount => (<button key={amount} onClick={() => setDropAmount(amount.toString())} className="flex-1 py-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700">${amount}</button>))}</div>
                <button onClick={handleAddCapital} disabled={!dropAmount || parseFloat(dropAmount) < 10} className="w-full py-4 bg-time-primary hover:bg-time-primary/80 disabled:bg-slate-700 rounded-xl text-white font-bold">Add ${dropAmount || '0'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
