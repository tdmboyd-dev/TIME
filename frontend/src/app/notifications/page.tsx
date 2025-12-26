'use client';

/**
 * Notifications Center Page - Enhanced
 *
 * Comprehensive notification management:
 * - List of all notifications with category grouping
 * - Mark as read/unread with bulk actions
 * - Delete notifications
 * - Notification statistics and analytics
 * - Filter by type, category, and priority
 * - Quick preferences access
 * - Real-time updates
 */

import { useState, useEffect, useMemo } from 'react';
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
  X,
  Shield,
  Gift,
  DollarSign,
  RefreshCw,
  BarChart3,
  Clock,
  Archive,
  ChevronRight
} from 'lucide-react';
import { useNotifications, type NotificationCategory } from '@/components/notifications/NotificationProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Category configuration
const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; icon: any; color: string; bgColor: string }> = {
  trade: { label: 'Trades', icon: TrendingUp, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  bot: { label: 'Bot Alerts', icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  price: { label: 'Price Targets', icon: DollarSign, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  big_moves: { label: 'Big Moves', icon: Zap, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  security: { label: 'Security', icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  marketing: { label: 'Promotions', icon: Gift, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  system: { label: 'System', icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isSubscribed,
    permission,
    preferences,
    stats,
    isLoading,
    requestPermission,
    subscribeToPush,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    updatePreferences,
    resetPreferences,
    refreshStats,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshNotifications();
    refreshStats();
  }, [refreshNotifications, refreshStats]);

  // Get category from notification type
  const getCategoryFromType = (type: string): NotificationCategory => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('trade') || lowerType.includes('executed')) return 'trade';
    if (lowerType.includes('bot') || lowerType.includes('signal')) return 'bot';
    if (lowerType.includes('price') || lowerType.includes('target')) return 'price';
    if (lowerType.includes('big_moves') || lowerType.includes('market_move')) return 'big_moves';
    if (lowerType.includes('security') || lowerType.includes('login')) return 'security';
    if (lowerType.includes('marketing') || lowerType.includes('promo')) return 'marketing';
    return 'system';
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Filter by read status
      if (filter === 'unread' && notification.readAt) return false;
      if (filter === 'read' && !notification.readAt) return false;

      // Filter by category
      if (categoryFilter !== 'all') {
        const category = notification.category || getCategoryFromType(notification.type);
        if (category !== categoryFilter) return false;
      }

      // Filter by priority
      if (priorityFilter !== 'all') {
        if (notification.priority !== priorityFilter) return false;
      }

      return true;
    });
  }, [notifications, filter, categoryFilter, priorityFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: typeof notifications } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      date.setHours(0, 0, 0, 0);

      let groupKey: string;
      if (date.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (date.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.readAt) {
      await markAsRead(notification._id);
    }
    if (notification.url) {
      router.push(notification.url);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    await refreshStats();
    setIsRefreshing(false);
  };

  const getNotificationIcon = (type: string) => {
    const category = getCategoryFromType(type);
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
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

        {/* Statistics Cards */}
        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Bell className="w-4 h-4" />
                <span className="text-xs">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Unread</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.unread}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Trades</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.byCategory?.trade || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Bot className="w-4 h-4" />
                <span className="text-xs">Bot Alerts</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.byCategory?.bot || 0}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="trade">Trades</option>
            <option value="bot">Bot Alerts</option>
            <option value="price">Price Targets</option>
            <option value="big_moves">Big Moves</option>
            <option value="security">Security</option>
            <option value="marketing">Promotions</option>
            <option value="system">System</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification List - Grouped by Date */}
      <div className="max-w-4xl mx-auto space-y-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No notifications to display</p>
            <p className="text-sm text-slate-500">
              {filter !== 'all' || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
            <div key={dateGroup}>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {dateGroup}
                <span className="text-slate-600">({groupNotifications.length})</span>
              </h3>
              <div className="space-y-2">
                {groupNotifications.map((notification) => {
                  const category = notification.category || getCategoryFromType(notification.type);
                  const categoryConfig = CATEGORY_CONFIG[category];

                  return (
                    <div
                      key={notification._id}
                      className={`flex items-start gap-4 p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-slate-800/50 ${
                        getPriorityColor(notification.priority)
                      } ${!notification.readAt ? 'bg-slate-800/30' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${categoryConfig.bgColor}`}>
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
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                              )}
                              {notification.priority === 'critical' && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Critical</span>
                              )}
                              {notification.priority === 'high' && (
                                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">High</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-2">{notification.message}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span>{formatTime(notification.createdAt)}</span>
                              <span>|</span>
                              <span className={`flex items-center gap-1 ${categoryConfig.color}`}>
                                {categoryConfig.label}
                              </span>
                              {notification.url && (
                                <>
                                  <span>|</span>
                                  <span className="flex items-center gap-1 text-blue-400">
                                    <ChevronRight className="w-3 h-3" />
                                    View Details
                                  </span>
                                </>
                              )}
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
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="max-w-4xl mx-auto mt-8 flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-4">
          <Link
            href="/settings?tab=notifications"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            Notification Settings
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Settings Modal - Enhanced */}
      {showSettings && preferences && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Notification Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Notification Categories</h3>
                <div className="space-y-3">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const categoryKey = key as NotificationCategory;
                    const Icon = config.icon;
                    const isEnabled = preferences.categories[categoryKey];

                    return (
                      <div key={key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{config.label}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => updatePreferences({
                            categories: { ...preferences.categories, [categoryKey]: !isEnabled }
                          })}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            isEnabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}></div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-400">Quiet Hours</h3>
                  <button
                    onClick={() => updatePreferences({
                      quietHours: { ...preferences.quietHours, enabled: !preferences.quietHours.enabled }
                    })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      preferences.quietHours.enabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences.quietHours.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
                {preferences.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Start</label>
                      <select
                        value={preferences.quietHours.start}
                        onChange={(e) => updatePreferences({
                          quietHours: { ...preferences.quietHours, start: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 text-sm"
                      >
                        <option value="21:00">9:00 PM</option>
                        <option value="22:00">10:00 PM</option>
                        <option value="23:00">11:00 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">End</label>
                      <select
                        value={preferences.quietHours.end}
                        onChange={(e) => updatePreferences({
                          quietHours: { ...preferences.quietHours, end: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 text-sm"
                      >
                        <option value="06:00">6:00 AM</option>
                        <option value="07:00">7:00 AM</option>
                        <option value="08:00">8:00 AM</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Minimum Priority */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Minimum Priority</h3>
                <select
                  value={preferences.minPriority}
                  onChange={(e) => updatePreferences({
                    minPriority: e.target.value as any
                  })}
                  className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-700"
                >
                  <option value="low">All notifications</option>
                  <option value="medium">Medium and above</option>
                  <option value="high">High and critical only</option>
                  <option value="critical">Critical only</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={resetPreferences}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
