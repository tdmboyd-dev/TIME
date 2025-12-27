'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Info,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Bell,
} from 'lucide-react';
import clsx from 'clsx';

import { API_BASE, getTokenFromCookie } from '@/lib/api';

interface Announcement {
  id: string;
  featureId: string;
  featureName: string;
  title: string;
  message: string;
  bannerType: 'info' | 'success' | 'warning' | 'feature';
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface FeatureAnnouncementBannerProps {
  onClose?: () => void;
  maxAnnouncements?: number;
  position?: 'top' | 'bottom';
  style?: 'banner' | 'floating' | 'toast';
}

export default function FeatureAnnouncementBanner({
  onClose,
  maxAnnouncements = 3,
  position = 'top',
  style = 'banner',
}: FeatureAnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const token = getTokenFromCookie();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/features/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.announcements) {
          // Filter out dismissed announcements
          const dismissed = getDismissedFromStorage();
          const active = data.announcements
            .filter((a: Announcement) => !dismissed.has(a.id))
            .slice(0, maxAnnouncements);
          setAnnouncements(active);
        }
      }
    } catch (err) {
      // Silently fail - announcements are not critical
    } finally {
      setIsLoading(false);
    }
  }, [maxAnnouncements]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Get dismissed announcements from localStorage
  const getDismissedFromStorage = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('time_dismissed_announcements');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  // Save dismissed to localStorage
  const saveDismissedToStorage = (ids: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('time_dismissed_announcements', JSON.stringify([...ids]));
    } catch {
      // Ignore storage errors
    }
  };

  // Track announcement view
  const trackView = async (announcementId: string) => {
    try {
      const token = getTokenFromCookie();
      if (!token) return;

      await fetch(`${API_BASE}/features/announcements/${announcementId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {
      // Silently fail
    }
  };

  // Track announcement dismiss
  const trackDismiss = async (announcementId: string) => {
    try {
      const token = getTokenFromCookie();
      if (!token) return;

      await fetch(`${API_BASE}/features/announcements/${announcementId}/dismiss`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {
      // Silently fail
    }
  };

  // Track announcement click
  const trackClick = async (announcementId: string) => {
    try {
      const token = getTokenFromCookie();
      if (!token) return;

      await fetch(`${API_BASE}/features/announcements/${announcementId}/click`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {
      // Silently fail
    }
  };

  // Dismiss announcement
  const dismissAnnouncement = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    saveDismissedToStorage(newDismissed);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    trackDismiss(id);

    if (onClose && announcements.length <= 1) {
      onClose();
    }
  };

  // Get icon for banner type
  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'feature':
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  // Get colors for banner type
  const getBannerColors = (type: string) => {
    switch (type) {
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          text: 'text-blue-400',
          iconBg: 'bg-blue-500/20',
        };
      case 'success':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          text: 'text-green-400',
          iconBg: 'bg-green-500/20',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          text: 'text-yellow-400',
          iconBg: 'bg-yellow-500/20',
        };
      case 'feature':
      default:
        return {
          bg: 'bg-purple-500/10 border-purple-500/30',
          text: 'text-purple-400',
          iconBg: 'bg-purple-500/20',
        };
    }
  };

  // Track views when announcements change
  useEffect(() => {
    announcements.forEach(a => trackView(a.id));
  }, [announcements]);

  // Auto-rotate announcements
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  if (isLoading || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  if (!currentAnnouncement) return null;

  const colors = getBannerColors(currentAnnouncement.bannerType);

  // Render banner style
  if (style === 'banner') {
    return (
      <div
        className={clsx(
          'relative border-b px-4 py-3',
          colors.bg,
          position === 'top' ? 'border-b' : 'border-t'
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx('p-2 rounded-lg', colors.iconBg, colors.text)}>
              {getIcon(currentAnnouncement.bannerType)}
            </div>
            <div className="min-w-0">
              <h4 className={clsx('font-medium truncate', colors.text)}>
                {currentAnnouncement.title}
              </h4>
              <p className="text-sm text-slate-400 truncate">
                {currentAnnouncement.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {announcements.length > 1 && (
              <div className="flex items-center gap-1">
                {announcements.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      idx === currentIndex ? colors.text.replace('text-', 'bg-') : 'bg-slate-600'
                    )}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => {
                trackClick(currentAnnouncement.id);
                // Could navigate to feature page here
              }}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                colors.text,
                'hover:bg-white/10'
              )}
            >
              Learn More
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => dismissAnnouncement(currentAnnouncement.id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render floating style
  if (style === 'floating') {
    return (
      <div
        className={clsx(
          'fixed z-50 m-4',
          position === 'top' ? 'top-0 right-0' : 'bottom-0 right-0'
        )}
      >
        <div
          className={clsx(
            'w-80 rounded-xl border shadow-2xl',
            colors.bg,
            'bg-slate-900/95 backdrop-blur-sm'
          )}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={clsx('p-2 rounded-lg flex-shrink-0', colors.iconBg, colors.text)}>
                {getIcon(currentAnnouncement.bannerType)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={clsx('font-medium', colors.text)}>
                  {currentAnnouncement.title}
                </h4>
                <p className="text-sm text-slate-400 mt-1">
                  {currentAnnouncement.message}
                </p>
              </div>
              <button
                onClick={() => dismissAnnouncement(currentAnnouncement.id)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
              {announcements.length > 1 && (
                <div className="flex items-center gap-1">
                  {announcements.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full transition-colors',
                        idx === currentIndex ? colors.text.replace('text-', 'bg-') : 'bg-slate-600'
                      )}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  trackClick(currentAnnouncement.id);
                }}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  colors.text,
                  'hover:bg-white/10'
                )}
              >
                Learn More
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render toast style
  return (
    <div
      className={clsx(
        'fixed z-50 left-1/2 -translate-x-1/2',
        position === 'top' ? 'top-4' : 'bottom-4'
      )}
    >
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl',
          colors.bg,
          'bg-slate-900/95 backdrop-blur-sm'
        )}
      >
        <div className={clsx('p-1.5 rounded-lg', colors.iconBg, colors.text)}>
          {getIcon(currentAnnouncement.bannerType)}
        </div>
        <div className="min-w-0">
          <span className={clsx('font-medium', colors.text)}>
            {currentAnnouncement.title}
          </span>
          <span className="text-slate-400 mx-2">-</span>
          <span className="text-sm text-slate-400">
            {currentAnnouncement.message.slice(0, 50)}
            {currentAnnouncement.message.length > 50 && '...'}
          </span>
        </div>
        <button
          onClick={() => {
            trackClick(currentAnnouncement.id);
          }}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded text-sm',
            colors.text,
            'hover:bg-white/10'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => dismissAnnouncement(currentAnnouncement.id)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
