'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Building2,
  Gem,
  Palette,
  BarChart3,
  Percent,
  DollarSign,
  Clock,
  Shield,
  Star,
  ChevronRight,
  Info,
  Lock,
  Users,
  Globe,
  Zap,
  CheckCircle,
  Loader2,
  X,
  RefreshCw,
  Activity
} from 'lucide-react';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

type InvestCategory = 'all' | 'stocks' | 'real-estate' | 'commodities' | 'art' | 'etfs' | 'high-yield';

interface TokenizedAsset {
  id: string;
  symbol: string;
  name: string;
  category: InvestCategory;
  price: number;
  change: number;
  changePercent: number;
  minInvestment: number;
  totalValue: number;
  investors: number;
  apy?: number;
  description: string;
  features: string[];
  risk: 'low' | 'medium' | 'high';
  liquidity: 'high' | 'medium' | 'low';
  image?: string;
}

const categories = [
  { id: 'all', label: 'All Assets', icon: Globe },
  { id: 'stocks', label: 'Stocks', icon: TrendingUp },
  { id: 'real-estate', label: 'Real Estate', icon: Building2 },
  { id: 'commodities', label: 'Commodities', icon: Gem },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'etfs', label: 'ETFs', icon: BarChart3 },
  { id: 'high-yield', label: 'High Yield', icon: Percent },
];

const tokenizedAssets: TokenizedAsset[] = [
  // Stocks
  {
    id: '1',
    symbol: 'tTSLA',
    name: 'Tokenized Tesla',
    category: 'stocks',
    price: 248.50,
    change: 5.80,
    changePercent: 2.39,
    minInvestment: 10,
    totalValue: 125000000,
    investors: 45230,
    description: 'Fractional ownership of Tesla Inc. (TSLA) stock through tokenization',
    features: ['24/7 Trading', 'No Minimum Shares', 'Instant Settlement', 'Dividend Pass-through'],
    risk: 'high',
    liquidity: 'high',
  },
  {
    id: '2',
    symbol: 'tAAPL',
    name: 'Tokenized Apple',
    category: 'stocks',
    price: 178.52,
    change: 2.34,
    changePercent: 1.33,
    minInvestment: 10,
    totalValue: 285000000,
    investors: 89450,
    description: 'Fractional ownership of Apple Inc. (AAPL) stock through tokenization',
    features: ['24/7 Trading', 'Dividend Distribution', 'Real-time Pricing', 'SEC Compliant'],
    risk: 'medium',
    liquidity: 'high',
  },
  {
    id: '3',
    symbol: 'tNVDA',
    name: 'Tokenized NVIDIA',
    category: 'stocks',
    price: 495.22,
    change: 12.45,
    changePercent: 2.58,
    minInvestment: 25,
    totalValue: 98000000,
    investors: 32100,
    description: 'Fractional ownership of NVIDIA Corp. (NVDA) stock',
    features: ['AI Growth Exposure', '24/7 Trading', 'Fractional Shares', 'Instant Settlement'],
    risk: 'high',
    liquidity: 'high',
  },

  // Real Estate
  {
    id: '4',
    symbol: 'MIAMI-APT',
    name: 'Miami Luxury Apartments',
    category: 'real-estate',
    price: 125.00,
    change: 0.85,
    changePercent: 0.68,
    minInvestment: 100,
    totalValue: 45000000,
    investors: 12800,
    apy: 8.5,
    description: 'Tokenized ownership in prime Miami Beach luxury apartment complex',
    features: ['Monthly Rental Income', 'Property Appreciation', 'Professional Management', 'Quarterly Distributions'],
    risk: 'medium',
    liquidity: 'medium',
  },
  {
    id: '5',
    symbol: 'NYC-COMM',
    name: 'NYC Commercial Tower',
    category: 'real-estate',
    price: 250.00,
    change: 1.25,
    changePercent: 0.50,
    minInvestment: 250,
    totalValue: 120000000,
    investors: 8500,
    apy: 6.2,
    description: 'Class A office building in Manhattan financial district',
    features: ['Trophy Asset', 'Long-term Leases', 'Blue-chip Tenants', 'Stable Income'],
    risk: 'low',
    liquidity: 'low',
  },
  {
    id: '6',
    symbol: 'DUBAI-RES',
    name: 'Dubai Marina Residences',
    category: 'real-estate',
    price: 85.00,
    change: 2.10,
    changePercent: 2.53,
    minInvestment: 50,
    totalValue: 32000000,
    investors: 15200,
    apy: 9.8,
    description: 'Luxury waterfront residential complex in Dubai Marina',
    features: ['High Rental Yields', 'Capital Appreciation', 'Tax-Free Income', 'Premium Location'],
    risk: 'medium',
    liquidity: 'medium',
  },

  // Commodities
  {
    id: '7',
    symbol: 'PAXG',
    name: 'PAX Gold',
    category: 'commodities',
    price: 2024.50,
    change: 8.30,
    changePercent: 0.41,
    minInvestment: 50,
    totalValue: 520000000,
    investors: 156000,
    description: 'Each token represents one fine troy ounce of London Good Delivery gold',
    features: ['Physical Gold Backed', 'Redeemable', 'Regulated', 'Instant Transfer'],
    risk: 'low',
    liquidity: 'high',
  },
  {
    id: '8',
    symbol: 'tSILVER',
    name: 'Tokenized Silver',
    category: 'commodities',
    price: 23.45,
    change: 0.32,
    changePercent: 1.38,
    minInvestment: 25,
    totalValue: 85000000,
    investors: 42000,
    description: 'Physical silver-backed token with full redemption rights',
    features: ['Industrial Demand', 'Inflation Hedge', 'Physical Backing', 'Low Entry'],
    risk: 'medium',
    liquidity: 'high',
  },
  {
    id: '9',
    symbol: 'tOIL',
    name: 'Crude Oil Token',
    category: 'commodities',
    price: 78.50,
    change: -1.20,
    changePercent: -1.51,
    minInvestment: 100,
    totalValue: 65000000,
    investors: 18500,
    description: 'Exposure to WTI crude oil futures without physical delivery',
    features: ['Energy Exposure', 'Daily Settlement', 'No Storage Costs', 'Leverage Available'],
    risk: 'high',
    liquidity: 'high',
  },

  // Art
  {
    id: '10',
    symbol: 'BANKSY-01',
    name: 'Banksy "Love is in the Bin"',
    category: 'art',
    price: 450.00,
    change: 12.50,
    changePercent: 2.86,
    minInvestment: 100,
    totalValue: 18500000,
    investors: 4200,
    description: 'Fractional ownership of the iconic self-shredding Banksy artwork',
    features: ['Blue-chip Art', 'Secure Storage', 'Insurance Included', 'Exhibition Revenue'],
    risk: 'medium',
    liquidity: 'low',
  },
  {
    id: '11',
    symbol: 'WARHOL-02',
    name: 'Warhol "Marilyn"',
    category: 'art',
    price: 850.00,
    change: 25.00,
    changePercent: 3.03,
    minInvestment: 250,
    totalValue: 42000000,
    investors: 2800,
    description: 'Fractional ownership of Andy Warhol\'s iconic Marilyn Monroe print',
    features: ['Museum Quality', 'Authenticated', 'Climate Controlled', 'Provenance Verified'],
    risk: 'medium',
    liquidity: 'low',
  },
  {
    id: '12',
    symbol: 'BEEPLE-NFT',
    name: 'Beeple Digital Collection',
    category: 'art',
    price: 125.00,
    change: -5.00,
    changePercent: -3.85,
    minInvestment: 50,
    totalValue: 8500000,
    investors: 6800,
    description: 'Curated collection of Beeple digital artworks',
    features: ['Digital Art Pioneer', 'NFT Backed', 'Metaverse Display', 'Community Access'],
    risk: 'high',
    liquidity: 'medium',
  },

  // ETFs
  {
    id: '13',
    symbol: 'tSPY',
    name: 'Tokenized S&P 500',
    category: 'etfs',
    price: 478.92,
    change: 2.15,
    changePercent: 0.45,
    minInvestment: 10,
    totalValue: 450000000,
    investors: 125000,
    description: 'Tokenized exposure to the S&P 500 index through SPY ETF',
    features: ['Broad Market Exposure', '500 Companies', 'Low Fees', 'Dividend Reinvestment'],
    risk: 'medium',
    liquidity: 'high',
  },
  {
    id: '14',
    symbol: 'tQQQ',
    name: 'Tokenized NASDAQ 100',
    category: 'etfs',
    price: 425.80,
    change: 5.60,
    changePercent: 1.33,
    minInvestment: 10,
    totalValue: 280000000,
    investors: 89000,
    description: 'Tokenized exposure to the NASDAQ 100 tech-heavy index',
    features: ['Tech Exposure', 'Growth Focus', '24/7 Trading', 'Instant Settlement'],
    risk: 'medium',
    liquidity: 'high',
  },
  {
    id: '15',
    symbol: 'tGLD',
    name: 'Tokenized Gold ETF',
    category: 'etfs',
    price: 185.20,
    change: 0.75,
    changePercent: 0.41,
    minInvestment: 25,
    totalValue: 180000000,
    investors: 67000,
    description: 'Tokenized shares of GLD gold ETF for precious metals exposure',
    features: ['Gold Exposure', 'ETF Structure', 'High Liquidity', 'Safe Haven'],
    risk: 'low',
    liquidity: 'high',
  },

  // High Yield
  {
    id: '16',
    symbol: 'YIELD-USD',
    name: 'USD Yield Vault',
    category: 'high-yield',
    price: 1.00,
    change: 0,
    changePercent: 0,
    minInvestment: 100,
    totalValue: 85000000,
    investors: 32000,
    apy: 12.5,
    description: 'Stable yield generation through diversified DeFi strategies',
    features: ['Stable Value', 'Daily Yield', 'Auto-compound', 'Risk Managed'],
    risk: 'medium',
    liquidity: 'high',
  },
  {
    id: '17',
    symbol: 'CORP-BOND',
    name: 'Corporate Bond Token',
    category: 'high-yield',
    price: 98.50,
    change: 0.15,
    changePercent: 0.15,
    minInvestment: 500,
    totalValue: 125000000,
    investors: 18500,
    apy: 7.8,
    description: 'Tokenized investment-grade corporate bond portfolio',
    features: ['Fixed Income', 'Quarterly Payments', 'Investment Grade', 'Diversified'],
    risk: 'low',
    liquidity: 'medium',
  },
  {
    id: '18',
    symbol: 'STAKING-ETH',
    name: 'ETH Staking Yield',
    category: 'high-yield',
    price: 2285.40,
    change: 45.20,
    changePercent: 2.02,
    minInvestment: 50,
    totalValue: 320000000,
    investors: 78000,
    apy: 4.5,
    description: 'Liquid staking token for Ethereum 2.0 staking rewards',
    features: ['ETH Exposure + Yield', 'Liquid Staking', 'No Lock-up', 'Compound Rewards'],
    risk: 'medium',
    liquidity: 'high',
  },
];

export default function InvestPage() {
  const [selectedCategory, setSelectedCategory] = useState<InvestCategory>('all');
  const [selectedAsset, setSelectedAsset] = useState<TokenizedAsset | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // API Connection States
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveAssets, setLiveAssets] = useState<TokenizedAsset[]>([]);

  // Fetch real data from backend
  const fetchLiveData = useCallback(async () => {
    try {
      const [positionsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/portfolio/positions`),
        fetch(`${API_BASE}/portfolio/summary`)
      ]);

      if (positionsRes.ok && summaryRes.ok) {
        const positions = await positionsRes.json();
        const summary = await summaryRes.json();

        // Map API data to asset format
        const mappedAssets: TokenizedAsset[] = [];

        // Fetch stock data for tokenized stocks
        const stockSymbols = ['TSLA', 'AAPL', 'NVDA'];
        for (const symbol of stockSymbols) {
          try {
            const stockRes = await fetch(`${API_BASE}/real-market/stock/${symbol}`);
            if (stockRes.ok) {
              const stockData = await stockRes.json();

              // Find corresponding mock asset for metadata
              const mockAsset = tokenizedAssets.find(a => a.symbol === `t${symbol}`);
              if (mockAsset) {
                mappedAssets.push({
                  ...mockAsset,
                  price: stockData.current_price || mockAsset.price,
                  change: stockData.change || mockAsset.change,
                  changePercent: stockData.change_percent || mockAsset.changePercent,
                });
              }
            }
          } catch (error) {
            // Error handled - symbol skipped
          }
        }

        setLiveAssets(mappedAssets);
        setIsConnected(true);
      } else {
        setIsConnected(false);
        setLiveAssets([]);
      }
    } catch (error) {
      // Error handled - shows empty state
      setIsConnected(false);
      setLiveAssets([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLiveData();
  }, [fetchLiveData]);

  const handleConfirmInvestment = async () => {
    if (!selectedAsset || !investAmount || parseFloat(investAmount) < selectedAsset.minInvestment) {
      setNotification({ type: 'error', message: 'Please enter a valid investment amount' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const tokens = (parseFloat(investAmount) / selectedAsset.price).toFixed(4);
    setIsProcessing(false);
    setShowInvestModal(false);
    setInvestAmount('');
    setNotification({
      type: 'success',
      message: `Successfully invested $${investAmount}! You received ${tokens} ${selectedAsset.symbol}`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Use live data if connected, otherwise use mock data
  const currentAssets = isConnected && liveAssets.length > 0
    ? [...liveAssets, ...tokenizedAssets.filter(a => !liveAssets.find(la => la.symbol === a.symbol))]
    : tokenizedAssets;

  const filteredAssets = currentAssets.filter(
    asset => selectedCategory === 'all' || asset.category === selectedCategory
  );

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const handleInvest = (asset: TokenizedAsset) => {
    setSelectedAsset(asset);
    setShowInvestModal(true);
  };

  const totalInvestors = currentAssets.reduce((sum, a) => sum + a.investors, 0);
  const totalAUM = currentAssets.reduce((sum, a) => sum + a.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invest</h1>
          <p className="text-slate-400 mt-1">Tokenized assets - fractional ownership in premium investments</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection Status Badge */}
          {isLoading ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-400 rounded-full text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
              <Activity className="w-4 h-4" />
              Live Data
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
              <Info className="w-4 h-4" />
              Demo Mode
            </span>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <span className="flex items-center gap-2 px-3 py-1.5 bg-time-primary/20 text-time-primary rounded-full text-sm">
            <Shield className="w-4 h-4" />
            SEC Compliant
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">Total AUM</span>
          </div>
          <p className="text-2xl font-bold text-white">${(totalAUM / 1000000000).toFixed(2)}B</p>
          <p className="text-xs text-green-400 mt-1">+5.2% this month</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-400">Total Investors</span>
          </div>
          <p className="text-2xl font-bold text-white">{(totalInvestors / 1000).toFixed(0)}K+</p>
          <p className="text-xs text-slate-500 mt-1">Worldwide</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">Assets Available</span>
          </div>
          <p className="text-2xl font-bold text-white">{currentAssets.length}</p>
          <p className="text-xs text-slate-500 mt-1">Across 6 categories</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-slate-400">Min Investment</span>
          </div>
          <p className="text-2xl font-bold text-white">$10</p>
          <p className="text-xs text-slate-500 mt-1">Start investing today</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as InvestCategory)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-time-primary text-white shadow-lg shadow-time-primary/25'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredAssets.map(asset => (
          <div key={asset.id} className="card p-4 hover:border-time-primary/50 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{asset.symbol}</span>
                  {asset.apy && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                      {asset.apy}% APY
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{asset.name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className={`text-sm ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {asset.change >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{asset.description}</p>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-slate-500">Min Investment</p>
                <p className="text-white font-medium">${asset.minInvestment}</p>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-slate-500">Total Value</p>
                <p className="text-white font-medium">${(asset.totalValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded ${getRiskColor(asset.risk)}`}>
                  {asset.risk.toUpperCase()} RISK
                </span>
                <span className={getLiquidityColor(asset.liquidity)}>
                  {asset.liquidity} liquidity
                </span>
              </div>
              <span className="text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {(asset.investors / 1000).toFixed(1)}K
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {asset.features.slice(0, 3).map((feature, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                  {feature}
                </span>
              ))}
            </div>

            <button
              onClick={() => handleInvest(asset)}
              className="w-full py-2.5 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-time-primary/25"
            >
              <Zap className="w-4 h-4" />
              Invest Now
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="card p-12 text-center">
          <PiggyBank className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No assets in this category</h3>
          <p className="text-slate-400">Check back soon for new investment opportunities</p>
        </div>
      )}

      {/* Investment Modal */}
      {showInvestModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Invest in {selectedAsset.symbol}</h3>
                <p className="text-sm text-slate-400">{selectedAsset.name}</p>
              </div>
              <button
                onClick={() => setShowInvestModal(false)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Asset Info */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400">Current Price</span>
                  <span className="text-xl font-bold text-white">${selectedAsset.price.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">24h Change</p>
                    <p className={selectedAsset.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {selectedAsset.change >= 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Risk Level</p>
                    <p className={getRiskColor(selectedAsset.risk).split(' ')[0]}>{selectedAsset.risk}</p>
                  </div>
                  {selectedAsset.apy && (
                    <div>
                      <p className="text-slate-500">Est. APY</p>
                      <p className="text-green-400">{selectedAsset.apy}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Investment Amount */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Investment Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    min={selectedAsset.minInvestment}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-lg focus:outline-none focus:border-time-primary/50"
                    placeholder={selectedAsset.minInvestment.toString()}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Minimum: ${selectedAsset.minInvestment}</p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setInvestAmount(amount.toString())}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300"
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Estimated Tokens */}
              {investAmount && parseFloat(investAmount) >= selectedAsset.minInvestment && (
                <div className="bg-time-primary/10 border border-time-primary/30 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">You will receive approximately</span>
                    <span className="font-bold text-time-primary">
                      {(parseFloat(investAmount) / selectedAsset.price).toFixed(4)} {selectedAsset.symbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-2">
                {selectedAsset.features.map((feature, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </span>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Investment involves risk. Past performance is not indicative of future results. Please read all offering documents carefully before investing.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInvestModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                {isProcessing ? (
                  <button
                    disabled
                    className="flex-1 py-3 bg-time-primary/50 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmInvestment}
                    disabled={!investAmount || parseFloat(investAmount) < selectedAsset.minInvestment}
                    className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors"
                  >
                    Confirm Investment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
