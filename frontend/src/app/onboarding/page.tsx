'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  TrendingUp,
  Target,
  Shield,
  Link as LinkIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  BarChart3,
  Wallet,
  DollarSign,
  PiggyBank,
  FileText,
  Calendar,
  Loader2,
  Bot,
  Play
} from 'lucide-react';
import { TimeLogo, TimeIcon } from '@/components/branding/TimeLogo';

/**
 * TIME BEYOND US - User Onboarding Flow
 *
 * A comprehensive 7-step wizard to personalize the trading experience:
 * 1. Welcome + Platform Intro
 * 2. Risk Profile Questionnaire (5 questions)
 * 3. Trading Experience Level
 * 4. Investment Goals (growth, income, preservation)
 * 5. Broker Connection Prompt
 * 6. Bot Recommendation Based on Profile
 * 7. First Bot Activation
 *
 * Features:
 * - localStorage progress saving
 * - Cookie-based completion tracking
 * - Smooth CSS transitions
 * - Full TypeScript typing
 * - Production-ready validation
 * - API integration for saving preferences
 */

// Types
type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';
type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
type TradingGoal = 'day-trading' | 'long-term' | 'retirement' | 'passive-income' | 'tax-optimization';
type InvestmentGoal = 'growth' | 'income' | 'preservation';

interface RiskQuestion {
  id: string;
  question: string;
  options: Array<{
    value: number;
    label: string;
    description: string;
  }>;
}

interface OnboardingData {
  step: number;
  name: string;
  experienceLevel: ExperienceLevel | null;
  riskTolerance: RiskTolerance | null;
  goals: TradingGoal[];
  investmentGoal: InvestmentGoal | null;
  riskAnswers: Record<string, number>;
  brokerConnected: boolean;
  recommendedBots: string[];
  activatedBot: string | null;
}

const STORAGE_KEY = 'time_onboarding_progress';
const COMPLETION_COOKIE = 'time_onboarding_complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Form state
  const [name, setName] = useState('');
  const [riskAnswers, setRiskAnswers] = useState<Record<string, number>>({});
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [investmentGoal, setInvestmentGoal] = useState<InvestmentGoal | null>(null);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | null>(null);
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [recommendedBots, setRecommendedBots] = useState<string[]>([]);
  const [activatedBot, setActivatedBot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data: OnboardingData = JSON.parse(saved);
          setCurrentStep(data.step);
          setName(data.name);
          setRiskAnswers(data.riskAnswers || {});
          setExperienceLevel(data.experienceLevel);
          setInvestmentGoal(data.investmentGoal || null);
          setRiskTolerance(data.riskTolerance);
          setGoals(data.goals);
          setRecommendedBots(data.recommendedBots || []);
          setActivatedBot(data.activatedBot || null);
        } catch (e) {
          console.error('Failed to load onboarding progress:', e);
        }
      }
    }
  }, []);

  // Save progress whenever data changes
  useEffect(() => {
    if (typeof window !== 'undefined' && name) {
      const data: OnboardingData = {
        step: currentStep,
        name,
        riskAnswers,
        experienceLevel,
        investmentGoal,
        riskTolerance,
        goals,
        brokerConnected: selectedBroker !== null,
        recommendedBots,
        activatedBot,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [currentStep, name, riskAnswers, experienceLevel, investmentGoal, riskTolerance, goals, selectedBroker, recommendedBots, activatedBot]);

  const handleNext = async () => {
    if (!canProceed()) return;

    // If moving from step 5 to 6, calculate bot recommendations
    if (currentStep === 5) {
      calculateBotRecommendations();
    }

    setIsAnimating(true);
    setDirection('forward');
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleBack = () => {
    setIsAnimating(true);
    setDirection('backward');
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleComplete = async () => {
    setIsSaving(true);

    try {
      // Save to backend API
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/users/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          riskAnswers,
          experienceLevel,
          investmentGoal,
          riskTolerance,
          goals,
          broker: selectedBroker,
          recommendedBots,
          activatedBot,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save onboarding data');
      }
    } catch (error) {
      console.error('Error saving onboarding:', error);
    }

    // Save completion status
    if (typeof window !== 'undefined') {
      // Set cookie
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${COMPLETION_COOKIE}=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

      // Clear onboarding progress
      localStorage.removeItem(STORAGE_KEY);

      // Save user preferences
      localStorage.setItem('time_user_preferences', JSON.stringify({
        name,
        experienceLevel,
        investmentGoal,
        riskTolerance,
        goals,
        activatedBot,
        onboardedAt: new Date().toISOString(),
      }));
    }

    setIsSaving(false);

    // Redirect to dashboard
    router.push('/');
  };

  const handleSkipBroker = () => {
    handleComplete();
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return name.trim().length >= 2;
      case 2:
        return Object.keys(riskAnswers).length === 5; // All 5 questions answered
      case 3:
        return experienceLevel !== null;
      case 4:
        return investmentGoal !== null;
      case 5:
        return true; // Broker connection is optional
      case 6:
        return recommendedBots.length > 0;
      case 7:
        return true; // Bot activation is optional
      default:
        return false;
    }
  };

  // Calculate risk tolerance from questionnaire answers
  const calculateRiskTolerance = (): RiskTolerance => {
    const avgScore = Object.values(riskAnswers).reduce((a, b) => a + b, 0) / Object.keys(riskAnswers).length;
    if (avgScore <= 2) return 'conservative';
    if (avgScore <= 3.5) return 'moderate';
    return 'aggressive';
  };

  // Bot recommendation engine
  const calculateBotRecommendations = () => {
    const calculatedRiskTolerance = calculateRiskTolerance();
    setRiskTolerance(calculatedRiskTolerance);

    const recommendations: string[] = [];

    // Beginner recommendations
    if (experienceLevel === 'beginner') {
      if (calculatedRiskTolerance === 'conservative') {
        recommendations.push('Index Tracker Bot', 'Dollar Cost Averaging Bot', 'Blue Chip Accumulator');
      } else if (calculatedRiskTolerance === 'moderate') {
        recommendations.push('Balanced Growth Bot', 'Smart Rebalancer', 'Trend Following Bot');
      } else {
        recommendations.push('Growth Momentum Bot', 'Swing Trader Bot', 'Volatility Rider');
      }
    }

    // Intermediate recommendations
    else if (experienceLevel === 'intermediate') {
      if (investmentGoal === 'growth') {
        recommendations.push('Growth Momentum Bot', 'Breakout Hunter', 'Sector Rotation Bot');
      } else if (investmentGoal === 'income') {
        recommendations.push('Dividend Harvester', 'Options Income Bot', 'Covered Call Writer');
      } else {
        recommendations.push('Capital Preservation Bot', 'Low Volatility Bot', 'Defensive Allocator');
      }
    }

    // Expert recommendations
    else {
      if (calculatedRiskTolerance === 'aggressive') {
        recommendations.push('AI Trade God Bot', 'Algorithmic Scalper', 'Multi-Strategy Arbitrage');
      } else if (calculatedRiskTolerance === 'moderate') {
        recommendations.push('Statistical Arbitrage Bot', 'Mean Reversion Pro', 'Options Wheel Strategy');
      } else {
        recommendations.push('Market Neutral Bot', 'Pairs Trading Bot', 'Volatility Arbitrage');
      }
    }

    // Add goal-specific bots
    if (goals.includes('retirement')) {
      recommendations.push('Retirement Growth Bot');
    }
    if (goals.includes('passive-income')) {
      recommendations.push('Passive Income Generator');
    }
    if (goals.includes('tax-optimization')) {
      recommendations.push('Tax Loss Harvester');
    }

    // Limit to top 3 recommendations
    setRecommendedBots(recommendations.slice(0, 3));
  };

  const toggleGoal = (goal: TradingGoal) => {
    setGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleRiskAnswer = (questionId: string, value: number) => {
    setRiskAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Risk Profile Questionnaire - 5 Questions
  const riskQuestions: RiskQuestion[] = [
    {
      id: 'q1',
      question: 'If your portfolio lost 20% of its value in a month, what would you do?',
      options: [
        { value: 1, label: 'Sell everything', description: 'I cannot handle losses' },
        { value: 2, label: 'Sell some holdings', description: 'I would reduce my exposure' },
        { value: 3, label: 'Hold steady', description: 'I would wait it out' },
        { value: 4, label: 'Buy more', description: 'I would see it as an opportunity' },
        { value: 5, label: 'Buy aggressively', description: 'I would double down' },
      ],
    },
    {
      id: 'q2',
      question: 'What is your investment time horizon?',
      options: [
        { value: 1, label: 'Less than 1 year', description: 'Short-term goals' },
        { value: 2, label: '1-3 years', description: 'Medium-term goals' },
        { value: 3, label: '3-5 years', description: 'Moderate long-term' },
        { value: 4, label: '5-10 years', description: 'Long-term growth' },
        { value: 5, label: '10+ years', description: 'Maximum growth potential' },
      ],
    },
    {
      id: 'q3',
      question: 'How important is generating regular income vs. capital appreciation?',
      options: [
        { value: 1, label: 'Income is critical', description: 'I need regular cash flow' },
        { value: 2, label: 'Prefer income', description: 'I prefer steady returns' },
        { value: 3, label: 'Balanced', description: 'Both are equally important' },
        { value: 4, label: 'Prefer growth', description: 'I prioritize capital gains' },
        { value: 5, label: 'Growth only', description: 'I want maximum appreciation' },
      ],
    },
    {
      id: 'q4',
      question: 'What percentage of your portfolio would you allocate to high-risk, high-reward investments?',
      options: [
        { value: 1, label: '0%', description: 'No high-risk investments' },
        { value: 2, label: '10-20%', description: 'Small allocation' },
        { value: 3, label: '20-40%', description: 'Moderate allocation' },
        { value: 4, label: '40-60%', description: 'Significant allocation' },
        { value: 5, label: '60%+', description: 'Aggressive allocation' },
      ],
    },
    {
      id: 'q5',
      question: 'How do you react to market volatility?',
      options: [
        { value: 1, label: 'Very anxious', description: 'I lose sleep over it' },
        { value: 2, label: 'Somewhat anxious', description: 'It makes me uncomfortable' },
        { value: 3, label: 'Neutral', description: 'I understand it is normal' },
        { value: 4, label: 'Calm', description: 'I see opportunities' },
        { value: 5, label: 'Excited', description: 'I thrive in volatility' },
      ],
    },
  ];

  const investmentGoals: Array<{ value: InvestmentGoal; title: string; description: string; icon: any }> = [
    {
      value: 'growth',
      title: 'Growth',
      description: 'Maximize capital appreciation over time',
      icon: TrendingUp,
    },
    {
      value: 'income',
      title: 'Income',
      description: 'Generate steady cash flow and dividends',
      icon: DollarSign,
    },
    {
      value: 'preservation',
      title: 'Preservation',
      description: 'Protect capital and minimize risk',
      icon: Shield,
    },
  ];

  const experienceLevels = [
    {
      value: 'beginner' as ExperienceLevel,
      title: 'Beginner',
      description: 'New to trading or have limited experience',
      icon: '🌱',
      recommended: 'Conservative strategies recommended',
    },
    {
      value: 'intermediate' as ExperienceLevel,
      title: 'Intermediate',
      description: 'Some trading experience with basic strategies',
      icon: '📈',
      recommended: 'Balanced growth strategies',
    },
    {
      value: 'expert' as ExperienceLevel,
      title: 'Expert',
      description: 'Experienced trader with deep market knowledge',
      icon: '🚀',
      recommended: 'Advanced algorithmic strategies',
    },
  ];

  const riskTolerances = [
    {
      value: 'conservative' as RiskTolerance,
      title: 'Conservative',
      description: 'Preserve capital, minimize losses',
      color: 'from-blue-500 to-cyan-500',
      icon: Shield,
      features: ['Lower risk', 'Stable returns', 'Capital preservation'],
    },
    {
      value: 'moderate' as RiskTolerance,
      title: 'Moderate',
      description: 'Balance between growth and safety',
      color: 'from-purple-500 to-pink-500',
      icon: BarChart3,
      features: ['Balanced risk', 'Steady growth', 'Diversification'],
    },
    {
      value: 'aggressive' as RiskTolerance,
      title: 'Aggressive',
      description: 'Maximum growth potential',
      color: 'from-orange-500 to-red-500',
      icon: TrendingUp,
      features: ['Higher risk', 'Max returns', 'Active trading'],
    },
  ];

  const tradingGoals = [
    {
      value: 'day-trading' as TradingGoal,
      title: 'Day Trading',
      description: 'Active short-term trading',
      icon: Sparkles,
    },
    {
      value: 'long-term' as TradingGoal,
      title: 'Long-term Investing',
      description: 'Build wealth over time',
      icon: TrendingUp,
    },
    {
      value: 'retirement' as TradingGoal,
      title: 'Retirement Planning',
      description: 'Secure your future',
      icon: PiggyBank,
    },
    {
      value: 'passive-income' as TradingGoal,
      title: 'Passive Income',
      description: 'Generate regular income',
      icon: DollarSign,
    },
    {
      value: 'tax-optimization' as TradingGoal,
      title: 'Tax Optimization',
      description: 'Minimize tax liability',
      icon: FileText,
    },
  ];

  const brokers = [
    { id: 'interactive-brokers', name: 'Interactive Brokers', logo: '🏦', supported: true },
    { id: 'alpaca', name: 'Alpaca', logo: '🦙', supported: true },
    { id: 'robinhood', name: 'Robinhood', logo: '🏹', supported: false },
    { id: 'td-ameritrade', name: 'TD Ameritrade', logo: '📊', supported: true },
    { id: 'coinbase', name: 'Coinbase', logo: '₿', supported: true },
    { id: 'binance', name: 'Binance', logo: '🔶', supported: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-time-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-time-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-time-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 md:p-8">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <TimeIcon size={48} animated />
              <div>
                <TimeLogo size="sm" animated />
                <p className="text-xs text-white/40 tracking-wider">META-INTELLIGENCE</p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <div
                  key={step}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    step === currentStep
                      ? 'w-8 bg-gradient-to-r from-time-primary to-time-secondary'
                      : step < currentStep
                      ? 'w-2 bg-time-primary'
                      : 'w-2 bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-4xl">
            {/* Step 1: Welcome + Name */}
            {currentStep === 1 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-time-primary to-time-secondary mb-6 animate-pulse">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Welcome to TIME
                  </h1>
                  <p className="text-lg text-white/60 max-w-xl mx-auto">
                    Let's personalize your trading experience. We'll help you get started with the perfect strategy for your goals.
                  </p>
                </div>

                <div className="max-w-md mx-auto">
                  <label className="block mb-2 text-sm font-medium text-white/80">
                    What should we call you?
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-lg placeholder-slate-500 focus:outline-none focus:border-time-primary transition-all"
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-white/40">
                    This helps us personalize your experience
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Risk Profile Questionnaire */}
            {currentStep === 2 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Let's understand your risk profile
                  </h2>
                  <p className="text-white/60">
                    Answer these 5 questions to help us personalize your experience
                  </p>
                </div>

                <div className="max-w-3xl mx-auto space-y-6">
                  {riskQuestions.map((q, index) => (
                    <div key={q.id} className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-time-primary flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-4">{q.question}</h3>
                          <div className="space-y-2">
                            {q.options.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleRiskAnswer(q.id, option.value)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                                  riskAnswers[q.id] === option.value
                                    ? 'border-time-primary bg-time-primary/10 scale-[1.02]'
                                    : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/40'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-white mb-1">{option.label}</div>
                                    <div className="text-sm text-white/60">{option.description}</div>
                                  </div>
                                  {riskAnswers[q.id] === option.value && (
                                    <Check className="w-5 h-5 text-time-primary flex-shrink-0 ml-3" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(riskAnswers).length > 0 && (
                  <div className="mt-6 p-4 bg-time-primary/10 border border-time-primary/30 rounded-xl text-center">
                    <p className="text-sm text-white/80">
                      {Object.keys(riskAnswers).length} of 5 questions answered
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Trading Experience Level */}
            {currentStep === 3 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    What's your trading experience?
                  </h2>
                  <p className="text-white/60">
                    This helps TIME recommend the right strategies for you
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setExperienceLevel(level.value)}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                        experienceLevel === level.value
                          ? 'border-time-primary bg-time-primary/10 scale-105'
                          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-4xl mb-3">{level.icon}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{level.title}</h3>
                      <p className="text-sm text-white/60 mb-3">{level.description}</p>
                      <div className="flex items-center gap-2 text-xs text-time-primary">
                        <Check className="w-4 h-4" />
                        {level.recommended}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Investment Goals (growth, income, preservation) */}
            {currentStep === 4 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    What is your primary investment goal?
                  </h2>
                  <p className="text-white/60">
                    Choose the strategy that best aligns with your objectives
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {investmentGoals.map((goal) => {
                    const Icon = goal.icon;
                    return (
                      <button
                        key={goal.value}
                        onClick={() => setInvestmentGoal(goal.value)}
                        className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
                          investmentGoal === goal.value
                            ? 'border-time-primary bg-time-primary/10 scale-105'
                            : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="mb-4">
                          <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-time-primary to-time-secondary">
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">{goal.title}</h3>
                        <p className="text-sm text-white/60">{goal.description}</p>
                        {investmentGoal === goal.value && (
                          <div className="mt-4 flex items-center justify-center gap-2 text-time-primary">
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">Selected</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Broker Connection */}
            {currentStep === 5 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Connect your first broker
                  </h2>
                  <p className="text-white/60">
                    Link a broker to start trading, or skip to explore TIME first
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {brokers.map((broker) => (
                    <button
                      key={broker.id}
                      onClick={() => broker.supported && setSelectedBroker(broker.id)}
                      disabled={!broker.supported}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 relative ${
                        !broker.supported
                          ? 'border-slate-700/30 bg-slate-800/20 opacity-50 cursor-not-allowed'
                          : selectedBroker === broker.id
                          ? 'border-time-primary bg-time-primary/10 scale-105'
                          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                      }`}
                    >
                      {selectedBroker === broker.id && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-time-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="text-4xl mb-3">{broker.logo}</div>
                      <h3 className="text-lg font-bold text-white mb-1">{broker.name}</h3>
                      {!broker.supported && (
                        <span className="text-xs text-white/40">Coming soon</span>
                      )}
                    </button>
                  ))}
                </div>

                {selectedBroker && (
                  <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-time-primary/20">
                        <LinkIcon className="w-6 h-6 text-time-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-2">Ready to connect</h4>
                        <p className="text-sm text-white/60 mb-4">
                          You'll be redirected to authorize TIME to trade on your behalf. Your credentials are never stored.
                        </p>
                        <button
                          onClick={handleComplete}
                          className="px-6 py-3 bg-gradient-to-r from-time-primary to-time-secondary text-white font-medium rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                        >
                          Connect {brokers.find(b => b.id === selectedBroker)?.name}
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsAnimating(true);
                      setDirection('forward');
                      setTimeout(() => {
                        setCurrentStep(6);
                        setIsAnimating(false);
                      }, 300);
                    }}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    I'll connect a broker later
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Bot Recommendations */}
            {currentStep === 6 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-time-primary to-time-secondary mb-6">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Your Personalized Bot Recommendations
                  </h2>
                  <p className="text-white/60">
                    Based on your profile, we recommend these trading bots
                  </p>
                </div>

                {riskTolerance && (
                  <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl max-w-2xl mx-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">Your Risk Profile</p>
                        <p className="text-lg font-bold text-white capitalize">{riskTolerance}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Experience Level</p>
                        <p className="text-lg font-bold text-white capitalize">{experienceLevel}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Investment Goal</p>
                        <p className="text-lg font-bold text-white capitalize">{investmentGoal}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {recommendedBots.map((botName, index) => (
                    <div
                      key={botName}
                      className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-time-primary/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div className="px-3 py-1 bg-time-primary/20 text-time-primary text-xs font-medium rounded-full">
                          #{index + 1} Match
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{botName}</h3>
                      <p className="text-sm text-white/60 mb-4">
                        Optimized for {riskTolerance} risk and {investmentGoal} strategy
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Check className="w-4 h-4 text-time-primary" />
                        <span>Matches your profile</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-time-primary/10 border border-time-primary/30 rounded-xl max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-time-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-white font-semibold mb-2">Next: Activate Your First Bot</h4>
                      <p className="text-sm text-white/80">
                        You can activate one of these bots now, or explore all available bots in the marketplace later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: First Bot Activation */}
            {currentStep === 7 && (
              <div
                className={`transition-all duration-300 ${
                  isAnimating
                    ? direction === 'forward'
                      ? 'opacity-0 -translate-x-8'
                      : 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-time-primary to-time-secondary mb-6 animate-pulse">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Activate Your First Bot
                  </h2>
                  <p className="text-white/60">
                    Choose a bot to start your automated trading journey
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
                  {recommendedBots.map((botName) => (
                    <button
                      key={botName}
                      onClick={() => setActivatedBot(botName)}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                        activatedBot === botName
                          ? 'border-time-primary bg-time-primary/10 scale-105'
                          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                        {activatedBot === botName && (
                          <div className="w-8 h-8 rounded-full bg-time-primary flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{botName}</h3>
                      <p className="text-sm text-white/60 mb-4">
                        {activatedBot === botName
                          ? 'Ready to activate'
                          : 'Click to select'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-time-primary" />
                        <span className="text-xs text-white/60">
                          {activatedBot === botName ? 'Selected' : 'Select to activate'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {activatedBot && (
                  <div className="max-w-2xl mx-auto">
                    <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl mb-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-time-primary/20">
                          <Target className="w-6 h-6 text-time-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-2">{activatedBot}</h4>
                          <p className="text-sm text-white/60 mb-4">
                            This bot will start in paper trading mode. You can switch to live trading once you're comfortable.
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                              <p className="text-white/40 text-xs mb-1">Mode</p>
                              <p className="text-white font-medium">Paper Trading</p>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                              <p className="text-white/40 text-xs mb-1">Risk Level</p>
                              <p className="text-white font-medium capitalize">{riskTolerance}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleComplete}
                      disabled={isSaving}
                      className="w-full px-8 py-4 bg-gradient-to-r from-time-primary to-time-secondary text-white font-medium rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Activating Bot...
                        </>
                      ) : (
                        <>
                          Activate & Start Trading
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={handleComplete}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    Skip for now - I'll activate a bot later
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12">
              {currentStep > 1 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-white transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all ${
                    canProceed()
                      ? 'bg-gradient-to-r from-time-primary to-time-secondary text-white hover:opacity-90'
                      : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : currentStep === 5 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-time-primary to-time-secondary text-white font-medium rounded-xl hover:opacity-90 transition-all"
                >
                  {selectedBroker ? 'Continue' : 'Skip & Continue'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : currentStep === 6 ? (
                <button
                  onClick={() => {
                    setIsAnimating(true);
                    setDirection('forward');
                    setTimeout(() => {
                      setCurrentStep(7);
                      setIsAnimating(false);
                    }, 300);
                  }}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-time-primary to-time-secondary text-white font-medium rounded-xl hover:opacity-90 transition-all"
                >
                  Continue to Activation
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : null}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-sm text-white/40">
            Step {currentStep} of 7
          </p>
        </footer>
      </div>
    </div>
  );
}
