/**
 * Root Navigator
 * TIME BEYOND US - Main Navigation Stack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TradeDetailScreen from '../screens/TradeDetailScreen';
import BotDetailScreen from '../screens/BotDetailScreen';
import MarketDetailScreen from '../screens/MarketDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SecurityScreen from '../screens/SecurityScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  TradeDetail: { tradeId: string };
  BotDetail: { botId: string };
  MarketDetail: { symbol: string };
  Profile: undefined;
  Security: undefined;
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
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
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
            name="BotDetail"
            component={BotDetailScreen}
            options={{
              headerShown: true,
              title: 'Bot Details',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="MarketDetail"
            component={MarketDetailScreen}
            options={{
              headerShown: true,
              title: 'Market',
              presentation: 'card',
            }}
          />
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
        </>
      )}
    </Stack.Navigator>
  );
}
