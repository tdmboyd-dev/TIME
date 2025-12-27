'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  Plus,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit2,
  Users,
  Percent,
  Bell,
  Globe,
  Crown,
  Beaker,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Save,
  Eye,
  Clock,
  TrendingUp,
  Settings,
  Megaphone,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

import { API_BASE, getTokenFromCookie } from '@/lib/api';

// ============================================================
// TYPES
// ============================================================

type UserSegment = 'all' | 'premium' | 'free' | 'beta_testers' | 'by_country';

interface UserSegmentConfig {
  type: UserSegment;
  countries?: string[];
  betaTesterIds?: string[];
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userSegments: UserSegmentConfig[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  announceOnEnable: boolean;
  announcementTitle?: string;
  announcementMessage?: string;
  announcementBannerType?: 'info' | 'success' | 'warning' | 'feature';
  announcementDurationDays?: number;
  enabledAt?: string;
  disabledAt?: string;
  enableHistory: any[];
}

interface FeatureFlagStats {
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  activeAnnouncements: number;
  flagsBySegment: Record<string, number>;
  recentChanges: any[];
}

// ============================================================
// COMPONENT
// ============================================================

export default function FeatureFlagsPage() {
  // State
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [stats, setStats] = useState<FeatureFlagStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [filterSegment, setFilterSegment] = useState<UserSegment | 'all'>('all');
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureFlag | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAnnouncementPreview, setShowAnnouncementPreview] = useState<FeatureFlag | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: false,
    rolloutPercentage: 100,
    userSegments: [{ type: 'all' as UserSegment }] as UserSegmentConfig[],
    announceOnEnable: true,
    announcementTitle: '',
    announcementMessage: '',
    announcementBannerType: 'feature' as 'info' | 'success' | 'warning' | 'feature',
    announcementDurationDays: 7,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  const fetchFeatures = useCallback(async () => {
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(data.features);
        }
      }
    } catch (err) {
      setError('Failed to fetch feature flags');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      // Stats fetch failure is non-critical
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchFeatures(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchFeatures, fetchStats]);

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle feature
  const toggleFeature = async (id: string) => {
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(prev => prev.map(f => f.id === id ? data.feature : f));
          showNotification('success', data.message);
          fetchStats();
        }
      } else {
        showNotification('error', 'Failed to toggle feature');
      }
    } catch (err) {
      showNotification('error', 'Failed to toggle feature');
    }
  };

  // Update rollout percentage
  const updateRollout = async (id: string, percentage: number) => {
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features/${id}/rollout`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ percentage }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(prev => prev.map(f => f.id === id ? data.feature : f));
        }
      }
    } catch (err) {
      showNotification('error', 'Failed to update rollout percentage');
    }
  };

  // Create feature
  const createFeature = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      showNotification('error', 'Name and description are required');
      return;
    }

    setIsSaving(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(prev => [data.feature, ...prev]);
          showNotification('success', 'Feature flag created successfully');
          setShowCreateModal(false);
          resetForm();
          fetchStats();
        }
      } else {
        const data = await response.json();
        showNotification('error', data.message || 'Failed to create feature');
      }
    } catch (err) {
      showNotification('error', 'Failed to create feature');
    } finally {
      setIsSaving(false);
    }
  };

  // Update feature
  const updateFeature = async () => {
    if (!editingFeature) return;

    setIsSaving(true);
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features/${editingFeature.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(prev => prev.map(f => f.id === editingFeature.id ? data.feature : f));
          showNotification('success', 'Feature flag updated successfully');
          setShowEditModal(false);
          setEditingFeature(null);
          resetForm();
          fetchStats();
        }
      } else {
        showNotification('error', 'Failed to update feature');
      }
    } catch (err) {
      showNotification('error', 'Failed to update feature');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete feature
  const deleteFeature = async (id: string) => {
    try {
      const token = getTokenFromCookie();
      const response = await fetch(`${API_BASE}/features/admin/features/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setFeatures(prev => prev.filter(f => f.id !== id));
        showNotification('success', 'Feature flag deleted');
        setShowDeleteConfirm(null);
        fetchStats();
      } else {
        showNotification('error', 'Failed to delete feature');
      }
    } catch (err) {
      showNotification('error', 'Failed to delete feature');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      enabled: false,
      rolloutPercentage: 100,
      userSegments: [{ type: 'all' }],
      announceOnEnable: true,
      announcementTitle: '',
      announcementMessage: '',
      announcementBannerType: 'feature',
      announcementDurationDays: 7,
    });
  };

  // Open edit modal
  const openEditModal = (feature: FeatureFlag) => {
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      description: feature.description,
      enabled: feature.enabled,
      rolloutPercentage: feature.rolloutPercentage,
      userSegments: feature.userSegments,
      announceOnEnable: feature.announceOnEnable,
      announcementTitle: feature.announcementTitle || '',
      announcementMessage: feature.announcementMessage || '',
      announcementBannerType: feature.announcementBannerType || 'feature',
      announcementDurationDays: feature.announcementDurationDays || 7,
    });
    setShowEditModal(true);
  };

  // Toggle segment
  const toggleSegment = (segment: UserSegment) => {
    setFormData(prev => {
      const hasSegment = prev.userSegments.some(s => s.type === segment);
      if (hasSegment) {
        return {
          ...prev,
          userSegments: prev.userSegments.filter(s => s.type !== segment),
        };
      } else {
        return {
          ...prev,
          userSegments: [...prev.userSegments, { type: segment }],
        };
      }
    });
  };

  // Filter features
  const filteredFeatures = features.filter(f => {
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !f.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterEnabled === 'enabled' && !f.enabled) return false;
    if (filterEnabled === 'disabled' && f.enabled) return false;
    if (filterSegment !== 'all' && !f.userSegments.some(s => s.type === filterSegment)) return false;
    return true;
  });

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedFeatures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get segment icon
  const getSegmentIcon = (segment: UserSegment) => {
    switch (segment) {
      case 'all': return <Users className="w-4 h-4" />;
      case 'premium': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'free': return <Users className="w-4 h-4 text-slate-400" />;
      case 'beta_testers': return <Beaker className="w-4 h-4 text-purple-400" />;
      case 'by_country': return <Globe className="w-4 h-4 text-blue-400" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  // Get banner type color
  const getBannerTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'success': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'feature': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-time-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg',
          notification.type === 'success' && 'bg-green-500/20 border border-green-500/50 text-green-400',
          notification.type === 'warning' && 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400',
          notification.type === 'error' && 'bg-red-500/20 border border-red-500/50 text-red-400'
        )}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flag className="w-7 h-7 text-time-primary" />
            Feature Flags
          </h1>
          <p className="text-slate-400">Master admin control panel for feature management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchFeatures(); fetchStats(); }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Feature
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-time-primary/10">
                <Flag className="w-5 h-5 text-time-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Features</p>
                <p className="text-xl font-bold text-white">{stats.totalFlags}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ToggleRight className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Enabled</p>
                <p className="text-xl font-bold text-green-400">{stats.enabledFlags}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <ToggleLeft className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Disabled</p>
                <p className="text-xl font-bold text-slate-400">{stats.disabledFlags}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Megaphone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active Announcements</p>
                <p className="text-xl font-bold text-purple-400">{stats.activeAnnouncements}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-time-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value as any)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value as any)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
            >
              <option value="all">All Segments</option>
              <option value="all">All Users</option>
              <option value="premium">Premium</option>
              <option value="free">Free</option>
              <option value="beta_testers">Beta Testers</option>
              <option value="by_country">By Country</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-3">
        {filteredFeatures.length === 0 ? (
          <div className="card p-8 text-center">
            <Flag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No feature flags found</p>
            <p className="text-slate-500 text-sm mt-1">Create your first feature flag to get started</p>
          </div>
        ) : (
          filteredFeatures.map((feature) => (
            <div key={feature.id} className="card overflow-hidden">
              {/* Main Row */}
              <div className="p-4 flex items-center gap-4">
                {/* Toggle */}
                <button
                  onClick={() => toggleFeature(feature.id)}
                  className={clsx(
                    'relative w-14 h-7 rounded-full transition-colors',
                    feature.enabled ? 'bg-green-500' : 'bg-slate-600'
                  )}
                >
                  <div className={clsx(
                    'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow',
                    feature.enabled ? 'translate-x-8' : 'translate-x-1'
                  )} />
                </button>

                {/* Feature Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium truncate">{feature.name}</h3>
                    {feature.announceOnEnable && (
                      <Bell className="w-4 h-4 text-purple-400" title="Announcement enabled" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">{feature.description}</p>
                </div>

                {/* Segments */}
                <div className="flex items-center gap-1">
                  {feature.userSegments.slice(0, 3).map((segment, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded bg-slate-800"
                      title={segment.type}
                    >
                      {getSegmentIcon(segment.type)}
                    </div>
                  ))}
                  {feature.userSegments.length > 3 && (
                    <span className="text-xs text-slate-400">+{feature.userSegments.length - 3}</span>
                  )}
                </div>

                {/* Rollout */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Percent className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feature.rolloutPercentage}
                    onChange={(e) => updateRollout(feature.id, parseInt(e.target.value))}
                    className="w-16 accent-time-primary"
                  />
                  <span className="text-sm text-slate-300 w-8">{feature.rolloutPercentage}%</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAnnouncementPreview(feature)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Preview Announcement"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(feature)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(feature.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleExpand(feature.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {expandedFeatures.has(feature.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedFeatures.has(feature.id) && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {/* Segments Detail */}
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-time-primary" />
                        User Segments
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {feature.userSegments.map((segment, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-slate-700 rounded flex items-center gap-1"
                          >
                            {getSegmentIcon(segment.type)}
                            {segment.type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Announcement Settings */}
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-purple-400" />
                        Announcement
                      </h4>
                      {feature.announceOnEnable ? (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400">
                            Title: <span className="text-slate-300">{feature.announcementTitle || feature.name}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Duration: <span className="text-slate-300">{feature.announcementDurationDays || 7} days</span>
                          </p>
                          <span className={clsx(
                            'inline-block px-2 py-0.5 text-xs rounded border',
                            getBannerTypeColor(feature.announcementBannerType || 'feature')
                          )}>
                            {feature.announcementBannerType || 'feature'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Announcements disabled</p>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        Metadata
                      </h4>
                      <div className="space-y-1 text-xs text-slate-400">
                        <p>Created: {new Date(feature.createdAt).toLocaleDateString()}</p>
                        <p>Updated: {new Date(feature.updatedAt).toLocaleDateString()}</p>
                        {feature.enabledAt && (
                          <p className="text-green-400">Enabled: {new Date(feature.enabledAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enable History */}
                  {feature.enableHistory.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        Recent Changes
                      </h4>
                      <div className="space-y-2">
                        {feature.enableHistory.slice(-5).reverse().map((event, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {event.action === 'enabled' ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                            <span className={event.action === 'enabled' ? 'text-green-400' : 'text-red-400'}>
                              {event.action}
                            </span>
                            <span className="text-slate-500">by {event.performedBy}</span>
                            <span className="text-slate-600">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-time-primary" />
                Create Feature Flag
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Feature Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., dark_mode, ai_trading"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this feature does..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                />
              </div>

              {/* Enabled & Rollout */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Initial State</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={clsx(
                        'relative w-14 h-7 rounded-full transition-colors',
                        formData.enabled ? 'bg-green-500' : 'bg-slate-600'
                      )}
                    >
                      <div className={clsx(
                        'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow',
                        formData.enabled ? 'translate-x-8' : 'translate-x-1'
                      )} />
                    </button>
                    <span className="text-sm text-slate-300">
                      {formData.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Rollout Percentage: {formData.rolloutPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.rolloutPercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, rolloutPercentage: parseInt(e.target.value) }))}
                    className="w-full accent-time-primary"
                  />
                </div>
              </div>

              {/* User Segments */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target User Segments</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'premium', 'free', 'beta_testers', 'by_country'] as UserSegment[]).map((segment) => (
                    <button
                      key={segment}
                      onClick={() => toggleSegment(segment)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors',
                        formData.userSegments.some(s => s.type === segment)
                          ? 'bg-time-primary/20 text-time-primary border border-time-primary/50'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      )}
                    >
                      {getSegmentIcon(segment)}
                      {segment.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Announcement Settings */}
              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" />
                    Enable Announcement on Feature Enable
                  </label>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, announceOnEnable: !prev.announceOnEnable }))}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors',
                      formData.announceOnEnable ? 'bg-purple-500' : 'bg-slate-600'
                    )}
                  >
                    <div className={clsx(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
                      formData.announceOnEnable ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>

                {formData.announceOnEnable && (
                  <div className="space-y-3 pl-6 border-l-2 border-purple-500/30">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Announcement Title</label>
                      <input
                        type="text"
                        value={formData.announcementTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, announcementTitle: e.target.value }))}
                        placeholder={`New Feature: ${formData.name || 'Feature Name'}`}
                        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Announcement Message</label>
                      <textarea
                        value={formData.announcementMessage}
                        onChange={(e) => setFormData(prev => ({ ...prev, announcementMessage: e.target.value }))}
                        placeholder="Custom announcement message (defaults to description)"
                        rows={2}
                        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Banner Type</label>
                        <select
                          value={formData.announcementBannerType}
                          onChange={(e) => setFormData(prev => ({ ...prev, announcementBannerType: e.target.value as any }))}
                          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                        >
                          <option value="feature">Feature (Purple)</option>
                          <option value="info">Info (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="warning">Warning (Yellow)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Duration (Days)</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={formData.announcementDurationDays}
                          onChange={(e) => setFormData(prev => ({ ...prev, announcementDurationDays: parseInt(e.target.value) || 7 }))}
                          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createFeature}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Create Feature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFeature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-time-primary" />
                Edit Feature Flag
              </h2>
              <button onClick={() => { setShowEditModal(false); setEditingFeature(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Same form fields as Create Modal */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Feature Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={clsx(
                        'relative w-14 h-7 rounded-full transition-colors',
                        formData.enabled ? 'bg-green-500' : 'bg-slate-600'
                      )}
                    >
                      <div className={clsx(
                        'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow',
                        formData.enabled ? 'translate-x-8' : 'translate-x-1'
                      )} />
                    </button>
                    <span className="text-sm text-slate-300">
                      {formData.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Rollout: {formData.rolloutPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.rolloutPercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, rolloutPercentage: parseInt(e.target.value) }))}
                    className="w-full accent-time-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target User Segments</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'premium', 'free', 'beta_testers', 'by_country'] as UserSegment[]).map((segment) => (
                    <button
                      key={segment}
                      onClick={() => toggleSegment(segment)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors',
                        formData.userSegments.some(s => s.type === segment)
                          ? 'bg-time-primary/20 text-time-primary border border-time-primary/50'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      )}
                    >
                      {getSegmentIcon(segment)}
                      {segment.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" />
                    Announcement on Enable
                  </label>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, announceOnEnable: !prev.announceOnEnable }))}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors',
                      formData.announceOnEnable ? 'bg-purple-500' : 'bg-slate-600'
                    )}
                  >
                    <div className={clsx(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
                      formData.announceOnEnable ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>

                {formData.announceOnEnable && (
                  <div className="space-y-3 pl-6 border-l-2 border-purple-500/30">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Announcement Title</label>
                      <input
                        type="text"
                        value={formData.announcementTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, announcementTitle: e.target.value }))}
                        placeholder={`New Feature: ${formData.name}`}
                        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Announcement Message</label>
                      <textarea
                        value={formData.announcementMessage}
                        onChange={(e) => setFormData(prev => ({ ...prev, announcementMessage: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Banner Type</label>
                        <select
                          value={formData.announcementBannerType}
                          onChange={(e) => setFormData(prev => ({ ...prev, announcementBannerType: e.target.value as any }))}
                          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                        >
                          <option value="feature">Feature (Purple)</option>
                          <option value="info">Info (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="warning">Warning (Yellow)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Duration (Days)</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={formData.announcementDurationDays}
                          onChange={(e) => setFormData(prev => ({ ...prev, announcementDurationDays: parseInt(e.target.value) || 7 }))}
                          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-time-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => { setShowEditModal(false); setEditingFeature(null); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateFeature}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Feature Flag?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              This action cannot be undone. The feature flag and its history will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteFeature(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Preview Modal */}
      {showAnnouncementPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-time-primary" />
                Announcement Preview
              </h3>
              <button onClick={() => setShowAnnouncementPreview(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {showAnnouncementPreview.announceOnEnable ? (
              <div className={clsx(
                'p-4 rounded-lg border',
                getBannerTypeColor(showAnnouncementPreview.announcementBannerType || 'feature')
              )}>
                <h4 className="font-medium mb-1">
                  {showAnnouncementPreview.announcementTitle || `New Feature: ${showAnnouncementPreview.name}`}
                </h4>
                <p className="text-sm opacity-80">
                  {showAnnouncementPreview.announcementMessage || showAnnouncementPreview.description}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs opacity-60">
                  <Clock className="w-3 h-3" />
                  Visible for {showAnnouncementPreview.announcementDurationDays || 7} days
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">Announcements are disabled for this feature</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 mb-2">Target Segments</h5>
              <div className="flex flex-wrap gap-2">
                {showAnnouncementPreview.userSegments.map((segment, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-slate-700 rounded flex items-center gap-1"
                  >
                    {getSegmentIcon(segment.type)}
                    {segment.type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
