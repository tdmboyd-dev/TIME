/**
 * PERFORMANCE DASHBOARD SERVICE
 *
 * Real-time analytics and performance tracking for:
 * - System health
 * - Bot performance
 * - User activity
 * - Trading volume
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('PerformanceDashboard');

// Types
export interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  activeConnections: number;
  requestsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface TradingMetrics {
  totalTrades: number;
  todayTrades: number;
  totalVolume: number;
  todayVolume: number;
  winRate: number;
  avgProfit: number;
  activeBots: number;
  signalsGenerated: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  premiumUsers: number;
  avgSessionDuration: number;
}

export interface BotLeaderboard {
  botId: string;
  name: string;
  tier: string;
  todayPnL: number;
  weekPnL: number;
  monthPnL: number;
  winRate: number;
  totalTrades: number;
}

export interface AlertEvent {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  source: string;
  timestamp: Date;
  resolved: boolean;
}

// Performance Dashboard Class
export class PerformanceDashboard extends EventEmitter {
  private metrics: {
    system: SystemMetrics;
    trading: TradingMetrics;
    users: UserMetrics;
  };
  private alerts: AlertEvent[] = [];
  private botLeaderboard: BotLeaderboard[] = [];

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.startMetricsCollection();
    logger.info('PerformanceDashboard initialized');
  }

  private initializeMetrics() {
    return {
      system: {
        cpu: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        uptime: 0,
        activeConnections: 0,
        requestsPerSecond: 0,
        avgResponseTime: 0,
        errorRate: 0,
      },
      trading: {
        totalTrades: 0,
        todayTrades: 0,
        totalVolume: 0,
        todayVolume: 0,
        winRate: 0,
        avgProfit: 0,
        activeBots: 0,
        signalsGenerated: 0,
      },
      users: {
        totalUsers: 0,
        activeToday: 0,
        newThisWeek: 0,
        premiumUsers: 0,
        avgSessionDuration: 0,
      },
    };
  }

  private startMetricsCollection(): void {
    // Collect metrics every 5 seconds
    setInterval(() => {
      this.collectSystemMetrics();
      this.emit('metricsUpdated', this.getSnapshot());
    }, 5000);
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    this.metrics.system = {
      cpu: Math.random() * 30 + 10, // Simulated
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      uptime: process.uptime(),
      activeConnections: Math.floor(Math.random() * 50 + 10),
      requestsPerSecond: Math.floor(Math.random() * 100 + 20),
      avgResponseTime: Math.random() * 50 + 10,
      errorRate: Math.random() * 0.5,
    };

    // Simulated trading metrics
    this.metrics.trading = {
      totalTrades: 15847,
      todayTrades: Math.floor(Math.random() * 200 + 50),
      totalVolume: 2450000,
      todayVolume: Math.floor(Math.random() * 50000 + 10000),
      winRate: 68.5 + (Math.random() - 0.5) * 5,
      avgProfit: 125.50 + (Math.random() - 0.5) * 50,
      activeBots: 133,
      signalsGenerated: Math.floor(Math.random() * 500 + 100),
    };

    // Simulated user metrics
    this.metrics.users = {
      totalUsers: 5234,
      activeToday: Math.floor(Math.random() * 200 + 50),
      newThisWeek: Math.floor(Math.random() * 50 + 10),
      premiumUsers: 1247,
      avgSessionDuration: 12.5 + Math.random() * 5,
    };
  }

  // Get current snapshot
  getSnapshot(): {
    system: SystemMetrics;
    trading: TradingMetrics;
    users: UserMetrics;
    alerts: AlertEvent[];
    leaderboard: BotLeaderboard[];
    timestamp: Date;
  } {
    return {
      ...this.metrics,
      alerts: this.alerts.slice(-10),
      leaderboard: this.getBotLeaderboard(),
      timestamp: new Date(),
    };
  }

  // Get bot leaderboard
  getBotLeaderboard(): BotLeaderboard[] {
    // Simulated leaderboard
    return [
      { botId: 'bot-001', name: 'Phantom King', tier: 'LEGENDARY', todayPnL: 450, weekPnL: 2340, monthPnL: 8920, winRate: 72.5, totalTrades: 234 },
      { botId: 'bot-002', name: 'Neural Overlord', tier: 'LEGENDARY', todayPnL: 380, weekPnL: 1890, monthPnL: 7450, winRate: 68.3, totalTrades: 189 },
      { botId: 'bot-003', name: 'Death Strike', tier: 'LEGENDARY', todayPnL: 320, weekPnL: 1560, monthPnL: 6230, winRate: 74.1, totalTrades: 156 },
      { botId: 'bot-004', name: 'Void Crusher', tier: 'LEGENDARY', todayPnL: 290, weekPnL: 1420, monthPnL: 5680, winRate: 65.8, totalTrades: 198 },
      { botId: 'bot-005', name: 'Leviathan Stalker', tier: 'LEGENDARY', todayPnL: 275, weekPnL: 1350, monthPnL: 5120, winRate: 69.2, totalTrades: 167 },
      { botId: 'bot-006', name: 'Hydra Force', tier: 'EPIC', todayPnL: 210, weekPnL: 1020, monthPnL: 4350, winRate: 71.4, totalTrades: 245 },
      { botId: 'bot-007', name: 'Cyber Prophet', tier: 'EPIC', todayPnL: 195, weekPnL: 980, monthPnL: 4120, winRate: 73.2, totalTrades: 212 },
      { botId: 'bot-008', name: 'Blood Money', tier: 'EPIC', todayPnL: 180, weekPnL: 920, monthPnL: 3890, winRate: 70.8, totalTrades: 178 },
      { botId: 'bot-009', name: 'Eagle Eye', tier: 'EPIC', todayPnL: 165, weekPnL: 850, monthPnL: 3560, winRate: 57.3, totalTrades: 267 },
      { botId: 'bot-010', name: 'Quantum Beast', tier: 'EPIC', todayPnL: 155, weekPnL: 790, monthPnL: 3210, winRate: 68.4, totalTrades: 189 },
    ];
  }

  // Add alert
  addAlert(type: AlertEvent['type'], message: string, source: string): void {
    const alert: AlertEvent = {
      id: `alert-${Date.now()}`,
      type,
      message,
      source,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alert', alert);
    logger.info(`Alert: [${type}] ${message} from ${source}`);
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Get historical metrics (for charts)
  getHistoricalMetrics(period: 'hour' | 'day' | 'week' | 'month'): {
    timestamps: Date[];
    tradingVolume: number[];
    activeUsers: number[];
    botPerformance: number[];
  } {
    const count = period === 'hour' ? 60 : period === 'day' ? 24 : period === 'week' ? 7 : 30;
    const timestamps: Date[] = [];
    const tradingVolume: number[] = [];
    const activeUsers: number[] = [];
    const botPerformance: number[] = [];

    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'hour') date.setMinutes(date.getMinutes() - i);
      else if (period === 'day') date.setHours(date.getHours() - i);
      else if (period === 'week') date.setDate(date.getDate() - i);
      else date.setDate(date.getDate() - i);

      timestamps.push(date);
      tradingVolume.push(Math.floor(Math.random() * 50000 + 10000));
      activeUsers.push(Math.floor(Math.random() * 200 + 50));
      botPerformance.push(Math.random() * 5 - 1);
    }

    return { timestamps, tradingVolume, activeUsers, botPerformance };
  }
}

// Singleton instance
export const performanceDashboard = new PerformanceDashboard();
