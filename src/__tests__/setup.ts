/**
 * Jest Test Setup
 *
 * Global setup and utilities for all tests.
 */

// Extend Jest matchers
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGODB_URI = 'mongodb://localhost:27017/time_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ALPACA_API_KEY = 'test-alpaca-key';
process.env.ALPACA_API_SECRET = 'test-alpaca-secret';
process.env.OANDA_API_KEY = 'test-oanda-key';
process.env.OANDA_ACCOUNT_ID = 'test-account-123';

// Global test utilities
export const testUtils = {
  // Generate random test data
  generateTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  }),

  generateTestBot: () => ({
    name: `TestBot-${Date.now()}`,
    strategy: 'momentum',
    symbols: ['AAPL', 'MSFT'],
    riskLevel: 'medium',
  }),

  generateTestOrder: () => ({
    symbol: 'AAPL',
    side: 'buy',
    type: 'market',
    quantity: 10,
  }),

  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock HTTP response
  mockResponse: (data: any, status = 200) => ({
    status,
    data,
    headers: {},
  }),
};

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Increase default timeout for integration tests
jest.setTimeout(30000);

// Mock console.log in tests to reduce noise
// Uncomment if needed:
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
