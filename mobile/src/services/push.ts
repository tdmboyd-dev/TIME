// Push Notification Service - Stubbed version (expo-notifications removed temporarily)
// TODO: Re-enable when Firebase is configured properly

class PushNotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications - stubbed
  async registerForPushNotifications(): Promise<string | null> {
    console.log('Push notifications disabled - Firebase not configured');
    return null;
  }

  // Get current push token
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Schedule a local notification - stubbed
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    triggerSeconds: number = 0
  ): Promise<string> {
    console.log('Local notification (stubbed):', title, body);
    return 'stub-notification-id';
  }

  // Cancel a scheduled notification - stubbed
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    console.log('Cancel notification (stubbed):', notificationId);
  }

  // Cancel all scheduled notifications - stubbed
  async cancelAllScheduledNotifications(): Promise<void> {
    console.log('Cancel all notifications (stubbed)');
  }

  // Get badge count - stubbed
  async getBadgeCount(): Promise<number> {
    return 0;
  }

  // Set badge count - stubbed
  async setBadgeCount(count: number): Promise<void> {
    console.log('Set badge count (stubbed):', count);
  }

  // Clear badge count - stubbed
  async clearBadgeCount(): Promise<void> {
    console.log('Clear badge count (stubbed)');
  }

  // Add notification received listener - stubbed
  addNotificationReceivedListener(callback: (notification: any) => void): { remove: () => void } {
    return { remove: () => {} };
  }

  // Add notification response listener - stubbed
  addNotificationResponseReceivedListener(callback: (response: any) => void): { remove: () => void } {
    return { remove: () => {} };
  }

  // Remove all listeners - stubbed
  removeAllListeners(): void {}

  // Send notification to backend - stubbed
  async registerDeviceToken(token: string, userId: string): Promise<void> {
    console.log('Register device token (stubbed):', token, userId);
  }

  // Create notification for trade execution - stubbed
  async notifyTradeExecuted(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number
  ): Promise<void> {
    console.log('Trade notification (stubbed):', symbol, side, amount, price);
  }

  // Create notification for bot alert - stubbed
  async notifyBotAlert(botName: string, message: string, data?: any): Promise<void> {
    console.log('Bot alert notification (stubbed):', botName, message);
  }

  // Create notification for price alert - stubbed
  async notifyPriceAlert(
    symbol: string,
    targetPrice: number,
    currentPrice: number
  ): Promise<void> {
    console.log('Price alert notification (stubbed):', symbol, targetPrice, currentPrice);
  }

  // Get all scheduled notifications - stubbed
  async getAllScheduledNotifications(): Promise<any[]> {
    return [];
  }

  // Dismiss all notifications - stubbed
  async dismissAllNotifications(): Promise<void> {
    console.log('Dismiss all notifications (stubbed)');
  }

  // Dismiss a specific notification - stubbed
  async dismissNotification(notificationId: string): Promise<void> {
    console.log('Dismiss notification (stubbed):', notificationId);
  }

  // Update notification preferences - stubbed
  async updateNotificationPreferences(preferences: Record<string, boolean>): Promise<void> {
    console.log('Update preferences (stubbed):', preferences);
  }

  // Get notification preferences - stubbed
  async getNotificationPreferences(): Promise<Record<string, boolean>> {
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
  }
}

export default new PushNotificationService();
