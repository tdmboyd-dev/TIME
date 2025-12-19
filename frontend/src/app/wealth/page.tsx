'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Shield,
  Users,
  TrendingUp,
  Gift,
  FileText,
  MapPin,
  Calculator,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Building,
  Heart,
  Scale,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

interface TrustRecommendation {
  name: string;
  type: string;
  description: string;
  taxSavings: number;
  implementationCost: number;
  score: number;
  benefits: string[];
}

interface Jurisdiction {
  state: string;
  score: number;
  features: string[];
}

interface EstateProjection {
  currentNetWorth: number;
  projectedNetWorth: number;
  estateTaxWithoutPlanning: number;
  estateTaxWithPlanning: number;
  savings: number;
}

export default function WealthPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state
  const [netWorth, setNetWorth] = useState(5000000);
  const [familySize, setFamilySize] = useState(4);
  const [age, setAge] = useState(55);
  const [married, setMarried] = useState(true);
  const [businessOwner, setBusinessOwner] = useState(false);

  // Results
  const [recommendations, setRecommendations] = useState<TrustRecommendation[]>([]);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [projection, setProjection] = useState<EstateProjection | null>(null);
  const [activeTab, setActiveTab] = useState<'trusts' | 'estate' | 'gifting'>('trusts');

  const fetchAnalysis = useCallback(async () => {
    try {
      const [trustRes, jurisdictionRes, projectionRes] = await Promise.all([
        fetch(`${API_BASE}/wealth/trusts/analyze?netWorth=${netWorth}&familySize=${familySize}&businessOwner=${businessOwner}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/wealth/trusts/jurisdictions?assetProtection=true&privacy=true`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/wealth/estate/projection?netWorth=${netWorth}&age=${age}&married=${married}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (trustRes.ok) {
        const trustData = await trustRes.json();
        if (trustData.success) {
          setRecommendations(trustData.data.recommendations || []);
          setIsConnected(true);
        }
      }

      if (jurisdictionRes.ok) {
        const jurisdictionData = await jurisdictionRes.json();
        if (jurisdictionData.success) {
          setJurisdiction(jurisdictionData.data);
        }
      }

      if (projectionRes.ok) {
        const projectionData = await projectionRes.json();
        if (projectionData.success) {
          setProjection(projectionData.data);
        }
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [netWorth, familySize, age, married, businessOwner]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalysis();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const trustTypes = [
    { name: 'Dynasty Trust', icon: Building, description: 'Multi-generational wealth transfer' },
    { name: 'GRAT', icon: TrendingUp, description: 'Grantor Retained Annuity Trust' },
    { name: 'ILIT', icon: Heart, description: 'Irrevocable Life Insurance Trust' },
    { name: 'SLAT', icon: Users, description: 'Spousal Lifetime Access Trust' },
    { name: 'FLP', icon: Scale, description: 'Family Limited Partnership' },
    { name: 'CLAT', icon: Gift, description: 'Charitable Lead Annuity Trust' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Landmark className="w-8 h-8 text-amber-400" />
                Wealth Management
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
              Dynasty Trusts, Estate Planning & Multi-Generational Wealth Transfer
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

        {/* Configuration Panel */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            Your Wealth Profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Net Worth</label>
              <select
                value={netWorth}
                onChange={(e) => setNetWorth(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value={1000000}>$1M</option>
                <option value={5000000}>$5M</option>
                <option value={10000000}>$10M</option>
                <option value={25000000}>$25M</option>
                <option value={50000000}>$50M+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Family Size</label>
              <select
                value={familySize}
                onChange={(e) => setFamilySize(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} members</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Married</label>
              <select
                value={married ? 'yes' : 'no'}
                onChange={(e) => setMarried(e.target.value === 'yes')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Business Owner</label>
              <select
                value={businessOwner ? 'yes' : 'no'}
                onChange={(e) => setBusinessOwner(e.target.value === 'yes')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'trusts', label: 'Trust Strategies', icon: Shield },
            { id: 'estate', label: 'Estate Projection', icon: TrendingUp },
            { id: 'gifting', label: 'Gifting Strategies', icon: Gift },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : (
          <>
            {/* Trust Strategies Tab */}
            {activeTab === 'trusts' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trust Types Overview */}
                <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold">Recommended Trust Structures</h2>
                  </div>
                  {recommendations.length === 0 ? (
                    <div className="p-12 text-center">
                      <Shield className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400">No Recommendations Yet</h3>
                      <p className="text-gray-500 mt-2">Adjust your profile to get personalized trust recommendations</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {recommendations.slice(0, 5).map((rec, idx) => (
                        <div key={idx} className="p-6 hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{rec.name}</h3>
                              <p className="text-gray-400 text-sm mt-1">{rec.description}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {rec.benefits?.slice(0, 3).map((b, i) => (
                                  <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">
                                {formatCurrency(rec.taxSavings)}
                              </div>
                              <div className="text-xs text-gray-500">Tax Savings</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Jurisdiction Recommendation */}
                <div className="space-y-6">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      Optimal Jurisdiction
                    </h3>
                    {jurisdiction ? (
                      <div>
                        <div className="text-2xl font-bold text-amber-400 mb-2">
                          {jurisdiction.state}
                        </div>
                        <div className="text-sm text-gray-400 mb-4">
                          Trust-friendly state with strong asset protection
                        </div>
                        <div className="space-y-2">
                          {jurisdiction.features?.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                              <ChevronRight className="w-4 h-4 text-green-400" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Select preferences to see recommendation</p>
                    )}
                  </div>

                  {/* Trust Types Quick Reference */}
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="font-bold mb-4">Trust Types</h3>
                    <div className="space-y-3">
                      {trustTypes.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50">
                          <t.icon className="w-5 h-5 text-amber-400" />
                          <div>
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-gray-500">{t.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Estate Projection Tab */}
            {activeTab === 'estate' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-6">Estate Tax Projection</h2>
                  {projection ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-800 rounded-lg">
                          <div className="text-sm text-gray-400">Current Net Worth</div>
                          <div className="text-2xl font-bold">{formatCurrency(projection.currentNetWorth)}</div>
                        </div>
                        <div className="p-4 bg-gray-800 rounded-lg">
                          <div className="text-sm text-gray-400">Projected (20 yrs)</div>
                          <div className="text-2xl font-bold text-blue-400">{formatCurrency(projection.projectedNetWorth)}</div>
                        </div>
                      </div>
                      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="text-sm text-red-400">Estate Tax Without Planning</div>
                        <div className="text-2xl font-bold text-red-400">{formatCurrency(projection.estateTaxWithoutPlanning)}</div>
                      </div>
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="text-sm text-green-400">Estate Tax With Planning</div>
                        <div className="text-2xl font-bold text-green-400">{formatCurrency(projection.estateTaxWithPlanning)}</div>
                      </div>
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="text-sm text-amber-400">Potential Savings</div>
                        <div className="text-3xl font-bold text-amber-400">{formatCurrency(projection.savings)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calculator className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-500">No projection data available</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-6">2025 Estate Tax Rules</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-400">Federal Exemption (2025)</div>
                      <div className="text-2xl font-bold">$13.99M</div>
                      <div className="text-xs text-gray-500 mt-1">Per person ($27.98M for married couples)</div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-400">Annual Gift Exclusion</div>
                      <div className="text-2xl font-bold">$19,000</div>
                      <div className="text-xs text-gray-500 mt-1">Per recipient, per year</div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-400">Top Estate Tax Rate</div>
                      <div className="text-2xl font-bold text-red-400">40%</div>
                      <div className="text-xs text-gray-500 mt-1">On amounts above exemption</div>
                    </div>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="text-sm text-amber-400">Warning: Sunset Provision</div>
                      <div className="text-sm text-gray-300 mt-1">
                        Exemption drops to ~$7M in 2026 unless extended by Congress
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gifting Strategies Tab */}
            {activeTab === 'gifting' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-6">Annual Gifting Strategy</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Annual Exclusion Gifts</span>
                        <span className="font-bold">{formatCurrency(19000 * familySize)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        $19,000 × {familySize} family members
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">5-Year Gift Potential</span>
                        <span className="font-bold text-green-400">{formatCurrency(19000 * familySize * 5)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Tax-free wealth transfer over 5 years
                      </div>
                    </div>
                    {married && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-amber-400">With Gift Splitting</span>
                          <span className="font-bold text-amber-400">{formatCurrency(38000 * familySize * 5)}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Married couples can combine exclusions
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-xl font-bold mb-6">Educational & Medical Gifts</h2>
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                    <div className="font-bold text-green-400 mb-2">Unlimited & Tax-Free</div>
                    <p className="text-sm text-gray-300">
                      Payments made directly to educational institutions or medical providers
                      are not subject to gift tax limits.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium">529 Plan Contributions</div>
                        <div className="text-xs text-gray-500">5-year gift election available</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium">Direct Tuition Payments</div>
                        <div className="text-xs text-gray-500">No limit, must be paid directly</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <Heart className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium">Medical Expense Payments</div>
                        <div className="text-xs text-gray-500">Pay directly to provider</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
