'use client';

import {
  Rocket,
  Bot,
  Brain,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Coins,
  Play,
  BarChart3,
  Layers,
  Cpu,
  Sparkles,
  DollarSign,
  Clock,
  LineChart,
  PieChart,
  RefreshCw,
  Upload,
  Download,
  Users,
  Crown,
  Gem,
  FlaskConical,
  Activity,
} from 'lucide-react';
import { PageIntroContent } from './PageIntroModal';

// ============================================
// AUTOPILOT PAGE
// ============================================
export const autopilotIntro: PageIntroContent = {
  pageId: 'autopilot',
  title: 'DROPBOT AutoPilot',
  subtitle: 'Autonomous AI Trading on Autopilot',
  icon: <Rocket className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-purple-600 to-pink-600',
  description:
    "Drop your capital, pick your risk tolerance, and let TIME's AI trade for you 24/7. No manual trading required. The AI analyzes markets, executes trades, and manages risk automatically based on your chosen profile.",
  features: [
    {
      icon: <Target className="w-5 h-5 text-purple-400" />,
      title: 'Choose Your Risk DNA',
      description:
        'Select from 6 risk profiles: Ultra Safe (2-5% annual), Careful (5-10%), Balanced (10-20%), Growth (20-40%), Aggressive (40-80%), or YOLO (80%+ potential)',
    },
    {
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      title: 'Drop Any Amount',
      description:
        'Start with as little as $10. Add more capital anytime. The AI scales your positions based on your balance.',
    },
    {
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      title: 'Watch Mode',
      description:
        'See live commentary as the AI makes decisions. Understand why it enters and exits trades in real-time.',
    },
    {
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      title: 'Automatic Risk Management',
      description:
        'AI sets stop-losses, take-profits, and position sizes based on your risk profile. No emotional trading.',
    },
  ],
  warnings: [
    'Higher risk profiles can result in significant losses. Only invest what you can afford to lose.',
    'Past performance does not guarantee future results.',
    'AI trading is still subject to market conditions and unexpected events.',
  ],
  tips: [
    'Start with "Balanced" if you\'re unsure - it aims for steady growth with moderate risk.',
    'Check "Watch Mode" to learn how the AI thinks and makes decisions.',
    'You can withdraw or add funds at any time without penalties.',
  ],
  ctaText: "Let's Start Trading",
};

// ============================================
// AI TRADE GOD PAGE
// ============================================
export const aiTradeGodIntro: PageIntroContent = {
  pageId: 'ai-trade-god',
  title: 'AI Trade God',
  subtitle: 'Create Trading Bots with Plain English',
  icon: <Brain className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
  description:
    'Describe your trading strategy in plain English, and the AI builds a fully functional trading bot for you. No coding required. Just tell it what you want, and it creates, tests, and deploys your bot.',
  features: [
    {
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      title: 'Natural Language Commands',
      description:
        'Type commands like "Buy Bitcoin when RSI drops below 30 and sell when it hits 70" - the AI understands and builds it.',
    },
    {
      icon: <Bot className="w-5 h-5 text-purple-400" />,
      title: '6 Bot Types Available',
      description:
        'DCA (Dollar Cost Average), GRID Trading, WHALE_FOLLOW (copy big wallets), AI_SENTIMENT, YIELD_FARM, and MARKET_MAKE.',
    },
    {
      icon: <Users className="w-5 h-5 text-cyan-400" />,
      title: 'Bot Lending Marketplace',
      description:
        'Rent out your profitable bots to other traders for passive income. Set your monthly fee + profit share.',
    },
    {
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      title: 'Advanced Controls',
      description:
        'Configure leverage (up to 10x), short positions, stop-loss, take-profit, and max daily trade limits.',
    },
  ],
  warnings: [
    'Leverage trading can amplify both gains AND losses significantly.',
    'Test your bots in Paper Trading mode before going live with real money.',
    'AI-generated bots should still be monitored - they\'re not infallible.',
  ],
  tips: [
    'Be specific in your commands. "Buy low, sell high" is too vague. Include actual numbers and conditions.',
    'Start with DCA bots - they\'re the safest for beginners.',
    'Check the marketplace for proven bots before building from scratch.',
  ],
  ctaText: 'Create My First Bot',
};

// ============================================
// BOTS PAGE
// ============================================
export const botsIntro: PageIntroContent = {
  pageId: 'bots',
  title: 'Bot Command Center',
  subtitle: 'Manage All Your Trading Bots',
  icon: <Bot className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  description:
    "Your central hub for all trading bots. Import bots from GitHub, MQL5, cTrader, or create your own. Monitor performance, start/stop bots, and watch TIME absorb successful strategies to make them even smarter.",
  features: [
    {
      icon: <Upload className="w-5 h-5 text-cyan-400" />,
      title: 'Import From Anywhere',
      description:
        'Bring in bots from GitHub repositories, MQL5 marketplace, cTrader, or upload your own custom code.',
    },
    {
      icon: <Cpu className="w-5 h-5 text-purple-400" />,
      title: 'Strategy Absorption',
      description:
        'TIME learns from every bot. When strategies perform well, the system absorbs their logic to improve all bots.',
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
      title: 'Real-Time Metrics',
      description:
        'Track win rate, profit factor, Sharpe ratio, max drawdown, and total P&L for each bot.',
    },
    {
      icon: <Play className="w-5 h-5 text-amber-400" />,
      title: 'One-Click Control',
      description:
        'Start, stop, or pause any bot instantly. Run bulk actions on multiple bots at once.',
    },
  ],
  warnings: [
    'Imported bots from external sources should be reviewed before activation.',
    'Running too many bots simultaneously can lead to conflicting trades.',
    'Each bot consumes API rate limits - monitor your usage.',
  ],
  tips: [
    'Use the "Synthesize" feature to combine the best parts of multiple bots into one super-bot.',
    'Sort bots by Sharpe Ratio to find the most risk-efficient performers.',
    'Keep some bots in Paper mode to test new strategies without risk.',
  ],
  ctaText: 'Explore My Bots',
};

// ============================================
// ULTIMATE MONEY MACHINE PAGE
// ============================================
export const ultimateIntro: PageIntroContent = {
  pageId: 'ultimate',
  title: 'Ultimate Money Machine',
  subtitle: '25 Super-Intelligent Trading Bots',
  icon: <Gem className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-violet-600 to-purple-700',
  description:
    "The crown jewel of TIME. 25 specialized AI bots working in harmony - Legendary, Epic, and Rare tiers. Each bot has unique abilities: ALPHA_HUNTER finds hidden gems, MARKET_MAKER provides liquidity, TREND_FOLLOWER rides waves, and more.",
  features: [
    {
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      title: 'Tiered Bot System',
      description:
        'Legendary bots (highest returns, rarest), Epic bots (balanced performance), Rare bots (consistent, stable).',
    },
    {
      icon: <Layers className="w-5 h-5 text-purple-400" />,
      title: '8 Bot Specializations',
      description:
        'ALPHA_HUNTER, MARKET_MAKER, TREND_FOLLOWER, MEAN_REVERSION, ARBITRAGE, SENTIMENT_ANALYZER, VOLATILITY_TRADER, SCALPER.',
    },
    {
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      title: 'Live Trading Dashboard',
      description:
        'Watch all 25 bots trade simultaneously. See signals, entries, exits, and P&L in real-time.',
    },
    {
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      title: 'Paper Mode Available',
      description:
        'Test the entire bot army with simulated money before committing real capital.',
    },
  ],
  warnings: [
    'This is a premium feature - requires admin access or subscription.',
    'Running all 25 bots requires significant capital for proper position sizing.',
    'Legendary bots take bigger risks for bigger rewards - not for the faint-hearted.',
  ],
  tips: [
    'Start with Paper Mode to understand how each bot behaves before going live.',
    'Legendary bots work best in volatile markets; Rare bots excel in stable conditions.',
    'Monitor daily trade counts to ensure bots aren\'t overtrading.',
  ],
  ctaText: 'Unleash the Bots',
};

// ============================================
// STRATEGIES PAGE
// ============================================
export const strategiesIntro: PageIntroContent = {
  pageId: 'strategies',
  title: 'Strategy Lab',
  subtitle: 'Create & Synthesize Winning Strategies',
  icon: <Layers className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  description:
    "Build custom trading strategies or let AI synthesize new ones by combining the best elements from multiple bots. Use ensemble methods to create strategies that outperform any single approach.",
  features: [
    {
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
      title: 'AI Strategy Synthesis',
      description:
        'Select 2+ bots and the AI creates a new hybrid strategy combining their best traits using ensemble learning.',
    },
    {
      icon: <Target className="w-5 h-5 text-purple-400" />,
      title: 'Optimization Goals',
      description:
        'Choose your priority: Maximum Return, Minimum Risk, or Balanced performance optimization.',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-cyan-400" />,
      title: '5 Strategy Types',
      description:
        'Trend Following, Mean Reversion, Momentum, Breakout, or Hybrid - each suited for different market conditions.',
    },
    {
      icon: <FlaskConical className="w-5 h-5 text-amber-400" />,
      title: 'Built-In Backtesting',
      description:
        'Test any strategy on historical data before deploying. See projected returns and risk metrics.',
    },
  ],
  warnings: [
    'Synthesized strategies should still be backtested thoroughly before live trading.',
    'Overfitting is a risk - a strategy that works perfectly on past data may fail in live markets.',
    'Complex hybrid strategies can be harder to understand and debug.',
  ],
  tips: [
    'Combine bots with different approaches (e.g., trend + mean reversion) for better diversification.',
    'Use "Minimum Risk" optimization if you\'re new to strategy synthesis.',
    'Backtest on at least 2 years of data for more reliable results.',
  ],
  ctaText: 'Start Creating',
};

// ============================================
// ROBO ADVISOR PAGE
// ============================================
export const roboIntro: PageIntroContent = {
  pageId: 'robo',
  title: 'Robo-Advisor',
  subtitle: 'AI-Powered Portfolio Management',
  icon: <PieChart className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  description:
    "Set it and forget it portfolio management. The AI builds a diversified portfolio based on your goals, automatically rebalances, harvests tax losses, and reinvests dividends. Like having a financial advisor that never sleeps.",
  features: [
    {
      icon: <RefreshCw className="w-5 h-5 text-blue-400" />,
      title: 'Auto-Rebalancing',
      description:
        'Choose weekly, monthly, or quarterly rebalancing. AI sells winners and buys losers to maintain target allocation.',
    },
    {
      icon: <Coins className="w-5 h-5 text-emerald-400" />,
      title: 'Tax-Loss Harvesting',
      description:
        'Automatically sells losing positions to offset gains and reduce your tax bill.',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      title: 'Dividend Reinvestment',
      description:
        'All dividends automatically reinvested to compound your returns over time.',
    },
    {
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      title: 'Risk-Adjusted Returns',
      description:
        'AI optimizes for the best possible return given your risk tolerance - not just max gains.',
    },
  ],
  warnings: [
    'Robo-advisors work best for long-term investing (5+ years), not short-term trading.',
    'Tax-loss harvesting has wash-sale rules - consult a tax professional.',
    'Past portfolio performance doesn\'t guarantee future results.',
  ],
  tips: [
    'Set up automatic monthly deposits to benefit from dollar-cost averaging.',
    'Choose a lower risk tolerance if you\'ll need the money within 5 years.',
    'Review your portfolio allocation annually to ensure it still matches your goals.',
  ],
  ctaText: 'Build My Portfolio',
};

// ============================================
// BACKTEST PAGE
// ============================================
export const backtestIntro: PageIntroContent = {
  pageId: 'backtest',
  title: 'Backtesting Engine',
  subtitle: 'Test Strategies on Historical Data',
  icon: <FlaskConical className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-orange-500 to-red-600',
  description:
    "Before risking real money, test your strategy on years of historical market data. See exactly how it would have performed, including drawdowns, win rates, and risk-adjusted returns.",
  features: [
    {
      icon: <Clock className="w-5 h-5 text-orange-400" />,
      title: 'Historical Simulation',
      description:
        'Run your strategy on 5+ years of tick-by-tick data. See every trade it would have made.',
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
      title: 'Comprehensive Metrics',
      description:
        'Sharpe Ratio, Sortino Ratio, Calmar Ratio, Profit Factor, Max Drawdown, Win Rate, and more.',
    },
    {
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      title: 'Walk-Forward Optimization',
      description:
        'Test on rolling windows to ensure your strategy works across different market conditions.',
    },
    {
      icon: <LineChart className="w-5 h-5 text-emerald-400" />,
      title: 'Realistic Simulation',
      description:
        'Accounts for slippage, commissions, and leverage to give you accurate projections.',
    },
  ],
  warnings: [
    'Backtesting is not a guarantee of future performance - markets change.',
    'Beware of overfitting - a strategy perfectly tuned to past data may fail in live trading.',
    'Ensure you\'re testing on enough data (2+ years minimum recommended).',
  ],
  tips: [
    'Use "Walk-Forward Optimization" to reduce overfitting risk.',
    'Test on multiple symbols to see if your strategy generalizes well.',
    'Look at Max Drawdown carefully - can you stomach that much loss?',
  ],
  ctaText: 'Run Backtest',
};

// ============================================
// LIVE TRADING PAGE
// ============================================
export const liveTradingIntro: PageIntroContent = {
  pageId: 'live-trading',
  title: 'Live Bot Trading',
  subtitle: 'Watch AI Trade in Real-Time',
  icon: <Activity className="w-7 h-7 text-white" />,
  iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
  description:
    "See your bots in action. Watch every trade as it happens with live commentary explaining why the AI made each decision. Monitor P&L, positions, and market conditions in real-time.",
  features: [
    {
      icon: <Play className="w-5 h-5 text-emerald-400" />,
      title: 'Real-Time Trade Feed',
      description:
        'See entries and exits the moment they happen. No delay, no refreshing needed.',
    },
    {
      icon: <Brain className="w-5 h-5 text-purple-400" />,
      title: 'AI Decision Commentary',
      description:
        'Understand WHY the bot made each trade. "RSI oversold + MACD crossover = BUY signal"',
    },
    {
      icon: <DollarSign className="w-5 h-5 text-cyan-400" />,
      title: 'Live P&L Tracking',
      description:
        'Watch your balance change in real-time. See unrealized gains/losses on open positions.',
    },
    {
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      title: 'Emergency Stop',
      description:
        'One-click button to stop all bots immediately if something goes wrong.',
    },
  ],
  warnings: [
    'Live trading uses real money - ensure you\'re comfortable with the risks.',
    'Don\'t interfere with bot trades unless absolutely necessary - let the strategy play out.',
    'Network issues can delay your view of trades - the bot continues even if your connection drops.',
  ],
  tips: [
    'Use the Emergency Stop if you see unexpected behavior or extreme market conditions.',
    'Watch the AI commentary to learn how professional trading decisions are made.',
    'Check this page at market open/close when volatility is highest.',
  ],
  ctaText: 'Watch Live',
};

// Export all content as a lookup object
export const pageIntroContents: Record<string, PageIntroContent> = {
  autopilot: autopilotIntro,
  'ai-trade-god': aiTradeGodIntro,
  bots: botsIntro,
  ultimate: ultimateIntro,
  strategies: strategiesIntro,
  robo: roboIntro,
  backtest: backtestIntro,
  'live-trading': liveTradingIntro,
};
