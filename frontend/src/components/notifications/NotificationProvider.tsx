'use client';

/**
 * NotificationProvider Component - Production Ready
 *
 * React Context for push notifications:
 * - Request notification permission on mount
 * - Subscribe to push notifications
 * - Show in-app notification toast on receive
 * - Store notifications in state
 * - Provide notification context to entire app
 * - User notification preferences management
 * - Quiet hours and rate limiting support
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, TrendingUp, Bot, Shield, Zap, Gift, DollarSign } from 'lucide-react';
import { useNotificationUpdates } from '@/hooks/useWebSocket';
import type { NotificationUpdate } from '@/hooks/useWebSocket';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

// Notification categories
export type NotificationCategory = 'trade' | 'bot' | 'price' | 'big_moves' | 'security' | 'marketing' | 'system';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: NotificationCategory;
  createdAt: Date;
  readAt?: Date;
  data?: Record<string, any>;
  url?: string;
}

// User notification preferences
export interface NotificationPreferences {
  categories: {
    trade: boolean;
    bot: boolean;
    price: boolean;
    big_moves: boolean;
    security: boolean;
    marketing: boolean;
    system: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  frequencyLimits: {
    maxPerHour: number;
    maxPerDay: number;
  };
  deliveryMethods: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  minPriority: 'low' | 'medium' | 'high' | 'critical';
}

const defaultPreferences: NotificationPreferences = {
  categories: {
    trade: true,
    bot: true,
    price: true,
    big_moves: true,
    security: true,
    marketing: false,
    system: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: 'America/New_York',
  },
  frequencyLimits: {
    maxPerHour: 20,
    maxPerDay: 100,
  },
  deliveryMethods: {
    push: true,
    email: true,
    sms: false,
    inApp: true,
  },
  minPriority: 'low',
};

interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  lastNotification?: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isSubscribed: boolean;
  permission: NotificationPermission;
  preferences: NotificationPreferences;
  stats: NotificationStats | null;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  refreshStats: () => Promise<void>;
  showToast: (title: string, message: string, type?: ToastType, url?: string) => void;
}

type ToastType = 'info' | 'success' | 'warning' | 'error' | 'trade' | 'bot' | 'security';

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  url?: string;
  category?: NotificationCategory;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if push notifications are supported
  const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  };

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isPushSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, []);

  // Get VAPID public key from server
  const getVapidPublicKey = async (): Promise<string> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/vapid-public-key`, {
        credentials: 'include',
      });
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Error fetching VAPID public key:', error);
      throw error;
    }
  };

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!isPushSupported() || permission !== 'granted') {
      return;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Send subscription to server
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubscribed(true);
        console.log('Successfully subscribed to push notifications');
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  }, [permission]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      // Unsubscribe from push
      await subscription.unsubscribe();

      // Notify server
      await fetch(`${BACKEND_URL}/api/v1/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      setIsSubscribed(false);
      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  }, []);

  // Fetch notifications from server
  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/history?limit=50`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }

      // Fetch unread count
      const countResponse = await fetch(`${BACKEND_URL}/api/v1/notifications/unread-count`, {
        credentials: 'include',
      });
      const countData = await countResponse.json();

      if (countData.success) {
        setUnreadCount(countData.count);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, readAt: new Date() } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, readAt: new Date() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        const wasUnread = !notifications.find(n => n._id === notificationId)?.readAt;
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Show toast notification
  const showToast = useCallback((title: string, message: string, type: ToastType = 'info', url?: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toast: ToastNotification = { id, title, message, type, url };
    setToasts(prev => [...prev, toast]);

    // Play notification sound for critical/high priority
    if (type === 'warning' || type === 'security') {
      playNotificationSound('high');
    }

    // Auto-dismiss after 5-10 seconds based on priority
    const timeout = type === 'security' || type === 'warning' ? 10000 : 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, timeout);
  }, []);

  // Remove toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Play notification sound
  const playNotificationSound = useCallback((priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    // Optional: implement sound playback
    // if (audioRef.current && preferences.deliveryMethods.push) {
    //   audioRef.current.src = `/sounds/${priority}.mp3`;
    //   audioRef.current.play().catch(() => {});
    // }
  }, []);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/preferences`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success && data.preferences) {
        setPreferences(data.preferences);
        showToast('Preferences Updated', 'Your notification preferences have been saved.', 'success');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      showToast('Error', 'Failed to update preferences. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Reset preferences to defaults
  const resetPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/preferences/reset`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success && data.preferences) {
        setPreferences(data.preferences);
        showToast('Preferences Reset', 'Your notification preferences have been reset to defaults.', 'success');
      }
    } catch (error) {
      console.error('Error resetting notification preferences:', error);
      showToast('Error', 'Failed to reset preferences. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Fetch notification statistics
  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/notifications/stats`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  }, []);

  // Get category from notification type
  const getCategoryFromType = (type: string): NotificationCategory => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('trade') || lowerType.includes('executed')) return 'trade';
    if (lowerType.includes('bot') || lowerType.includes('signal')) return 'bot';
    if (lowerType.includes('price') || lowerType.includes('alert')) return 'price';
    if (lowerType.includes('big_moves') || lowerType.includes('market_move')) return 'big_moves';
    if (lowerType.includes('security') || lowerType.includes('login')) return 'security';
    if (lowerType.includes('marketing') || lowerType.includes('promo')) return 'marketing';
    return 'system';
  };

  // Convert category to toast type
  const categoryToToastType = (category: NotificationCategory): ToastType => {
    switch (category) {
      case 'trade': return 'trade';
      case 'bot': return 'bot';
      case 'security': return 'security';
      case 'big_moves': return 'warning';
      default: return 'info';
    }
  };

  // Listen for push messages from service worker
  useEffect(() => {
    if (!isPushSupported()) return;

    const handlePushMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
        const { title, body, data } = event.data.payload;

        // Show in-app toast
        showToast(title, body, 'info', data?.url);

        // Refresh notifications
        refreshNotifications();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handlePushMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handlePushMessage);
    };
  }, [refreshNotifications, showToast]);

  // Socket.IO real-time notification updates
  const handleRealtimeNotification = useCallback((update: NotificationUpdate) => {
    console.log('[Notifications] Received real-time notification:', update);

    // Add to notifications list
    setNotifications(prev => [update, ...prev]);

    // Increment unread count
    setUnreadCount(prev => prev + 1);

    // Show in-app toast
    showToast(update.title, update.message, 'info', update.url || update.data?.url);
  }, [showToast]);

  // Subscribe to real-time notifications via Socket.IO
  useNotificationUpdates(handleRealtimeNotification);

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(Notification.permission);

      // Check if already subscribed
      if (isPushSupported() && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        });
      }

      // Fetch initial notifications, preferences, and stats
      refreshNotifications();
      fetchPreferences();
      refreshStats();
    }
  }, [refreshNotifications, fetchPreferences, refreshStats]);

  // Handle navigation messages from service worker
  useEffect(() => {
    if (!isPushSupported()) return;

    const handleNavigation = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE') {
        router.push(event.data.url);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleNavigation);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleNavigation);
    };
  }, [router]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'trade': return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'bot': return <Bot className="w-5 h-5 text-purple-400" />;
      case 'security': return <Shield className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getToastColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-green-500/50 bg-green-500/10';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'error': return 'border-red-500/50 bg-red-500/10';
      case 'trade': return 'border-emerald-500/50 bg-emerald-500/10';
      case 'bot': return 'border-purple-500/50 bg-purple-500/10';
      case 'security': return 'border-red-500/50 bg-red-500/10';
      default: return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isSubscribed,
        permission,
        preferences,
        stats,
        isLoading,
        requestPermission,
        subscribeToPush,
        unsubscribeFromPush,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        updatePreferences,
        resetPreferences,
        refreshStats,
        showToast,
      }}
    >
      {children}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-xl animate-in slide-in-from-right ${getToastColor(toast.type)}`}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{toast.title}</div>
              <div className="text-xs text-slate-300 mt-1">{toast.message}</div>
              {toast.url && (
                <a
                  href={toast.url}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                >
                  View Details →
                </a>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
