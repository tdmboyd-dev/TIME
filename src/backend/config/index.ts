/**
 * TIME — Meta-Intelligence Trading Governor
 * Configuration Management
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/time_db',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || '',
    phone: process.env.ADMIN_PHONE || '',
  },

  // Evolution Mode
  evolution: {
    defaultMode: (process.env.DEFAULT_EVOLUTION_MODE as 'controlled' | 'autonomous') || 'controlled',
  },

  // Inactivity Failsafe
  inactivity: {
    warningDays: parseInt(process.env.INACTIVITY_WARNING_DAYS || '3', 10),
    finalWarningDays: parseInt(process.env.INACTIVITY_FINAL_WARNING_DAYS || '4', 10),
    autonomousSwitchDays: parseInt(process.env.INACTIVITY_AUTONOMOUS_SWITCH_DAYS || '5', 10),
  },

  // Email (SMTP)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  // SMS (Twilio)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  // Exchanges
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY || '',
      secret: process.env.BINANCE_SECRET || '',
      testnet: process.env.BINANCE_TESTNET === 'true',
    },
    bybit: {
      apiKey: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_SECRET || '',
      testnet: process.env.BYBIT_TESTNET === 'true',
    },
  },

  // Market Data
  marketData: {
    alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || '',
    polygonKey: process.env.POLYGON_API_KEY || '',
  },

  // Bot Research
  botResearch: {
    githubToken: process.env.GITHUB_TOKEN || '',
    enableScraping: process.env.ENABLE_BOT_SCRAPING === 'true',
    minRating: parseFloat(process.env.BOT_REVIEW_MIN_RATING || '4.0'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    filePath: process.env.LOG_FILE_PATH || './logs/time.log',
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
  },

  // Risk Defaults
  riskDefaults: {
    maxPositionSize: 0.02, // 2% of portfolio
    maxPortfolioRisk: 0.1, // 10% max risk
    maxDrawdown: 0.15, // 15% max drawdown
    maxDailyLoss: 0.05, // 5% max daily loss
    maxCorrelation: 0.7, // 70% max correlation
    maxSlippage: 0.005, // 0.5% max slippage
    maxLatency: 1000, // 1000ms max latency
  },
};

export type Config = typeof config;

// Validate required configuration
export function validateConfig(): void {
  const errors: string[] = [];

  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'change-me-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
    if (!config.admin.email) {
      errors.push('ADMIN_EMAIL must be set');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export default config;
