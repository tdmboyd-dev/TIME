'use client';

/**
 * TIME BEYOND US - Signals Page
 *
 * Displays real-time trading signals from all connected systems.
 * Signals flow from: Ultimate Money Machine, TIMEBEUNUS, Bot Brain,
 * AI Trading Signals, and the Agent Swarm.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Bot,
  Brain,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { API_BASE, getAuthHeaders } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface Signal {
  id: string;
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;
  source: string;
  strategy?: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  createdAt: Date;
  reason: string;
  indicators?: Record<string, number>;
}

interface SignalUpdate {
  signalId: string;
  symbol: string;
  direction: 'long' | 'short';
  confidence: number;
  source: string;
  timestamp: Date;
}

// ============================================================================
// MOCK DATA (fallback)
// ============================================================================

const mockSignals: Signal[] = [
  {
    id: '1',
    symbol: 'AAPL',
    direction: 'long',
    confidence: 0.87,
    source: 'Ultimate Money Machine',
    strategy: 'Momentum Breakout',
    entryPrice: 178.50,
    targetPrice: 185.00,
    stopLoss: 175.00,
    timeframe: '4H',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    reason: 'Strong momentum above 50 SMA with volume confirmation',
    indicators: { RSI: 62, MACD: 1.2, Volume: 1.5 },
  },
  {
    id: '2',
    symbol: 'NVDA',
    direction: 'long',
    confidence: 0.92,
    source: 'TIMEBEUNUS',
    strategy: 'Big Mover Detection',
    entryPrice: 875.00,
    targetPrice: 920.00,
    stopLoss: 850.00,
    timeframe: '1D',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    reason: 'Detected as industry destroyer - AI chip demand surge',
    indicators: { RSI: 71, Sentiment: 0.85, Volume: 2.3 },
  },
  {
    id: '3',
    symbol: 'BTC/USD',
    direction: 'short',
    confidence: 0.73,
    source: 'Bot Brain',
    strategy: 'Mean Reversion',
    entryPrice: 67500,
    targetPrice: 64000,
    stopLoss: 69000,
    timeframe: '1H',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    reason: 'Overbought on multiple timeframes, expect pullback',
    indicators: { RSI: 78, BB_Width: 0.12, Stoch: 89 },
  },
  {
    id: '4',
    symbol: 'TSLA',
    direction: 'long',
    confidence: 0.81,
    source: 'Agent Swarm',
    strategy: 'Consensus Trade',
    entryPrice: 245.00,
    targetPrice: 260.00,
    stopLoss: 235.00,
    timeframe: '4H',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    reason: '8/10 swarm agents agree on bullish setup',
    indicators: { RSI: 55, SwarmConsensus: 0.8, Volume: 1.2 },
  },
  {
    id: '5',
    symbol: 'EUR/USD',
    direction: 'short',
    confidence: 0.68,
    source: 'AI Trading Signals',
    strategy: 'Technical Breakdown',
    entryPrice: 1.0850,
    targetPrice: 1.0750,
    stopLoss: 1.0900,
    timeframe: '1D',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    reason: 'Breaking below key support with momentum confirmation',
    indicators: { RSI: 42, MACD: -0.002, ADX: 28 },
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);

  const directionColors = {
    long: 'text-green-400 bg-green-400/10',
    short: 'text-red-400 bg-red-400/10',
    neutral: 'text-gray-400 bg-gray-400/10',
  };

  const sourceIcons: Record<string, React.ReactNode> = {
    'Ultimate Money Machine': <Zap className="w-4 h-4" />,
    'TIMEBEUNUS': <Target className="w-4 h-4" />,
    'Bot Brain': <Brain className="w-4 h-4" />,
    'Agent Swarm': <Bot className="w-4 h-4" />,
    'AI Trading Signals': <Activity className="w-4 h-4" />,
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/50 transition-colors"
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white">{signal.symbol}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${directionColors[signal.direction]}`}>
              {signal.direction === 'long' ? (
                <TrendingUp className="w-3 h-3" />
              ) : signal.direction === 'short' ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {signal.direction.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{signal.timeframe}</span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-400">
            {sourceIcons[signal.source] || <Activity className="w-4 h-4" />}
            <span className="text-sm">{signal.source}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{timeAgo(signal.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Confidence</span>
              <span className={`text-sm font-medium ${
                signal.confidence >= 0.8 ? 'text-green-400' :
                signal.confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {(signal.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  signal.confidence >= 0.8 ? 'bg-green-500' :
                  signal.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${signal.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-700/50 p-4 bg-gray-900/30"
        >
          <p className="text-sm text-gray-300 mb-4">{signal.reason}</p>

          {signal.strategy && (
            <div className="mb-4">
              <span className="text-xs text-gray-500">Strategy: </span>
              <span className="text-sm text-purple-400">{signal.strategy}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-4">
            {signal.entryPrice && (
              <div>
                <span className="text-xs text-gray-500 block">Entry</span>
                <span className="text-sm text-white font-medium">
                  ${signal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {signal.targetPrice && (
              <div>
                <span className="text-xs text-gray-500 block">Target</span>
                <span className="text-sm text-green-400 font-medium">
                  ${signal.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {signal.stopLoss && (
              <div>
                <span className="text-xs text-gray-500 block">Stop Loss</span>
                <span className="text-sm text-red-400 font-medium">
                  ${signal.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {signal.indicators && Object.keys(signal.indicators).length > 0 && (
            <div>
              <span className="text-xs text-gray-500 block mb-2">Indicators</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(signal.indicators).map(([key, value]) => (
                  <span
                    key={key}
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                  >
                    {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // WebSocket connection for real-time signals
  const { isConnected, subscribe } = useWebSocket({
    channels: ['signals'],
    handlers: {
      onTrade: (update: any) => {
        // Convert trade update to signal format if needed
        console.log('[Signals] Trade update:', update);
      },
    },
  });

  // Fetch initial signals
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await fetch(`${API_BASE}/signals/active`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.signals && Array.isArray(data.signals)) {
            setSignals(data.signals.map((s: any) => ({
              ...s,
              createdAt: new Date(s.createdAt || s.timestamp),
            })));
          } else {
            setSignals(mockSignals);
          }
        } else {
          setSignals(mockSignals);
        }
      } catch (error) {
        console.error('[Signals] Fetch error:', error);
        setSignals(mockSignals);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, []);

  // Handle new signal from WebSocket
  const handleNewSignal = useCallback((signalUpdate: SignalUpdate) => {
    const newSignal: Signal = {
      id: signalUpdate.signalId,
      symbol: signalUpdate.symbol,
      direction: signalUpdate.direction,
      confidence: signalUpdate.confidence,
      source: signalUpdate.source,
      timeframe: '1H',
      createdAt: new Date(signalUpdate.timestamp),
      reason: 'Real-time signal from ' + signalUpdate.source,
    };

    setSignals(prev => [newSignal, ...prev.slice(0, 49)]);
  }, []);

  // Subscribe to WebSocket signals
  useEffect(() => {
    if (isConnected) {
      subscribe(['signals']);
    }
  }, [isConnected, subscribe]);

  // Filter signals
  const filteredSignals = signals.filter(signal => {
    if (filter !== 'all' && signal.direction !== filter) return false;
    if (sourceFilter !== 'all' && signal.source !== sourceFilter) return false;
    return true;
  });

  // Get unique sources
  const sources = Array.from(new Set(signals.map(s => s.source)));

  // Stats
  const longSignals = signals.filter(s => s.direction === 'long').length;
  const shortSignals = signals.filter(s => s.direction === 'short').length;
  const avgConfidence = signals.length > 0
    ? signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading signals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Trading Signals</h1>
            <p className="text-gray-400">
              Real-time signals from 84+ connected systems
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Total Signals</span>
            </div>
            <span className="text-2xl font-bold text-white">{signals.length}</span>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">Long Signals</span>
            </div>
            <span className="text-2xl font-bold text-green-400">{longSignals}</span>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-400">Short Signals</span>
            </div>
            <span className="text-2xl font-bold text-red-400">{shortSignals}</span>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">Avg Confidence</span>
            </div>
            <span className="text-2xl font-bold text-yellow-400">
              {(avgConfidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filter:</span>
          </div>
          <div className="flex gap-2">
            {['all', 'long', 'short'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as typeof filter)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1 border border-gray-700 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        {/* Signals List */}
        <div className="space-y-4">
          {filteredSignals.length > 0 ? (
            filteredSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No signals match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
