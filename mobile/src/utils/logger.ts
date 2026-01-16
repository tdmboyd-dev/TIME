/**
 * TIME BEYOND US - Mobile App Logger
 *
 * Production-safe logging utility that only outputs in development mode.
 * All console statements should use this logger instead of direct console calls.
 */

import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  tag?: string;
  data?: any;
}

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = config.enableDebugLogs;
  }

  private formatMessage(level: LogLevel, message: string, tag?: string): string {
    const timestamp = new Date().toISOString();
    const tagStr = tag ? `[${tag}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${tagStr} ${message}`;
  }

  private shouldLog(): boolean {
    return this.enabled || __DEV__;
  }

  debug(message: string, options?: LogOptions): void {
    if (!this.shouldLog()) return;
    const formatted = this.formatMessage('debug', message, options?.tag);
    if (options?.data !== undefined) {
      console.log(formatted, options.data);
    } else {
      console.log(formatted);
    }
  }

  info(message: string, options?: LogOptions): void {
    if (!this.shouldLog()) return;
    const formatted = this.formatMessage('info', message, options?.tag);
    if (options?.data !== undefined) {
      console.info(formatted, options.data);
    } else {
      console.info(formatted);
    }
  }

  warn(message: string, options?: LogOptions): void {
    if (!this.shouldLog()) return;
    const formatted = this.formatMessage('warn', message, options?.tag);
    if (options?.data !== undefined) {
      console.warn(formatted, options.data);
    } else {
      console.warn(formatted);
    }
  }

  error(message: string, options?: LogOptions): void {
    // Errors are always logged, even in production
    const formatted = this.formatMessage('error', message, options?.tag);
    if (options?.data !== undefined) {
      console.error(formatted, options.data);
    } else {
      console.error(formatted);
    }
  }

  // Convenience methods with tags
  api(message: string, data?: any): void {
    this.debug(message, { tag: 'API', data });
  }

  ws(message: string, data?: any): void {
    this.debug(message, { tag: 'WebSocket', data });
  }

  auth(message: string, data?: any): void {
    this.debug(message, { tag: 'Auth', data });
  }

  nav(message: string, data?: any): void {
    this.debug(message, { tag: 'Navigation', data });
  }

  // Group logging (only in dev)
  group(label: string): void {
    if (!this.shouldLog()) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!this.shouldLog()) return;
    console.groupEnd();
  }

  // Table logging (only in dev)
  table(data: any): void {
    if (!this.shouldLog()) return;
    console.table(data);
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
