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
  WifiOff,
  X,
  Save,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Home,
  GraduationCap,
  Trash2,
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

interface NewPlanData {
  name: string;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  targetAmount: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

const ALLOCATION_PRESETS = {
  conservative: { stocks: 30, bonds: 60, cash: 10 },
  moderate: { stocks: 60, bonds: 30, cash: 10 },
  aggressive: { stocks: 85, bonds: 10, cash: 5 },
};

export default function RetirementPage() {
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RetirementPlan | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // New plan form state
  const [newPlan, setNewPlan] = useState<NewPlanData>({
    name: 'My Retirement Plan',
    currentAge: 35,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 1000,
    expectedReturn: 7,
    targetAmount: 2000000,
    riskTolerance: 'moderate',
  });

  // Edit plan state
  const [editPlan, setEditPlan] = useState<NewPlanData & { id: string }>({
    id: '',
    name: '',
    currentAge: 35,
    retirementAge: 65,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturn: 7,
    targetAmount: 0,
    riskTolerance: 'moderate',
  });

  // Calculator state
  const [calcAge, setCalcAge] = useState(30);
  const [calcRetireAge, setCalcRetireAge] = useState(65);
  const [calcSavings, setCalcSavings] = useState(50000);
  const [calcMonthly, setCalcMonthly] = useState(1000);
  const [calcReturn, setCalcReturn] = useState(7);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);

      const goalsResponse = await fetch(`${API_BASE}/robo/goals`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();

        if (goalsData.success && goalsData.data) {
          const retirementGoals = Array.isArray(goalsData.data)
            ? goalsData.data.filter((goal: any) => goal.type === 'retirement' || goal.name?.toLowerCase().includes('retirement'))
            : [];

          if (retirementGoals.length > 0) {
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

      const portfolioResponse = await fetch(`${API_BASE}/portfolio/summary`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();

        if (portfolioData.success && portfolioData.data) {
          const summary = portfolioData.data;

          const derivedPlan: RetirementPlan = {
            id: '1',
            name: 'Portfolio-Based Retirement Plan',
            currentAge: 35,
            retirementAge: 65,
            currentSavings: summary.total_value || summary.totalValue || 0,
            monthlyContribution: 2000,
            expectedReturn: summary.return_rate || 7,
            inflationRate: 2.5,
            targetAmount: 2000000,
            projectedAmount: (summary.total_value || 0) * Math.pow(1.07, 30),
            onTrack: true,
            accounts: summary.accounts || [],
          };

          setPlans([derivedPlan]);
          setIsConnected(true);
          return;
        }
      }

      setPlans([]);
      setIsConnected(false);

    } catch (error) {
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

  const calculateProjection = (
    savings: number = calcSavings,
    monthly: number = calcMonthly,
    currentAge: number = calcAge,
    retireAge: number = calcRetireAge,
    returnRate: number = calcReturn
  ) => {
    const years = retireAge - currentAge;
    const monthlyRate = returnRate / 100 / 12;
    const months = years * 12;

    const fvSavings = savings * Math.pow(1 + returnRate / 100, years);
    const fvContributions = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

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

  // Create new plan
  const handleCreatePlan = async () => {
    setSaving(true);
    try {
      const projection = calculateProjection(
        newPlan.currentSavings,
        newPlan.monthlyContribution,
        newPlan.currentAge,
        newPlan.retirementAge,
        newPlan.expectedReturn
      );

      const res = await fetch(`${API_BASE}/robo/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlan.name,
          type: 'retirement',
          current_age: newPlan.currentAge,
          retirement_age: newPlan.retirementAge,
          current_amount: newPlan.currentSavings,
          monthly_contribution: newPlan.monthlyContribution,
          expected_return: newPlan.expectedReturn,
          target_amount: newPlan.targetAmount,
          projected_amount: projection,
          allocation: ALLOCATION_PRESETS[newPlan.riskTolerance],
        }),
      });

      if (res.ok) {
        await fetchPlans();
      } else {
        // Optimistic update
        const newRetirementPlan: RetirementPlan = {
          id: Date.now().toString(),
          name: newPlan.name,
          currentAge: newPlan.currentAge,
          retirementAge: newPlan.retirementAge,
          currentSavings: newPlan.currentSavings,
          monthlyContribution: newPlan.monthlyContribution,
          expectedReturn: newPlan.expectedReturn,
          inflationRate: 2.5,
          targetAmount: newPlan.targetAmount,
          projectedAmount: projection,
          onTrack: projection >= newPlan.targetAmount,
          accounts: [{
            type: 'Primary Account',
            balance: newPlan.currentSavings,
            allocation: ALLOCATION_PRESETS[newPlan.riskTolerance],
          }],
        };
        setPlans([...plans, newRetirementPlan]);
      }

      setShowCreateModal(false);
      setCreateStep(1);
      setNewPlan({
        name: 'My Retirement Plan',
        currentAge: 35,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturn: 7,
        targetAmount: 2000000,
        riskTolerance: 'moderate',
      });
    } catch (error) {
      // Optimistic update on error
      const projection = calculateProjection(
        newPlan.currentSavings,
        newPlan.monthlyContribution,
        newPlan.currentAge,
        newPlan.retirementAge,
        newPlan.expectedReturn
      );
      const newRetirementPlan: RetirementPlan = {
        id: Date.now().toString(),
        name: newPlan.name,
        currentAge: newPlan.currentAge,
        retirementAge: newPlan.retirementAge,
        currentSavings: newPlan.currentSavings,
        monthlyContribution: newPlan.monthlyContribution,
        expectedReturn: newPlan.expectedReturn,
        inflationRate: 2.5,
        targetAmount: newPlan.targetAmount,
        projectedAmount: projection,
        onTrack: projection >= newPlan.targetAmount,
        accounts: [{
          type: 'Primary Account',
          balance: newPlan.currentSavings,
          allocation: ALLOCATION_PRESETS[newPlan.riskTolerance],
        }],
      };
      setPlans([...plans, newRetirementPlan]);
      setShowCreateModal(false);
      setCreateStep(1);
    }
    setSaving(false);
  };

  // Open settings for a plan
  const openSettings = (plan: RetirementPlan) => {
    setEditPlan({
      id: plan.id,
      name: plan.name,
      currentAge: plan.currentAge,
      retirementAge: plan.retirementAge,
      currentSavings: plan.currentSavings,
      monthlyContribution: plan.monthlyContribution,
      expectedReturn: plan.expectedReturn,
      targetAmount: plan.targetAmount,
      riskTolerance: 'moderate',
    });
    setShowSettingsModal(true);
  };

  // Save plan settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const projection = calculateProjection(
        editPlan.currentSavings,
        editPlan.monthlyContribution,
        editPlan.currentAge,
        editPlan.retirementAge,
        editPlan.expectedReturn
      );

      await fetch(`${API_BASE}/robo/goals/${editPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPlan.name,
          current_age: editPlan.currentAge,
          retirement_age: editPlan.retirementAge,
          current_amount: editPlan.currentSavings,
          monthly_contribution: editPlan.monthlyContribution,
          expected_return: editPlan.expectedReturn,
          target_amount: editPlan.targetAmount,
        }),
      });

      // Update local state
      setPlans(plans.map(p => {
        if (p.id === editPlan.id) {
          return {
            ...p,
            name: editPlan.name,
            currentAge: editPlan.currentAge,
            retirementAge: editPlan.retirementAge,
            currentSavings: editPlan.currentSavings,
            monthlyContribution: editPlan.monthlyContribution,
            expectedReturn: editPlan.expectedReturn,
            targetAmount: editPlan.targetAmount,
            projectedAmount: projection,
            onTrack: projection >= editPlan.targetAmount,
          };
        }
        return p;
      }));

      setShowSettingsModal(false);
    } catch (error) {
      // Update local state anyway
      const projection = calculateProjection(
        editPlan.currentSavings,
        editPlan.monthlyContribution,
        editPlan.currentAge,
        editPlan.retirementAge,
        editPlan.expectedReturn
      );
      setPlans(plans.map(p => {
        if (p.id === editPlan.id) {
          return {
            ...p,
            name: editPlan.name,
            currentAge: editPlan.currentAge,
            retirementAge: editPlan.retirementAge,
            currentSavings: editPlan.currentSavings,
            monthlyContribution: editPlan.monthlyContribution,
            expectedReturn: editPlan.expectedReturn,
            targetAmount: editPlan.targetAmount,
            projectedAmount: projection,
            onTrack: projection >= editPlan.targetAmount,
          };
        }
        return p;
      }));
      setShowSettingsModal(false);
    }
    setSaving(false);
  };

  // Delete plan
  const handleDeletePlan = async () => {
    if (!confirm('Are you sure you want to delete this retirement plan? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      await fetch(`${API_BASE}/robo/goals/${editPlan.id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Continue with local delete
    }

    setPlans(plans.filter(p => p.id !== editPlan.id));
    setShowSettingsModal(false);
    setSaving(false);
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
            onClick={() => setShowCreateModal(true)}
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
            {plans.filter(p => p.onTrack).length}/{plans.length || 0}
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
              onClick={() => setShowCreateModal(true)}
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
                  onClick={() => openSettings(plan)}
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
              {plan.accounts.length > 0 && (
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
              )}
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
                <X className="w-5 h-5" />
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

      {/* Create Plan Modal - Multi-Step Wizard */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Create Retirement Plan</h2>
                <button
                  onClick={() => { setShowCreateModal(false); setCreateStep(1); }}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {/* Step Indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      createStep >= step
                        ? 'bg-time-primary text-white'
                        : 'bg-slate-700 text-slate-400'
                    )}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={clsx(
                        'w-12 h-0.5 mx-1',
                        createStep > step ? 'bg-time-primary' : 'bg-slate-700'
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>Basic Info</span>
                <span>Contributions</span>
                <span>Allocation</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Basic Info */}
              {createStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Plan Name</label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                      placeholder="e.g., My Retirement Plan"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Your Current Age</label>
                      <input
                        type="number"
                        min="18"
                        max="80"
                        value={newPlan.currentAge}
                        onChange={(e) => setNewPlan({ ...newPlan, currentAge: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Target Retirement Age</label>
                      <input
                        type="number"
                        min={newPlan.currentAge + 1}
                        max="100"
                        value={newPlan.retirementAge}
                        onChange={(e) => setNewPlan({ ...newPlan, retirementAge: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-400">Time until retirement</p>
                    <p className="text-2xl font-bold text-white">{newPlan.retirementAge - newPlan.currentAge} years</p>
                  </div>
                </>
              )}

              {/* Step 2: Contributions */}
              {createStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Current Savings ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlan.currentSavings}
                      onChange={(e) => setNewPlan({ ...newPlan, currentSavings: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Your total current retirement savings</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Contribution ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlan.monthlyContribution}
                      onChange={(e) => setNewPlan({ ...newPlan, monthlyContribution: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">How much you plan to save each month</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Target Retirement Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlan.targetAmount}
                      onChange={(e) => setNewPlan({ ...newPlan, targetAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Your goal for retirement savings</p>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-400 mb-1">Projected at Retirement</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(calculateProjection(
                        newPlan.currentSavings,
                        newPlan.monthlyContribution,
                        newPlan.currentAge,
                        newPlan.retirementAge,
                        newPlan.expectedReturn
                      ))}
                    </p>
                    <p className="text-xs text-green-300/70 mt-1">Based on {newPlan.expectedReturn}% annual return</p>
                  </div>
                </>
              )}

              {/* Step 3: Allocation */}
              {createStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Expected Annual Return (%)</label>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      value={newPlan.expectedReturn}
                      onChange={(e) => setNewPlan({ ...newPlan, expectedReturn: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">3%</span>
                      <span className="text-white font-bold">{newPlan.expectedReturn}%</span>
                      <span className="text-slate-500">12%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Risk Tolerance</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'conservative', label: 'Conservative', icon: Shield, desc: '30% Stocks, 60% Bonds' },
                        { value: 'moderate', label: 'Moderate', icon: Target, desc: '60% Stocks, 30% Bonds' },
                        { value: 'aggressive', label: 'Aggressive', icon: TrendingUp, desc: '85% Stocks, 10% Bonds' },
                      ].map(({ value, label, icon: Icon, desc }) => (
                        <button
                          key={value}
                          onClick={() => setNewPlan({ ...newPlan, riskTolerance: value as any })}
                          className={clsx(
                            'p-4 rounded-lg border text-left transition-colors',
                            newPlan.riskTolerance === value
                              ? 'border-time-primary bg-time-primary/20'
                              : 'border-slate-700 hover:border-slate-600'
                          )}
                        >
                          <Icon className={clsx(
                            'w-5 h-5 mb-2',
                            newPlan.riskTolerance === value ? 'text-time-primary' : 'text-slate-400'
                          )} />
                          <p className="text-sm font-medium text-white">{label}</p>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
                    <h4 className="text-sm font-medium text-white mb-3">Plan Summary</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Plan Name</span>
                      <span className="text-white">{newPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Retirement in</span>
                      <span className="text-white">{newPlan.retirementAge - newPlan.currentAge} years</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Monthly Contribution</span>
                      <span className="text-white">{formatCurrency(newPlan.monthlyContribution)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Target Amount</span>
                      <span className="text-white">{formatCurrency(newPlan.targetAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                      <span className="text-green-400">Projected Amount</span>
                      <span className="text-green-400 font-bold">
                        {formatCurrency(calculateProjection(
                          newPlan.currentSavings,
                          newPlan.monthlyContribution,
                          newPlan.currentAge,
                          newPlan.retirementAge,
                          newPlan.expectedReturn
                        ))}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-between">
              {createStep > 1 ? (
                <button
                  onClick={() => setCreateStep(createStep - 1)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <button
                  onClick={() => { setShowCreateModal(false); setCreateStep(1); }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              )}

              {createStep < 3 ? (
                <button
                  onClick={() => setCreateStep(createStep + 1)}
                  className="px-4 py-2 bg-time-primary text-white rounded-lg hover:bg-time-primary/80 transition-colors flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreatePlan}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Plan
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-time-primary" />
                Plan Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Plan Name</label>
                <input
                  type="text"
                  value={editPlan.name}
                  onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current Age</label>
                  <input
                    type="number"
                    value={editPlan.currentAge}
                    onChange={(e) => setEditPlan({ ...editPlan, currentAge: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Retirement Age</label>
                  <input
                    type="number"
                    value={editPlan.retirementAge}
                    onChange={(e) => setEditPlan({ ...editPlan, retirementAge: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Current Savings ($)</label>
                <input
                  type="number"
                  value={editPlan.currentSavings}
                  onChange={(e) => setEditPlan({ ...editPlan, currentSavings: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Contribution ($)</label>
                <input
                  type="number"
                  value={editPlan.monthlyContribution}
                  onChange={(e) => setEditPlan({ ...editPlan, monthlyContribution: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Expected Return (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editPlan.expectedReturn}
                  onChange={(e) => setEditPlan({ ...editPlan, expectedReturn: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Amount ($)</label>
                <input
                  type="number"
                  value={editPlan.targetAmount}
                  onChange={(e) => setEditPlan({ ...editPlan, targetAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-time-primary focus:outline-none"
                />
              </div>

              {/* Projected */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 mb-1">New Projected Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(calculateProjection(
                    editPlan.currentSavings,
                    editPlan.monthlyContribution,
                    editPlan.currentAge,
                    editPlan.retirementAge,
                    editPlan.expectedReturn
                  ))}
                </p>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
                <button
                  onClick={handleDeletePlan}
                  disabled={saving}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Plan
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-2 bg-time-primary text-white rounded-lg hover:bg-time-primary/80 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
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
