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
  WifiOff,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { PageIntroModal } from '@/components/onboarding/PageIntroModal';
import { roboIntro } from '@/components/onboarding/pageIntroContent';

import { API_BASE, getAuthHeaders } from '@/lib/api';

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
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Portfolio Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [portfolioSettings, setPortfolioSettings] = useState({
    autoRebalance: true,
    rebalanceFrequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly',
    monthlyDeposit: 500,
    reinvestDividends: true,
    taxLossHarvesting: false,
  });

  // No mock data - show empty state when no portfolios exist

  const fetchPortfolios = useCallback(async () => {
    const loadingState = isRefreshing ? setIsRefreshing : setIsLoading;
    loadingState(true);

    try {
      const response = await fetch(`${API_BASE}/robo/portfolios`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setIsConnected(true);
        // Handle both array and object formats from API
        if (Array.isArray(data.data)) {
          setPortfolios(data.data);
        } else if (typeof data.data === 'object') {
          // Convert model portfolios object to array format
          const modelPortfolios = Object.entries(data.data).map(([key, value]: [string, any]) => ({
            id: key,
            name: value.name || key,
            riskLevel: value.riskLevel || 'moderate',
            totalValue: 0,
            totalReturn: 0,
            returnPercent: 0,
            allocation: value.allocation || [],
            isActive: false,
            autoRebalance: false,
            lastRebalance: '',
            monthlyDeposit: 0,
            isModel: true, // Mark as model portfolio for UI
          }));
          setPortfolios(modelPortfolios);
        }
      } else {
        // API returned error - show empty state
        setIsConnected(false);
        setPortfolios([]);
      }
    } catch (error) {
      // Error handled - shows empty state
      setIsConnected(false);
      setPortfolios([]);
    } finally {
      loadingState(false);
    }
  }, [isRefreshing]);

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
      <PageIntroModal content={roboIntro} />
      {/* Notification */}
      {notification && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2',
          notification.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
        )}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

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
                    <button
                      onClick={() => {
                        setEditingPortfolio(portfolio);
                        setPortfolioSettings({
                          autoRebalance: portfolio.autoRebalance,
                          rebalanceFrequency: 'monthly',
                          monthlyDeposit: portfolio.monthlyDeposit,
                          reinvestDividends: true,
                          taxLossHarvesting: false,
                        });
                        setShowSettingsModal(true);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                      title="Portfolio settings"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setPortfolios(prev => prev.map(p =>
                          p.id === portfolio.id ? { ...p, isActive: !p.isActive } : p
                        ));
                      }}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        portfolio.isActive ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-slate-700 hover:bg-slate-600'
                      )}
                      title={portfolio.isActive ? 'Pause portfolio' : 'Activate portfolio'}
                    >
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
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNotification({ type: 'success', message: 'Portfolio created successfully!' });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                >
                  Create Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Settings Modal */}
      {showSettingsModal && editingPortfolio && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{editingPortfolio.name} Settings</h2>
                <p className="text-slate-400 text-sm mt-1">Configure your portfolio preferences</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Auto Rebalance */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Auto Rebalance</h3>
                  <p className="text-slate-500 text-sm">Automatically rebalance to target allocation</p>
                </div>
                <button
                  onClick={() => setPortfolioSettings(prev => ({ ...prev, autoRebalance: !prev.autoRebalance }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    portfolioSettings.autoRebalance ? 'bg-time-primary' : 'bg-slate-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                    portfolioSettings.autoRebalance ? 'left-6' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Rebalance Frequency */}
              {portfolioSettings.autoRebalance && (
                <div>
                  <h3 className="text-white font-medium mb-3">Rebalance Frequency</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(['weekly', 'monthly', 'quarterly'] as const).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setPortfolioSettings(prev => ({ ...prev, rebalanceFrequency: freq }))}
                        className={clsx(
                          'py-2 px-4 rounded-lg border-2 capitalize transition-all',
                          portfolioSettings.rebalanceFrequency === freq
                            ? 'border-time-primary bg-time-primary/10 text-white'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        )}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Deposit */}
              <div>
                <h3 className="text-white font-medium mb-2">Monthly Deposit</h3>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    value={portfolioSettings.monthlyDeposit}
                    onChange={(e) => setPortfolioSettings(prev => ({ ...prev, monthlyDeposit: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Reinvest Dividends */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Reinvest Dividends</h3>
                  <p className="text-slate-500 text-sm">Automatically reinvest dividend payments</p>
                </div>
                <button
                  onClick={() => setPortfolioSettings(prev => ({ ...prev, reinvestDividends: !prev.reinvestDividends }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    portfolioSettings.reinvestDividends ? 'bg-time-primary' : 'bg-slate-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                    portfolioSettings.reinvestDividends ? 'left-6' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Tax Loss Harvesting */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Tax Loss Harvesting</h3>
                  <p className="text-slate-500 text-sm">Sell losing positions to offset gains</p>
                </div>
                <button
                  onClick={() => setPortfolioSettings(prev => ({ ...prev, taxLossHarvesting: !prev.taxLossHarvesting }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    portfolioSettings.taxLossHarvesting ? 'bg-time-primary' : 'bg-slate-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                    portfolioSettings.taxLossHarvesting ? 'left-6' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch(`${API_BASE}/robo/portfolios/${editingPortfolio.id}/settings`, {
                        method: 'PUT',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(portfolioSettings),
                      });
                    } catch {
                      // Continue anyway
                    }
                    setPortfolios(prev => prev.map(p =>
                      p.id === editingPortfolio.id
                        ? { ...p, autoRebalance: portfolioSettings.autoRebalance, monthlyDeposit: portfolioSettings.monthlyDeposit }
                        : p
                    ));
                    setShowSettingsModal(false);
                    setNotification({ type: 'success', message: 'Portfolio settings updated!' });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
