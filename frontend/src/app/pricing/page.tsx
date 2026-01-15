'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Zap,
  Crown,
  Rocket,
  Building2,
  Bot,
  TrendingUp,
  Shield,
  Star,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Target,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { getAuthHeadersWithCSRF } from '@/lib/api';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';
const STRIPE_API = `${API_BASE}/stripe`;

// ============================================================
// TYPES
// ============================================================

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  limits: {
    bots?: number;
    strategies?: number;
    backtests?: number;
    apiCalls?: number;
    support?: string;
  };
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
}

interface UserSubscription {
  id: string;
  tier: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

// ============================================================
// PRICING DATA (fallback if API unavailable)
// ============================================================

const FALLBACK_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      '3 active bots',
      'Paper trading only',
      'Basic market data',
      'Community support',
      'Add more via Bot Marketplace',
    ],
    limits: { bots: 3, strategies: 3, backtests: 10, apiCalls: 1000, support: 'community' },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19,
    interval: 'month',
    features: [
      '5 active bots',
      '$5,000 max capital',
      'Real trading enabled',
      'Email support',
      'Basic backtesting',
      'Add more via Bot Marketplace',
    ],
    limits: { bots: 5, strategies: 10, backtests: 30, apiCalls: 10000, support: 'email' },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    interval: 'month',
    features: [
      '7 active bots',
      '$25,000 max capital',
      'Priority execution',
      'Priority support',
      'Advanced backtesting',
      'API access',
    ],
    limits: { bots: 7, strategies: 20, backtests: 100, apiCalls: 50000, support: 'priority' },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 109,
    interval: 'month',
    features: [
      '11 Super Bots',
      'Unlimited capital',
      '24/7 priority support',
      'Advanced AI features',
      'Risk management tools',
      'Unlimited backtesting',
    ],
    limits: { bots: 11, strategies: 50, backtests: -1, apiCalls: 200000, support: '24/7-priority' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 450,
    interval: 'month',
    features: [
      'Unlimited bots',
      'Unlimited capital',
      'White-label solution',
      'Dedicated account manager',
      'Custom integrations',
      'On-premise deployment',
      'SLA guarantee',
      'Custom bot development',
    ],
    limits: { bots: -1, strategies: -1, backtests: -1, apiCalls: -1, support: 'dedicated' },
  },
];

const FALLBACK_ADDONS: AddOn[] = [
  {
    id: 'dropbot',
    name: 'DROPBOT AutoPilot',
    price: 39,
    description: 'Zero-config autopilot trading for beginners',
    features: [
      'Set it and forget it trading',
      'AI-powered entry/exit',
      'Automatic risk management',
      'Real-time notifications',
    ],
  },
  {
    id: 'umm',
    name: 'Ultimate Money Machine',
    price: 59,
    description: 'Advanced trading suite with Super Bots',
    features: [
      '25 Super Bots access',
      'Market Attack Strategies',
      'Multi-strategy portfolios',
      'Institutional data feeds',
      'Advanced AI trading',
    ],
  },
];

// ============================================================
// TIER ICONS & COLORS
// ============================================================

const tierConfig: Record<string, { icon: React.ReactNode; color: string; gradient: string }> = {
  free: {
    icon: <Bot className="w-8 h-8" />,
    color: 'text-slate-400',
    gradient: 'from-slate-600 to-slate-800',
  },
  basic: {
    icon: <Zap className="w-8 h-8" />,
    color: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-800',
  },
  pro: {
    icon: <Rocket className="w-8 h-8" />,
    color: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-800',
  },
  premium: {
    icon: <Crown className="w-8 h-8" />,
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-600',
  },
  enterprise: {
    icon: <Building2 className="w-8 h-8" />,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600',
  },
};

// ============================================================
// COMPONENT
// ============================================================

export default function PricingPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>(FALLBACK_TIERS);
  const [addOns, setAddOns] = useState<AddOn[]>(FALLBACK_ADDONS);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [activeAddOns, setActiveAddOns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Check URL params for success/cancel messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      showNotification('success', 'Subscription activated successfully! Welcome aboard.');
    } else if (params.get('canceled') === 'true') {
      showNotification('info', 'Checkout was canceled. No charges were made.');
    } else if (params.get('addon_success') === 'true') {
      showNotification('success', 'Add-on activated successfully!');
    } else if (params.get('addon_canceled') === 'true') {
      showNotification('info', 'Add-on checkout was canceled.');
    }
    // Clean URL
    window.history.replaceState({}, '', '/pricing');
  }, []);

  // Fetch pricing data
  const fetchData = useCallback(async () => {
    try {
      const [tiersRes, addOnsRes, subRes, userAddOnsRes] = await Promise.all([
        fetch(`${STRIPE_API}/tiers`).catch(() => null),
        fetch(`${STRIPE_API}/addons`).catch(() => null),
        fetch(`${STRIPE_API}/subscription`, { credentials: 'include' }).catch(() => null),
        fetch(`${STRIPE_API}/user-addons`, { credentials: 'include' }).catch(() => null),
      ]);

      if (tiersRes?.ok) {
        const data = await tiersRes.json();
        if (data.success && Array.isArray(data.tiers)) {
          setTiers(data.tiers);
        }
      }

      if (addOnsRes?.ok) {
        const data = await addOnsRes.json();
        if (data.success && Array.isArray(data.addOns)) {
          setAddOns(data.addOns);
        }
      }

      if (subRes?.ok) {
        const data = await subRes.json();
        if (data.success && data.subscription) {
          setCurrentSubscription(data.subscription);
        }
      }

      if (userAddOnsRes?.ok) {
        const data = await userAddOnsRes.json();
        if (data.success && Array.isArray(data.addOns)) {
          setActiveAddOns(data.addOns);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle tier subscription
  const handleSubscribe = async (tierId: string) => {
    setIsProcessing(tierId);
    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${STRIPE_API}/create-checkout`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          tierId,
          successUrl: `${window.location.origin}/pricing?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showNotification('error', data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      showNotification('error', 'Failed to start checkout. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle add-on purchase
  const handleAddOnPurchase = async (addOnId: string) => {
    setIsProcessing(`addon-${addOnId}`);
    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${STRIPE_API}/create-addon-checkout`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          addOnId,
          successUrl: `${window.location.origin}/pricing?addon_success=true`,
          cancelUrl: `${window.location.origin}/pricing?addon_canceled=true`,
        }),
      });

      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showNotification('error', data.error || 'Failed to create add-on checkout');
      }
    } catch (error) {
      showNotification('error', 'Failed to start add-on checkout. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle manage subscription
  const handleManageSubscription = async () => {
    setIsProcessing('manage');
    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${STRIPE_API}/create-portal`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showNotification('error', data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      showNotification('error', 'Failed to open billing portal. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-time-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500/90 text-white' :
            notification.type === 'error' ? 'bg-red-500/90 text-white' :
            'bg-blue-500/90 text-white'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <XCircle className="w-5 h-5" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              x
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Choose the plan that fits your trading goals. All plans include core platform access.
          Upgrade or downgrade anytime.
        </p>

        {/* Current Plan Badge */}
        {currentSubscription && (
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 bg-time-primary/20 border border-time-primary/50 rounded-full">
            <span className="text-time-primary font-medium">
              Current Plan: {currentSubscription.tier.charAt(0).toUpperCase() + currentSubscription.tier.slice(1)}
            </span>
            <button
              onClick={handleManageSubscription}
              disabled={isProcessing === 'manage'}
              className="text-sm text-white bg-time-primary hover:bg-time-primary/80 px-3 py-1 rounded-full transition-colors"
            >
              {isProcessing === 'manage' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Manage Billing'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {tiers.map((tier) => {
          const config = tierConfig[tier.id] || tierConfig.free;
          const isCurrentTier = currentSubscription?.tier === tier.id;
          const isFree = tier.id === 'free';
          const isPro = tier.id === 'pro';

          return (
            <div
              key={tier.id}
              className={clsx(
                'relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300',
                isCurrentTier
                  ? 'bg-time-primary/10 border-time-primary shadow-lg shadow-time-primary/20 scale-[1.02]'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:shadow-xl',
                isPro && !isCurrentTier && 'ring-2 ring-purple-500/50'
              )}
            >
              {/* Popular Badge */}
              {isPro && !isCurrentTier && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold text-white shadow-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentTier && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-time-primary rounded-full text-xs font-bold text-white shadow-lg">
                  CURRENT PLAN
                </div>
              )}

              {/* Tier Header */}
              <div className="text-center mb-6">
                <div className={clsx(
                  'inline-flex p-3 rounded-xl mb-4 bg-gradient-to-br',
                  config.gradient
                )}>
                  <div className="text-white">{config.icon}</div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">${tier.price}</span>
                  <span className="text-slate-400">/{tier.interval}</span>
                </div>
                {tier.limits.bots && (
                  <p className={clsx('text-sm mt-2', config.color)}>
                    {tier.limits.bots === -1 ? 'Unlimited' : tier.limits.bots} Bot{tier.limits.bots !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-6 flex-1">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <Check className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.color)} />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {!isFree ? (
                <button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={isCurrentTier || isProcessing === tier.id}
                  className={clsx(
                    'w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
                    isCurrentTier
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isPro
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-purple-500/25'
                      : 'bg-time-primary hover:bg-time-primary/80 text-white'
                  )}
                >
                  {isProcessing === tier.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCurrentTier ? (
                    'Current Plan'
                  ) : currentSubscription ? (
                    <>Change Plan <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Get Started <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl bg-slate-700 text-slate-400 text-center font-semibold">
                  {isCurrentTier ? 'Current Plan' : 'Always Free'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add-Ons Section */}
      <div className="pt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-semibold">Power Add-Ons</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Supercharge Your Trading
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Add these powerful modules to any plan for enhanced capabilities.
            Each add-on is billed separately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {addOns.map((addOn) => {
            const isActive = activeAddOns.includes(addOn.id);
            const isDropbot = addOn.id === 'dropbot';

            return (
              <div
                key={addOn.id}
                className={clsx(
                  'relative p-6 rounded-2xl border-2 transition-all',
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                )}
              >
                {isActive && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-amber-500 rounded-full text-xs font-bold text-white">
                    ACTIVE
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={clsx(
                    'p-3 rounded-xl',
                    isDropbot
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600'
                  )}>
                    {isDropbot ? (
                      <Target className="w-8 h-8 text-white" />
                    ) : (
                      <TrendingUp className="w-8 h-8 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{addOn.name}</h3>
                    <p className="text-slate-400 text-sm mb-4">{addOn.description}</p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-white">+${addOn.price}</span>
                      <span className="text-slate-400">/month</span>
                    </div>

                    <ul className="space-y-2 mb-4">
                      {addOn.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-amber-400" />
                          <span className="text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleAddOnPurchase(addOn.id)}
                      disabled={isActive || isProcessing === `addon-${addOn.id}`}
                      className={clsx(
                        'w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
                        isActive
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                      )}
                    >
                      {isProcessing === `addon-${addOn.id}` ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isActive ? (
                        'Already Active'
                      ) : (
                        <>Add to Plan <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Compare All Plans
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-4 text-slate-400 font-medium">Feature</th>
                {tiers.map((tier) => (
                  <th key={tier.id} className="text-center py-4 px-4">
                    <span className={clsx(
                      'font-bold',
                      tierConfig[tier.id]?.color || 'text-white'
                    )}>
                      {tier.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 px-4 text-slate-300">Active Bots</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-4 px-4 text-white font-medium">
                    {tier.limits.bots === -1 ? 'Unlimited' : tier.limits.bots}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 px-4 text-slate-300">Strategies</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-4 px-4 text-white font-medium">
                    {tier.limits.strategies === -1 ? 'Unlimited' : tier.limits.strategies}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 px-4 text-slate-300">Backtests/Month</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-4 px-4 text-white font-medium">
                    {tier.limits.backtests === -1 ? 'Unlimited' : tier.limits.backtests}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 px-4 text-slate-300">API Calls/Month</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-4 px-4 text-white font-medium">
                    {tier.limits.apiCalls === -1 ? 'Unlimited' : tier.limits.apiCalls?.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 px-4 text-slate-300">Support</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-4 px-4 text-white font-medium capitalize">
                    {tier.limits.support?.replace(/-/g, ' ')}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-4 px-4 text-slate-300">Price</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-4 px-4">
                    <span className="text-xl font-bold text-white">${tier.price}</span>
                    <span className="text-slate-400">/mo</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Can I change my plan anytime?</h3>
            <p className="text-slate-400">
              Yes! You can upgrade or downgrade your plan at any time. When upgrading, you will be
              charged the prorated difference. When downgrading, the credit will be applied to your
              next billing cycle.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Do add-ons work with any plan?</h3>
            <p className="text-slate-400">
              Yes! Add-ons can be added to any subscription tier, including the Free plan.
              They are billed separately from your main subscription.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">What payment methods do you accept?</h3>
            <p className="text-slate-400">
              We accept all major credit cards (Visa, Mastercard, American Express) through our
              secure payment processor, Stripe. Enterprise customers can also pay via invoice.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Is there a free trial?</h3>
            <p className="text-slate-400">
              Our Free tier gives you access to the platform with 1 bot forever. This lets you
              experience the platform before committing to a paid plan. No credit card required.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="pt-8">
        <div className="bg-gradient-to-r from-time-primary/20 to-purple-500/20 rounded-2xl p-8 border border-time-primary/30 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Beat the Market?
          </h2>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Join thousands of traders using TIME BEYOND US to automate their trading strategies.
            Start for free and upgrade when you are ready.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-time-primary hover:bg-time-primary/80 text-white font-semibold rounded-xl transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/support"
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
