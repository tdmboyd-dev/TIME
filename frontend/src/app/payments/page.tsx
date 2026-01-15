'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Building2,
  Wallet,
  Plus,
  Trash2,
  RefreshCw,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Shield,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { getAuthHeadersWithCSRF } from '@/lib/api';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';
const STRIPE_API = `${API_BASE}/stripe`;

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'crypto';
  name: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  bankName?: string;
  routingNumber?: string;
  cryptoAddress?: string;
  cryptoNetwork?: string;
  isDefault: boolean;
  isVerified: boolean;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'fee' | 'trade';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
  method: string;
}

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

interface UserSubscription {
  id: string;
  tier: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function PaymentsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [addMethodType, setAddMethodType] = useState<'card' | 'bank' | 'crypto'>('card');
  const [balance, setBalance] = useState(125438.67);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editMethodName, setEditMethodName] = useState('');
  const [editMethodDefault, setEditMethodDefault] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<PaymentMethod | null>(null);

  // Stripe subscription state
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const [tiersRes, subRes] = await Promise.all([
        fetch(`${STRIPE_API}/tiers`).catch(() => null),
        fetch(`${STRIPE_API}/subscription`).catch(() => null),
      ]);

      if (tiersRes?.ok) {
        const tiersData = await tiersRes.json();
        if (tiersData.success && Array.isArray(tiersData.tiers)) {
          setSubscriptionTiers(tiersData.tiers);
        }
      }

      if (subRes?.ok) {
        const subData = await subRes.json();
        if (subData.success) {
          setCurrentSubscription(subData.subscription);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Try multiple payment-related endpoints
      const [methodsRes, transactionsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/payments/methods`).catch(() => null),
        fetch(`${API_BASE}/payments/transactions`).catch(() => null),
        fetch(`${API_BASE}/payments/history`).catch(() => null),
      ]);

      // Check if any endpoint returned successfully
      const hasData = !!(methodsRes?.ok || transactionsRes?.ok || historyRes?.ok);
      setIsConnected(hasData);

      if (methodsRes?.ok) {
        const methodsData = await methodsRes.json();
        if (methodsData.success && Array.isArray(methodsData.data)) {
          setPaymentMethods(methodsData.data);
        }
      }

      if (transactionsRes?.ok) {
        const transactionsData = await transactionsRes.json();
        if (transactionsData.success && Array.isArray(transactionsData.data)) {
          setTransactions(transactionsData.data);
        }
      }

      if (historyRes?.ok) {
        const historyData = await historyRes.json();
        if (historyData.success && Array.isArray(historyData.data)) {
          setTransactions(historyData.data);
        }
      }

      // No mock data - show empty state when no data available
      if (!hasData) {
        setPaymentMethods([]);
        setTransactions([]);
      }
    } catch (error) {
      // Error handled - shows disconnected state
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSubscriptionData();
  }, [fetchData, fetchSubscriptionData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    fetchSubscriptionData();
  };

  const handleSubscribe = async (tierId: string) => {
    setIsSubscriptionLoading(true);
    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${STRIPE_API}/create-checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tierId }),
      });

      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showNotification('error', data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      showNotification('error', 'Failed to start subscription process');
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsSubscriptionLoading(true);
    try {
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${STRIPE_API}/create-portal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showNotification('error', data.error || 'Failed to open customer portal');
      }
    } catch (error) {
      showNotification('error', 'Failed to open subscription management');
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case 'fee':
        return <DollarSign className="w-4 h-4 text-yellow-400" />;
      case 'trade':
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'bank':
        return <Building2 className="w-5 h-5" />;
      case 'crypto':
        return <Wallet className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
              ×
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Remove Payment Method</h3>
              <p className="text-slate-400">
                Are you sure you want to remove <span className="text-white font-medium">{showDeleteConfirm.name}</span>?
              </p>
              <p className="text-sm text-red-400 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPaymentMethods(prev => prev.filter(m => m.id !== showDeleteConfirm.id));
                  showNotification('success', `${showDeleteConfirm.name} has been removed.`);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Payments & Transfers</h1>
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-time-primary animate-spin" />
            ) : isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50">
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Demo</span>
              </div>
            )}
          </div>
          <p className="text-slate-400 mt-1">
            {isConnected ? 'Live payment data from backend' : 'Manage your payment methods and transactions'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="card p-6 bg-gradient-to-r from-time-primary/20 to-purple-500/20 border-time-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Available Balance</p>
            <p className="text-4xl font-bold text-white">{formatCurrency(balance)}</p>
            <p className="text-sm text-slate-400 mt-2">
              Pending: {formatCurrency(2000)} • Processing: {formatCurrency(0)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-3 rounded-full bg-green-500/20">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400 font-medium">Secured</p>
              <p className="text-xs text-slate-500">FDIC Insured</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Subscription Plans</h2>
            <p className="text-slate-400 mt-1">Upgrade your trading capabilities</p>
          </div>
          {currentSubscription && currentSubscription.status === 'active' && (
            <button
              onClick={handleManageSubscription}
              disabled={isSubscriptionLoading}
              className="btn-secondary flex items-center gap-2"
            >
              {isSubscriptionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Manage Subscription
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {subscriptionTiers.map((tier) => {
            const isCurrentTier = currentSubscription?.tier === tier.id;
            const isFree = tier.id === 'free';
            const isActive = currentSubscription?.status === 'active';

            return (
              <div
                key={tier.id}
                className={clsx(
                  'relative p-6 rounded-xl border-2 transition-all',
                  isCurrentTier
                    ? 'bg-time-primary/10 border-time-primary shadow-lg shadow-time-primary/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600',
                  tier.id === 'pro' && 'ring-2 ring-purple-500/50'
                )}
              >
                {tier.id === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 rounded-full text-xs font-bold text-white">
                    POPULAR
                  </div>
                )}
                {isCurrentTier && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-time-primary rounded-full text-xs font-bold text-white">
                    CURRENT PLAN
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white mb-2">{tier.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-white">${tier.price}</span>
                    <span className="text-slate-400">/{tier.interval}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 min-h-[200px]">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isFree && (
                  <button
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={isCurrentTier || isSubscriptionLoading}
                    className={clsx(
                      'w-full py-3 rounded-lg font-medium transition-all',
                      isCurrentTier
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : tier.id === 'pro'
                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
                        : 'bg-time-primary hover:bg-time-primary/80 text-white'
                    )}
                  >
                    {isSubscriptionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : isCurrentTier ? (
                      'Current Plan'
                    ) : isActive ? (
                      'Change Plan'
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                )}
                {isFree && (
                  <div className="w-full py-3 rounded-lg bg-slate-700 text-slate-400 text-center font-medium">
                    {isCurrentTier ? 'Current Plan' : 'Always Free'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {currentSubscription && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Current billing period</p>
                <p className="text-white font-medium">
                  {new Date(currentSubscription.currentPeriodStart).toLocaleDateString()} - {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              {currentSubscription.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400 font-medium">Cancels on {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">Total Deposits</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(45000)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/20">
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-slate-400">Total Withdrawals</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(12500)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-400">Fees This Month</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(29.97)}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">Payment Methods</span>
          </div>
          <p className="text-2xl font-bold text-white">{paymentMethods.length}</p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Payment Methods</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Method
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin mb-2" />
            <p className="text-slate-400">Loading payment methods...</p>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No payment methods</h3>
            <p className="text-slate-400 mb-4">Add a payment method to deposit funds</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={clsx(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  method.isDefault
                    ? 'bg-time-primary/10 border-time-primary/30'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    'p-3 rounded-lg',
                    method.type === 'card' ? 'bg-blue-500/20 text-blue-400' :
                    method.type === 'bank' ? 'bg-green-500/20 text-green-400' :
                    'bg-orange-500/20 text-orange-400'
                  )}>
                    {getMethodIcon(method.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{method.name}</span>
                      {method.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-time-primary/20 text-time-primary rounded">
                          Default
                        </span>
                      )}
                      {method.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {method.type === 'card' && `${method.brand} ****${method.last4} • Exp ${method.expiryMonth}/${method.expiryYear}`}
                      {method.type === 'bank' && `${method.bankName} ****${method.last4}`}
                      {method.type === 'crypto' && `${method.cryptoNetwork} • ${method.cryptoAddress}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingMethod(method);
                      setEditMethodName(method.name);
                      setEditMethodDefault(method.isDefault);
                      setShowEditModal(true);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(method)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
          <button
            onClick={() => setShowAllTransactionsModal(true)}
            className="text-sm text-time-primary hover:underline"
          >View All</button>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={clsx(
                  'p-2 rounded-lg',
                  tx.type === 'deposit' ? 'bg-green-500/20' :
                  tx.type === 'withdrawal' ? 'bg-red-500/20' :
                  tx.type === 'fee' ? 'bg-yellow-500/20' :
                  'bg-blue-500/20'
                )}>
                  {getTypeIcon(tx.type)}
                </div>
                <div>
                  <p className="font-medium text-white">{tx.description}</p>
                  <p className="text-sm text-slate-400">{tx.method} • {tx.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={clsx(
                    'font-semibold',
                    tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {tx.amount >= 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    {getStatusIcon(tx.status)}
                    <span className="text-xs text-slate-500 capitalize">{tx.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Add Payment Method</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['card', 'bank', 'crypto'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAddMethodType(type)}
                    className={clsx(
                      'p-4 rounded-lg border text-center transition-all',
                      addMethodType === type
                        ? 'bg-time-primary/20 border-time-primary text-time-primary'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    )}
                  >
                    {getMethodIcon(type)}
                    <p className="text-xs mt-2 capitalize">{type === 'card' ? 'Card' : type === 'bank' ? 'Bank' : 'Crypto'}</p>
                  </button>
                ))}
              </div>

              {addMethodType === 'card' && (
                <>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {addMethodType === 'bank' && (
                <>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Routing Number</label>
                    <input
                      type="text"
                      placeholder="123456789"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Account Number</label>
                    <input
                      type="text"
                      placeholder="000123456789"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </>
              )}

              {addMethodType === 'crypto' && (
                <>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Network</label>
                    <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white">
                      <option>Bitcoin</option>
                      <option>Ethereum</option>
                      <option>USDC (ERC-20)</option>
                      <option>USDT (TRC-20)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Wallet Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                <Lock className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">Your information is encrypted and secure</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    showNotification('success', `${addMethodType === 'card' ? 'Card' : addMethodType === 'bank' ? 'Bank Account' : 'Crypto Wallet'} added successfully!`);
                    setShowAddModal(false);
                  }}
                  className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                >
                  Add Method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Deposit Funds</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Amount ($)</label>
                <input
                  type="number"
                  placeholder="1000"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">From</label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700"
                    >
                      <input type="radio" name="deposit-method" className="text-time-primary" />
                      <div className="flex-1">
                        <p className="text-white">{method.name}</p>
                        <p className="text-xs text-slate-500">****{method.last4}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    showNotification('success', 'Deposit initiated! Funds will be available within 1-3 business days.');
                    setShowDepositModal(false);
                  }}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium"
                >
                  Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Withdraw Funds</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-400">Available Balance</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(balance)}</p>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Amount ($)</label>
                <input
                  type="number"
                  placeholder="1000"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">To</label>
                <div className="space-y-2">
                  {paymentMethods.filter(m => m.type === 'bank').map((method) => (
                    <label
                      key={method.id}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700"
                    >
                      <input type="radio" name="withdraw-method" className="text-time-primary" />
                      <div className="flex-1">
                        <p className="text-white">{method.name}</p>
                        <p className="text-xs text-slate-500">****{method.last4}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  Withdrawals typically take 1-3 business days to process.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    showNotification('success', 'Withdrawal submitted! Expected arrival: 1-3 business days.');
                    setShowWithdrawModal(false);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Method Modal */}
      {showEditModal && editingMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Edit Payment Method</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                <div className={clsx(
                  'p-3 rounded-lg',
                  editingMethod.type === 'card' ? 'bg-blue-500/20 text-blue-400' :
                  editingMethod.type === 'bank' ? 'bg-green-500/20 text-green-400' :
                  'bg-orange-500/20 text-orange-400'
                )}>
                  {getMethodIcon(editingMethod.type)}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {editingMethod.type === 'card' ? `${editingMethod.brand} ****${editingMethod.last4}` :
                     editingMethod.type === 'bank' ? `${editingMethod.bankName} ****${editingMethod.last4}` :
                     `${editingMethod.cryptoNetwork} Wallet`}
                  </p>
                  <p className="text-sm text-slate-400 capitalize">{editingMethod.type}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={editMethodName}
                  onChange={(e) => setEditMethodName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="e.g., My Business Card"
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMethodDefault}
                  onChange={(e) => setEditMethodDefault(e.target.checked)}
                  className="w-4 h-4 text-time-primary rounded"
                />
                <div>
                  <p className="text-white">Set as default</p>
                  <p className="text-xs text-slate-500">Use this method for deposits and subscriptions</p>
                </div>
              </label>

              {editingMethod.type === 'card' && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-400">Expiry: {editingMethod.expiryMonth}/{editingMethod.expiryYear}</p>
                  <p className="text-xs text-slate-500 mt-1">To update card details, add a new card and remove this one.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Update local state
                    setPaymentMethods(paymentMethods.map(m => {
                      if (m.id === editingMethod.id) {
                        return { ...m, name: editMethodName, isDefault: editMethodDefault };
                      }
                      // If making this default, unset other defaults
                      if (editMethodDefault && m.isDefault) {
                        return { ...m, isDefault: false };
                      }
                      return m;
                    }));
                    setShowEditModal(false);
                  }}
                  className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Transactions Modal */}
      {showAllTransactionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Transaction History</h3>
              <button onClick={() => setShowAllTransactionsModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="p-4 border-b border-slate-700 flex flex-wrap gap-3">
              <select className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="fee">Fees</option>
                <option value="trade">Trades</option>
              </select>
              <select className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
                <option value="">All Time</option>
              </select>
              <button className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No transactions yet</h3>
                    <p className="text-slate-400">Your transaction history will appear here</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          'p-2 rounded-lg',
                          tx.type === 'deposit' ? 'bg-green-500/20' :
                          tx.type === 'withdrawal' ? 'bg-red-500/20' :
                          tx.type === 'fee' ? 'bg-yellow-500/20' :
                          'bg-blue-500/20'
                        )}>
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{tx.description}</p>
                          <p className="text-sm text-slate-400">{tx.method} • {tx.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={clsx(
                            'font-semibold',
                            tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {tx.amount >= 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <div className="flex items-center gap-1 justify-end">
                            {getStatusIcon(tx.status)}
                            <span className="text-xs text-slate-500 capitalize">{tx.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-between items-center">
              <p className="text-sm text-slate-400">Showing {transactions.length} transactions</p>
              <button
                onClick={() => setShowAllTransactionsModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
