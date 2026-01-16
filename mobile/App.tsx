/**
 * TIME BEYOND US - Mobile Trading App
 * React Native / Expo
 *
 * Features:
 * - Biometric authentication (Face ID / Fingerprint)
 * - Real-time portfolio tracking with WebSocket
 * - 151+ AI Trading Bots (133 absorbed + 18 fused)
 * - Push notifications for trades, bots, and price alerts
 * - Quick trade interface
 * - Dark mode optimized design system
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import authService from './src/services/auth';
import pushService from './src/services/push';
import { logger } from './src/utils/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    },
  },
});

// TIME BEYOND US Dark Theme
const TIMETheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00ff88',
    background: '#020617',
    card: '#1e293b',
    text: '#f8fafc',
    border: '#334155',
    notification: '#00ff88',
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Check authentication status
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Validate session with backend
        const validSession = await authService.validateSession();
        setIsAuthenticated(validSession);

        if (validSession) {
          // Register for push notifications
          const pushToken = await pushService.registerForPushNotifications();
          if (pushToken) {
            const user = await authService.getUser();
            if (user?.id) {
              await pushService.registerDeviceToken(pushToken, user.id);
            }
          }

          // Setup notification listeners
          pushService.addNotificationReceivedListener((notification) => {
            logger.info('Notification received', { tag: 'Push', data: notification });
          });

          pushService.addNotificationResponseReceivedListener((response) => {
            logger.info('Notification tapped', { tag: 'Push', data: response });
            // Handle navigation based on notification data
            const data = response.notification.request.content.data;
            // Navigate to appropriate screen based on notification type
          });
        }
      }
    } catch (error) {
      logger.error('Error initializing app', { tag: 'App', data: error });
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading || isAuthenticated === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={TIMETheme}>
          <StatusBar style="light" backgroundColor="#020617" />
          <RootNavigator isAuthenticated={isAuthenticated} />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
