'use client';

/**
 * NotificationProvider Component
 *
 * React Context for push notifications:
 * - Request notification permission on mount
 * - Subscribe to push notifications
 * - Show in-app notification toast on receive
 * - Store notifications in state
 * - Provide notification context to entire app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { useNotificationUpdates } from '@/hooks/useWebSocket';
import type { NotificationUpdate } from '@/hooks/useWebSocket';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  readAt?: Date;
  data?: Record<string, any>;
  url?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isSubscribed: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

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
  type: 'info' | 'success' | 'warning' | 'error';
  url?: string;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

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
  const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', url?: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toast: ToastNotification = { id, title, message, type, url };
    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Remove toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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

      // Fetch initial notifications
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getToastColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500/50 bg-green-500/10';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'error': return 'border-red-500/50 bg-red-500/10';
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
        requestPermission,
        subscribeToPush,
        unsubscribeFromPush,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
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
