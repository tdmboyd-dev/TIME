'use client';

/**
 * NotificationBell Component
 *
 * Bell icon with unread count badge and dropdown preview
 * - Shows recent notifications in dropdown
 * - Click notification to navigate and mark as read
 * - "View All" link to full notifications page
 * - Real-time updates via NotificationProvider
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, TrendingUp, AlertTriangle, Info, Bot, DollarSign, Zap, X } from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.readAt) {
      await markAsRead(notification._id);
    }
    setShowDropdown(false);
    if (notification.url || notification.data?.url) {
      router.push(notification.url || notification.data.url);
    }
  };

  const getNotificationIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('trade') || lowerType.includes('executed')) {
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    }
    if (lowerType.includes('alert') || lowerType.includes('price')) {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
    if (lowerType.includes('bot') || lowerType.includes('signal')) {
      return <Bot className="w-4 h-4 text-purple-400" />;
    }
    if (lowerType.includes('profit')) {
      return <DollarSign className="w-4 h-4 text-emerald-400" />;
    }
    if (lowerType.includes('system')) {
      return <Zap className="w-4 h-4 text-blue-400" />;
    }
    return <Info className="w-4 h-4 text-slate-400" />;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString();
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      !notification.readAt ? 'bg-slate-800/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-medium ${!notification.readAt ? 'text-white' : 'text-slate-300'}`}>
                            {notification.title}
                          </h4>
                          {!notification.readAt && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            {formatTime(notification.createdAt)}
                          </span>
                          <div className="flex items-center gap-1">
                            {!notification.readAt && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="p-1 hover:bg-slate-700 rounded transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id);
                              }}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-700 bg-slate-800/50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  router.push('/notifications');
                }}
                className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                View All Notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
