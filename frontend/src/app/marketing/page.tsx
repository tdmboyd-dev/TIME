'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Play, Square, Settings, BarChart3, Send, Plus, Eye, Clock, TrendingUp } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )time_auth_token=([^;]+)'));
  return match ? match[2] : null;
}

interface AutoPostConfig {
  enabled: boolean;
  intervalMinutes: number;
  platforms: string[];
  contentTypes: string[];
  maxPostsPerDay: number;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  includeEmojis: boolean;
  tone: 'professional' | 'casual' | 'exciting' | 'educational' | 'urgent';
}

interface AutoPostStats {
  enabled: boolean;
  postsToday: number;
  maxPostsPerDay: number;
  nextPostIn: string;
  lastPost: Date | null;
}

interface Analytics {
  totalPosts: number;
  totalCampaigns: number;
  platformBreakdown: Record<string, number>;
  recentPosts: any[];
  topPerformingPosts: any[];
}

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in' },
  { id: 'discord', name: 'Discord', icon: '💬' },
  { id: 'telegram', name: 'Telegram', icon: '✈️' },
  { id: 'reddit', name: 'Reddit', icon: '🤖' },
];

const CONTENT_TYPES = [
  { id: 'tip', name: 'Trading Tips', count: 15 },
  { id: 'feature', name: 'Feature Highlights', count: 15 },
  { id: 'educational', name: 'Educational', count: 10 },
  { id: 'engagement', name: 'Engagement', count: 10 },
  { id: 'promotion', name: 'Promotions', count: 5 },
  { id: 'announcement', name: 'Announcements', count: 5 },
];

const TONES = [
  { id: 'professional', name: 'Professional' },
  { id: 'casual', name: 'Casual' },
  { id: 'exciting', name: 'Exciting' },
  { id: 'educational', name: 'Educational' },
  { id: 'urgent', name: 'Urgent' },
];

export default function MarketingHubPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<AutoPostConfig>({
    enabled: false,
    intervalMinutes: 120,
    platforms: ['twitter', 'linkedin', 'discord', 'telegram'],
    contentTypes: ['tip', 'feature', 'educational', 'engagement'],
    maxPostsPerDay: 12,
    quietHoursStart: 23,
    quietHoursEnd: 7,
    includeEmojis: true,
    tone: 'casual',
  });
  const [stats, setStats] = useState<AutoPostStats>({
    enabled: false,
    postsToday: 0,
    maxPostsPerDay: 12,
    nextPostIn: 'Not scheduled',
    lastPost: null,
  });
  const [analytics, setAnalytics] = useState<Analytics>({
    totalPosts: 0,
    totalCampaigns: 0,
    platformBreakdown: {},
    recentPosts: [],
    topPerformingPosts: [],
  });
  const [manualContent, setManualContent] = useState('');
  const [manualPlatforms, setManualPlatforms] = useState<string[]>(['twitter']);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = getTokenFromCookie();
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [statusRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/marketing/autopost/status`, { headers }),
        fetch(`${API_BASE}/api/v1/marketing/analytics`, { headers }),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.success) {
          setConfig(statusData.config);
          setStats(statusData.stats);
        }
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.analytics);
        }
      }
    } catch (error) {
      console.error('Failed to fetch marketing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoPosting = async () => {
    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/autopost/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Auto-posting started successfully!' });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to start auto-posting');
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const stopAutoPosting = async () => {
    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/autopost/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Auto-posting stopped' });
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to stop auto-posting');
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const updateConfig = async (updates: Partial<AutoPostConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    try {
      const token = getTokenFromCookie();
      await fetch(`${API_BASE}/api/v1/marketing/autopost/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const postNow = async () => {
    if (!manualContent.trim()) {
      setNotification({ type: 'error', message: 'Please enter content to post' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/post-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: manualContent,
          platforms: manualPlatforms,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Post published successfully!' });
        setManualContent('');
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to publish post');
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const togglePlatform = (platformId: string) => {
    const newPlatforms = config.platforms.includes(platformId)
      ? config.platforms.filter(p => p !== platformId)
      : [...config.platforms, platformId];
    updateConfig({ platforms: newPlatforms });
  };

  const toggleContentType = (typeId: string) => {
    const newTypes = config.contentTypes.includes(typeId)
      ? config.contentTypes.filter(t => t !== typeId)
      : [...config.contentTypes, typeId];
    updateConfig({ contentTypes: newTypes });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Marketing Hub</h1>
            <p className="text-slate-400">Automated social media marketing for TIME BEYOND US</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Auto-Posting</span>
            <div className={`w-3 h-3 rounded-full ${stats.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.enabled ? 'Active' : 'Stopped'}
          </div>
          <div className="text-xs text-slate-500 mt-1">{stats.nextPostIn}</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-sm">Posts Today</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.postsToday} / {stats.maxPostsPerDay}
          </div>
          <div className="text-xs text-slate-500 mt-1">Daily limit</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-sm">Total Posts</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.totalPosts}</div>
          <div className="text-xs text-slate-500 mt-1">All time</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 text-sm">Campaigns</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.totalCampaigns}</div>
          <div className="text-xs text-slate-500 mt-1">Active campaigns</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auto-Posting Control */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Auto-Posting Control
            </h2>
            {stats.enabled ? (
              <button
                onClick={stopAutoPosting}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={startAutoPosting}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            )}
          </div>

          {/* Posting Interval */}
          <div className="mb-6">
            <label className="text-sm text-slate-400 mb-2 block">Posting Interval (minutes)</label>
            <input
              type="number"
              value={config.intervalMinutes}
              onChange={(e) => updateConfig({ intervalMinutes: parseInt(e.target.value) || 60 })}
              min={5}
              max={1440}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">Post every {config.intervalMinutes} minutes</p>
          </div>

          {/* Max Posts Per Day */}
          <div className="mb-6">
            <label className="text-sm text-slate-400 mb-2 block">Max Posts Per Day</label>
            <input
              type="number"
              value={config.maxPostsPerDay}
              onChange={(e) => updateConfig({ maxPostsPerDay: parseInt(e.target.value) || 12 })}
              min={1}
              max={100}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Quiet Hours */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Quiet Hours Start</label>
              <input
                type="number"
                value={config.quietHoursStart}
                onChange={(e) => updateConfig({ quietHoursStart: parseInt(e.target.value) })}
                min={0}
                max={23}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Quiet Hours End</label>
              <input
                type="number"
                value={config.quietHoursEnd}
                onChange={(e) => updateConfig({ quietHoursEnd: parseInt(e.target.value) })}
                min={0}
                max={23}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tone */}
          <div className="mb-6">
            <label className="text-sm text-slate-400 mb-2 block">Tone</label>
            <select
              value={config.tone}
              onChange={(e) => updateConfig({ tone: e.target.value as any })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            >
              {TONES.map(tone => (
                <option key={tone.id} value={tone.id}>{tone.name}</option>
              ))}
            </select>
          </div>

          {/* Include Emojis */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Include Emojis</span>
            <button
              onClick={() => updateConfig({ includeEmojis: !config.includeEmojis })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.includeEmojis ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                config.includeEmojis ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Platforms</h2>
          <div className="space-y-3">
            {PLATFORMS.map(platform => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                  config.platforms.includes(platform.id)
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="font-medium">{platform.name}</span>
                </div>
                {config.platforms.includes(platform.id) && (
                  <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-medium text-white mb-2">Platform Breakdown</h3>
            {Object.entries(analytics.platformBreakdown).map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-400">{platform}</span>
                <span className="text-xs text-white font-medium">{count} posts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Types */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Content Types (50+ pieces)</h2>
          <div className="grid grid-cols-2 gap-3">
            {CONTENT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => toggleContentType(type.id)}
                className={`p-4 rounded-lg border transition-all text-left ${
                  config.contentTypes.includes(type.id)
                    ? 'bg-purple-500/10 border-purple-500/30 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-sm mb-1">{type.name}</div>
                <div className="text-xs opacity-60">{type.count} pieces</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Post */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Post Now
          </h2>

          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-2 block">Content</label>
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Write your post content..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">{manualContent.length} characters</p>
          </div>

          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-2 block">Select Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => {
                    if (manualPlatforms.includes(platform.id)) {
                      setManualPlatforms(manualPlatforms.filter(p => p !== platform.id));
                    } else {
                      setManualPlatforms([...manualPlatforms, platform.id]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    manualPlatforms.includes(platform.id)
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {platform.icon} {platform.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={postNow}
            disabled={isProcessing || !manualContent.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {isProcessing ? 'Publishing...' : 'Post Now'}
          </button>
        </div>
      </div>

      {/* Recent Posts */}
      {analytics.recentPosts.length > 0 && (
        <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Recent Posts
          </h2>
          <div className="space-y-3">
            {analytics.recentPosts.map((post: any) => (
              <div key={post.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm text-white">{post.content.substring(0, 100)}...</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    post.status === 'posted' ? 'bg-emerald-500/20 text-emerald-400' :
                    post.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {post.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{post.platforms.join(', ')}</span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
