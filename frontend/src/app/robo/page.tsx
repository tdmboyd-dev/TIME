'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Brain,
  TrendingUp,
  Shield,
  Zap,
  Settings,
  Play,
  Pause,
  RefreshCw,
  DollarSign,
  PieChart,
  BarChart3,
  Target,
  Sliders,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

interface Portfolio {
  id: string;
  name: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  totalValue: number;
  totalReturn: number;
  returnPercent: number;
  allocation: {
    asset: string;
    percentage: number;
    value: number;
    change: number;
  }[];
  isActive: boolean;
  autoRebalance: boolean;
  lastRebalance: string;
  monthlyDeposit: number;
}

const riskColors = {
  conservative: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  aggressive: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
};

export default function RoboAdvisorPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

  // Mock data fallback
  const getMockPortfolios = useCallback((): Portfolio[] => [
    {
      id: '1',
      name: 'Growth Portfolio',
      riskLevel: 'aggressive',
      totalValue: 125000,
      totalReturn: 18500,
      returnPercent: 17.4,
      allocation: [
        { asset: 'US Stocks', percentage: 50, value: 62500, change: 2.3 },
        { asset: 'International Stocks', percentage: 25, value: 31250, change: 1.8 },
        { asset: 'Emerging Markets', percentage: 15, value: 18750, change: -0.5 },
        { asset: 'Bonds', percentage: 10, value: 12500, change: 0.2 },
      ],
      isActive: true,
      autoRebalance: true,
      lastRebalance: '2024-12-01',
      monthlyDeposit: 1500,
    },
    {
      id: '2',
      name: 'Balanced Portfolio',
      riskLevel: 'moderate',
      totalValue: 85000,
      totalReturn: 8900,
      returnPercent: 11.7,
      allocation: [
        { asset: 'US Stocks', percentage: 40, value: 34000, change: 1.5 },
        { asset: 'International Stocks', percentage: 20, value: 17000, change: 0.8 },
        { asset: 'Bonds', percentage: 30, value: 25500, change: 0.3 },
        { asset: 'Real Estate', percentage: 10, value: 8500, change: 0.5 },
      ],
      isActive: true,
      autoRebalance: true,
      lastRebalance: '2024-11-15',
      monthlyDeposit: 1000,
    },
  ], []);

  const fetchPortfolios = useCallback(async () => {
    const loadingState = isRefreshing ? setIsRefreshing : setIsLoading;
    loadingState(true);

    try {
      const response = await fetch(`${API_BASE}/robo/portfolios`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setIsConnected(true);
        setPortfolios(data.data);
        console.log('Connected to live Robo API:', data.data.length, 'portfolios');
      } else {
        // API returned error, use mock data
        setIsConnected(false);
        setPortfolios(getMockPortfolios());
        console.log('Using mock data - API returned error');
      }
    } catch (error) {
      // Network error or API unreachable, use mock data
      console.error('Failed to fetch portfolios:', error);
      setIsConnected(false);
      setPortfolios(getMockPortfolios());
      console.log('Using mock data - API unreachable');
    } finally {
      loadingState(false);
    }
  }, [isRefreshing, getMockPortfolios]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPortfolios();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalReturn = portfolios.reduce((sum, p) => sum + p.totalReturn, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Robo-Advisor</h1>
            {/* Connection Status Badge */}
            <span
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                isConnected
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-700 text-slate-400'
              )}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Demo
                </>
              )}
            </span>
          </div>
          <p className="text-slate-400">AI-powered portfolio management and optimization</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className={clsx(
              'p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors',
              (isRefreshing || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
            title="Refresh data"
          >
            <RefreshCw className={clsx('w-4 h-4 text-slate-400', isRefreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Create Portfolio
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Total Returns</span>
          </div>
          <p className="text-2xl font-bold text-green-400">+{formatCurrency(totalReturn)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <PieChart className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Active Portfolios</span>
          </div>
          <p className="text-2xl font-bold text-white">{portfolios.filter(p => p.isActive).length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">Auto-Rebalancing</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {portfolios.filter(p => p.autoRebalance).length} Active
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-time-primary">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6 text-time-primary" />
            <h3 className="font-semibold text-white">AI Optimization</h3>
          </div>
          <p className="text-sm text-slate-400">
            Machine learning algorithms continuously optimize your portfolio for maximum risk-adjusted returns.
          </p>
        </div>

        <div className="card p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-6 h-6 text-green-400" />
            <h3 className="font-semibold text-white">Auto-Rebalancing</h3>
          </div>
          <p className="text-sm text-slate-400">
            Automatic rebalancing keeps your portfolio aligned with your target allocation.
          </p>
        </div>

        <div className="card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <h3 className="font-semibold text-white">Tax-Loss Harvesting</h3>
          </div>
          <p className="text-sm text-slate-400">
            Automatically harvest losses to minimize your tax burden and maximize after-tax returns.
          </p>
        </div>
      </div>

      {/* Portfolios */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your Portfolios</h2>

        {isLoading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-2" />
            <p className="text-slate-400">Loading portfolios...</p>
          </div>
        ) : portfolios.length === 0 ? (
          <div className="card p-8 text-center">
            <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No portfolios yet</h3>
            <p className="text-slate-400 mb-4">Create your first AI-managed portfolio</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Brain className="w-4 h-4 mr-2" />
              Create Portfolio
            </button>
          </div>
        ) : (
          portfolios.map((portfolio) => {
            const riskStyle = riskColors[portfolio.riskLevel];
            return (
              <div key={portfolio.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{portfolio.name}</h3>
                      <span className={clsx(
                        'px-2 py-0.5 text-xs rounded-full capitalize',
                        riskStyle.bg,
                        riskStyle.text
                      )}>
                        {portfolio.riskLevel}
                      </span>
                      {portfolio.isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Monthly deposit: {formatCurrency(portfolio.monthlyDeposit)} • Last rebalanced: {portfolio.lastRebalance}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                      <Settings className="w-4 h-4 text-slate-400" />
                    </button>
                    <button className={clsx(
                      'p-2 rounded-lg transition-colors',
                      portfolio.isActive ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-slate-700 hover:bg-slate-600'
                    )}>
                      {portfolio.isActive ? (
                        <Pause className="w-4 h-4 text-green-400" />
                      ) : (
                        <Play className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Value and Returns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Total Value</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(portfolio.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Return</p>
                    <p className="text-lg font-semibold text-green-400">+{formatCurrency(portfolio.totalReturn)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Return %</p>
                    <p className="text-lg font-semibold text-green-400">+{portfolio.returnPercent}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Auto-Rebalance</p>
                    <p className="text-lg font-semibold text-white">
                      {portfolio.autoRebalance ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>

                {/* Allocation */}
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-400 mb-3">Asset Allocation</p>
                  <div className="space-y-2">
                    {portfolio.allocation.map((asset, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white">{asset.asset}</span>
                            <span className="text-slate-400">{asset.percentage}%</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-time-primary to-blue-400 rounded-full"
                              style={{ width: `${asset.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right w-24">
                          <p className="text-sm text-white">{formatCurrency(asset.value)}</p>
                          <p className={clsx(
                            'text-xs',
                            asset.change >= 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {asset.change >= 0 ? '+' : ''}{asset.change}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Create AI Portfolio</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Portfolio Name</label>
                <input
                  type="text"
                  placeholder="My Investment Portfolio"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Risk Tolerance</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['conservative', 'moderate', 'aggressive'] as const).map((risk) => {
                    const style = riskColors[risk];
                    return (
                      <button
                        key={risk}
                        onClick={() => setSelectedRisk(risk)}
                        className={clsx(
                          'p-4 rounded-lg border text-center transition-all',
                          selectedRisk === risk
                            ? `${style.bg} ${style.border} ${style.text}`
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        )}
                      >
                        <p className="font-medium capitalize">{risk}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {risk === 'conservative' && '4-6% return'}
                          {risk === 'moderate' && '7-10% return'}
                          {risk === 'aggressive' && '12-15% return'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Initial Investment ($)</label>
                <input
                  type="number"
                  placeholder="10000"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Monthly Contribution ($)</label>
                <input
                  type="number"
                  placeholder="500"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-white">Auto-Rebalancing</span>
                </div>
                <button className="w-12 h-6 bg-time-primary rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium">
                  Create Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
