'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  Home,
  GraduationCap,
  Briefcase,
  PiggyBank,
  Car,
  RefreshCcw,
  ChevronRight,
  Loader2,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

interface InvestmentGoal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  riskProfile: {
    level: string;
    score: number;
    description: string;
  };
  allocation: {
    assetClass: string;
    targetPercent: number;
    etf: string;
    etfName: string;
  }[];
}

interface RiskQuestion {
  id: string;
  question: string;
  options: { value: number; label: string }[];
}

const GOAL_ICONS: Record<string, any> = {
  retirement: Briefcase,
  home: Home,
  education: GraduationCap,
  emergency_fund: PiggyBank,
  general_savings: TrendingUp,
  major_purchase: Car,
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState('retirement');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [riskAnswers, setRiskAnswers] = useState<Record<string, number>>({});
  const [riskProfile, setRiskProfile] = useState<any>(null);

  const fetchGoals = useCallback(async () => {
    // Mock data fallback
    const mockGoals: InvestmentGoal[] = [
      {
        id: 'mock-1',
        name: 'Retirement Fund',
        type: 'retirement',
        targetAmount: 1000000,
        currentAmount: 150000,
        targetDate: '2045-12-31',
        monthlyContribution: 1500,
        riskProfile: {
          level: 'moderate',
          score: 50,
          description: 'Balanced approach with moderate risk',
        },
        allocation: [
          { assetClass: 'Stocks', targetPercent: 60, etf: 'VTI', etfName: 'Vanguard Total Stock Market' },
          { assetClass: 'Bonds', targetPercent: 30, etf: 'BND', etfName: 'Vanguard Total Bond Market' },
          { assetClass: 'Cash', targetPercent: 10, etf: 'VMFXX', etfName: 'Vanguard Federal Money Market' },
        ],
      },
    ];

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/robo/goals?userId=demo-user`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      if (data.success && data.data?.goals) {
        setGoals(data.data.goals);
        setIsConnected(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch goals from API, using mock data:', error);
      setGoals(mockGoals);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    // Mock data fallback
    const mockQuestions: RiskQuestion[] = [
      {
        id: 'q1',
        question: 'What is your investment time horizon?',
        options: [
          { value: 1, label: 'Less than 3 years' },
          { value: 3, label: '3-5 years' },
          { value: 5, label: '5-10 years' },
          { value: 7, label: 'More than 10 years' },
        ],
      },
      {
        id: 'q2',
        question: 'How would you react to a 20% market decline?',
        options: [
          { value: 1, label: 'Sell everything immediately' },
          { value: 3, label: 'Hold and wait' },
          { value: 5, label: 'Buy more at lower prices' },
        ],
      },
    ];

    try {
      const res = await fetch(`${API_BASE}/robo/questions`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      if (data.success && data.data?.questions) {
        setQuestions(data.data.questions);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch questions from API, using mock data:', error);
      setQuestions(mockQuestions);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchGoals(), fetchQuestions()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchGoals();
    fetchQuestions();
  }, [fetchGoals, fetchQuestions]);

  const calculateRiskProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/robo/risk-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: riskAnswers }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      if (data.success && data.data?.profile) {
        setRiskProfile(data.data.profile);
        setStep(3);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to calculate risk profile:', error);
      // Fallback to basic profile
      const avgScore = Object.values(riskAnswers).reduce((a, b) => a + b, 0) / Object.values(riskAnswers).length;
      const score = Math.round((avgScore / 7) * 100);
      let level = 'moderate';
      if (score < 20) level = 'conservative';
      else if (score < 40) level = 'moderate_conservative';
      else if (score < 60) level = 'moderate';
      else if (score < 80) level = 'moderate_aggressive';
      else level = 'aggressive';

      setRiskProfile({
        level,
        score,
        description: `Your risk profile is ${level.replace('_', ' ')}`,
      });
      setStep(3);
    }
  };

  const createGoal = async () => {
    try {
      const res = await fetch(`${API_BASE}/robo/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          name: goalName,
          type: goalType,
          targetAmount: parseFloat(targetAmount),
          targetDate,
          monthlyContribution: parseFloat(monthlyContribution) || 0,
          riskAnswers,
        }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      if (data.success) {
        alert(`Goal "${goalName}" created!`);
        setShowNewGoal(false);
        resetForm();
        fetchGoals();
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert('Failed to create goal. Please try again.');
    }
  };

  const resetForm = () => {
    setStep(1);
    setGoalName('');
    setGoalType('retirement');
    setTargetAmount('');
    setTargetDate('');
    setMonthlyContribution('');
    setRiskAnswers({});
    setRiskProfile(null);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'conservative':
        return 'text-blue-400 bg-blue-400/10';
      case 'moderate_conservative':
        return 'text-cyan-400 bg-cyan-400/10';
      case 'moderate':
        return 'text-green-400 bg-green-400/10';
      case 'moderate_aggressive':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'aggressive':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-400" />
                Investment Goals
              </h1>
              {/* Connection Status Badge */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  isConnected
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Demo
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-400 mt-2">
              Set goals and let our robo-advisor manage your investments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2 border border-gray-700"
              title="Refresh data"
            >
              <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowNewGoal(!showNewGoal)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Goal
            </button>
          </div>
        </div>

        {/* New Goal Wizard */}
        {showNewGoal && (
          <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step >= s
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-24 h-1 ${
                        step > s ? 'bg-purple-600' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Goal Details */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold mb-6">What are you saving for?</h2>

                {/* Goal Type */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(GOAL_ICONS).map(([type, Icon]) => (
                    <button
                      key={type}
                      onClick={() => setGoalType(type)}
                      className={`p-4 rounded-lg border transition-colors ${
                        goalType === type
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Goal Name
                    </label>
                    <input
                      type="text"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="e.g., Retirement Fund"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Target Amount ($)
                    </label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="100000"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Monthly Contribution ($)
                    </label>
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="500"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!goalName || !targetAmount || !targetDate}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    Next: Risk Assessment
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Risk Questions */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold mb-6">Risk Assessment</h2>
                <p className="text-gray-400 mb-6">
                  Answer these questions to determine the right investment strategy for you.
                </p>

                <div className="space-y-6">
                  {questions.map((q) => (
                    <div key={q.id} className="bg-gray-800/50 rounded-lg p-4">
                      <p className="font-medium mb-4">{q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setRiskAnswers({ ...riskAnswers, [q.id]: opt.value })
                            }
                            className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                              riskAnswers[q.id] === opt.value
                                ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={calculateRiskProfile}
                    disabled={Object.keys(riskAnswers).length < questions.length}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    Calculate My Risk Profile
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && riskProfile && (
              <div>
                <h2 className="text-xl font-bold mb-6">Your Investment Plan</h2>

                {/* Risk Profile */}
                <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Your Risk Profile</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getRiskLevelColor(
                        riskProfile.level
                      )}`}
                    >
                      {riskProfile.level.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{riskProfile.description}</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Risk Score</span>
                      <span className="font-medium">{riskProfile.score}/100</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${riskProfile.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Goal</p>
                    <p className="font-semibold">{goalName}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Target</p>
                    <p className="font-semibold">${parseInt(targetAmount).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Target Date</p>
                    <p className="font-semibold">{new Date(targetDate).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Monthly</p>
                    <p className="font-semibold">${parseInt(monthlyContribution || '0').toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={createGoal}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Create Goal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : goals.length === 0 ? (
            <div className="col-span-2 bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
              <Target className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">No Goals Yet</h3>
              <p className="text-gray-500 mt-2">
                Create your first investment goal to get started
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const Icon = GOAL_ICONS[goal.type] || Target;
              const progress = (goal.currentAmount / goal.targetAmount) * 100;

              return (
                <div
                  key={goal.id}
                  className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.name}</h3>
                        <p className="text-sm text-gray-400 capitalize">
                          {goal.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium capitalize ${getRiskLevelColor(
                        goal.riskProfile.level
                      )}`}
                    >
                      {goal.riskProfile.level.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">
                        ${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                      </span>
                      <span className="text-purple-400">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Target Date</p>
                      <p className="font-medium">
                        {new Date(goal.targetDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Monthly</p>
                      <p className="font-medium">${goal.monthlyContribution}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Risk Score</p>
                      <p className="font-medium">{goal.riskProfile.score}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
