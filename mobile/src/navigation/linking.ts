/**
 * Deep Linking Configuration
 * TIME BEYOND US - Navigation Deep Links
 */

import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
// Note: expo-notifications removed - Firebase not configured

const prefix = Linking.createURL('/');

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  TradeDetail: { tradeId: string };
  BotDetail: { botId: string };
  MarketDetail: { symbol: string };
  Settings: undefined;
  Profile: undefined;
  Security: undefined;
};

export type TabParamList = {
  Home: undefined;
  Portfolio: undefined;
  Trade: { symbol?: string };
  Bots: undefined;
  Alerts: undefined;
  Settings: undefined;
};

// Parse notification data to navigation state (stubbed - notifications disabled)
function getStateFromNotification(notification: any | null) {
  // Notifications disabled - Firebase not configured
  return undefined;
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'timebeyondus://', 'https://timebeyondus.com'],

  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      Main: {
        screens: {
          Home: '',
          Portfolio: 'portfolio',
          Trade: 'trade/:symbol?',
          Bots: 'bots',
          Alerts: 'alerts',
          Settings: 'settings',
        },
      },
      TradeDetail: 'trade/detail/:tradeId',
      BotDetail: 'bot/:botId',
      MarketDetail: 'market/:symbol',
      Settings: 'settings',
      Profile: 'profile',
      Security: 'security',
    },
  },

  // Get initial URL
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    // Notifications disabled - Firebase not configured
    return null;
  },

  // Listen to incoming links
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Notifications disabled - Firebase not configured

    return () => {
      // Clean up the event listeners
      linkingSubscription.remove();
    };
  },
};

// Helper function to navigate to a screen from anywhere
export function getDeepLinkUrl(screen: string, params?: Record<string, any>): string {
  let path = screen.toLowerCase();

  if (params) {
    const queryParams = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    path += `?${queryParams}`;
  }

  return `${prefix}${path}`;
}

// Universal link handler
export async function handleUniversalLink(url: string): Promise<{
  screen: string;
  params?: Record<string, any>;
} | null> {
  try {
    const parsed = Linking.parse(url);

    if (!parsed.path) {
      return null;
    }

    const pathParts = parsed.path.split('/');

    switch (pathParts[0]) {
      case 'trade':
        if (pathParts[1] === 'detail' && pathParts[2]) {
          return { screen: 'TradeDetail', params: { tradeId: pathParts[2] } };
        }
        if (pathParts[1]) {
          return { screen: 'Trade', params: { symbol: pathParts[1] } };
        }
        return { screen: 'Trade' };

      case 'bot':
        if (pathParts[1]) {
          return { screen: 'BotDetail', params: { botId: pathParts[1] } };
        }
        return { screen: 'Bots' };

      case 'market':
        if (pathParts[1]) {
          return { screen: 'MarketDetail', params: { symbol: pathParts[1] } };
        }
        return { screen: 'Home' };

      case 'portfolio':
        return { screen: 'Portfolio' };

      case 'alerts':
        return { screen: 'Alerts' };

      case 'settings':
        return { screen: 'Settings' };

      default:
        return { screen: 'Home' };
    }
  } catch (error) {
    console.error('Error handling universal link:', error);
    return null;
  }
}

export default linking;
