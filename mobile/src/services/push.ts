import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = tokenData.data;

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00ff88',
        });

        await Notifications.setNotificationChannelAsync('trades', {
          name: 'Trade Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00ff88',
          sound: 'notification.wav',
        });

        await Notifications.setNotificationChannelAsync('bots', {
          name: 'Bot Alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#6366f1',
        });

        await Notifications.setNotificationChannelAsync('price', {
          name: 'Price Alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#22d3ee',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Get current push token
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    triggerSeconds: number = 0
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: triggerSeconds > 0 ? { seconds: triggerSeconds } : null,
    });
  }

  // Cancel a scheduled notification
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge count
  async clearBadgeCount(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Add notification received listener
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Remove all listeners
  removeAllListeners(): void {
    Notifications.removeNotificationSubscription;
  }

  // Send notification to backend (to register device)
  async registerDeviceToken(token: string, userId: string): Promise<void> {
    // This would call your backend API to register the device token
    // Example:
    // await apiService.registerPushToken(token, userId);
    console.log('Registering device token:', token, 'for user:', userId);
  }

  // Create notification for trade execution
  async notifyTradeExecuted(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number
  ): Promise<void> {
    await this.scheduleLocalNotification(
      'Trade Executed',
      `${side.toUpperCase()} ${amount} ${symbol} at $${price}`,
      {
        type: 'trade',
        symbol,
        side,
        amount,
        price,
      }
    );
  }

  // Create notification for bot alert
  async notifyBotAlert(botName: string, message: string, data?: any): Promise<void> {
    await this.scheduleLocalNotification(
      `Bot Alert: ${botName}`,
      message,
      {
        type: 'bot',
        botName,
        ...data,
      }
    );
  }

  // Create notification for price alert
  async notifyPriceAlert(
    symbol: string,
    targetPrice: number,
    currentPrice: number
  ): Promise<void> {
    await this.scheduleLocalNotification(
      'Price Alert',
      `${symbol} reached $${targetPrice} (current: $${currentPrice})`,
      {
        type: 'price',
        symbol,
        targetPrice,
        currentPrice,
      }
    );
  }

  // Get all scheduled notifications
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Dismiss all notifications
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Dismiss a specific notification
  async dismissNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  // Update notification preferences on backend
  async updateNotificationPreferences(preferences: Record<string, boolean>): Promise<void> {
    try {
      // This would call your backend API to update notification preferences
      // await apiService.put('/notifications/preferences', preferences);
      console.log('Updating notification preferences:', preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Get notification preferences from backend
  async getNotificationPreferences(): Promise<Record<string, boolean>> {
    try {
      // This would call your backend API to get notification preferences
      // return await apiService.get('/notifications/preferences');
      return {
        trades_executed: true,
        trades_failed: true,
        trades_pending: true,
        trades_summary: true,
        bots_signals: true,
        bots_trades: true,
        bots_status: true,
        bots_performance: true,
        bots_errors: true,
        price_targets: true,
        price_movement: true,
        price_volatility: true,
        portfolio_balance: true,
        portfolio_performance: true,
        portfolio_risk: true,
        security_login: true,
        security_changes: true,
        security_suspicious: true,
        marketing_news: false,
        marketing_tips: false,
        marketing_promotions: false,
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {};
    }
  }
}

export default new PushNotificationService();
