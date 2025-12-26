/**
 * Deep Linking Configuration
 * TIME BEYOND US - Navigation Deep Links
 */

import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

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

// Parse notification data to navigation state
function getStateFromNotification(notification: Notifications.Notification | null) {
  if (!notification) return undefined;

  const data = notification.request.content.data as {
    type?: string;
    tradeId?: string;
    botId?: string;
    symbol?: string;
  };

  if (!data) return undefined;

  switch (data.type) {
    case 'trade':
      if (data.tradeId) {
        return {
          routes: [
            {
              name: 'Main',
              state: {
                routes: [{ name: 'Portfolio' }],
              },
            },
            {
              name: 'TradeDetail',
              params: { tradeId: data.tradeId },
            },
          ],
        };
      }
      break;

    case 'bot':
      if (data.botId) {
        return {
          routes: [
            {
              name: 'Main',
              state: {
                routes: [{ name: 'Bots' }],
              },
            },
            {
              name: 'BotDetail',
              params: { botId: data.botId },
            },
          ],
        };
      }
      break;

    case 'price':
      if (data.symbol) {
        return {
          routes: [
            {
              name: 'Main',
              state: {
                routes: [
                  {
                    name: 'Trade',
                    params: { symbol: data.symbol },
                  },
                ],
              },
            },
          ],
        };
      }
      break;

    case 'system':
      return {
        routes: [
          {
            name: 'Main',
            state: {
              routes: [{ name: 'Alerts' }],
            },
          },
        ],
      };
  }

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

    // Check if there is an initial notification
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response?.notification) {
      const state = getStateFromNotification(response.notification);
      if (state) {
        // Convert state to URL format
        const route = state.routes[state.routes.length - 1];
        if (route.name === 'TradeDetail' && route.params?.tradeId) {
          return `${prefix}trade/detail/${route.params.tradeId}`;
        }
        if (route.name === 'BotDetail' && route.params?.botId) {
          return `${prefix}bot/${route.params.botId}`;
        }
      }
    }

    return null;
  },

  // Listen to incoming links
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Listen to notifications being pressed
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          tradeId?: string;
          botId?: string;
          symbol?: string;
        };

        if (data) {
          let url: string | null = null;

          switch (data.type) {
            case 'trade':
              if (data.tradeId) {
                url = `${prefix}trade/detail/${data.tradeId}`;
              }
              break;
            case 'bot':
              if (data.botId) {
                url = `${prefix}bot/${data.botId}`;
              }
              break;
            case 'price':
              if (data.symbol) {
                url = `${prefix}trade/${data.symbol}`;
              }
              break;
            case 'system':
              url = `${prefix}alerts`;
              break;
          }

          if (url) {
            listener(url);
          }
        }
      });

    return () => {
      // Clean up the event listeners
      linkingSubscription.remove();
      notificationSubscription.remove();
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
