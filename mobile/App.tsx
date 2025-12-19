/**
 * TIME Trading Mobile App
 * React Native / Expo
 *
 * Features:
 * - Biometric authentication (Face ID / Fingerprint)
 * - Real-time portfolio tracking
 * - Bot control and monitoring
 * - Push notifications for trades
 * - Dark mode optimized
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Screens
import HomeScreen from './screens/HomeScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import BotsScreen from './screens/BotsScreen';
import MarketsScreen from './screens/MarketsScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import TradeDetailScreen from './screens/TradeDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

// TIME Dark Theme
const TIMETheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366f1',
    background: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    border: '#334155',
    notification: '#22c55e',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Portfolio') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Bots') {
            iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
          } else if (route.name === 'Markets') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Bots" component={BotsScreen} />
      <Tab.Screen name="Markets" component={MarketsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      setIsLoggedIn(!!token);
    } catch {
      setIsLoggedIn(false);
    }
  }

  if (isLoggedIn === null) {
    // Loading state
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer theme={TIMETheme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="TradeDetail"
                component={TradeDetailScreen}
                options={{
                  headerShown: true,
                  title: 'Trade Details',
                  headerStyle: { backgroundColor: '#0f172a' },
                  headerTintColor: '#f8fafc',
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
