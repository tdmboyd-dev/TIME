'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Shield,
  Eye,
  EyeOff,
  BarChart3,
  Target,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRightLeft,
  Layers,
  Cpu,
  Network,
  Play,
  Pause,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Rocket,
  Brain,
} from 'lucide-react';
import clsx from 'clsx';

// Types
interface Venue {
  id: string;
  name: string;
  type: 'lit' | 'dark' | 'ecn' | 'cex' | 'dex' | 'otc';
  region: string;
  latencyMs: number;
  liquidityScore: number;
  fillRate: number;
  avgSlippage: number;
  connected: boolean;
  darkPoolAccess: boolean;
}

interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyVenue: string;
  buyPrice: number;
  sellVenue: string;
  sellPrice: number;
  spreadBps: number;
  netProfitBps: number;
  confidence: number;
  riskScore: number;
  expiresIn: string;
}

interface SmartOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  quantityFilled: number;
  status: string;
  avgFillPrice: number;
  venueCount: number;
}

interface LiquidityPool {
  symbol: string;
  totalLiquidity: number;
  spread: number;
  quality: number;
}

// Mock data generators
const generateVenues = (): Venue[] => [
  { id: 'nasdaq', name: 'NASDAQ', type: 'lit', region: 'NA', latencyMs: 1, liquidityScore: 95, fillRate: 0.98, avgSlippage: 0.5, connected: true, darkPoolAccess: false },
  { id: 'nyse', name: 'NYSE', type: 'lit', region: 'NA', latencyMs: 2, liquidityScore: 94, fillRate: 0.97, avgSlippage: 0.6, connected: true, darkPoolAccess: false },
  { id: 'sigma_x', name: 'Goldman Sigma X', type: 'dark', region: 'NA', latencyMs: 2, liquidityScore: 88, fillRate: 0.92, avgSlippage: 0.3, connected: true, darkPoolAccess: true },
  { id: 'crossfinder', name: 'CS Crossfinder', type: 'dark', region: 'NA', latencyMs: 2, liquidityScore: 85, fillRate: 0.90, avgSlippage: 0.4, connected: true, darkPoolAccess: true },
  { id: 'liquidnet', name: 'Liquidnet', type: 'dark', region: 'GLOBAL', latencyMs: 5, liquidityScore: 82, fillRate: 0.88, avgSlippage: 0.2, connected: true, darkPoolAccess: true },
  { id: 'binance', name: 'Binance', type: 'cex', region: 'GLOBAL', latencyMs: 10, liquidityScore: 98, fillRate: 0.99, avgSlippage: 0.8, connected: true, darkPoolAccess: false },
  { id: 'coinbase', name: 'Coinbase Pro', type: 'cex', region: 'NA', latencyMs: 15, liquidityScore: 92, fillRate: 0.96, avgSlippage: 1.0, connected: true, darkPoolAccess: false },
  { id: 'uniswap', name: 'Uniswap V3', type: 'dex', region: 'GLOBAL', latencyMs: 12000, liquidityScore: 75, fillRate: 0.85, avgSlippage: 1.5, connected: true, darkPoolAccess: false },
  { id: 'lmax', name: 'LMAX Exchange', type: 'ecn', region: 'EU', latencyMs: 4, liquidityScore: 90, fillRate: 0.95, avgSlippage: 0.3, connected: true, darkPoolAccess: false },
];

const generateArbitrageOpportunities = (): ArbitrageOpportunity[] => [
  { id: 'arb1', symbol: 'BTCUSD', buyVenue: 'Coinbase', buyPrice: 44850, sellVenue: 'Binance', sellPrice: 44920, spreadBps: 15.6, netProfitBps: 8.2, confidence: 0.85, riskScore: 25, expiresIn: '450ms' },
  { id: 'arb2', symbol: 'ETHUSD', buyVenue: 'Kraken', buyPrice: 2485, sellVenue: 'Binance', sellPrice: 2492, spreadBps: 28.2, netProfitBps: 18.5, confidence: 0.92, riskScore: 18, expiresIn: '320ms' },
  { id: 'arb3', symbol: 'SOLUSD', buyVenue: 'OKX', buyPrice: 98.50, sellVenue: 'Coinbase', sellPrice: 98.85, spreadBps: 35.5, netProfitBps: 22.1, confidence: 0.78, riskScore: 32, expiresIn: '280ms' },
];

export default function ExecutionPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [arbitrageOpps, setArbitrageOpps] = useState<ArbitrageOpportunity[]>([]);
  const [activeOrders, setActiveOrders] = useState<SmartOrder[]>([]);
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Smart Order Form State
  const [orderForm, setOrderForm] = useState({
    symbol: 'AAPL',
    side: 'buy' as 'buy' | 'sell',
    quantity: 1000,
    orderType: 'adaptive',
    urgency: 'medium',
    darkPoolPriority: false,
    maxSlippageBps: 10,
  });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    connectedVenues: 50,
    totalVenues: 54,
    activeArbitrage: 3,
    avgLatency: 8.5,
    totalLiquidity: 125000000,
    executedOrders: 1247,
    avgSlippage: 0.8,
    profitToday: 12450,
  });

  // Selected view
  const [activeTab, setActiveTab] = useState<'overview' | 'venues' | 'arbitrage' | 'orders' | 'analytics'>('overview');
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);

  useEffect(() => {
    setVenues(generateVenues());
    setArbitrageOpps(generateArbitrageOpportunities());
    setLiquidityPools([
      { symbol: 'AAPL', totalLiquidity: 15000000, spread: 0.02, quality: 92 },
      { symbol: 'BTCUSD', totalLiquidity: 85000000, spread: 5.50, quality: 95 },
      { symbol: 'ETHUSD', totalLiquidity: 45000000, spread: 0.85, quality: 93 },
      { symbol: 'EURUSD', totalLiquidity: 250000000, spread: 0.0001, quality: 98 },
    ]);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setArbitrageOpps(generateArbitrageOpportunities());
      setStats(prev => ({
        ...prev,
        avgLatency: 8 + Math.random() * 2,
        profitToday: prev.profitToday + Math.floor(Math.random() * 50),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSmartOrder = async () => {
    setIsSubmitting(true);

    // Simulate order submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newOrder: SmartOrder = {
      id: `SO_${Date.now()}`,
      symbol: orderForm.symbol,
      side: orderForm.side,
      quantity: orderForm.quantity,
      quantityFilled: Math.floor(orderForm.quantity * Math.random()),
      status: 'working',
      avgFillPrice: 175.50 + Math.random() * 5,
      venueCount: 4 + Math.floor(Math.random() * 3),
    };

    setActiveOrders(prev => [...prev, newOrder]);
    setIsSubmitting(false);
    setShowOrderModal(false);
    setNotification({ type: 'success', message: `Smart order created: ${orderForm.side} ${orderForm.quantity} ${orderForm.symbol}` });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExecuteArbitrage = async (oppId: string) => {
    const opp = arbitrageOpps.find(o => o.id === oppId);
    if (!opp) return;

    setNotification({ type: 'warning', message: `Executing arbitrage: ${opp.symbol}...` });

    await new Promise(resolve => setTimeout(resolve, 800));

    const success = Math.random() > 0.2;
    if (success) {
      setNotification({ type: 'success', message: `Arbitrage executed! Profit: +$${(opp.netProfitBps * 10).toFixed(2)}` });
      setArbitrageOpps(prev => prev.filter(o => o.id !== oppId));
    } else {
      setNotification({ type: 'error', message: 'Arbitrage expired - prices moved' });
    }

    setTimeout(() => setNotification(null), 4000);
  };

  const getVenueTypeColor = (type: string) => {
    switch (type) {
      case 'lit': return 'bg-blue-500/20 text-blue-400';
      case 'dark': return 'bg-purple-500/20 text-purple-400';
      case 'ecn': return 'bg-cyan-500/20 text-cyan-400';
      case 'cex': return 'bg-orange-500/20 text-orange-400';
      case 'dex': return 'bg-pink-500/20 text-pink-400';
      case 'otc': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'venues', label: 'Venues (50+)', icon: Network },
    { id: 'arbitrage', label: 'Arbitrage', icon: ArrowRightLeft },
    { id: 'orders', label: 'Smart Orders', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={clsx(
          'fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up',
          notification.type === 'success' ? 'bg-green-500/90' :
          notification.type === 'error' ? 'bg-red-500/90' : 'bg-yellow-500/90'
        )}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 text-white" /> :
           notification.type === 'error' ? <AlertTriangle className="w-5 h-5 text-white" /> :
           <Clock className="w-5 h-5 text-white" />}
          <span className="text-white font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="w-8 h-8 text-time-primary" />
            Advanced Execution Engine
          </h1>
          <p className="text-slate-400">Institutional-grade smart order routing across 50+ venues</p>
        </div>
        <button
          onClick={() => setShowOrderModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Rocket className="w-4 h-4" />
          New Smart Order
        </button>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Network className="w-3 h-3" />
            Venues
          </div>
          <div className="text-xl font-bold text-white">{stats.connectedVenues}/{stats.totalVenues}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Zap className="w-3 h-3" />
            Avg Latency
          </div>
          <div className="text-xl font-bold text-green-400">{stats.avgLatency.toFixed(1)}ms</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <ArrowRightLeft className="w-3 h-3" />
            Arbitrage
          </div>
          <div className="text-xl font-bold text-purple-400">{arbitrageOpps.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Layers className="w-3 h-3" />
            Liquidity
          </div>
          <div className="text-xl font-bold text-cyan-400">${(stats.totalLiquidity / 1e6).toFixed(0)}M</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Target className="w-3 h-3" />
            Orders Today
          </div>
          <div className="text-xl font-bold text-white">{stats.executedOrders}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Activity className="w-3 h-3" />
            Avg Slippage
          </div>
          <div className="text-xl font-bold text-blue-400">{stats.avgSlippage}bps</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Shield className="w-3 h-3" />
            Dark Pool
          </div>
          <div className="text-xl font-bold text-purple-400">8 Active</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            Profit Today
          </div>
          <div className="text-xl font-bold text-green-400">${stats.profitToday.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-time-primary/20 text-time-primary'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Venues Grid */}
          {(activeTab === 'overview' || activeTab === 'venues') && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-time-primary" />
                  Connected Venues
                </h2>
                <span className="text-sm text-slate-400">{venues.length} shown</span>
              </div>
              <div className="space-y-3">
                {venues.map(venue => (
                  <div
                    key={venue.id}
                    className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setExpandedVenue(expandedVenue === venue.id ? null : venue.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          'w-2 h-2 rounded-full',
                          venue.connected ? 'bg-green-500' : 'bg-red-500'
                        )} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{venue.name}</span>
                            <span className={clsx('px-2 py-0.5 rounded text-xs', getVenueTypeColor(venue.type))}>
                              {venue.type.toUpperCase()}
                            </span>
                            {venue.darkPoolAccess && (
                              <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                                DARK
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{venue.region}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-white">{venue.latencyMs}ms</div>
                          <div className="text-xs text-slate-500">Latency</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">{(venue.fillRate * 100).toFixed(0)}%</div>
                          <div className="text-xs text-slate-500">Fill Rate</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">{venue.liquidityScore}</div>
                          <div className="text-xs text-slate-500">Liquidity</div>
                        </div>
                        {expandedVenue === venue.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                    {expandedVenue === venue.id && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-slate-500">Avg Slippage</div>
                          <div className="text-sm text-white">{venue.avgSlippage}bps</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Order Types</div>
                          <div className="text-sm text-white">Market, Limit, TWAP</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Assets</div>
                          <div className="text-sm text-white">{venue.type === 'cex' ? 'Crypto' : venue.type === 'dex' ? 'DeFi' : 'Equities'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Status</div>
                          <div className="text-sm text-green-400">Operational</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Smart Orders */}
          {(activeTab === 'overview' || activeTab === 'orders') && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-time-primary" />
                  Active Smart Orders
                </h2>
                <button className="btn-secondary text-sm">View All</button>
              </div>
              {activeOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No active orders. Create a smart order to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map(order => (
                    <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={clsx(
                            'px-2 py-1 rounded text-xs font-medium',
                            order.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          )}>
                            {order.side.toUpperCase()}
                          </span>
                          <span className="font-medium text-white">{order.symbol}</span>
                          <span className="text-slate-400">{order.quantity} shares</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-white">{order.quantityFilled}/{order.quantity}</div>
                            <div className="text-xs text-slate-500">Filled</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white">${order.avgFillPrice.toFixed(2)}</div>
                            <div className="text-xs text-slate-500">Avg Price</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-cyan-400">{order.venueCount} venues</div>
                            <div className="text-xs text-slate-500">Routing</div>
                          </div>
                          <span className={clsx(
                            'px-2 py-1 rounded text-xs',
                            order.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'working' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          )}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-time-primary to-time-secondary transition-all"
                          style={{ width: `${(order.quantityFilled / order.quantity) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Real-Time Arbitrage */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                Arbitrage
              </h2>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="space-y-3">
              {arbitrageOpps.map(opp => (
                <div key={opp.id} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{opp.symbol}</span>
                    <span className="text-xs text-slate-500">{opp.expiresIn}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-slate-500">Buy @ {opp.buyVenue}</span>
                      <div className="text-green-400">${opp.buyPrice.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Sell @ {opp.sellVenue}</span>
                      <div className="text-red-400">${opp.sellPrice.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-400">+{opp.netProfitBps.toFixed(1)}bps</span>
                      <span className="text-slate-500">{(opp.confidence * 100).toFixed(0)}% conf</span>
                    </div>
                    <button
                      onClick={() => handleExecuteArbitrage(opp.id)}
                      className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 transition-colors"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Liquidity Pools */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-cyan-400" />
              Aggregated Liquidity
            </h2>
            <div className="space-y-3">
              {liquidityPools.map(pool => (
                <div key={pool.symbol} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{pool.symbol}</span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded',
                      pool.quality >= 95 ? 'bg-green-500/20 text-green-400' :
                      pool.quality >= 90 ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    )}>
                      {pool.quality}% quality
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Total Liquidity</span>
                      <div className="text-white">${(pool.totalLiquidity / 1e6).toFixed(1)}M</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Spread</span>
                      <div className="text-white">{pool.spread < 1 ? (pool.spread * 100).toFixed(3) + '%' : '$' + pool.spread.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-time-primary" />
              AI Insights
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400">Dark pool routing saved 3.2bps on last 10 orders</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">TWAP recommended for AAPL in current volatility</p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">High toxicity detected on BATS - routing adjusted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700/50 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Create Smart Order</h2>
                <p className="text-sm text-slate-400">AI-optimized routing across 50+ venues</p>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={orderForm.symbol}
                    onChange={e => setOrderForm({ ...orderForm, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={e => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Side</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderForm({ ...orderForm, side: 'buy' })}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium transition-colors',
                      orderForm.side === 'buy'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                    )}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setOrderForm({ ...orderForm, side: 'sell' })}
                    className={clsx(
                      'flex-1 py-2 rounded-lg font-medium transition-colors',
                      orderForm.side === 'sell'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                    )}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Order Type</label>
                <select
                  value={orderForm.orderType}
                  onChange={e => setOrderForm({ ...orderForm, orderType: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white"
                >
                  <option value="adaptive">Adaptive (AI-Controlled)</option>
                  <option value="twap">TWAP</option>
                  <option value="vwap">VWAP</option>
                  <option value="dark_sweep">Dark Sweep</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="passive">Passive</option>
                  <option value="stealth">Stealth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Urgency</label>
                <select
                  value={orderForm.urgency}
                  onChange={e => setOrderForm({ ...orderForm, urgency: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white"
                >
                  <option value="low">Low - Minimize impact</option>
                  <option value="medium">Medium - Balanced</option>
                  <option value="high">High - Fast execution</option>
                  <option value="critical">Critical - Immediate</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Dark Pool Priority</p>
                  <p className="text-xs text-slate-500">Route to dark pools first for large orders</p>
                </div>
                <button
                  onClick={() => setOrderForm({ ...orderForm, darkPoolPriority: !orderForm.darkPoolPriority })}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    orderForm.darkPoolPriority ? 'bg-purple-500' : 'bg-slate-600'
                  )}
                >
                  <span className={clsx(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    orderForm.darkPoolPriority ? 'translate-x-7' : 'translate-x-1'
                  )} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Slippage: {orderForm.maxSlippageBps}bps
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={orderForm.maxSlippageBps}
                  onChange={e => setOrderForm({ ...orderForm, maxSlippageBps: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleSmartOrder}
                disabled={isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Create Smart Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
