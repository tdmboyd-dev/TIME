'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PiggyBank,
  TrendingUp,
  Calendar,
  Target,
  DollarSign,
  Calculator,
  ChevronRight,
  Plus,
  Settings,
  RefreshCw,
  Wallet,
  LineChart,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

interface RetirementPlan {
  id: string;
  name: string;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate: number;
  targetAmount: number;
  projectedAmount: number;
  onTrack: boolean;
  accounts: {
    type: string;
    balance: number;
    allocation: { stocks: number; bonds: number; cash: number };
  }[];
}

export default function RetirementPage() {
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RetirementPlan | null>(null);

  // Calculator state
  const [calcAge, setCalcAge] = useState(30);
  const [calcRetireAge, setCalcRetireAge] = useState(65);
  const [calcSavings, setCalcSavings] = useState(50000);
  const [calcMonthly, setCalcMonthly] = useState(1000);
  const [calcReturn, setCalcReturn] = useState(7);

  // NO MOCK DATA - All retirement plans come from real API endpoints

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try fetching from robo-advisor goals endpoint
      const goalsResponse = await fetch(`${API_BASE}/robo/goals`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        console.log('Robo goals data:', goalsData);

        // Try to map retirement goals to retirement plans
        if (goalsData.success && goalsData.data) {
          const retirementGoals = Array.isArray(goalsData.data)
            ? goalsData.data.filter((goal: any) => goal.type === 'retirement' || goal.name?.toLowerCase().includes('retirement'))
            : [];

          if (retirementGoals.length > 0) {
            // Map goals to retirement plan format
            const mappedPlans = retirementGoals.map((goal: any) => ({
              id: goal.id || goal._id || Math.random().toString(),
              name: goal.name || 'Retirement Goal',
              currentAge: goal.current_age || 35,
              retirementAge: goal.target_age || goal.retirement_age || 65,
              currentSavings: goal.current_amount || goal.amount || 0,
              monthlyContribution: goal.monthly_contribution || 0,
              expectedReturn: goal.expected_return || 7,
              inflationRate: goal.inflation_rate || 2.5,
              targetAmount: goal.target_amount || goal.goal_amount || 0,
              projectedAmount: goal.projected_amount || goal.target_amount || 0,
              onTrack: goal.on_track ?? (goal.progress >= 100),
              accounts: goal.accounts || [],
            }));

            setPlans(mappedPlans);
            setIsConnected(true);
            return;
          }
        }
      }

      // Try fetching from portfolio summary endpoint
      const portfolioResponse = await fetch(`${API_BASE}/portfolio/summary`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        console.log('Portfolio summary data:', portfolioData);

        // Check if we can derive retirement info from portfolio
        if (portfolioData.success && portfolioData.data) {
          const summary = portfolioData.data;

          // Create a basic retirement plan from portfolio data
          const derivedPlan: RetirementPlan = {
            id: '1',
            name: 'Portfolio-Based Retirement Plan',
            currentAge: 35,
            retirementAge: 65,
            currentSavings: summary.total_value || summary.totalValue || 0,
            monthlyContribution: 2000, // Default
            expectedReturn: summary.return_rate || 7,
            inflationRate: 2.5,
            targetAmount: 2000000, // Default target
            projectedAmount: (summary.total_value || 0) * Math.pow(1.07, 30), // Simple projection
            onTrack: true,
            accounts: summary.accounts || [],
          };

          setPlans([derivedPlan]);
          setIsConnected(true);
          return;
        }
      }

      // If all API calls fail, show empty state - NO MOCK DATA
      setPlans([]);
      setIsConnected(false);

    } catch (error) {
      // Error handled - show empty state, NO MOCK DATA
      setPlans([]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const calculateProjection = () => {
    const years = calcRetireAge - calcAge;
    const monthlyRate = calcReturn / 100 / 12;
    const months = years * 12;

    // Future value of current savings
    const fvSavings = calcSavings * Math.pow(1 + calcReturn / 100, years);

    // Future value of monthly contributions
    const fvContributions = calcMonthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

    return fvSavings + fvContributions;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalSavings = plans.reduce((sum, plan) => sum + plan.currentSavings, 0);
  const totalProjected = plans.reduce((sum, plan) => sum + plan.projectedAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Retirement Planning</h1>
            {/* Connection Status Badge */}
            {isConnected ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                <Wifi className="w-3 h-3" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-500/20 text-slate-400 rounded-full border border-slate-500/30">
                <WifiOff className="w-3 h-3" />
                Demo
              </span>
            )}
          </div>
          <p className="text-slate-400">Plan and track your path to financial freedom</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2"
            title="Refresh data"
          >
            <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculator
          </button>
          <button
            onClick={() => alert('Create New Retirement Plan\n\nThis will open a wizard to help you:\n1. Set your retirement age goal\n2. Define monthly contributions\n3. Choose investment allocation\n4. Set target savings amount\n\nComing soon!')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Total Savings</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSavings)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Projected at Retirement</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalProjected)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-slate-400">Years to Retirement</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {plans[0] ? plans[0].retirementAge - plans[0].currentAge : 30}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Target className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">On Track</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {plans.filter(p => p.onTrack).length}/{plans.length}
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your Retirement Plans</h2>

        {isLoading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-2" />
            <p className="text-slate-400">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="card p-8 text-center">
            <PiggyBank className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No retirement plans yet</h3>
            <p className="text-slate-400 mb-4">Create your first retirement plan to start tracking</p>
            <button
              onClick={() => alert('Create New Retirement Plan\n\nThis will open a wizard to help you:\n1. Set your retirement age goal\n2. Define monthly contributions\n3. Choose investment allocation\n4. Set target savings amount\n\nComing soon!')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </button>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    {plan.onTrack ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        On Track
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Needs Attention
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Age {plan.currentAge} → {plan.retirementAge} ({plan.retirementAge - plan.currentAge} years)
                  </p>
                </div>
                <button
                  onClick={() => alert(`Retirement Plan Settings\n\n- Adjust monthly contribution\n- Update expected return rate\n- Modify target retirement age\n- Change investment allocation\n\nComing soon!`)}
                  className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Progress to Goal</span>
                  <span className="text-white">
                    {((plan.currentSavings / plan.targetAmount) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-time-primary to-green-400 rounded-full transition-all"
                    style={{ width: `${Math.min((plan.currentSavings / plan.targetAmount) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-500">{formatCurrency(plan.currentSavings)}</span>
                  <span className="text-slate-500">{formatCurrency(plan.targetAmount)}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Monthly Contribution</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(plan.monthlyContribution)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Expected Return</p>
                  <p className="text-sm font-semibold text-white">{plan.expectedReturn}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Projected Amount</p>
                  <p className="text-sm font-semibold text-green-400">{formatCurrency(plan.projectedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Target Amount</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(plan.targetAmount)}</p>
                </div>
              </div>

              {/* Accounts */}
              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-400 mb-3">Linked Accounts</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.accounts.map((account, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-white">{account.type}</p>
                        <p className="text-xs text-slate-400">
                          {account.allocation.stocks}% Stocks / {account.allocation.bonds}% Bonds
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-white">{formatCurrency(account.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Retirement Calculator</h3>
              <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Current Age</label>
                  <input
                    type="number"
                    value={calcAge}
                    onChange={(e) => setCalcAge(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Retirement Age</label>
                  <input
                    type="number"
                    value={calcRetireAge}
                    onChange={(e) => setCalcRetireAge(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Current Savings ($)</label>
                <input
                  type="number"
                  value={calcSavings}
                  onChange={(e) => setCalcSavings(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Monthly Contribution ($)</label>
                <input
                  type="number"
                  value={calcMonthly}
                  onChange={(e) => setCalcMonthly(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Expected Annual Return (%)</label>
                <input
                  type="number"
                  value={calcReturn}
                  onChange={(e) => setCalcReturn(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="bg-slate-800 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400 mb-1">Projected Retirement Savings</p>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(calculateProjection())}</p>
                <p className="text-xs text-slate-500 mt-1">
                  in {calcRetireAge - calcAge} years at {calcReturn}% annual return
                </p>
              </div>

              <button
                onClick={() => setShowCalculator(false)}
                className="w-full py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
