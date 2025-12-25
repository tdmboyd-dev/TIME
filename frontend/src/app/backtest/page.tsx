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
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';
import { PageIntroModal } from '@/components/onboarding/PageIntroModal';
import { backtestIntro } from '@/components/onboarding/pageIntroContent';

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
}

export default function BacktestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const runBacktest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
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
        setResult(data.data.summary);
        setIsConnected(true);
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
                Strategy Backtesting
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
              Test strategies on historical data with walk-forward optimization
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
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Advanced</h3>
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
                      Run Backtest
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
                    <div className="text-2xl font-bold text-blue-400">{formatPercent(result.winRate)}</div>
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
                      { label: 'Win Rate', value: result.winRate > 50, desc: 'Win rate above 50%' },
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
            ) : (
              <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
                <FlaskConical className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-400">No Backtest Results</h3>
                <p className="text-gray-500 mt-2">
                  Configure your parameters and run a backtest to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
