/**
 * TIME — Meta-Intelligence Trading Governor
 * Logging Utility
 */

import winston from 'winston';
import path from 'path';
import config from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  }),
];

// Add file transport in non-test environments
if (config.nodeEnv !== 'test') {
  const logDir = path.dirname(config.logging.filePath);

  transports.push(
    new winston.transports.File({
      filename: config.logging.filePath,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

// Create logger
export const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
});

// Component-specific loggers
export function createComponentLogger(component: string) {
  return {
    debug: (message: string, meta?: object) => logger.debug(`[${component}] ${message}`, meta),
    info: (message: string, meta?: object) => logger.info(`[${component}] ${message}`, meta),
    warn: (message: string, meta?: object) => logger.warn(`[${component}] ${message}`, meta),
    error: (message: string, meta?: object) => logger.error(`[${component}] ${message}`, meta),
  };
}

// Pre-configured component loggers
export const loggers = {
  governor: createComponentLogger('TIME_GOVERNOR'),
  evolution: createComponentLogger('EVOLUTION'),
  learning: createComponentLogger('LEARNING_ENGINE'),
  risk: createComponentLogger('RISK_ENGINE'),
  regime: createComponentLogger('REGIME_DETECTOR'),
  synthesis: createComponentLogger('SYNTHESIS_ENGINE'),
  vision: createComponentLogger('MARKET_VISION'),
  teaching: createComponentLogger('TEACHING_ENGINE'),
  attribution: createComponentLogger('ATTRIBUTION'),
  bots: createComponentLogger('BOT_MANAGER'),
  consent: createComponentLogger('CONSENT'),
  notifications: createComponentLogger('NOTIFICATIONS'),
  api: createComponentLogger('API'),
  inactivity: createComponentLogger('INACTIVITY_MONITOR'),
  backtest: createComponentLogger('BACKTEST'),
};

export default logger;
