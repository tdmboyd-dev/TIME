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
    kraken: {
      apiKey: process.env.KRAKEN_API_KEY || '',
      secret: process.env.KRAKEN_SECRET || '',
    },
  },

  // Market Data Providers
  marketData: {
    alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || '',
    polygonKey: process.env.POLYGON_API_KEY || '',
    twelveDataKey: process.env.TWELVE_DATA_API_KEY || '',
    finnhubKey: process.env.FINNHUB_API_KEY || '',
    fmpKey: process.env.FMP_API_KEY || '',
    fredKey: process.env.FRED_API_KEY || '',
  },

  // AI Providers
  ai: {
    openaiKey: process.env.OPENAI_API_KEY || '',
  },

  // Blockchain/Web3
  blockchain: {
    alchemyKey: process.env.ALCHEMY_API_KEY || '',
  },

  // Broker Connections
  brokers: {
    alpaca: {
      apiKey: process.env.ALPACA_API_KEY || '',
      secretKey: process.env.ALPACA_SECRET_KEY || '',
      paper: process.env.ALPACA_PAPER === 'true',
      dataFeed: (process.env.ALPACA_DATA_FEED || 'iex') as 'iex' | 'sip',
    },
    oanda: {
      apiKey: process.env.OANDA_API_KEY || '',
      accountId: process.env.OANDA_ACCOUNT_ID || '',
      practice: process.env.OANDA_PRACTICE === 'true',
    },
    snaptrade: {
      clientId: process.env.SNAPTRADE_CLIENT_ID || '',
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY || '',
    },
    interactiveBrokers: {
      host: process.env.IBKR_HOST || process.env.IB_HOST || '127.0.0.1',
      port: parseInt(process.env.IBKR_PORT || process.env.IB_PORT || '7497', 10),
      clientId: parseInt(process.env.IBKR_CLIENT_ID || process.env.IB_CLIENT_ID || '1', 10),
      paper: process.env.IBKR_PAPER === 'true',
    },
  },

  // MetaTrader Bridge
  mtBridge: {
    enabled: process.env.MT_BRIDGE_ENABLED === 'true',
    port: parseInt(process.env.MT_BRIDGE_PORT || '15555', 10),
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
  const warnings: string[] = [];

  // Always validate JWT secret (not just production)
  if (config.jwt.secret === 'change-me-in-production') {
    if (config.nodeEnv === 'production') {
      errors.push('CRITICAL: JWT_SECRET must be set in production - refusing to start');
    } else {
      warnings.push('WARNING: Using default JWT_SECRET - set a secure secret for production');
    }
  } else if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (config.nodeEnv === 'production') {
    if (!config.admin.email) {
      errors.push('ADMIN_EMAIL must be set in production');
    }

    // Validate CORS doesn't include localhost in production
    const hasLocalhost = config.frontend.corsOrigins.some(o =>
      o.includes('localhost') || o.includes('127.0.0.1')
    );
    if (hasLocalhost) {
      warnings.push('WARNING: CORS includes localhost origins in production');
    }
  }

  // Log warnings
  warnings.forEach(w => console.warn(`[Config] ${w}`));

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export default config;
