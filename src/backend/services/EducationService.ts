/**
 * EDUCATION SERVICE
 *
 * Admin Academy - For TIMEBEUNUS (Platform Owner)
 * Bot University - For Money Machine (Premium Users)
 * Learning Path - For DropBot (Beginners)
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('EducationService');

// Types
export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: string; // e.g., "5 min"
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  videoUrl?: string;
  quiz?: Quiz;
}

export interface Quiz {
  questions: QuizQuestion[];
  passingScore: number; // percentage
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  targetAudience: 'admin' | 'power_user' | 'beginner';
  lessons: Lesson[];
  estimatedTime: string;
  prerequisites?: string[];
}

export interface UserProgress {
  userId: string;
  completedLessons: string[];
  quizScores: Record<string, number>;
  certificates: string[];
  currentCourse?: string;
  lastAccessedAt: Date;
}

// Education Service
export class EducationService {
  private courses: Map<string, Course> = new Map();
  private userProgress: Map<string, UserProgress> = new Map();

  constructor() {
    this.initializeCourses();
    logger.info('EducationService initialized with Admin Academy + Bot University + Learning Path');
  }

  private initializeCourses(): void {
    // ==========================================
    // ADMIN ACADEMY - For Platform Owner (You)
    // ==========================================
    const adminAcademy: Course = {
      id: 'admin-academy',
      title: 'Admin Academy',
      description: 'Master the entire TIME platform. Learn to control everything like a pro.',
      targetAudience: 'admin',
      estimatedTime: '2 hours',
      lessons: [
        {
          id: 'admin-1',
          title: 'Welcome to Admin Academy',
          description: 'Your 5-minute intro to running TIME like a boss',
          content: `
# Welcome to Admin Academy! 👋

You are the owner of TIME - the most advanced trading platform ever built.
This quick course will teach you everything you need to know.

## What You'll Learn:
1. How to monitor all users and bots
2. How to control the entire platform
3. How to maximize profits for everyone
4. How to handle emergencies

## Your Powers:
- Full control over all 133+ bots
- Access to every strategy
- User management
- Revenue tracking
- Emergency controls

Let's get started! 🚀
          `,
          duration: '5 min',
          difficulty: 'beginner',
          category: 'getting-started',
        },
        {
          id: 'admin-2',
          title: 'The Admin Dashboard',
          description: 'Your command center explained in plain English',
          content: `
# The Admin Dashboard 📊

Your dashboard shows everything in real-time:

## Top Stats:
- **Total Users** - How many people are using TIME
- **Active Bots** - Bots currently trading
- **Daily Volume** - How much money is being traded
- **Platform Revenue** - Your earnings

## Quick Actions:
- 🔴 **Emergency Stop** - Stops ALL trading instantly
- 🟢 **Enable Autonomous** - Lets bots run themselves
- 📊 **View Reports** - See detailed analytics

## Pro Tips:
1. Check the dashboard every morning
2. Look for unusual activity
3. Monitor error rates
4. Keep an eye on user growth
          `,
          duration: '5 min',
          difficulty: 'beginner',
          category: 'dashboard',
        },
        {
          id: 'admin-3',
          title: 'Controlling All Bots',
          description: 'How to manage 133+ bots with one click',
          content: `
# Bot Control Mastery 🤖

You have 133+ bots at your command. Here's how to control them:

## One-Click Commands:
- **Activate All** - Turns on every bot
- **Pause All** - Pauses trading but keeps positions
- **Emergency Stop** - Closes everything

## Bot Categories:
- 🦄 **LEGENDARY** (5) - The titans, 40-66% ROI
- ⚔️ **EPIC** (10) - The warriors, 20-40% ROI
- 🛡️ **RARE** (10) - The specialists, 12-30% ROI
- ⚡ **COMMON** (100+) - The army, 10-20% ROI

## Smart Tip:
Use "Activate by Tier" to gradually turn on bots.
Start with RARE → EPIC → LEGENDARY as you get comfortable.
          `,
          duration: '10 min',
          difficulty: 'intermediate',
          category: 'bot-control',
        },
        {
          id: 'admin-4',
          title: 'Revenue & Monetization',
          description: 'How the money flows and how you earn',
          content: `
# Understanding Revenue 💰

## Your Revenue Streams:
1. **Subscription Fees** - Monthly user payments
2. **10% Platform Fee** - From all transfers
3. **UMM Add-On** - $59/mo premium feature
4. **DropBot Add-On** - $39/mo beginner feature

## How to Maximize:
1. Grow user base
2. Convert free → paid
3. Upsell UMM to power users
4. Keep win rates high (happy users stay)

## Dashboard Metrics:
- MRR (Monthly Recurring Revenue)
- Churn Rate (users leaving)
- LTV (Lifetime Value)
- CAC (Cost to Acquire Customer)
          `,
          duration: '10 min',
          difficulty: 'intermediate',
          category: 'revenue',
        },
        {
          id: 'admin-5',
          title: 'Emergency Protocols',
          description: 'What to do when things go wrong',
          content: `
# Emergency Protocols 🚨

## Red Alert Situations:
1. **Market Crash** - Activate defensive mode
2. **Bot Malfunction** - Pause specific bot
3. **User Complaint** - Check trade history
4. **API Outage** - Switch to backup broker

## Emergency Steps:
1. **STOP TRADING** - Click Emergency Stop
2. **ASSESS** - Check what went wrong
3. **FIX** - Address the issue
4. **RESUME** - Gradually restart

## Pro Tip:
Always have a plan. Markets will crash, bots will glitch.
The key is staying calm and following the protocol.
          `,
          duration: '10 min',
          difficulty: 'advanced',
          category: 'emergencies',
        },
      ],
    };

    // ==========================================
    // BOT UNIVERSITY - For Money Machine Users
    // ==========================================
    const botUniversity: Course = {
      id: 'bot-university',
      title: 'Bot University',
      description: 'Learn to use the 25 Super Bots like a pro trader.',
      targetAudience: 'power_user',
      estimatedTime: '3 hours',
      lessons: [
        {
          id: 'umm-1',
          title: 'Meet Your 25 Super Bots',
          description: 'What each Super Bot does and when to use it',
          content: `
# Your Super Bot Army 🦸

You have access to 25 Super Bots. Here's what they do:

## The 5 LEGENDARY Bots:
1. **PHANTOM KING** - Master alpha hunter, 66% ROI
2. **NEURAL OVERLORD** - AI/ML prediction, 35% ROI
3. **DEATH STRIKE** - Perfect execution, 20% ROI
4. **VOID CRUSHER** - Options & arbitrage, 45% ROI
5. **LEVIATHAN STALKER** - Whale tracking, 55% ROI

## When to Use Each:
- **Bull Market** → PHANTOM KING, THUNDER BOLT
- **Bear Market** → RUBBER BAND, IRON FORTRESS
- **Sideways** → INFINITE GRINDER, BLOOD MONEY
- **Volatile** → CHAOS TAMER, DEATH STRIKE
          `,
          duration: '10 min',
          difficulty: 'beginner',
          category: 'bots',
        },
        {
          id: 'umm-2',
          title: 'Configuring Your First Bot',
          description: 'Step-by-step bot setup in 5 minutes',
          content: `
# Bot Setup Wizard 🔧

## Step 1: Choose Your Bot
Pick based on your goals:
- Want steady income? → MONEY PRINTER
- Want big gains? → PHANTOM KING
- Want safety? → IRON FORTRESS

## Step 2: Set Risk Level
- **Conservative** - 1% per trade, max 3 trades/day
- **Moderate** - 2% per trade, max 10 trades/day
- **Aggressive** - 5% per trade, unlimited trades

## Step 3: Pick Assets
Tell the bot what to trade:
- Stocks (AAPL, TSLA, etc.)
- Crypto (BTC, ETH, etc.)
- Or let it choose automatically

## Step 4: Enable & Monitor
Click Enable and watch it work!
Check back in 24 hours to see results.
          `,
          duration: '10 min',
          difficulty: 'beginner',
          category: 'setup',
        },
        {
          id: 'umm-3',
          title: 'Understanding Bot Performance',
          description: 'How to read and improve bot results',
          content: `
# Reading Bot Performance 📊

## Key Metrics:
- **Win Rate** - % of profitable trades (aim for 60%+)
- **ROI** - Return on investment
- **Sharpe Ratio** - Risk-adjusted return (above 1 is good)
- **Max Drawdown** - Biggest drop (lower is better)

## What Good Looks Like:
- Win Rate: 65-75%
- ROI: 20-40% annually
- Sharpe: 1.5-2.5
- Max Drawdown: Under 15%

## When to Adjust:
- Win rate drops below 50% → Pause and review
- Drawdown hits 20% → Reduce position size
- ROI declining → Try different market conditions
          `,
          duration: '15 min',
          difficulty: 'intermediate',
          category: 'performance',
        },
      ],
    };

    // ==========================================
    // LEARNING PATH - For DropBot Beginners
    // ==========================================
    const learningPath: Course = {
      id: 'learning-path',
      title: 'Trading Basics Learning Path',
      description: 'Zero to trading in 10 easy lessons.',
      targetAudience: 'beginner',
      estimatedTime: '1 hour',
      lessons: [
        {
          id: 'db-1',
          title: 'What is Trading?',
          description: 'The absolute basics explained simply',
          content: `
# What is Trading? 📈

Trading is buying and selling things to make money.

## Simple Example:
1. You buy an apple for $1
2. Next week, apples are popular
3. You sell your apple for $2
4. You made $1 profit! 🎉

## Stock Trading:
Same idea, but with company shares:
1. Buy Apple (AAPL) stock at $150
2. Price goes up to $160
3. Sell and keep the $10 profit!

## Why Use Bots?
Bots trade for you 24/7.
They're faster and don't get emotional.
          `,
          duration: '5 min',
          difficulty: 'beginner',
          category: 'basics',
        },
        {
          id: 'db-2',
          title: 'Understanding Risk',
          description: 'How to not lose your money',
          content: `
# Risk Made Simple 🛡️

## Rule #1: Never Risk What You Can't Lose
Only trade with "fun money" at first.

## The 5 Risk Levels in DropBot:
1. **Ultra Safe** - Barely any risk, small gains
2. **Conservative** - Low risk, steady growth
3. **Moderate** - Balanced risk/reward
4. **Aggressive** - Higher risk, higher reward
5. **Maximum** - Expert only, can lose a lot

## Starting Out?
Pick "Conservative" or "Moderate".
You can always increase later.
          `,
          duration: '5 min',
          difficulty: 'beginner',
          category: 'risk',
        },
        {
          id: 'db-3',
          title: 'Your First Trade',
          description: 'Let DropBot make your first trade',
          content: `
# Your First Trade 🎯

## Setting Up DropBot:
1. Choose your risk level (start with Moderate)
2. Add money (minimum $10)
3. Click "Start Trading"
4. Watch DropBot work!

## What Happens Next:
- DropBot analyzes the market
- It finds opportunities
- It trades automatically
- You check back later

## Pro Tips:
- Don't check every minute (relax!)
- Give it at least 24 hours
- Start small, grow later
          `,
          duration: '5 min',
          difficulty: 'beginner',
          category: 'first-trade',
        },
      ],
    };

    // Add all courses
    this.courses.set('admin-academy', adminAcademy);
    this.courses.set('bot-university', botUniversity);
    this.courses.set('learning-path', learningPath);

    logger.info(`Initialized ${this.courses.size} courses with ${
      adminAcademy.lessons.length + botUniversity.lessons.length + learningPath.lessons.length
    } total lessons`);
  }

  // Get course by ID
  getCourse(courseId: string): Course | null {
    return this.courses.get(courseId) || null;
  }

  // Get all courses for a user type
  getCoursesForUser(userType: 'admin' | 'power_user' | 'beginner'): Course[] {
    return Array.from(this.courses.values())
      .filter(c => c.targetAudience === userType);
  }

  // Get all courses
  getAllCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  // Get lesson by ID
  getLesson(courseId: string, lessonId: string): Lesson | null {
    const course = this.courses.get(courseId);
    if (!course) return null;
    return course.lessons.find(l => l.id === lessonId) || null;
  }

  // Mark lesson complete
  markLessonComplete(userId: string, lessonId: string): void {
    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = {
        userId,
        completedLessons: [],
        quizScores: {},
        certificates: [],
        lastAccessedAt: new Date(),
      };
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }
    progress.lastAccessedAt = new Date();
    this.userProgress.set(userId, progress);

    logger.info(`User ${userId} completed lesson ${lessonId}`);
  }

  // Get user progress
  getUserProgress(userId: string): UserProgress | null {
    return this.userProgress.get(userId) || null;
  }

  // Check if user completed course
  hasCompletedCourse(userId: string, courseId: string): boolean {
    const progress = this.userProgress.get(userId);
    if (!progress) return false;

    const course = this.courses.get(courseId);
    if (!course) return false;

    return course.lessons.every(l => progress.completedLessons.includes(l.id));
  }

  // Award certificate
  awardCertificate(userId: string, courseId: string): string {
    const progress = this.userProgress.get(userId);
    if (!progress) {
      throw new Error('User has no progress');
    }

    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const certId = `cert-${courseId}-${Date.now()}`;
    progress.certificates.push(certId);
    this.userProgress.set(userId, progress);

    logger.info(`Awarded certificate ${certId} to user ${userId} for ${course.title}`);
    return certId;
  }

  // Get recommended next lesson
  getNextLesson(userId: string, courseId: string): Lesson | null {
    const progress = this.userProgress.get(userId);
    const course = this.courses.get(courseId);

    if (!course) return null;

    // Find first incomplete lesson
    for (const lesson of course.lessons) {
      if (!progress || !progress.completedLessons.includes(lesson.id)) {
        return lesson;
      }
    }

    return null; // All complete
  }
}

// Singleton instance
export const educationService = new EducationService();
