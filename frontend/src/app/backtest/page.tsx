'use client';

import { useState } from 'react';
import {
  FlaskConical,
  Play,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  DollarSign,
  Percent,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  Settings,
  Zap,
  Download,
  LineChart,
  TrendingDownIcon,
  Gauge,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';
import { PageIntroModal } from '@/components/onboarding/PageIntroModal';
import { backtestIntro } from '@/components/onboarding/pageIntroContent';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ScatterChart,
  Cell,
} from 'recharts';

interface BacktestResult {
  symbol: string;
  period: { start: string; end: string };
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  equityCurve?: Array<{ date: string; equity: number }>;
  drawdownCurve?: Array<{ date: string; drawdown: number }>;
  trades?: Array<any>;
}

interface MonteCarloResult {
  runs: Array<{
    runId: number;
    finalCapital: number;
    returnPercent: number;
    maxDrawdown: number;
    sharpeRatio: number;
  }>;
  statistics: {
    meanReturn: number;
    medianReturn: number;
    stdDevReturn: number;
    confidenceInterval: { lower: number; upper: number };
    probabilityOfProfit: number;
    probabilityOfRuin: number;
    valueAtRisk: number;
    conditionalVaR: number;
  };
}

interface WalkForwardResult {
  results: Array<{
    parameters: any;
    returnPercent: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }>;
  avgInSampleReturn: number;
  avgOutOfSampleReturn: number;
  efficiency: number;
  robustness: number;
}

export default function BacktestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Advanced results
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [walkForwardResult, setWalkForwardResult] = useState<WalkForwardResult | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'monte-carlo' | 'walk-forward' | 'charts'>('basic');

  // Form state
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-01');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [positionSize, setPositionSize] = useState(10);
  const [maxDrawdown, setMaxDrawdown] = useState(20);
  const [commission, setCommission] = useState(0.1);
  const [slippage, setSlippage] = useState(0.05);
  const [leverage, setLeverage] = useState(1);

  // Advanced settings
  const [numMonteCarloRuns, setNumMonteCarloRuns] = useState(1000);
  const [runWalkForward, setRunWalkForward] = useState(false);

  const runBacktest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setMonteCarloResult(null);
    setWalkForwardResult(null);

    try {
      // Run basic backtest
      const res = await fetch(`${API_BASE}/backtest/run`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          startDate,
          endDate,
          initialCapital,
          positionSizePercent: positionSize,
          maxDrawdownPercent: maxDrawdown,
          commissionPercent: commission,
          slippagePercent: slippage,
          leverage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          ...data.data.summary,
          ...data.data.tradeStats,
          ...data.data.riskMetrics,
          equityCurve: data.data.equityCurve,
          drawdownCurve: data.data.drawdownCurve,
          trades: data.data.trades,
        });
        setIsConnected(true);

        // Run Monte Carlo simulation
        if (numMonteCarloRuns > 0) {
          runMonteCarlo(data.data.trades);
        }

        // Run Walk-Forward analysis
        if (runWalkForward) {
          runWalkForwardAnalysis();
        }
      } else {
        setError(data.error || 'Backtest failed');
      }
    } catch (err) {
      setError('Failed to connect to backtest engine');
      setIsConnected(false);
    } finally {
      setIsRunning(false);
    }
  };

  const runMonteCarlo = async (trades: any[]) => {
    try {
      const res = await fetch(`${API_BASE}/backtest/advanced/monte-carlo`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          config: { initialCapital },
          monteCarloConfig: {
            numRuns: numMonteCarloRuns,
            randomizeEntries: false,
            randomizeExits: false,
            confidenceLevel: 0.95,
            bootstrapMethod: 'shuffle',
          },
          trades,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMonteCarloResult(data.data);
      }
    } catch (err) {
      console.error('Monte Carlo failed:', err);
    }
  };

  const runWalkForwardAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE}/backtest/advanced/walk-forward`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          config: {
            startDate,
            endDate,
            initialCapital,
            positionSizePercent: positionSize,
            maxDrawdownPercent: maxDrawdown,
            commissionPercent: commission,
            slippagePercent: slippage,
            leverage,
          },
          trainWindowDays: 180,
          testWindowDays: 30,
          stepDays: 30,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setWalkForwardResult(data.data);
      }
    } catch (err) {
      console.error('Walk-forward failed:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'BTC/USD', 'ETH/USD', 'EUR/USD'];

  // Prepare Monte Carlo distribution data
  const monteCarloDistribution = monteCarloResult
    ? (() => {
        const bins = 20;
        const returns = monteCarloResult.runs.map(r => r.returnPercent);
        const min = Math.min(...returns);
        const max = Math.max(...returns);
        const binSize = (max - min) / bins;

        const histogram = new Array(bins).fill(0).map((_, i) => {
          const binMin = min + i * binSize;
          const binMax = binMin + binSize;
          const count = returns.filter(r => r >= binMin && r < binMax).length;
          return {
            range: `${binMin.toFixed(1)}%`,
            count,
            percent: (count / returns.length) * 100,
          };
        });

        return histogram;
      })()
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <PageIntroModal content={backtestIntro} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FlaskConical className="w-8 h-8 text-cyan-400" />
                Advanced Strategy Backtesting
              </h1>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
              }`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{isConnected ? 'Live' : 'Demo'}</span>
              </div>
            </div>
            <p className="text-gray-400 mt-2">
              Walk-forward optimization, Monte Carlo simulation, and advanced analytics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Backtest Configuration
              </h2>

              <div className="space-y-4">
                {/* Symbol */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    placeholder="AAPL"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {popularSymbols.map(s => (
                      <button
                        key={s}
                        onClick={() => setSymbol(s)}
                        className={`px-2 py-1 text-xs rounded ${
                          symbol === s
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Capital */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Initial Capital</label>
                  <select
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  >
                    <option value={1000}>$1,000</option>
                    <option value={5000}>$5,000</option>
                    <option value={10000}>$10,000</option>
                    <option value={25000}>$25,000</option>
                    <option value={50000}>$50,000</option>
                    <option value={100000}>$100,000</option>
                  </select>
                </div>

                {/* Position Size */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Position Size (%)</label>
                  <input
                    type="range"
                    value={positionSize}
                    onChange={(e) => setPositionSize(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full"
                  />
                  <div className="text-right text-sm text-cyan-400">{positionSize}%</div>
                </div>

                {/* Max Drawdown */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Drawdown (%)</label>
                  <input
                    type="range"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                    min="5"
                    max="50"
                    className="w-full"
                  />
                  <div className="text-right text-sm text-red-400">{maxDrawdown}%</div>
                </div>

                {/* Advanced Settings */}
                <div className="pt-4 border-t border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Advanced Options
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Commission</label>
                      <input
                        type="number"
                        value={commission}
                        onChange={(e) => setCommission(Number(e.target.value))}
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Slippage</label>
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(Number(e.target.value))}
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Leverage</label>
                      <input
                        type="number"
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        min="1"
                        max="10"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>

                  {/* Monte Carlo */}
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">Monte Carlo Simulations</label>
                    <select
                      value={numMonteCarloRuns}
                      onChange={(e) => setNumMonteCarloRuns(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                    >
                      <option value={0}>Disabled</option>
                      <option value={100}>100 runs</option>
                      <option value={500}>500 runs</option>
                      <option value={1000}>1,000 runs</option>
                      <option value={5000}>5,000 runs</option>
                    </select>
                  </div>

                  {/* Walk-Forward */}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={runWalkForward}
                      onChange={(e) => setRunWalkForward(e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-xs text-gray-400">Enable Walk-Forward Analysis</label>
                  </div>
                </div>

                {/* Run Button */}
                <button
                  onClick={runBacktest}
                  disabled={isRunning || !symbol}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Running Backtest...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Run Advanced Backtest
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            {result ? (
              <>
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-800">
                  {[
                    { id: 'basic', label: 'Overview', icon: BarChart3 },
                    { id: 'charts', label: 'Charts', icon: LineChart },
                    { id: 'monte-carlo', label: 'Monte Carlo', icon: Zap, disabled: !monteCarloResult },
                    { id: 'walk-forward', label: 'Walk-Forward', icon: Activity, disabled: !walkForwardResult },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                      disabled={tab.disabled}
                      className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-cyan-400 text-cyan-400'
                          : tab.disabled
                          ? 'border-transparent text-gray-600 cursor-not-allowed'
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Basic Overview */}
                {activeTab === 'basic' && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <DollarSign className="w-4 h-4" />
                          Final Capital
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(result.finalCapital)}</div>
                        <div className={`text-sm ${result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.totalReturn >= 0 ? '+' : ''}{formatCurrency(result.totalReturn)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <Percent className="w-4 h-4" />
                          Total Return
                        </div>
                        <div className={`text-2xl font-bold ${result.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.totalReturnPercent >= 0 ? '+' : ''}{formatPercent(result.totalReturnPercent)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <Target className="w-4 h-4" />
                          Win Rate
                        </div>
                        <div className="text-2xl font-bold text-blue-400">{formatPercent(result.winRate * 100)}</div>
                        <div className="text-sm text-gray-500">
                          {result.winningTrades}W / {result.losingTrades}L
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <Activity className="w-4 h-4" />
                          Total Trades
                        </div>
                        <div className="text-2xl font-bold">{result.totalTrades}</div>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800">
                      <div className="p-6 border-b border-gray-800">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-cyan-400" />
                          Performance Metrics
                        </h2>
                      </div>
                      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Profit Factor</div>
                          <div className={`text-xl font-bold ${result.profitFactor >= 1.5 ? 'text-green-400' : result.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {result.profitFactor.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Sharpe Ratio</div>
                          <div className={`text-xl font-bold ${result.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {result.sharpeRatio.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Sortino Ratio</div>
                          <div className="text-xl font-bold">{result.sortinoRatio.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Calmar Ratio</div>
                          <div className="text-xl font-bold">{result.calmarRatio.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Max Drawdown</div>
                          <div className="text-xl font-bold text-red-400">
                            {formatPercent(result.maxDrawdownPercent)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Avg Win / Loss</div>
                          <div className="text-xl font-bold">
                            <span className="text-green-400">{formatCurrency(result.averageWin)}</span>
                            <span className="text-gray-500 mx-1">/</span>
                            <span className="text-red-400">{formatCurrency(result.averageLoss)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quality Assessment */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">Strategy Quality Assessment</h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Profitability', value: result.totalReturnPercent > 0, desc: 'Strategy is profitable' },
                          { label: 'Risk-Adjusted', value: result.sharpeRatio > 1, desc: 'Good risk-adjusted returns (Sharpe > 1)' },
                          { label: 'Drawdown Control', value: result.maxDrawdownPercent < 20, desc: 'Max drawdown under 20%' },
                          { label: 'Profit Factor', value: result.profitFactor > 1.5, desc: 'Profit factor above 1.5' },
                          { label: 'Win Rate', value: result.winRate > 0.5, desc: 'Win rate above 50%' },
                        ].map((check, i) => (
                          <div key={i} className="flex items-center gap-3">
                            {check.value ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            )}
                            <div>
                              <div className="font-medium">{check.label}</div>
                              <div className="text-xs text-gray-500">{check.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Charts Tab */}
                {activeTab === 'charts' && result.equityCurve && (
                  <div className="space-y-6">
                    {/* Equity Curve */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">Equity Curve</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={result.equityCurve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#9CA3AF' }}
                          />
                          <Area type="monotone" dataKey="equity" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Drawdown Curve */}
                    {result.drawdownCurve && (
                      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                        <h3 className="font-bold mb-4">Drawdown Analysis</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={result.drawdownCurve}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                              labelStyle={{ color: '#9CA3AF' }}
                            />
                            <Area type="monotone" dataKey="drawdown" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Monte Carlo Tab */}
                {activeTab === 'monte-carlo' && monteCarloResult && (
                  <div className="space-y-6">
                    {/* Monte Carlo Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Probability of Profit</div>
                        <div className="text-2xl font-bold text-green-400">
                          {(monteCarloResult.statistics.probabilityOfProfit * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Mean Return</div>
                        <div className="text-2xl font-bold">
                          {formatPercent(monteCarloResult.statistics.meanReturn)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Value at Risk (95%)</div>
                        <div className="text-2xl font-bold text-red-400">
                          {formatPercent(monteCarloResult.statistics.valueAtRisk)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Probability of Ruin</div>
                        <div className="text-2xl font-bold text-red-400">
                          {(monteCarloResult.statistics.probabilityOfRuin * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Distribution */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">Return Distribution ({monteCarloResult.runs.length} simulations)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={monteCarloDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="range" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#9CA3AF' }}
                          />
                          <Bar dataKey="count" fill="#06B6D4" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Confidence Interval */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">95% Confidence Interval</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Lower Bound (5th percentile)</div>
                          <div className="text-xl font-bold text-red-400">
                            {formatPercent(monteCarloResult.statistics.confidenceInterval.lower)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Median Return</div>
                          <div className="text-xl font-bold text-cyan-400">
                            {formatPercent(monteCarloResult.statistics.medianReturn)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Upper Bound (95th percentile)</div>
                          <div className="text-xl font-bold text-green-400">
                            {formatPercent(monteCarloResult.statistics.confidenceInterval.upper)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Walk-Forward Tab */}
                {activeTab === 'walk-forward' && walkForwardResult && (
                  <div className="space-y-6">
                    {/* Walk-Forward Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">In-Sample Avg Return</div>
                        <div className="text-2xl font-bold">
                          {formatPercent(walkForwardResult.avgInSampleReturn)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Out-of-Sample Avg Return</div>
                        <div className="text-2xl font-bold text-cyan-400">
                          {formatPercent(walkForwardResult.avgOutOfSampleReturn)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Efficiency</div>
                        <div className={`text-2xl font-bold ${walkForwardResult.efficiency > 0.8 ? 'text-green-400' : walkForwardResult.efficiency > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {walkForwardResult.efficiency.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="text-sm text-gray-400 mb-1">Robustness Score</div>
                        <div className="text-2xl font-bold">
                          {walkForwardResult.robustness.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Walk-Forward Results */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h3 className="font-bold mb-4">Walk-Forward Periods</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsLineChart data={walkForwardResult.results}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#9CA3AF' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="returnPercent" stroke="#06B6D4" name="Return %" />
                          <Line type="monotone" dataKey="sharpeRatio" stroke="#10B981" name="Sharpe Ratio" />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
                <FlaskConical className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-400">No Backtest Results</h3>
                <p className="text-gray-500 mt-2">
                  Configure your parameters and run a backtest to see advanced analytics
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
