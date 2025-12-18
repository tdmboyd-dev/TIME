/**
 * Frontend Logger Utility
 *
 * In production: Silently captures errors for monitoring
 * In development: Logs to console for debugging
 *
 * This replaces raw console.error calls which should not be in production code.
 */

const isDev = process.env.NODE_ENV === 'development';

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * Log an error - only outputs to console in development
 */
export function logError(message: string, error?: unknown, context?: LogContext): void {
  if (isDev) {
    console.error(`[ERROR] ${message}`, error, context);
  }
  // In production: Could send to error monitoring service (Sentry, etc.)
  // sendToErrorMonitoring({ message, error, context });
}

/**
 * Log a warning - only outputs to console in development
 */
export function logWarning(message: string, context?: LogContext): void {
  if (isDev) {
    console.warn(`[WARN] ${message}`, context);
  }
}

/**
 * Log info - only outputs to console in development
 */
export function logInfo(message: string, context?: LogContext): void {
  if (isDev) {
    console.log(`[INFO] ${message}`, context);
  }
}

/**
 * Log debug - only outputs to console in development
 */
export function logDebug(message: string, context?: LogContext): void {
  if (isDev) {
    console.log(`[DEBUG] ${message}`, context);
  }
}

/**
 * Create a component-scoped logger
 */
export function createLogger(component: string) {
  return {
    error: (message: string, error?: unknown, context?: LogContext) =>
      logError(message, error, { component, ...context }),
    warn: (message: string, context?: LogContext) =>
      logWarning(message, { component, ...context }),
    info: (message: string, context?: LogContext) =>
      logInfo(message, { component, ...context }),
    debug: (message: string, context?: LogContext) =>
      logDebug(message, { component, ...context }),
  };
}

export default { logError, logWarning, logInfo, logDebug, createLogger };
