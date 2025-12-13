/**
 * TIME Learning/Education Routes
 *
 * Comprehensive trading education system:
 * - Structured courses (beginner to advanced)
 * - Interactive lessons with quizzes
 * - Video content integration
 * - Progress tracking
 * - Certifications
 * - AI-powered personalized learning paths
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { databaseManager } from '../database/connection';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================
// TYPES
// ============================================================

interface Course {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  duration: number; // minutes
  lessons: Lesson[];
  instructor: string;
  rating: number;
  enrollments: number;
  prerequisites: string[];
  skills: string[];
  thumbnail: string;
  featured: boolean;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'article' | 'interactive' | 'quiz';
  duration: number;
  content: string;
  videoUrl?: string;
  order: number;
}

interface Quiz {
  id: string;
  lessonId: string;
  questions: QuizQuestion[];
  passingScore: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface UserProgress {
  userId: string;
  courseId: string;
  completedLessons: string[];
  quizScores: Record<string, number>;
  startedAt: Date;
  lastAccessed: Date;
  completed: boolean;
  completedAt?: Date;
  certificateId?: string;
}

// ============================================================
// COURSE DATA (Production: Store in MongoDB)
// ============================================================

const courses: Course[] = [
  {
    id: 'course_trading_101',
    title: 'Trading 101: Getting Started',
    description: 'Learn the fundamentals of trading - from market basics to placing your first trade. Perfect for complete beginners.',
    level: 'beginner',
    category: 'Fundamentals',
    duration: 180,
    instructor: 'TIME Academy',
    rating: 4.8,
    enrollments: 15420,
    prerequisites: [],
    skills: ['Market Basics', 'Order Types', 'Risk Management'],
    thumbnail: '/images/courses/trading-101.jpg',
    featured: true,
    lessons: [
      {
        id: 'lesson_1_1',
        title: 'What is Trading?',
        type: 'article',
        duration: 15,
        order: 1,
        content: `
# What is Trading?

Trading is the buying and selling of financial assets like stocks, bonds, currencies, or commodities with the goal of making a profit.

## Key Concepts

### 1. Markets
Markets are where buyers and sellers come together. The main markets are:
- **Stock Market**: Trade shares of companies (NYSE, NASDAQ)
- **Forex Market**: Trade currencies (EUR/USD, GBP/JPY)
- **Crypto Market**: Trade cryptocurrencies (Bitcoin, Ethereum)
- **Commodities**: Trade physical goods (Gold, Oil)

### 2. Participants
- **Retail Traders**: Individual traders like you
- **Institutional Investors**: Banks, hedge funds, pension funds
- **Market Makers**: Provide liquidity by always being willing to buy/sell

### 3. How Prices Move
Prices are determined by **supply and demand**:
- More buyers than sellers → Price goes UP
- More sellers than buyers → Price goes DOWN

## Why Trade?
1. **Grow Wealth**: Potentially earn returns higher than savings accounts
2. **Income Generation**: Some traders make it their full-time career
3. **Hedge Risk**: Protect existing investments from losses
4. **Learn Markets**: Understanding markets helps in business and life

## Getting Started
Before you start trading, you'll need:
1. A brokerage account
2. Capital to invest (start small!)
3. Knowledge of how markets work
4. A trading plan

In the next lessons, we'll cover each of these in detail.
        `,
      },
      {
        id: 'lesson_1_2',
        title: 'Understanding Order Types',
        type: 'article',
        duration: 20,
        order: 2,
        content: `
# Understanding Order Types

When you want to buy or sell, you need to place an **order**. Different order types give you different levels of control.

## Market Orders

A **market order** buys or sells immediately at the best available price.

**Pros:**
- Guaranteed execution
- Simple and fast

**Cons:**
- No price guarantee
- May get worse price in volatile markets

**When to use:** When you need to get in/out quickly and price isn't critical.

## Limit Orders

A **limit order** only executes at your specified price or better.

**Example:** "Buy 100 shares of AAPL at $150 or lower"

**Pros:**
- Price control
- No surprises

**Cons:**
- May never fill if price doesn't reach your level
- Could miss opportunities

**When to use:** When you have a specific entry/exit price in mind.

## Stop Orders

A **stop order** becomes a market order when a trigger price is hit.

### Stop-Loss Order
Protects against losses. If you're long at $100, a stop-loss at $95 sells if price drops to $95.

### Stop-Limit Order
Like a stop order, but becomes a limit order instead of market order. More control, but may not fill.

## Advanced Order Types

### Trailing Stop
A stop that moves with the price. Locks in profits while limiting downside.

### OCO (One-Cancels-Other)
Two orders linked together - when one fills, the other cancels. Great for "take profit or stop loss" setups.

### Good-Till-Canceled (GTC)
Order stays active until filled or you cancel it.

### Day Order
Order expires at end of trading day if not filled.
        `,
      },
      {
        id: 'lesson_1_3',
        title: 'Risk Management Basics',
        type: 'article',
        duration: 25,
        order: 3,
        content: `
# Risk Management Basics

**Risk management is the #1 most important skill in trading.** Without it, even the best strategies will fail.

## The Golden Rules

### Rule 1: Never Risk More Than You Can Afford to Lose
Only trade with money you don't need for bills, emergencies, or living expenses.

### Rule 2: The 1% Rule
Never risk more than 1-2% of your account on a single trade.

**Example:**
- Account size: $10,000
- Max risk per trade: $100-200
- If your stop loss is $5 away, position size = $100 / $5 = 20 shares

### Rule 3: Always Use Stop Losses
A stop loss limits your downside. Without one, a single bad trade can wipe out your account.

### Rule 4: Risk/Reward Ratio
Only take trades where potential reward is greater than potential risk.

**Good trade:** Risk $100 to potentially make $300 (1:3 ratio)
**Bad trade:** Risk $300 to potentially make $100 (3:1 ratio)

## Position Sizing

Position size = Account risk / Trade risk

**Example:**
- Account: $10,000
- Risk per trade: 1% = $100
- Entry: $50
- Stop loss: $48 (risk = $2 per share)
- Position size: $100 / $2 = 50 shares

## Diversification
Don't put all your eggs in one basket:
- Trade multiple assets
- Use different strategies
- Spread across sectors/markets

## Emotional Risk Management
- Have a trading plan and stick to it
- Don't revenge trade after a loss
- Take breaks when frustrated
- Keep a trading journal
        `,
      },
      {
        id: 'lesson_1_4',
        title: 'Quiz: Trading Basics',
        type: 'quiz',
        duration: 10,
        order: 4,
        content: 'quiz_trading_basics',
      },
    ],
  },
  {
    id: 'course_technical_analysis',
    title: 'Technical Analysis Mastery',
    description: 'Master chart reading, patterns, and indicators. Learn to predict price movements using historical data.',
    level: 'intermediate',
    category: 'Technical Analysis',
    duration: 420,
    instructor: 'TIME Academy',
    rating: 4.9,
    enrollments: 8750,
    prerequisites: ['course_trading_101'],
    skills: ['Chart Reading', 'Indicators', 'Pattern Recognition', 'Trend Analysis'],
    thumbnail: '/images/courses/technical-analysis.jpg',
    featured: true,
    lessons: [
      {
        id: 'lesson_2_1',
        title: 'Candlestick Charts Explained',
        type: 'article',
        duration: 30,
        order: 1,
        content: `
# Candlestick Charts Explained

Candlestick charts are the most popular way to visualize price action. Each "candle" shows 4 prices for a time period.

## Anatomy of a Candlestick

\`\`\`
    ┃  ← High (top of wick)
    ┃
  ┌─┴─┐← Open (if red) / Close (if green)
  │   │← Body
  └─┬─┘← Close (if red) / Open (if green)
    ┃
    ┃  ← Low (bottom of wick)
\`\`\`

### Components:
- **Open**: Where price started
- **Close**: Where price ended
- **High**: Highest price reached
- **Low**: Lowest price reached
- **Body**: Difference between open and close
- **Wicks/Shadows**: The lines above and below the body

### Colors:
- **Green/White**: Bullish - price closed HIGHER than it opened
- **Red/Black**: Bearish - price closed LOWER than it opened

## Reading Candlesticks

### Long Body
Strong buying (green) or selling (red) pressure

### Short Body
Indecision, potential reversal

### Long Upper Wick
Sellers pushed price down from the high

### Long Lower Wick
Buyers pushed price up from the low

## Key Patterns

### Doji
Open and close are almost equal. Strong indecision signal.

### Hammer
Small body, long lower wick. Bullish reversal signal.

### Shooting Star
Small body, long upper wick. Bearish reversal signal.

### Engulfing
Large candle completely "engulfs" the previous candle. Strong reversal.
        `,
      },
      {
        id: 'lesson_2_2',
        title: 'Support and Resistance',
        type: 'article',
        duration: 25,
        order: 2,
        content: `
# Support and Resistance

Support and resistance are price levels where buying or selling pressure is strong enough to stop or reverse price movement.

## Support

A price level where buying interest is strong enough to overcome selling pressure.

**Think of it as a "floor"** - price has a hard time falling below it.

### How to Identify Support:
1. Previous lows
2. Round numbers ($100, $50)
3. Moving averages
4. Trendlines

### Why Support Works:
- Buyers remember it was a good entry point
- Sellers who missed the last bounce want to sell there
- Algorithms are programmed to buy at these levels

## Resistance

A price level where selling interest is strong enough to overcome buying pressure.

**Think of it as a "ceiling"** - price has a hard time rising above it.

### How to Identify Resistance:
1. Previous highs
2. Round numbers
3. Moving averages
4. Trendlines

## Key Concepts

### Role Reversal
When support is broken, it often becomes resistance (and vice versa).

### The More Touches, The Stronger
A level that has been tested 5 times is stronger than one tested 2 times.

### Volume Confirmation
High volume at a support/resistance level increases its significance.

## Trading Strategy

**Buy at support:**
- Enter long when price bounces off support
- Stop loss below support
- Target next resistance

**Sell at resistance:**
- Enter short when price rejects resistance
- Stop loss above resistance
- Target next support
        `,
      },
    ],
  },
  {
    id: 'course_algo_trading',
    title: 'Algorithmic Trading with Python',
    description: 'Build your own trading bots. Learn to automate strategies with Python, backtesting, and live trading.',
    level: 'advanced',
    category: 'Algorithmic Trading',
    duration: 600,
    instructor: 'TIME Academy',
    rating: 4.7,
    enrollments: 4200,
    prerequisites: ['course_trading_101', 'course_technical_analysis'],
    skills: ['Python', 'Backtesting', 'API Integration', 'Automation'],
    thumbnail: '/images/courses/algo-trading.jpg',
    featured: true,
    lessons: [
      {
        id: 'lesson_3_1',
        title: 'Introduction to Algo Trading',
        type: 'article',
        duration: 20,
        order: 1,
        content: `
# Introduction to Algorithmic Trading

Algorithmic trading uses computer programs to execute trades automatically based on predefined rules.

## Why Use Algorithms?

### 1. Speed
Computers can analyze and execute in milliseconds

### 2. Emotion-Free
No fear, greed, or hesitation

### 3. 24/7 Trading
Bots don't sleep

### 4. Backtesting
Test strategies on historical data before risking real money

### 5. Consistency
Execute the same strategy every time without deviation

## Types of Strategies

### Trend Following
Buy when price is rising, sell when falling.

### Mean Reversion
Bet that prices will return to average levels.

### Arbitrage
Exploit price differences between markets.

### Market Making
Profit from bid-ask spread by providing liquidity.

### Momentum
Trade based on rate of price change.

## Tools You'll Need

1. **Python**: Most popular language for algo trading
2. **Pandas**: Data manipulation
3. **NumPy**: Numerical calculations
4. **Backtrader/Zipline**: Backtesting frameworks
5. **Broker API**: Execute trades (Alpaca, Interactive Brokers)

## Getting Started

In this course, you'll learn:
1. Setting up your development environment
2. Fetching and processing market data
3. Building trading strategies
4. Backtesting and optimization
5. Connecting to live markets
6. Risk management for bots
        `,
      },
    ],
  },
  {
    id: 'course_options_trading',
    title: 'Options Trading Complete Guide',
    description: 'Learn options from scratch to advanced strategies. Calls, puts, spreads, and income strategies.',
    level: 'intermediate',
    category: 'Options',
    duration: 480,
    instructor: 'TIME Academy',
    rating: 4.6,
    enrollments: 6100,
    prerequisites: ['course_trading_101'],
    skills: ['Options Basics', 'Greeks', 'Spreads', 'Hedging'],
    thumbnail: '/images/courses/options.jpg',
    featured: false,
    lessons: [],
  },
  {
    id: 'course_crypto_trading',
    title: 'Cryptocurrency Trading Masterclass',
    description: 'Navigate the crypto markets. Bitcoin, Ethereum, DeFi, and advanced crypto trading strategies.',
    level: 'intermediate',
    category: 'Cryptocurrency',
    duration: 360,
    instructor: 'TIME Academy',
    rating: 4.5,
    enrollments: 9800,
    prerequisites: ['course_trading_101'],
    skills: ['Crypto Basics', 'DeFi', 'NFTs', 'Technical Analysis'],
    thumbnail: '/images/courses/crypto.jpg',
    featured: false,
    lessons: [],
  },
];

const quizzes: Record<string, Quiz> = {
  quiz_trading_basics: {
    id: 'quiz_trading_basics',
    lessonId: 'lesson_1_4',
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        question: 'What type of order guarantees execution but not price?',
        options: ['Limit Order', 'Market Order', 'Stop Order', 'OCO Order'],
        correctAnswer: 1,
        explanation: 'A market order executes immediately at the best available price, guaranteeing execution but not a specific price.',
      },
      {
        id: 'q2',
        question: 'According to the 1% rule, if your account is $20,000, how much should you risk per trade?',
        options: ['$20', '$200', '$2,000', '$20,000'],
        correctAnswer: 1,
        explanation: 'The 1% rule states you should risk no more than 1% of your account per trade. 1% of $20,000 = $200.',
      },
      {
        id: 'q3',
        question: 'What does a green candlestick indicate?',
        options: ['Price went down', 'Price went up', 'No change', 'High volume'],
        correctAnswer: 1,
        explanation: 'A green (or white) candlestick means the closing price was higher than the opening price - a bullish candle.',
      },
      {
        id: 'q4',
        question: 'What is a good risk/reward ratio for a trade?',
        options: ['3:1 (risk 3 to make 1)', '1:1', '1:2 or better', 'Any ratio is fine'],
        correctAnswer: 2,
        explanation: 'You should aim for at least 1:2 risk/reward - risking $1 to potentially make $2 or more.',
      },
      {
        id: 'q5',
        question: 'What happens when a support level is broken?',
        options: ['Nothing changes', 'It often becomes resistance', 'It becomes stronger support', 'Trading stops'],
        correctAnswer: 1,
        explanation: 'When support is broken, it often "flips" to become resistance - a phenomenon called role reversal.',
      },
    ],
  },
};

// User progress storage (Production: MongoDB)
const userProgress: Map<string, UserProgress[]> = new Map();

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /learn/courses
 * List all available courses
 */
router.get('/courses', async (req: Request, res: Response) => {
  const { category, level, featured } = req.query;

  let filtered = [...courses];

  if (category) {
    filtered = filtered.filter(c => c.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (level) {
    filtered = filtered.filter(c => c.level === level);
  }

  if (featured === 'true') {
    filtered = filtered.filter(c => c.featured);
  }

  res.json({
    success: true,
    data: filtered.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      level: course.level,
      category: course.category,
      duration: course.duration,
      lessonCount: course.lessons.length,
      instructor: course.instructor,
      rating: course.rating,
      enrollments: course.enrollments,
      skills: course.skills,
      thumbnail: course.thumbnail,
      featured: course.featured,
      prerequisites: course.prerequisites,
    })),
    total: filtered.length,
  });
});

/**
 * GET /learn/courses/:courseId
 * Get detailed course information
 */
router.get('/courses/:courseId', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const course = courses.find(c => c.id === courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({
    success: true,
    data: {
      ...course,
      lessons: course.lessons.map(l => ({
        id: l.id,
        title: l.title,
        type: l.type,
        duration: l.duration,
        order: l.order,
      })),
    },
  });
});

/**
 * GET /learn/courses/:courseId/lessons/:lessonId
 * Get lesson content
 */
router.get('/courses/:courseId/lessons/:lessonId', async (req: Request, res: Response) => {
  const { courseId, lessonId } = req.params;
  const course = courses.find(c => c.id === courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = course.lessons.find(l => l.id === lessonId);

  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  res.json({
    success: true,
    data: {
      ...lesson,
      course: {
        id: course.id,
        title: course.title,
      },
      nextLesson: course.lessons.find(l => l.order === lesson.order + 1)?.id,
      prevLesson: course.lessons.find(l => l.order === lesson.order - 1)?.id,
    },
  });
});

/**
 * GET /learn/quiz/:quizId
 * Get quiz questions
 */
router.get('/quiz/:quizId', authMiddleware, async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const quiz = quizzes[quizId];

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  // Don't send correct answers to client
  res.json({
    success: true,
    data: {
      id: quiz.id,
      passingScore: quiz.passingScore,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
    },
  });
});

/**
 * POST /learn/quiz/:quizId/submit
 * Submit quiz answers
 */
router.post('/quiz/:quizId/submit', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { quizId } = req.params;
  const { answers } = req.body; // { questionId: answerIndex }

  const quiz = quizzes[quizId];

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Answers required' });
  }

  // Grade the quiz
  let correct = 0;
  const results = quiz.questions.map(q => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correct++;

    return {
      questionId: q.id,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  res.json({
    success: true,
    data: {
      score,
      passed,
      correct,
      total: quiz.questions.length,
      passingScore: quiz.passingScore,
      results,
    },
  });
});

/**
 * POST /learn/courses/:courseId/enroll
 * Enroll in a course
 */
router.post('/courses/:courseId/enroll', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { courseId } = req.params;

  const course = courses.find(c => c.id === courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Check if already enrolled
  const userProgressList = userProgress.get(user.id) || [];
  const existingProgress = userProgressList.find(p => p.courseId === courseId);

  if (existingProgress) {
    return res.json({
      success: true,
      message: 'Already enrolled',
      data: existingProgress,
    });
  }

  // Create new progress entry
  const newProgress: UserProgress = {
    userId: user.id,
    courseId,
    completedLessons: [],
    quizScores: {},
    startedAt: new Date(),
    lastAccessed: new Date(),
    completed: false,
  };

  userProgressList.push(newProgress);
  userProgress.set(user.id, userProgressList);

  res.json({
    success: true,
    message: 'Enrolled successfully',
    data: newProgress,
  });
});

/**
 * POST /learn/courses/:courseId/lessons/:lessonId/complete
 * Mark lesson as complete
 */
router.post('/courses/:courseId/lessons/:lessonId/complete', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { courseId, lessonId } = req.params;

  const userProgressList = userProgress.get(user.id) || [];
  const progress = userProgressList.find(p => p.courseId === courseId);

  if (!progress) {
    return res.status(400).json({ error: 'Not enrolled in this course' });
  }

  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
    progress.lastAccessed = new Date();
  }

  // Check if course is complete
  const course = courses.find(c => c.id === courseId);
  if (course && progress.completedLessons.length === course.lessons.length) {
    progress.completed = true;
    progress.completedAt = new Date();
    progress.certificateId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  res.json({
    success: true,
    data: progress,
  });
});

/**
 * GET /learn/progress
 * Get user's learning progress
 */
router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userProgressList = userProgress.get(user.id) || [];

  res.json({
    success: true,
    data: userProgressList.map(p => {
      const course = courses.find(c => c.id === p.courseId);
      return {
        ...p,
        courseName: course?.title,
        totalLessons: course?.lessons.length || 0,
        percentComplete: course ? Math.round((p.completedLessons.length / course.lessons.length) * 100) : 0,
      };
    }),
  });
});

/**
 * GET /learn/categories
 * Get course categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  const categories = [...new Set(courses.map(c => c.category))];

  res.json({
    success: true,
    data: categories.map(cat => ({
      name: cat,
      courseCount: courses.filter(c => c.category === cat).length,
    })),
  });
});

/**
 * GET /learn/search
 * Search courses
 */
router.get('/search', async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || (q as string).length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const query = (q as string).toLowerCase();
  const results = courses.filter(
    c =>
      c.title.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.skills.some(s => s.toLowerCase().includes(query)) ||
      c.category.toLowerCase().includes(query)
  );

  res.json({
    success: true,
    data: results,
    total: results.length,
  });
});

/**
 * GET /learn/recommendations
 * Get personalized course recommendations
 */
router.get('/recommendations', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userProgressList = userProgress.get(user.id) || [];

  const completedCourseIds = userProgressList.filter(p => p.completed).map(p => p.courseId);
  const inProgressCourseIds = userProgressList.filter(p => !p.completed).map(p => p.courseId);

  // Recommend courses that:
  // 1. User hasn't enrolled in
  // 2. Have completed prerequisites
  // 3. Are next in learning path
  const recommendations = courses.filter(course => {
    // Not already enrolled or completed
    if (completedCourseIds.includes(course.id) || inProgressCourseIds.includes(course.id)) {
      return false;
    }

    // Has completed all prerequisites
    const hasPrereqs = course.prerequisites.every(prereq => completedCourseIds.includes(prereq));
    return hasPrereqs;
  });

  res.json({
    success: true,
    data: recommendations.slice(0, 5),
  });
});

export default router;
