/**
 * Root Navigator
 * TIME BEYOND US - Main Navigation Stack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MFAScreen from '../screens/MFAScreen';

// Main Screens
import TradeDetailScreen from '../screens/TradeDetailScreen';
import AdvancedTradeScreen from '../screens/AdvancedTradeScreen';
import BotDetailScreen from '../screens/BotDetailScreen';
import BotConfigureScreen from '../screens/BotConfigureScreen';
import MarketDetailScreen from '../screens/MarketDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SecurityScreen from '../screens/SecurityScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import PriceAlertsScreen from '../screens/PriceAlertsScreen';

export type RootStackParamList = {
  // Auth Screens
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MFA: { mode?: 'setup' | 'verify' };

  // Main Screens
  Main: undefined;
  TradeDetail: { tradeId: string };
  AdvancedTrade: { symbol?: string };
  BotDetail: { botId: string };
  BotConfigure: { botId?: string; mode?: 'create' | 'edit' };
  MarketDetail: { symbol: string };
  Profile: undefined;
  Security: undefined;
  NotificationPreferences: undefined;
  Leaderboard: undefined;
  PriceAlerts: undefined;
  TraderProfile: { traderId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

export default function RootNavigator({ isAuthenticated }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#020617',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#020617',
        },
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="MFA"
            component={MFAScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />

          {/* Trading Screens */}
          <Stack.Screen
            name="TradeDetail"
            component={TradeDetailScreen}
            options={{
              headerShown: true,
              title: 'Trade Details',
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="AdvancedTrade"
            component={AdvancedTradeScreen}
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />

          {/* Bot Screens */}
          <Stack.Screen
            name="BotDetail"
            component={BotDetailScreen}
            options={{
              headerShown: true,
              title: 'Bot Details',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="BotConfigure"
            component={BotConfigureScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />

          {/* Market Screens */}
          <Stack.Screen
            name="MarketDetail"
            component={MarketDetailScreen}
            options={{
              headerShown: true,
              title: 'Market',
              presentation: 'card',
            }}
          />

          {/* Profile & Settings Screens */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true,
              title: 'Profile',
            }}
          />
          <Stack.Screen
            name="Security"
            component={SecurityScreen}
            options={{
              headerShown: true,
              title: 'Security Settings',
            }}
          />
          <Stack.Screen
            name="MFA"
            component={MFAScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="NotificationPreferences"
            component={NotificationPreferencesScreen}
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />

          {/* Social Screens */}
          <Stack.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />

          {/* Alerts Screens */}
          <Stack.Screen
            name="PriceAlerts"
            component={PriceAlertsScreen}
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
