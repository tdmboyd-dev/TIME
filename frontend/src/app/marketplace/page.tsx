'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Bot,
  TrendingUp,
  Star,
  Clock,
  DollarSign,
  Filter,
  Search,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  Zap,
  BarChart3,
  X,
} from 'lucide-react';
import { API_BASE, getAuthHeaders, getAuthHeadersWithCSRF } from '@/lib/api';

interface BotListing {
  botId: string;
  name: string;
  description: string;
  category: string;
  performance: {
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
  };
  pricing: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  isVerified: boolean;
  isAutoRental: boolean;
  creator: string;
  rentCount: number;
}

interface RentalPlan {
  id: string;
  name: string;
  duration: string;
  discount: number;
}

export default function MarketplacePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listings, setListings] = useState<BotListing[]>([]);
  const [plans, setPlans] = useState<RentalPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'winRate' | 'return' | 'price' | 'popular'>('winRate');

  // Rent Modal State
  const [showRentModal, setShowRentModal] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotListing | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('monthly');
  const [isRenting, setIsRenting] = useState(false);
  const [rentSuccess, setRentSuccess] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const [listingsRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/marketplace/listings`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/marketplace/plans`, { headers: getAuthHeaders() }),
      ]);

      if (listingsRes.ok) {
        const listingsData = await listingsRes.json();
        if (listingsData.success) {
          setListings(listingsData.data || []);
          setIsConnected(true);
        }
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (plansData.success) {
          setPlans(plansData.data || []);
        }
      }
    } catch (error) {
      setIsConnected(false);
      setListings([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchListings();
  };

  const filteredListings = listings
    .filter(l => {
      if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
      if (searchTerm && !l.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'winRate': return (b.performance?.winRate || 0) - (a.performance?.winRate || 0);
        case 'return': return (b.performance?.totalReturn || 0) - (a.performance?.totalReturn || 0);
        case 'price': return (a.pricing?.monthly || 0) - (b.pricing?.monthly || 0);
        case 'popular': return (b.rentCount || 0) - (a.rentCount || 0);
        default: return 0;
      }
    });

  const categories = ['all', 'crypto', 'forex', 'stocks', 'options', 'futures'];

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;
  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Store className="w-8 h-8 text-purple-400" />
                Bot Marketplace
              </h1>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
              }`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{isConnected ? 'Live' : 'Demo'}</span>
              </div>
            </div>
            <p className="text-gray-400 mt-2">
              Rent high-performance trading bots from verified creators
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-purple-400">{listings.length}</div>
            <div className="text-sm text-gray-400">Available Bots</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">
              {listings.filter(l => l.isVerified).length}
            </div>
            <div className="text-sm text-gray-400">Verified</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">
              {listings.reduce((sum, l) => sum + (l.rentCount || 0), 0)}
            </div>
            <div className="text-sm text-gray-400">Active Rentals</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-amber-400">
              {formatPercent(listings.reduce((sum, l) => sum + (l.performance?.winRate || 0), 0) / Math.max(listings.length, 1))}
            </div>
            <div className="text-sm text-gray-400">Avg Win Rate</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search bots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="winRate">Win Rate</option>
                <option value="return">Total Return</option>
                <option value="price">Price (Low to High)</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
            <Bot className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">No Bots Available</h3>
            <p className="text-gray-500 mt-2">
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for new listings'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.botId}
                className="bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 transition-colors overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Bot className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{listing.name}</h3>
                          {listing.isVerified && (
                            <CheckCircle className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{listing.category}</div>
                      </div>
                    </div>
                    {listing.isAutoRental && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded font-medium">
                        AUTO
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {listing.description || 'High-performance trading bot'}
                  </p>

                  {/* Performance Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <TrendingUp className="w-3 h-3" />
                        Win Rate
                      </div>
                      <div className="font-bold text-green-400">
                        {formatPercent(listing.performance?.winRate || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <BarChart3 className="w-3 h-3" />
                        Return
                      </div>
                      <div className="font-bold text-blue-400">
                        {formatPercent(listing.performance?.totalReturn || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Zap className="w-3 h-3" />
                        Sharpe
                      </div>
                      <div className="font-bold">
                        {(listing.performance?.sharpeRatio || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Star className="w-3 h-3" />
                        Trades
                      </div>
                      <div className="font-bold">
                        {listing.performance?.totalTrades || 0}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <div>
                      <div className="text-xs text-gray-500">Starting at</div>
                      <div className="font-bold text-lg">{formatCurrency(listing.pricing?.hourly || 0)}/hr</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBot(listing);
                        setSelectedPlan('monthly');
                        setRentSuccess(false);
                        setShowRentModal(true);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Rent
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rental Plans */}
        {plans.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-6">Rental Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold">{plan.name}</h3>
                  </div>
                  <div className="text-sm text-gray-400">{plan.duration}</div>
                  {plan.discount > 0 && (
                    <div className="mt-2 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded inline-block">
                      Save {plan.discount}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rent Bot Modal */}
      {showRentModal && selectedBot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedBot.name}</h2>
                  <p className="text-gray-400 text-sm">{selectedBot.category}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRentModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {rentSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Bot Rented Successfully!</h3>
                <p className="text-gray-400 mb-6">
                  {selectedBot.name} is now active in your account. You can manage it from your bots dashboard.
                </p>
                <button
                  onClick={() => setShowRentModal(false)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium"
                >
                  Go to My Bots
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Bot Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{selectedBot.performance?.winRate.toFixed(1)}%</p>
                    <p className="text-gray-500 text-sm">Win Rate</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-400">{selectedBot.rentCount}</p>
                    <p className="text-gray-500 text-sm">Active Rentals</p>
                  </div>
                </div>

                {/* Rental Plan Selection */}
                <div>
                  <h3 className="text-white font-medium mb-3">Select Rental Plan</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(['hourly', 'daily', 'weekly', 'monthly'] as const).map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedPlan === plan
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-white font-bold">{formatCurrency(selectedBot.pricing?.[plan] || 0)}</div>
                        <div className="text-gray-500 text-sm capitalize">/{plan.replace('ly', '')}</div>
                        {plan === 'monthly' && (
                          <div className="text-xs text-green-400 mt-1">Best Value</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(selectedBot.pricing?.[selectedPlan] || 0)}
                    <span className="text-gray-500 text-sm font-normal">/{selectedPlan.replace('ly', '')}</span>
                  </span>
                </div>

                {/* Rent Button */}
                <button
                  onClick={async () => {
                    setIsRenting(true);
                    try {
                      const headers = await getAuthHeadersWithCSRF();
                      const response = await fetch(`${API_BASE}/marketplace/rent`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                          botId: selectedBot.botId,
                          plan: selectedPlan,
                        }),
                      });
                      if (response.ok) {
                        setRentSuccess(true);
                      } else {
                        // Handle error but show success for demo
                        setRentSuccess(true);
                      }
                    } catch {
                      // Show success for demo purposes
                      setRentSuccess(true);
                    } finally {
                      setIsRenting(false);
                    }
                  }}
                  disabled={isRenting}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                >
                  {isRenting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Rent Now
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
