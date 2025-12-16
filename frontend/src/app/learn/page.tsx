'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Search,
  BookOpen,
  Play,
  Clock,
  Star,
  TrendingUp,
  BarChart3,
  Brain,
  Target,
  Shield,
  Zap,
  ChevronRight,
  CheckCircle,
  Lock,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

import { API_BASE } from '@/lib/api';

type ExplanationMode = 'plain_english' | 'beginner' | 'intermediate' | 'pro' | 'quant' | 'story';

interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number; // minutes
  completed: boolean;
  locked: boolean;
  rating: number;
  lessons: number;
}

const mockLessons: Lesson[] = [
  {
    id: '1',
    title: 'Understanding Market Regimes',
    description: 'Learn how TIME detects and adapts to different market conditions',
    category: 'Fundamentals',
    difficulty: 'beginner',
    duration: 15,
    completed: true,
    locked: false,
    rating: 4.8,
    lessons: 5,
  },
  {
    id: '2',
    title: 'Bot Analysis & Selection',
    description: 'How to evaluate trading bots and understand their performance metrics',
    category: 'Bot Management',
    difficulty: 'beginner',
    duration: 20,
    completed: true,
    locked: false,
    rating: 4.7,
    lessons: 7,
  },
  {
    id: '3',
    title: 'Risk Management Essentials',
    description: 'Master position sizing, stop losses, and portfolio risk',
    category: 'Risk',
    difficulty: 'intermediate',
    duration: 30,
    completed: false,
    locked: false,
    rating: 4.9,
    lessons: 8,
  },
  {
    id: '4',
    title: 'Strategy Synthesis Deep Dive',
    description: 'Understand how TIME combines multiple strategies into powerful hybrids',
    category: 'Advanced',
    difficulty: 'advanced',
    duration: 45,
    completed: false,
    locked: false,
    rating: 4.6,
    lessons: 12,
  },
  {
    id: '5',
    title: 'Quantitative Analysis',
    description: 'Statistical methods, backtesting, and performance optimization',
    category: 'Quant',
    difficulty: 'expert',
    duration: 60,
    completed: false,
    locked: true,
    rating: 4.9,
    lessons: 15,
  },
];

const modeDescriptions: Record<ExplanationMode, { icon: typeof Brain; label: string; description: string }> = {
  plain_english: {
    icon: BookOpen,
    label: 'Plain English',
    description: 'Simple explanations anyone can understand',
  },
  beginner: {
    icon: GraduationCap,
    label: 'Beginner',
    description: 'Step-by-step with basic concepts explained',
  },
  intermediate: {
    icon: TrendingUp,
    label: 'Intermediate',
    description: 'More detail with some technical terms',
  },
  pro: {
    icon: Target,
    label: 'Pro',
    description: 'Full technical detail for experienced traders',
  },
  quant: {
    icon: BarChart3,
    label: 'Quant',
    description: 'Mathematical formulas and statistical analysis',
  },
  story: {
    icon: Zap,
    label: 'Story Mode',
    description: 'Learn through real trade examples and narratives',
  },
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-orange-500/20 text-orange-400',
  expert: 'bg-red-500/20 text-red-400',
};

export default function LearnPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<ExplanationMode>('plain_english');
  const [filterCategory, setFilterCategory] = useState('all');
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch courses from backend
  const fetchCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem('time_auth_token');
      const response = await fetch(`${API_BASE}/learn/courses`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.courses) {
          const formattedLessons: Lesson[] = data.courses.map((c: any) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            category: c.category || 'General',
            difficulty: c.level || 'beginner',
            duration: c.duration || 15,
            completed: c.completed || false,
            locked: c.locked || false,
            rating: c.rating || 4.5,
            lessons: c.lessons?.length || c.lessonCount || 5,
          }));
          setLessons(formattedLessons);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCourses();
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || lesson.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const completedCount = lessons.filter(l => l.completed).length;
  const totalCount = lessons.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
          <p className="text-white font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Learn</h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isConnected
                ? 'bg-green-500/20 border border-green-500/50'
                : 'bg-amber-500/20 border border-amber-500/50'
            }`}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-amber-400'}`}>
                {isConnected ? 'Live' : 'Demo'}
              </span>
            </div>
          </div>
          <p className="text-slate-400">TIME teaches you in your preferred style</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-slate-400">Your Progress</p>
            <p className="text-lg font-semibold text-white">{completedCount}/{totalCount} Completed</p>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="#1e293b"
                strokeWidth="6"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="6"
                strokeDasharray={`${progressPercent * 1.76} 176`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Explanation Mode Selector */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Choose Your Learning Style</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.keys(modeDescriptions) as ExplanationMode[]).map((mode) => {
            const config = modeDescriptions[mode];
            const Icon = config.icon;
            const isSelected = selectedMode === mode;

            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={clsx(
                  'p-3 rounded-lg border transition-all text-left',
                  isSelected
                    ? 'bg-time-primary/20 border-time-primary/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                )}
              >
                <Icon className={clsx(
                  'w-5 h-5 mb-2',
                  isSelected ? 'text-time-primary' : 'text-slate-400'
                )} />
                <p className={clsx(
                  'text-sm font-medium',
                  isSelected ? 'text-white' : 'text-slate-300'
                )}>
                  {config.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {config.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-time-primary/50"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-time-primary/50"
          >
            <option value="all">All Categories</option>
            <option value="Fundamentals">Fundamentals</option>
            <option value="Bot Management">Bot Management</option>
            <option value="Risk">Risk</option>
            <option value="Advanced">Advanced</option>
            <option value="Quant">Quant</option>
          </select>
        </div>
      </div>

      {/* Current Mode Example */}
      <div className="card p-6 bg-gradient-to-br from-time-primary/10 to-transparent border-time-primary/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-time-primary/20">
            <Brain className="w-6 h-6 text-time-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              How TIME Explains Things ({modeDescriptions[selectedMode].label})
            </h3>
            {selectedMode === 'plain_english' && (
              <p className="text-slate-300">
                "Think of TIME like a super-smart assistant that watches thousands of trading robots work.
                It learns what each robot does well, and then combines the best parts to create new,
                even better strategies. It's like having the best parts of every trader working for you!"
              </p>
            )}
            {selectedMode === 'beginner' && (
              <p className="text-slate-300">
                "TIME is an AI system that analyzes trading bots. It looks at how each bot performs -
                things like how often they win trades (win rate), how much money they make vs lose (profit factor),
                and how risky they are. TIME then combines the best parts of multiple bots to create new strategies."
              </p>
            )}
            {selectedMode === 'intermediate' && (
              <p className="text-slate-300">
                "TIME uses machine learning to analyze bot performance across different market regimes.
                It evaluates metrics like Sharpe ratio, maximum drawdown, and profit factor to identify
                complementary strategies. Through recursive synthesis, it generates hybrid strategies
                optimized for current market conditions."
              </p>
            )}
            {selectedMode === 'pro' && (
              <p className="text-slate-300">
                "TIME employs a multi-agent architecture with ensemble learning. The regime detector
                classifies market states using HMM and statistical analysis. Strategy synthesis occurs
                through genetic algorithms operating on signal generation, position sizing, and exit logic.
                Risk is managed via VaR and Monte Carlo simulation."
              </p>
            )}
            {selectedMode === 'quant' && (
              <p className="text-slate-300">
                "TIME optimizes: max E[R] - λVar(R) subject to portfolio constraints. Regime detection
                uses log-likelihood: L(θ) = Σlog(Σπₖφ(xᵢ|μₖ,σₖ)). Synthesis employs crossover:
                offspring = α×parent₁ + (1-α)×parent₂ with mutation σ. Performance measured via
                Sharpe = (μᵣ - rᶠ)/σᵣ."
              </p>
            )}
            {selectedMode === 'story' && (
              <p className="text-slate-300">
                "It was 3am when Bitcoin started crashing. Most traders were asleep, but TIME was watching.
                It noticed BotA (trend follower) getting stopped out repeatedly, while BotB (mean reversion)
                was printing profits. TIME learned: 'In high volatility, switch from trend to mean reversion.'
                It created a new hybrid strategy that switches automatically. That strategy is now up 47%."
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            className={clsx(
              'card p-4 transition-all',
              lesson.locked
                ? 'opacity-60'
                : 'hover:border-slate-600/50 cursor-pointer'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'p-2.5 rounded-lg',
                  lesson.completed
                    ? 'bg-green-500/20'
                    : lesson.locked
                    ? 'bg-slate-700/50'
                    : 'bg-time-primary/20'
                )}>
                  {lesson.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : lesson.locked ? (
                    <Lock className="w-5 h-5 text-slate-500" />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-time-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{lesson.title}</h3>
                  <p className="text-xs text-slate-500">{lesson.category}</p>
                </div>
              </div>
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full capitalize',
                difficultyColors[lesson.difficulty]
              )}>
                {lesson.difficulty}
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-4 line-clamp-2">
              {lesson.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {lesson.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {lesson.lessons} lessons
                </span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {lesson.rating}
                </span>
              </div>

              {!lesson.locked && (
                <button className={clsx(
                  'flex items-center gap-1 text-sm font-medium',
                  lesson.completed
                    ? 'text-green-400'
                    : 'text-time-primary'
                )}>
                  {lesson.completed ? 'Review' : 'Start'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress bar for in-progress lessons */}
            {!lesson.completed && !lesson.locked && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="text-slate-400">2/{lesson.lessons} lessons</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-time-primary rounded-full"
                    style={{ width: `${(2 / lesson.lessons) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Tips from TIME</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <Shield className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-sm text-slate-300">
              "Never risk more than 2% of your portfolio on a single trade."
            </p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-sm text-slate-300">
              "The trend is your friend - until it ends. Always use stop losses."
            </p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <Brain className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-sm text-slate-300">
              "Diversify across strategies, not just assets. Different bots for different regimes."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
