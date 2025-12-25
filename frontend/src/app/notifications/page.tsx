'use client';

/**
 * Notifications Center Page
 *
 * Comprehensive notification management:
 * - List of all notifications
 * - Mark as read/unread
 * - Delete notifications
 * - Notification preferences toggles
 * - Filter by type and priority
 * - Real-time updates
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  CheckCheck,
  Filter,
  TrendingUp,
  AlertTriangle,
  Info,
  Zap,
  Bot,
  X
} from 'lucide-react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isSubscribed,
    permission,
    requestPermission,
    subscribeToPush,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [preferences, setPreferences] = useState({
    trades: true,
    alerts: true,
    bots: true,
    system: true,
  });

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const filteredNotifications = notifications.filter(notification => {
    // Filter by read status
    if (filter === 'unread' && notification.readAt) return false;
    if (filter === 'read' && !notification.readAt) return false;

    // Filter by type
    if (typeFilter !== 'all') {
      const type = notification.type.toLowerCase();
      if (typeFilter === 'trades' && !type.includes('trade')) return false;
      if (typeFilter === 'alerts' && !type.includes('alert')) return false;
      if (typeFilter === 'bots' && !type.includes('bot')) return false;
      if (typeFilter === 'system' && !type.includes('system')) return false;
    }

    return true;
  });

  const handleNotificationClick = async (notification: any) => {
    if (!notification.readAt) {
      await markAsRead(notification._id);
    }
    if (notification.url) {
      router.push(notification.url);
    }
  };

  const getNotificationIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('trade')) return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (lowerType.includes('alert')) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    if (lowerType.includes('bot')) return <Bot className="w-5 h-5 text-purple-400" />;
    if (lowerType.includes('system')) return <Zap className="w-5 h-5 text-blue-400" />;
    return <Info className="w-5 h-5 text-slate-400" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-500/5';
      case 'high': return 'border-l-orange-500 bg-orange-500/5';
      case 'medium': return 'border-l-blue-500 bg-blue-500/5';
      default: return 'border-l-slate-600 bg-slate-800/30';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
            <p className="text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All Read
              </button>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Push Notification Status */}
        {!isSubscribed && permission !== 'denied' && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Enable Push Notifications</div>
                <p className="text-sm text-slate-300 mb-3">
                  Get instant alerts for trades, price movements, and important updates.
                </p>
                <button
                  onClick={permission === 'default' ? requestPermission : subscribeToPush}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Enable Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Notifications Blocked</div>
                <p className="text-sm text-slate-300">
                  You've blocked notifications. To enable them, please update your browser settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                filter === 'unread' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                filter === 'read' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Read
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="trades">Trades</option>
            <option value="alerts">Alerts</option>
            <option value="bots">Bots</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-w-4xl mx-auto space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`flex items-start gap-4 p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-slate-800/50 ${
                getPriorityColor(notification.priority)
              } ${!notification.readAt ? 'bg-slate-800/30' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.readAt ? 'text-white' : 'text-slate-300'}`}>
                        {notification.title}
                      </h3>
                      {!notification.readAt && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatTime(notification.createdAt)}</span>
                      <span>•</span>
                      <span className="capitalize">{notification.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.readAt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification._id);
                        }}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Notification Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Trade Notifications</div>
                  <div className="text-sm text-slate-400">Get notified about trade executions</div>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, trades: !prev.trades }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.trades ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.trades ? 'translate-x-6' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Alert Notifications</div>
                  <div className="text-sm text-slate-400">Price alerts and market events</div>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, alerts: !prev.alerts }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.alerts ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.alerts ? 'translate-x-6' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Bot Updates</div>
                  <div className="text-sm text-slate-400">Bot status changes and updates</div>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, bots: !prev.bots }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.bots ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.bots ? 'translate-x-6' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">System Notifications</div>
                  <div className="text-sm text-slate-400">Platform updates and announcements</div>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, system: !prev.system }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    preferences.system ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.system ? 'translate-x-6' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save preferences to backend
                  setShowSettings(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
