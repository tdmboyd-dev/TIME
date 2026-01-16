/**
 * TIME BEYOND US - Mobile App Configuration
 *
 * Centralized configuration management with environment support.
 * Uses Expo Constants for runtime configuration.
 */

import Constants from 'expo-constants';

// Environment type
type Environment = 'development' | 'preview' | 'production';

// Get current environment from EAS build config
const APP_ENV = (Constants.expoConfig?.extra?.env?.APP_ENV ||
  process.env.APP_ENV ||
  'development') as Environment;

// Configuration per environment
const ENV_CONFIG = {
  development: {
    apiUrl: 'http://localhost:3001/api/v1',
    wsUrl: 'ws://localhost:3001',
    enableDebugLogs: true,
    enableCertificatePinning: false,
  },
  preview: {
    apiUrl: 'https://time-backend-hosting.fly.dev/api/v1',
    wsUrl: 'wss://time-backend-hosting.fly.dev',
    enableDebugLogs: true,
    enableCertificatePinning: false,
  },
  production: {
    apiUrl: 'https://time-backend-hosting.fly.dev/api/v1',
    wsUrl: 'wss://time-backend-hosting.fly.dev',
    enableDebugLogs: false,
    enableCertificatePinning: true,
  },
};

// Get config from app.json extra or fall back to environment defaults
const getConfigValue = <T>(key: keyof typeof ENV_CONFIG.production, defaultValue: T): T => {
  // First try app.json extra config
  const extraConfig = Constants.expoConfig?.extra;
  if (extraConfig && key in extraConfig) {
    return extraConfig[key] as T;
  }
  // Fall back to environment defaults
  return (ENV_CONFIG[APP_ENV]?.[key] as T) || defaultValue;
};

// Export configuration
export const config = {
  // Environment
  env: APP_ENV,
  isDev: __DEV__,
  isProduction: APP_ENV === 'production',

  // API Configuration
  apiUrl: getConfigValue('apiUrl', ENV_CONFIG.production.apiUrl),
  wsUrl: getConfigValue('wsUrl', ENV_CONFIG.production.wsUrl),

  // Feature Flags
  enableDebugLogs: __DEV__ || getConfigValue('enableDebugLogs', false),
  enableCertificatePinning: getConfigValue('enableCertificatePinning', true),

  // Timeouts
  apiTimeout: 30000,
  wsReconnectDelay: 1000,
  wsMaxReconnectAttempts: 5,

  // App Info
  appName: Constants.expoConfig?.name || 'TIME BEYOND US',
  appVersion: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode?.toString() || '1',

  // Certificate Pinning (for SSL pinning)
  pinnedCertificates: {
    'time-backend-hosting.fly.dev': [
      // SHA256 fingerprint of the server's certificate
      // Update this when the certificate is renewed
      // You can get this from: openssl s_client -connect time-backend-hosting.fly.dev:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
    ],
  },
};

// Validate configuration in development
if (__DEV__) {
  console.log('[Config] Environment:', APP_ENV);
  console.log('[Config] API URL:', config.apiUrl);
  console.log('[Config] WebSocket URL:', config.wsUrl);
}

export default config;
