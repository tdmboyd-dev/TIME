/**
 * PLAIN ENGLISH SERVICE
 *
 * Translates all technical trading data into human-readable language.
 * Makes TIMEBEUNUS and Money Machine easy to understand.
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PlainEnglishService');

// Types
export interface PlainEnglishStats {
  performance: string;
  riskLevel: string;
  recommendation: string;
  explanation: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface PlainEnglishBot {
  name: string;
  whatItDoes: string;
  howItWorks: string;
  bestFor: string;
  riskLevel: string;
  expectedReturn: string;
  tips: string[];
}

export interface PlainEnglishMarket {
  summary: string;
  trend: string;
  whatToExpect: string;
  actionItems: string[];
}

// Plain English Service
export class PlainEnglishService {

  constructor() {
    logger.info('PlainEnglishService initialized - Making trading easy to understand');
  }

  // Translate portfolio performance
  translatePortfolio(data: {
    totalValue: number;
    dailyChange: number;
    dailyChangePercent: number;
    winRate?: number;
    totalTrades?: number;
  }): PlainEnglishStats {
    const { totalValue, dailyChange, dailyChangePercent, winRate, totalTrades } = data;

    let performance: string;
    let sentiment: 'positive' | 'neutral' | 'negative';

    if (dailyChangePercent > 3) {
      performance = `🚀 Your portfolio is on FIRE today! Up $${dailyChange.toLocaleString()} (${dailyChangePercent.toFixed(2)}%)`;
      sentiment = 'positive';
    } else if (dailyChangePercent > 1) {
      performance = `📈 Great day! You're up $${dailyChange.toLocaleString()} (${dailyChangePercent.toFixed(2)}%)`;
      sentiment = 'positive';
    } else if (dailyChangePercent > 0) {
      performance = `✅ Solid gains today. Up $${dailyChange.toLocaleString()} (${dailyChangePercent.toFixed(2)}%)`;
      sentiment = 'positive';
    } else if (dailyChangePercent > -1) {
      performance = `📊 Small dip today. Down $${Math.abs(dailyChange).toLocaleString()} (${Math.abs(dailyChangePercent).toFixed(2)}%)`;
      sentiment = 'neutral';
    } else if (dailyChangePercent > -3) {
      performance = `⚠️ Rough day. Down $${Math.abs(dailyChange).toLocaleString()} (${Math.abs(dailyChangePercent).toFixed(2)}%)`;
      sentiment = 'negative';
    } else {
      performance = `🔴 Tough market. Down $${Math.abs(dailyChange).toLocaleString()} (${Math.abs(dailyChangePercent).toFixed(2)}%)`;
      sentiment = 'negative';
    }

    let riskLevel: string;
    if (winRate && winRate > 70) {
      riskLevel = '🛡️ Low Risk - Your win rate is excellent';
    } else if (winRate && winRate > 55) {
      riskLevel = '⚖️ Moderate Risk - Good balance of wins and losses';
    } else if (winRate) {
      riskLevel = '⚡ Higher Risk - Consider adjusting strategy';
    } else {
      riskLevel = '📊 Risk analysis pending - Keep trading to build history';
    }

    let recommendation: string;
    if (sentiment === 'positive' && (!winRate || winRate > 60)) {
      recommendation = '👍 Keep doing what you\'re doing! Your strategy is working.';
    } else if (sentiment === 'negative' && dailyChangePercent < -3) {
      recommendation = '💡 Consider pausing trading. Markets are volatile. Wait for calmer conditions.';
    } else {
      recommendation = '📈 Stay the course. Markets have ups and downs.';
    }

    return {
      performance,
      riskLevel,
      recommendation,
      explanation: `Your portfolio is worth $${totalValue.toLocaleString()}. ${totalTrades ? `You've made ${totalTrades} trades total.` : ''}`,
      sentiment,
    };
  }

  // Translate bot into plain English
  translateBot(bot: {
    name: string;
    category: string;
    strategy: string;
    expectedROI: number;
    risk: string;
    winRate?: number;
    abilities?: string[];
  }): PlainEnglishBot {
    const { name, category, strategy, expectedROI, risk, winRate, abilities } = bot;

    // Category to plain English
    const categoryDescriptions: Record<string, string> = {
      'Alpha Hunter': 'finds hidden opportunities other traders miss',
      'Pattern Master': 'spots chart patterns to predict price moves',
      'Arbitrageur': 'profits from price differences between markets',
      'Learning Engine': 'gets smarter with every trade it makes',
      'Sentiment Reader': 'reads market mood from news and social media',
      'Risk Guardian': 'protects your money from big losses',
      'Yield Farmer': 'earns passive income from DeFi protocols',
      'Market Maker': 'profits by providing liquidity to markets',
    };

    // Strategy to plain English
    const strategyDescriptions: Record<string, string> = {
      'momentum': 'buys assets that are trending up',
      'mean_reversion': 'buys when prices drop too much, expecting a bounce',
      'arbitrage': 'buys low in one place, sells high in another',
      'machine_learning': 'uses AI to predict price movements',
      'options_trading': 'trades options for leverage and income',
      'grid_trading': 'places orders at regular intervals to profit from volatility',
      'dca': 'buys steadily over time to average out prices',
    };

    // Risk to plain English
    const riskDescriptions: Record<string, string> = {
      'Low': '🟢 Safe - Small, steady gains',
      'Medium': '🟡 Moderate - Balanced risk/reward',
      'High': '🟠 Aggressive - High reward, high risk',
      'Extreme': '🔴 Expert Only - Maximum risk',
    };

    const whatItDoes = categoryDescriptions[category] || 'trades automatically for you';
    const howItWorks = strategyDescriptions[strategy] || 'uses advanced algorithms';

    let bestFor: string;
    if (risk === 'Low') {
      bestFor = 'Beginners, long-term investors, cautious traders';
    } else if (risk === 'Medium') {
      bestFor = 'Active traders, balanced portfolios';
    } else if (risk === 'High') {
      bestFor = 'Experienced traders, aggressive growth';
    } else {
      bestFor = 'Expert traders only, maximum profit seekers';
    }

    const tips: string[] = [];
    if (expectedROI > 30) {
      tips.push('🎯 High potential returns - monitor closely');
    }
    if (winRate && winRate > 70) {
      tips.push('🏆 Strong historical win rate');
    }
    if (abilities && abilities.length > 3) {
      tips.push('🔧 Multi-talented bot with many abilities');
    }
    tips.push(`💰 Expected return: ${expectedROI}% per year`);

    return {
      name,
      whatItDoes: `${name} ${whatItDoes}`,
      howItWorks: `This bot ${howItWorks}`,
      bestFor,
      riskLevel: riskDescriptions[risk] || '⚪ Unknown',
      expectedReturn: `${expectedROI}% annual return expected`,
      tips,
    };
  }

  // Translate market conditions
  translateMarket(data: {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high';
    fearGreedIndex?: number;
    topMovers?: { symbol: string; change: number }[];
  }): PlainEnglishMarket {
    const { trend, volatility, fearGreedIndex, topMovers } = data;

    let summary: string;
    let trendDescription: string;
    let whatToExpect: string;
    const actionItems: string[] = [];

    // Trend description
    if (trend === 'bullish') {
      trendDescription = '📈 Markets are going UP! Buyers are in control.';
      summary = 'Good time for growth-focused strategies.';
      actionItems.push('Consider momentum strategies');
      actionItems.push('Look for breakout opportunities');
    } else if (trend === 'bearish') {
      trendDescription = '📉 Markets are going DOWN. Sellers dominate.';
      summary = 'Be cautious. Consider defensive strategies.';
      actionItems.push('Consider mean reversion strategies');
      actionItems.push('Look for oversold bounce opportunities');
    } else {
      trendDescription = '📊 Markets are SIDEWAYS. No clear direction.';
      summary = 'Great for grid trading and range strategies.';
      actionItems.push('Grid trading works well in sideways markets');
      actionItems.push('Wait for a breakout before aggressive trades');
    }

    // Volatility
    if (volatility === 'high') {
      whatToExpect = '⚡ Expect big price swings. Reduce position sizes.';
      actionItems.push('Use smaller position sizes');
      actionItems.push('Set wider stop losses');
    } else if (volatility === 'medium') {
      whatToExpect = '📊 Normal market conditions. Stick to your strategy.';
    } else {
      whatToExpect = '😴 Quiet market. Smaller moves expected.';
      actionItems.push('Good time for DCA strategies');
    }

    // Fear/Greed
    if (fearGreedIndex !== undefined) {
      if (fearGreedIndex < 25) {
        actionItems.push('🔴 Extreme Fear - Historically good buying opportunity');
      } else if (fearGreedIndex > 75) {
        actionItems.push('🟢 Extreme Greed - Consider taking profits');
      }
    }

    // Top movers
    if (topMovers && topMovers.length > 0) {
      const topGainer = topMovers.find(m => m.change > 0);
      const topLoser = topMovers.find(m => m.change < 0);
      if (topGainer) {
        actionItems.push(`🚀 ${topGainer.symbol} is hot today (+${topGainer.change.toFixed(2)}%)`);
      }
      if (topLoser) {
        actionItems.push(`📉 ${topLoser.symbol} is dropping (${topLoser.change.toFixed(2)}%)`);
      }
    }

    return {
      summary,
      trend: trendDescription,
      whatToExpect,
      actionItems,
    };
  }

  // Translate trade results
  translateTrade(trade: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    pnl?: number;
    botName?: string;
  }): string {
    const { symbol, side, quantity, price, pnl, botName } = trade;

    const action = side === 'buy' ? 'bought' : 'sold';
    const total = quantity * price;

    let result = `📝 You ${action} ${quantity} ${symbol} at $${price.toFixed(2)} (Total: $${total.toFixed(2)})`;

    if (botName) {
      result += ` • Executed by ${botName}`;
    }

    if (pnl !== undefined) {
      if (pnl > 0) {
        result += ` • 🎉 Profit: +$${pnl.toFixed(2)}`;
      } else if (pnl < 0) {
        result += ` • 📉 Loss: -$${Math.abs(pnl).toFixed(2)}`;
      } else {
        result += ' • ⚖️ Break even';
      }
    }

    return result;
  }

  // Quick stats summary
  getQuickSummary(data: {
    portfolioValue: number;
    dailyPnL: number;
    activeBots: number;
    openPositions: number;
  }): string {
    const { portfolioValue, dailyPnL, activeBots, openPositions } = data;

    const pnlEmoji = dailyPnL >= 0 ? '📈' : '📉';
    const pnlSign = dailyPnL >= 0 ? '+' : '';

    return `
💰 Portfolio: $${portfolioValue.toLocaleString()}
${pnlEmoji} Today: ${pnlSign}$${dailyPnL.toFixed(2)}
🤖 Active Bots: ${activeBots}
📊 Open Positions: ${openPositions}
    `.trim();
  }

  // Natural language command processing
  processCommand(command: string): { action: string; params: Record<string, any> } {
    const lowerCommand = command.toLowerCase();

    // "Make me money" -> enable autopilot
    if (lowerCommand.includes('make me money') || lowerCommand.includes('make money')) {
      return { action: 'enable_autopilot', params: { risk: 'moderate' } };
    }

    // "Stop everything" -> emergency stop
    if (lowerCommand.includes('stop everything') || lowerCommand.includes('stop all')) {
      return { action: 'emergency_stop', params: {} };
    }

    // "Start trading X" -> activate specific strategy
    const startMatch = lowerCommand.match(/start (?:trading )?(\w+)/);
    if (startMatch) {
      return { action: 'start_strategy', params: { strategy: startMatch[1] } };
    }

    // "How am I doing" -> get performance
    if (lowerCommand.includes('how am i doing') || lowerCommand.includes('my performance')) {
      return { action: 'get_performance', params: {} };
    }

    // "Show me best bots" -> get leaderboard
    if (lowerCommand.includes('best bot') || lowerCommand.includes('top bot')) {
      return { action: 'get_top_bots', params: { limit: 5 } };
    }

    // Default: unknown command
    return { action: 'unknown', params: { originalCommand: command } };
  }
}

// Singleton instance
export const plainEnglishService = new PlainEnglishService();
