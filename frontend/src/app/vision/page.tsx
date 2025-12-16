'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Activity,
  Eye,
  Brain,
  Bot,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Gauge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

type Perspective = 'human' | 'quant' | 'bot' | 'merged';

interface MarketView {
  perspective: Perspective;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  signals: string[];
  keyLevels: { type: string; price: number; importance: 'high' | 'medium' | 'low' }[];
  reasoning: string;
}

const perspectives: Record<Perspective, { icon: typeof Brain; label: string; color: string }> = {
  human: { icon: Eye, label: 'Human Trader', color: 'text-blue-400' },
  quant: { icon: BarChart3, label: 'Quant Analysis', color: 'text-purple-400' },
  bot: { icon: Bot, label: 'Bot Ensemble', color: 'text-orange-400' },
  merged: { icon: Brain, label: 'TIME Merged', color: 'text-time-primary' },
};

const mockViews: Record<Perspective, MarketView> = {
  human: {
    perspective: 'human',
    sentiment: 'bullish',
    confidence: 72,
    signals: [
      'Higher lows forming on daily chart',
      'Volume increasing on up days',
      'Market structure remains intact',
      'Fear & Greed Index recovering',
    ],
    keyLevels: [
      { type: 'Resistance', price: 45000, importance: 'high' },
      { type: 'Support', price: 42500, importance: 'high' },
      { type: 'Previous High', price: 44200, importance: 'medium' },
    ],
    reasoning: 'The market appears to be forming a bullish continuation pattern. Price action suggests accumulation at current levels with buyers stepping in at support. The overall trend remains up, and the recent pullback looks healthy rather than concerning.',
  },
  quant: {
    perspective: 'quant',
    sentiment: 'bullish',
    confidence: 68,
    signals: [
      'RSI(14) = 58.3 (neutral-bullish)',
      'MACD bullish crossover forming',
      '20 EMA > 50 EMA (bullish)',
      'Bollinger Band squeeze detected',
    ],
    keyLevels: [
      { type: '0.618 Fib', price: 44850, importance: 'high' },
      { type: '0.382 Fib', price: 43200, importance: 'medium' },
      { type: 'VWAP', price: 43567, importance: 'high' },
    ],
    reasoning: 'Statistical analysis indicates a 68% probability of upward movement. Key momentum indicators are turning bullish, with MACD about to cross. Volatility compression (Bollinger squeeze) suggests an imminent large move. Risk/reward favors long positions above VWAP.',
  },
  bot: {
    perspective: 'bot',
    sentiment: 'bullish',
    confidence: 74,
    signals: [
      'Trend Follower: LONG signal active',
      'Mean Reversion: Neutral (no extremes)',
      'Momentum Bot: Accumulating',
      'Breakout Bot: Watching 44000',
    ],
    keyLevels: [
      { type: 'Bot Cluster Buy', price: 42800, importance: 'high' },
      { type: 'Bot Cluster Sell', price: 45200, importance: 'high' },
      { type: 'Stop Hunt Zone', price: 42000, importance: 'medium' },
    ],
    reasoning: '3 out of 4 active bots have bullish bias. Ensemble consensus is LONG. The bots identify strong buy pressure around 42800 level where multiple algorithms converge. Risk: potential stop hunt below 42000 before continuation.',
  },
  merged: {
    perspective: 'merged',
    sentiment: 'bullish',
    confidence: 78,
    signals: [
      'Cross-validated bullish bias (3/3 perspectives)',
      'High-probability setup forming',
      'Risk levels clearly defined',
      'Multiple confluences at key levels',
    ],
    keyLevels: [
      { type: 'TIME Entry Zone', price: 43000, importance: 'high' },
      { type: 'TIME Target 1', price: 44500, importance: 'high' },
      { type: 'TIME Stop', price: 41800, importance: 'high' },
    ],
    reasoning: 'TIME has synthesized all perspectives and identified a high-conviction setup. Human intuition, quantitative analysis, and bot signals all align bullish. The merged view provides optimal entry (43000), targets (44500, 46000), and stop (41800). Risk/Reward: 2.5:1. Recommended position size: 1.5% of portfolio.',
  },
};

export default function VisionPage() {
  const [selectedPerspective, setSelectedPerspective] = useState<Perspective>('merged');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [marketData, setMarketData] = useState<any>(null);
  const [marketStatus, setMarketStatus] = useState<any>(null);

  const currentView = mockViews[selectedPerspective];

  // Fetch market status
  const fetchMarketStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/real-market/status`);
      if (response.ok) {
        const data = await response.json();
        setMarketStatus(data);
        setIsConnected(true);
        return true;
      }
    } catch (error) {
      console.error('Failed to fetch market status:', error);
      setIsConnected(false);
    }
    return false;
  }, []);

  // Fetch market data based on selected symbol
  const fetchMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      const symbol = selectedSymbol.split('/')[0]; // Extract base symbol

      // Determine endpoint based on symbol type
      if (['BTC', 'ETH'].includes(symbol)) {
        endpoint = `${API_BASE}/real-market/crypto/${symbol}`;
      } else {
        endpoint = `${API_BASE}/real-market/stock/${symbol}`;
      }

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
        setIsConnected(true);
      } else {
        console.warn('Failed to fetch market data, using mock data');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      setIsConnected(false);
      setMarketData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol]);

  // Initial load
  useEffect(() => {
    fetchMarketStatus();
    fetchMarketData();
  }, [fetchMarketStatus, fetchMarketData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([fetchMarketStatus(), fetchMarketData()]).finally(() => {
      setTimeout(() => setIsRefreshing(false), 500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Market Vision</h1>
            <p className="text-slate-400">See the market through multiple perspectives</p>
          </div>
          {/* Connection Status Badge */}
          <div className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2',
            isConnected
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          )}>
            <span className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
            )} />
            {isConnected ? 'Live Data' : 'Demo Mode'}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={clsx('w-4 h-4', (isRefreshing || isLoading) && 'animate-spin')} />
          Refresh Analysis
        </button>
      </div>

      {/* Symbol Selector */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Analyzing:</span>
            <div className="flex items-center gap-2">
              {['BTC/USD', 'ETH/USD', 'SPY', 'QQQ'].map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedSymbol === symbol
                      ? 'bg-time-primary/20 text-time-primary border border-time-primary/30'
                      : 'bg-slate-800/50 text-slate-400 hover:text-white border border-transparent'
                  )}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
          {/* Real-time Market Data Display */}
          {marketData && isConnected && (
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-slate-400">Price: </span>
                <span className="text-white font-mono font-medium">
                  ${marketData.price?.toLocaleString() || marketData.last_price?.toLocaleString() || 'N/A'}
                </span>
              </div>
              {marketData.change_percent && (
                <div className={clsx(
                  'flex items-center gap-1',
                  marketData.change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {marketData.change_percent >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {marketData.change_percent >= 0 ? '+' : ''}
                    {marketData.change_percent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Perspective Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(perspectives) as Perspective[]).map((perspective) => {
          const config = perspectives[perspective];
          const Icon = config.icon;
          const isSelected = selectedPerspective === perspective;
          const view = mockViews[perspective];

          return (
            <button
              key={perspective}
              onClick={() => setSelectedPerspective(perspective)}
              className={clsx(
                'card p-4 text-left transition-all',
                isSelected && 'ring-2 ring-time-primary'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={clsx(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-time-primary/20' : 'bg-slate-800'
                )}>
                  <Icon className={clsx('w-5 h-5', isSelected ? 'text-time-primary' : config.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{config.label}</p>
                  <p className="text-xs text-slate-500">{view.confidence}% confidence</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {view.sentiment === 'bullish' && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    Bullish
                  </span>
                )}
                {view.sentiment === 'bearish' && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    Bearish
                  </span>
                )}
                {view.sentiment === 'neutral' && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Activity className="w-3 h-3" />
                    Neutral
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Analysis View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Signals */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-time-primary" />
              Active Signals
            </h3>
            <div className="space-y-2">
              {currentView.signals.map((signal, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{signal}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-time-primary" />
              Confidence Meter
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Overall Confidence</span>
                <span className={clsx(
                  'text-lg font-bold',
                  currentView.confidence >= 70 ? 'text-green-400' :
                  currentView.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {currentView.confidence}%
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    currentView.confidence >= 70 ? 'bg-green-400' :
                    currentView.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  )}
                  style={{ width: `${currentView.confidence}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {currentView.confidence >= 70
                  ? 'High conviction setup - consider full position'
                  : currentView.confidence >= 50
                  ? 'Moderate conviction - consider partial position'
                  : 'Low conviction - wait for better setup'}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Column - Key Levels & Reasoning */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-time-primary" />
              Key Price Levels
            </h3>
            <div className="space-y-2">
              {currentView.keyLevels.map((level, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'w-2 h-2 rounded-full',
                      level.importance === 'high' ? 'bg-red-400' :
                      level.importance === 'medium' ? 'bg-yellow-400' : 'bg-slate-400'
                    )} />
                    <span className="text-sm text-slate-300">{level.type}</span>
                  </div>
                  <span className="text-sm font-mono text-white">
                    ${level.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-time-primary" />
              {perspectives[selectedPerspective].label} Analysis
            </h3>
            <div className={clsx(
              'p-4 rounded-lg border',
              currentView.sentiment === 'bullish'
                ? 'bg-green-500/5 border-green-500/20'
                : currentView.sentiment === 'bearish'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-slate-800/50 border-slate-700/50'
            )}>
              <p className="text-slate-300 leading-relaxed">
                {currentView.reasoning}
              </p>
            </div>
          </div>

          {/* Action Recommendation (only for merged view) */}
          {selectedPerspective === 'merged' && (
            <div className="card p-4 bg-gradient-to-br from-time-primary/10 to-transparent border-time-primary/30">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-time-primary" />
                TIME Recommendation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                  <p className="text-xs text-slate-500 mb-1">Entry Zone</p>
                  <p className="text-lg font-bold text-white">$43,000</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                  <p className="text-xs text-slate-500 mb-1">Target</p>
                  <p className="text-lg font-bold text-green-400">$44,500</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                  <p className="text-xs text-slate-500 mb-1">Stop Loss</p>
                  <p className="text-lg font-bold text-red-400">$41,800</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Risk/Reward Ratio: <span className="text-white">2.5:1</span></span>
                <span className="text-slate-400">Suggested Size: <span className="text-white">1.5% of portfolio</span></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Perspective Comparison */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Perspective Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-700/50">
                <th className="pb-3 font-medium">Perspective</th>
                <th className="pb-3 font-medium">Sentiment</th>
                <th className="pb-3 font-medium">Confidence</th>
                <th className="pb-3 font-medium">Key Signal</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(mockViews) as Perspective[]).map((perspective) => {
                const view = mockViews[perspective];
                const config = perspectives[perspective];
                const Icon = config.icon;

                return (
                  <tr key={perspective} className="border-b border-slate-700/30">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={clsx('w-4 h-4', config.color)} />
                        <span className="text-white">{config.label}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={clsx(
                        'px-2 py-0.5 text-xs rounded-full capitalize',
                        view.sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        view.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      )}>
                        {view.sentiment}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              view.confidence >= 70 ? 'bg-green-400' :
                              view.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                            )}
                            style={{ width: `${view.confidence}%` }}
                          />
                        </div>
                        <span className="text-slate-300">{view.confidence}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">
                      {view.signals[0]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
