'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone,
  Play,
  Square,
  Settings,
  BarChart3,
  Send,
  Plus,
  Eye,
  Clock,
  TrendingUp,
  Gift,
  Users,
  Tag,
  DollarSign,
  Award,
  Percent,
  Calendar,
  Check,
  X,
  Edit2,
  Copy,
  ExternalLink,
} from 'lucide-react';

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

interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  userName: string;
  usageCount: number;
  totalRewards: number;
  referrals: any[];
  conversionRate: number;
}

interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: string;
  discountPercent?: number;
  discountAmount?: number;
  freeMonths?: number;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number;
  expiryDate?: string;
  totalRevenue: number;
  totalDiscount: number;
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
  const [activeTab, setActiveTab] = useState<'social' | 'campaigns' | 'referrals' | 'promos'>('social');
  const [isLoading, setIsLoading] = useState(true);

  // Social media state
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

  // Referral state
  const [referralStats, setReferralStats] = useState<any>(null);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [newReferralUser, setNewReferralUser] = useState({ userId: '', userName: '' });

  // Promo code state
  const [promoStats, setPromoStats] = useState<any>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    description: '',
    type: 'percentage',
    discountPercent: 20,
    discountAmount: 0,
    freeMonths: 0,
    usageLimit: 100,
    expiryDate: '',
  });

  // Campaign state
  const [showOverview, setShowOverview] = useState(false);
  const [marketingOverview, setMarketingOverview] = useState<any>(null);

  // UI state
  const [manualContent, setManualContent] = useState('');
  const [manualPlatforms, setManualPlatforms] = useState<string[]>(['twitter']);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setIsLoading(true);
    const token = getTokenFromCookie();
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      if (activeTab === 'social') {
        const [statusRes, analyticsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/marketing/autopost/status`, { headers }),
          fetch(`${API_BASE}/api/v1/marketing/analytics`, { headers }),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.success) {
            setConfig(data.config);
            setStats(data.stats);
          }
        }

        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          if (data.success) {
            setAnalytics(data.analytics);
          }
        }
      } else if (activeTab === 'referrals') {
        const res = await fetch(`${API_BASE}/api/v1/marketing/referrals`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReferralStats(data);
            setReferralCodes(data.referralCodes || []);
          }
        }
      } else if (activeTab === 'promos') {
        const res = await fetch(`${API_BASE}/api/v1/marketing/promos`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPromoStats(data);
            setPromoCodes(data.promoCodes || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverview = async () => {
    const token = getTokenFromCookie();
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_BASE}/api/v1/marketing/analytics/overview`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMarketingOverview(data.overview);
          setShowOverview(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error);
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
        showNotification('success', 'Auto-posting started successfully!');
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to start auto-posting');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAutoPosting = async () => {
    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/autopost/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Auto-posting stopped');
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to stop auto-posting');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsProcessing(false);
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
      showNotification('error', 'Please enter content to post');
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
        showNotification('success', 'Post published successfully!');
        setManualContent('');
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to publish post');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReferralCode = async () => {
    if (!newReferralUser.userId || !newReferralUser.userName) {
      showNotification('error', 'Please enter user ID and name');
      return;
    }

    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/referrals/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newReferralUser),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', `Referral code ${data.referralCode.code} generated!`);
        setShowReferralForm(false);
        setNewReferralUser({ userId: '', userName: '' });
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to generate referral code');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const createPromoCode = async () => {
    if (!newPromo.code || !newPromo.description) {
      showNotification('error', 'Please enter code and description');
      return;
    }

    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/promos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newPromo,
          applicablePlans: ['all'],
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', `Promo code ${data.promoCode.code} created!`);
        setShowPromoForm(false);
        setNewPromo({
          code: '',
          description: '',
          type: 'percentage',
          discountPercent: 20,
          discountAmount: 0,
          freeMonths: 0,
          usageLimit: 100,
          expiryDate: '',
        });
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to create promo code');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePromoStatus = async (code: string, isActive: boolean) => {
    setIsProcessing(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/api/v1/marketing/promos/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', `Promo code ${isActive ? 'deactivated' : 'activated'}`);
        fetchAllData();
      } else {
        throw new Error(data.error || 'Failed to update promo code');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('success', 'Copied to clipboard!');
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Marketing Hub</h1>
              <p className="text-slate-400">Complete marketing automation and analytics</p>
            </div>
          </div>

          <button
            onClick={fetchOverview}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            View Overview
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'social', label: 'Social Media', icon: Megaphone },
            { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
            { id: 'referrals', label: 'Referrals', icon: Users },
            { id: 'promos', label: 'Promo Codes', icon: Tag },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SOCIAL MEDIA TAB */}
      {activeTab === 'social' && (
        <>
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

              <div className="space-y-4">
                <div>
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

                <div>
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

                <div className="grid grid-cols-2 gap-4">
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

                <div>
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
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Platform Breakdown</h3>
                {Object.entries(analytics.platformBreakdown).length > 0 ? (
                  Object.entries(analytics.platformBreakdown).map(([platform, count]) => (
                    <div key={platform} className="flex items-center justify-between py-1">
                      <span className="text-xs text-slate-400">{platform}</span>
                      <span className="text-xs text-white font-medium">{count} posts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No posts yet</p>
                )}
              </div>
            </div>

            {/* Content Types */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Content Types (60+ pieces)</h2>
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
        </>
      )}

      {/* REFERRALS TAB */}
      {activeTab === 'referrals' && (
        <>
          {/* Referral Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-sm">Total Referrals</span>
              </div>
              <div className="text-2xl font-bold text-white">{referralStats?.totalReferrals || 0}</div>
              <div className="text-xs text-slate-500 mt-1">From {referralStats?.totalReferralCodes || 0} codes</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-sm">Conversions</span>
              </div>
              <div className="text-2xl font-bold text-white">{referralStats?.totalConversions || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Converted to paid</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400 text-sm">Rewards Paid</span>
              </div>
              <div className="text-2xl font-bold text-white">${referralStats?.totalRewardsPaid || 0}</div>
              <div className="text-xs text-slate-500 mt-1">${referralStats?.pendingRewards || 0} pending</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400 text-sm">Active Codes</span>
              </div>
              <div className="text-2xl font-bold text-white">{referralStats?.activeReferralCodes || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Referral codes</div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowReferralForm(!showReferralForm)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Referral Code
            </button>
          </div>

          {/* Referral Form */}
          {showReferralForm && (
            <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Generate New Referral Code</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">User ID</label>
                  <input
                    type="text"
                    value={newReferralUser.userId}
                    onChange={(e) => setNewReferralUser({ ...newReferralUser, userId: e.target.value })}
                    placeholder="user_123"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">User Name</label>
                  <input
                    type="text"
                    value={newReferralUser.userName}
                    onChange={(e) => setNewReferralUser({ ...newReferralUser, userName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateReferralCode}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Generating...' : 'Generate Code'}
                </button>
                <button
                  onClick={() => setShowReferralForm(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {referralStats?.leaderboard && referralStats.leaderboard.length > 0 && (
            <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Referral Leaderboard
              </h2>
              <div className="space-y-2">
                {referralStats.leaderboard.map((leader: any) => (
                  <div key={leader.rank} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        #{leader.rank}
                      </div>
                      <div>
                        <div className="text-white font-medium">{leader.userName}</div>
                        <div className="text-xs text-slate-400">Code: {leader.code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{leader.totalReferrals} referrals</div>
                      <div className="text-xs text-slate-400">{leader.conversions} converted | ${leader.totalRewards} earned</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral Codes List */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">All Referral Codes</h2>
            <div className="space-y-3">
              {referralCodes.map((ref) => (
                <div key={ref.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">{ref.code}</span>
                        <button
                          onClick={() => copyToClipboard(ref.code)}
                          className="text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-slate-400">{ref.userName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{ref.referrals.length} referrals</div>
                      <div className="text-xs text-slate-500">{ref.conversionRate.toFixed(1)}% conversion</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-700">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Used</div>
                      <div className="text-white font-medium">{ref.usageCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Conversions</div>
                      <div className="text-emerald-400 font-medium">{ref.referrals.filter(r => r.convertedToPaid).length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Rewards</div>
                      <div className="text-amber-400 font-medium">${ref.totalRewards}</div>
                    </div>
                  </div>
                </div>
              ))}

              {referralCodes.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No referral codes yet. Generate one to get started!
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* PROMO CODES TAB */}
      {activeTab === 'promos' && (
        <>
          {/* Promo Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-sm">Total Codes</span>
              </div>
              <div className="text-2xl font-bold text-white">{promoStats?.totalCodes || 0}</div>
              <div className="text-xs text-slate-500 mt-1">{promoStats?.activeCodes || 0} active</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400 text-sm">Redemptions</span>
              </div>
              <div className="text-2xl font-bold text-white">{promoStats?.totalRedemptions || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Total uses</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-sm">Revenue</span>
              </div>
              <div className="text-2xl font-bold text-white">${promoStats?.totalRevenue || 0}</div>
              <div className="text-xs text-slate-500 mt-1">After discounts</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-red-400" />
                <span className="text-slate-400 text-sm">Discounts</span>
              </div>
              <div className="text-2xl font-bold text-white">${promoStats?.totalDiscount || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Total discounted</div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowPromoForm(!showPromoForm)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Promo Code
            </button>
          </div>

          {/* Promo Form */}
          {showPromoForm && (
            <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Create New Promo Code</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Code</label>
                  <input
                    type="text"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Type</label>
                  <select
                    value={newPromo.type}
                    onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="free_trial">Free Trial</option>
                    <option value="free_months">Free Months</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-slate-400 mb-2 block">Description</label>
                  <input
                    type="text"
                    value={newPromo.description}
                    onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                    placeholder="20% off all plans"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                {newPromo.type === 'percentage' && (
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Discount %</label>
                    <input
                      type="number"
                      value={newPromo.discountPercent}
                      onChange={(e) => setNewPromo({ ...newPromo, discountPercent: parseInt(e.target.value) || 0 })}
                      min={1}
                      max={100}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}
                {newPromo.type === 'fixed_amount' && (
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Discount Amount ($)</label>
                    <input
                      type="number"
                      value={newPromo.discountAmount}
                      onChange={(e) => setNewPromo({ ...newPromo, discountAmount: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}
                {newPromo.type === 'free_months' && (
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Free Months</label>
                    <input
                      type="number"
                      value={newPromo.freeMonths}
                      onChange={(e) => setNewPromo({ ...newPromo, freeMonths: parseInt(e.target.value) || 0 })}
                      min={1}
                      max={12}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Usage Limit</label>
                  <input
                    type="number"
                    value={newPromo.usageLimit}
                    onChange={(e) => setNewPromo({ ...newPromo, usageLimit: parseInt(e.target.value) || 0 })}
                    min={1}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={newPromo.expiryDate}
                    onChange={(e) => setNewPromo({ ...newPromo, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createPromoCode}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Creating...' : 'Create Promo Code'}
                </button>
                <button
                  onClick={() => setShowPromoForm(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Promo Codes List */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">All Promo Codes</h2>
            <div className="space-y-3">
              {promoCodes.map((promo) => (
                <div key={promo.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">{promo.code}</span>
                        <button
                          onClick={() => copyToClipboard(promo.code)}
                          className="text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <span className={`px-2 py-1 rounded text-xs ${
                          promo.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {promo.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">{promo.description}</div>
                    </div>
                    <button
                      onClick={() => togglePromoStatus(promo.code, promo.isActive)}
                      disabled={isProcessing}
                      className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {promo.isActive ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pt-3 border-t border-slate-700">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Type</div>
                      <div className="text-white font-medium capitalize">{promo.type.replace('_', ' ')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Redemptions</div>
                      <div className="text-purple-400 font-medium">{promo.usageCount}/{promo.usageLimit || '∞'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Revenue</div>
                      <div className="text-emerald-400 font-medium">${promo.totalRevenue}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Discount</div>
                      <div className="text-red-400 font-medium">${promo.totalDiscount}</div>
                    </div>
                  </div>
                  {promo.expiryDate && (
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expires: {new Date(promo.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}

              {promoCodes.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No promo codes yet. Create one to get started!
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CAMPAIGNS TAB */}
      {activeTab === 'campaigns' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
          <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Campaign Management</h2>
          <p className="text-slate-400 mb-6">
            Create and track marketing campaigns with ROI analysis, A/B testing, and detailed performance metrics.
          </p>
          <p className="text-slate-500 text-sm">
            Coming soon: Full campaign dashboard with analytics integration
          </p>
        </div>
      )}

      {/* OVERVIEW MODAL */}
      {showOverview && marketingOverview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Marketing Overview</h2>
              <button
                onClick={() => setShowOverview(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Social */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-cyan-400" />
                  Social Media
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Posts</span>
                    <span className="text-white font-medium">{marketingOverview.social.totalPosts}</span>
                  </div>
                </div>
              </div>

              {/* Campaigns */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Campaigns
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total</span>
                    <span className="text-white font-medium">{marketingOverview.campaigns.total}</span>
                  </div>
                </div>
              </div>

              {/* Referrals */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Referrals
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Codes</span>
                    <span className="text-white font-medium">{marketingOverview.referrals.totalCodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Referrals</span>
                    <span className="text-white font-medium">{marketingOverview.referrals.totalReferrals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conversions</span>
                    <span className="text-emerald-400 font-medium">{marketingOverview.referrals.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conversion Rate</span>
                    <span className="text-cyan-400 font-medium">{marketingOverview.referrals.conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rewards</span>
                    <span className="text-amber-400 font-medium">${marketingOverview.referrals.totalRewards}</span>
                  </div>
                </div>
              </div>

              {/* Promos */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  Promo Codes
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Codes</span>
                    <span className="text-white font-medium">{marketingOverview.promos.totalCodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active</span>
                    <span className="text-emerald-400 font-medium">{marketingOverview.promos.activeCodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Redemptions</span>
                    <span className="text-white font-medium">{marketingOverview.promos.redemptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue</span>
                    <span className="text-emerald-400 font-medium">${marketingOverview.promos.revenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discount</span>
                    <span className="text-red-400 font-medium">${marketingOverview.promos.discount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
