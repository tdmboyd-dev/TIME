/**
 * Circuit Breaker Pattern for TIME
 *
 * Protects against cascading failures when external services are unavailable.
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */

import { createComponentLogger } from './logger';

const logger = createComponentLogger('CircuitBreaker');

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;      // Number of failures before opening (default: 5)
  successThreshold?: number;      // Number of successes to close (default: 2)
  timeout?: number;               // Time in ms before trying again (default: 30000)
  monitorInterval?: number;       // Interval to check/log status (default: 60000)
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

class CircuitBreaker {
  private name: string;
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextRetryTime: Date | null = null;

  // Counters for monitoring
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  // Configuration
  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000;

    // Log status periodically
    if (options.monitorInterval !== 0) {
      setInterval(() => {
        if (this.totalRequests > 0) {
          logger.debug(`Circuit [${this.name}] stats`, this.getStats());
        }
      }, options.monitorInterval || 60000);
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.nextRetryTime && new Date() < this.nextRetryTime) {
        throw new Error(`Circuit breaker [${this.name}] is OPEN. Retry after ${this.nextRetryTime.toISOString()}`);
      }
      // Time to try again - transition to half-open
      this.state = 'HALF_OPEN';
      logger.info(`Circuit [${this.name}] transitioning to HALF_OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute with fallback if circuit is open
   */
  async executeWithFallback<T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker')) {
        logger.warn(`Circuit [${this.name}] using fallback`);
        return await fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();
    this.successes++;
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        logger.info(`Circuit [${this.name}] CLOSED after recovery`);
      }
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = new Date();
    this.failures++;
    this.successes = 0;

    if (this.state === 'HALF_OPEN') {
      // Failed during test - reopen
      this.state = 'OPEN';
      this.nextRetryTime = new Date(Date.now() + this.timeout);
      logger.warn(`Circuit [${this.name}] reopened after failed recovery attempt`);
    } else if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
      // Too many failures - open
      this.state = 'OPEN';
      this.nextRetryTime = new Date(Date.now() + this.timeout);
      logger.error(`Circuit [${this.name}] OPENED after ${this.failures} failures`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Manually reset the circuit
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextRetryTime = null;
    logger.info(`Circuit [${this.name}] manually reset`);
  }

  /**
   * Check if circuit allows requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true;
    if (this.state === 'OPEN' && this.nextRetryTime && new Date() >= this.nextRetryTime) {
      return true;
    }
    return false;
  }
}

// ============================================================================
// Pre-configured Circuit Breakers for External Services
// ============================================================================

export const circuitBreakers = {
  // Market Data APIs
  polygon: new CircuitBreaker({ name: 'Polygon.io', failureThreshold: 3, timeout: 60000 }),
  twelveData: new CircuitBreaker({ name: 'TwelveData', failureThreshold: 3, timeout: 60000 }),
  alphaVantage: new CircuitBreaker({ name: 'AlphaVantage', failureThreshold: 5, timeout: 120000 }),
  finnhub: new CircuitBreaker({ name: 'Finnhub', failureThreshold: 3, timeout: 60000 }),

  // Trading APIs
  alpaca: new CircuitBreaker({ name: 'Alpaca', failureThreshold: 3, timeout: 30000 }),
  binance: new CircuitBreaker({ name: 'Binance', failureThreshold: 3, timeout: 30000 }),

  // Other External APIs
  github: new CircuitBreaker({ name: 'GitHub', failureThreshold: 5, timeout: 60000 }),
  coinGecko: new CircuitBreaker({ name: 'CoinGecko', failureThreshold: 5, timeout: 60000 }),

  // General external fetch
  external: new CircuitBreaker({ name: 'External', failureThreshold: 10, timeout: 30000 }),
};

/**
 * Get or create a circuit breaker by name
 */
const customBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  const key = name.toLowerCase();

  // Check pre-configured breakers
  if (key in circuitBreakers) {
    return (circuitBreakers as any)[key];
  }

  // Check custom breakers
  if (customBreakers.has(key)) {
    return customBreakers.get(key)!;
  }

  // Create new custom breaker
  const breaker = new CircuitBreaker({ name, ...options });
  customBreakers.set(key, breaker);
  return breaker;
}

/**
 * Wrap a fetch call with circuit breaker
 */
export async function fetchWithCircuitBreaker(
  circuitName: string,
  url: string,
  options?: RequestInit,
  timeoutMs: number = 10000
): Promise<Response> {
  const breaker = getCircuitBreaker(circuitName);

  return breaker.execute(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok && response.status >= 500) {
        // Server errors count as failures
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

export { CircuitBreaker };
export default circuitBreakers;
