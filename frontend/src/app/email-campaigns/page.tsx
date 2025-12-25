'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Plus,
  Play,
  Pause,
  Trash2,
  BarChart3,
  Users,
  MousePointer,
  Eye,
  TrendingUp,
  Send,
  RefreshCw,
  Settings,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

/**
 * Email Campaign Management Page (ADMIN ONLY)
 *
 * Features:
 * - Create/edit campaigns
 * - View campaign analytics
 * - Manage subscribers
 * - Preview emails
 * - Install pre-built templates
 * - Track opens, clicks, conversions
 * - A/B testing support
 */

import { API_BASE, getTokenFromCookie } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  emails: CampaignEmail[];
  createdAt: string;
  updatedAt: string;
}

interface CampaignEmail {
  id: string;
  campaignId: string;
  sequenceNumber: number;
  delayDays: number;
  subject: string;
  templateId: string;
  status: string;
}

interface CampaignStats {
  campaignId: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  variantAStats?: VariantStats;
  variantBStats?: VariantStats;
}

interface VariantStats {
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  emails: CampaignEmail[];
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export default function EmailCampaignsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getCookie('time_auth_token');
        if (!token) {
          router.push('/login?redirect=/email-campaigns');
          return;
        }

        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });

        if (!res.ok) {
          router.push('/login?redirect=/email-campaigns');
          return;
        }

        const data = await res.json();
        const userRole = data.user?.role;

        if (userRole !== 'admin' && userRole !== 'owner') {
          router.push('/dashboard?error=unauthorized');
          return;
        }

        setIsAuthorized(true);
        await loadData();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login?redirect=/email-campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadData = async () => {
    try {
      const token = getTokenFromCookie();
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load campaigns and templates
      const [campaignsRes, templatesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/campaigns`, { headers }),
        fetch(`${API_BASE}/api/v1/campaigns/templates/all`, { headers })
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const token = getTokenFromCookie();
      const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Campaign paused' });
        await loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      const token = getTokenFromCookie();
      const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Campaign resumed' });
        await loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
      return;
    }

    try {
      const token = getTokenFromCookie();
      const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Campaign deleted' });
        await loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleViewStats = async (campaign: Campaign) => {
    try {
      const token = getTokenFromCookie();
      const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaign.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        setSelectedCampaign(campaign);
        setCampaignStats(data.stats);
        setShowStatsModal(true);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleInstallTemplate = async (templateType: string) => {
    try {
      const token = getTokenFromCookie();
      const res = await fetch(`${API_BASE}/api/v1/campaigns/templates/install`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateType })
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Template "${templateType}" installed!` });
        setShowTemplatesModal(false);
        await loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading email campaigns...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl">Access Denied</p>
          <p className="text-gray-400 mt-2">Admin privileges required</p>
        </div>
      </div>
    );
  }

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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">Email Campaigns</h1>
            </div>
            <p className="text-gray-400">Automated drip campaigns with A/B testing and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 bg-slate-800/50 rounded-lg border border-white/5 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white/60 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Templates
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-6 h-6 text-purple-400" />
            <span className="text-white/60 text-sm">Total Campaigns</span>
          </div>
          <div className="text-3xl font-bold text-white">{campaigns.length}</div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-6 h-6 text-emerald-400" />
            <span className="text-white/60 text-sm">Active</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {campaigns.filter(c => c.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Pause className="w-6 h-6 text-amber-400" />
            <span className="text-white/60 text-sm">Paused</span>
          </div>
          <div className="text-3xl font-bold text-amber-400">
            {campaigns.filter(c => c.status === 'PAUSED').length}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-6 h-6 text-gray-400" />
            <span className="text-white/60 text-sm">Draft</span>
          </div>
          <div className="text-3xl font-bold text-gray-400">
            {campaigns.filter(c => c.status === 'DRAFT').length}
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">All Campaigns</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 mb-2">No campaigns yet</p>
            <p className="text-white/20 text-sm">Create your first campaign or install a template</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        campaign.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                        campaign.status === 'PAUSED' ? 'bg-amber-500/20 text-amber-400' :
                        campaign.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {campaign.status}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        {campaign.type.replace('_', ' ')}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-white/60 text-sm mb-3">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-white/40">
                      <span>{campaign.emails.length} emails</span>
                      <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewStats(campaign)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="View Stats"
                    >
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                    </button>
                    {campaign.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handlePauseCampaign(campaign.id)}
                        className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"
                        title="Pause Campaign"
                      >
                        <Pause className="w-5 h-5 text-amber-400" />
                      </button>
                    ) : campaign.status === 'PAUSED' ? (
                      <button
                        onClick={() => handleResumeCampaign(campaign.id)}
                        className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors"
                        title="Resume Campaign"
                      >
                        <Play className="w-5 h-5 text-emerald-400" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {showStatsModal && selectedCampaign && campaignStats && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedCampaign.name}</h2>
                <p className="text-white/40 text-sm">Campaign Analytics</p>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 text-white/60 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Send className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{campaignStats.totalSent.toLocaleString()}</p>
                  <p className="text-white/40 text-sm">Sent</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Eye className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-400">{campaignStats.openRate.toFixed(1)}%</p>
                  <p className="text-white/40 text-sm">Open Rate</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <MousePointer className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-400">{campaignStats.clickRate.toFixed(1)}%</p>
                  <p className="text-white/40 text-sm">Click Rate</p>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Total Opened</p>
                  <p className="text-2xl font-bold text-white">{campaignStats.totalOpened.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Total Clicked</p>
                  <p className="text-2xl font-bold text-white">{campaignStats.totalClicked.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Bounced</p>
                  <p className="text-2xl font-bold text-red-400">{campaignStats.totalBounced.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Unsubscribed</p>
                  <p className="text-2xl font-bold text-amber-400">{campaignStats.totalUnsubscribed.toLocaleString()}</p>
                </div>
              </div>

              {/* A/B Test Results */}
              {campaignStats.variantAStats && campaignStats.variantBStats && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">A/B Test Results</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border-2 border-cyan-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">Variant A</h4>
                        {campaignStats.variantAStats.openRate > campaignStats.variantBStats.openRate && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">WINNER</span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Sent</span>
                          <span className="text-white">{campaignStats.variantAStats.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Open Rate</span>
                          <span className="text-emerald-400">{campaignStats.variantAStats.openRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Click Rate</span>
                          <span className="text-purple-400">{campaignStats.variantAStats.clickRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border-2 border-purple-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">Variant B</h4>
                        {campaignStats.variantBStats.openRate > campaignStats.variantAStats.openRate && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">WINNER</span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Sent</span>
                          <span className="text-white">{campaignStats.variantBStats.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Open Rate</span>
                          <span className="text-emerald-400">{campaignStats.variantBStats.openRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Click Rate</span>
                          <span className="text-purple-400">{campaignStats.variantBStats.clickRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Campaign Templates</h2>
                <p className="text-white/40 text-sm">Pre-built email sequences ready to use</p>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 text-white/60 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
                      <p className="text-white/60 text-sm mb-2">{template.description}</p>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span>{template.emails.length} emails</span>
                        <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs font-medium">
                          {template.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInstallTemplate(template.type)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Install
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal (Basic - can be expanded) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Create Campaign</h2>
                <p className="text-white/40 text-sm">Build a custom email campaign</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 text-white/60 rotate-45" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <p className="text-white/60 mb-2">Custom campaign builder coming soon!</p>
                <p className="text-white/40 text-sm">For now, please install a template and customize it.</p>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowTemplatesModal(true);
                  }}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Browse Templates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
