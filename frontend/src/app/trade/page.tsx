'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Star,
  BarChart2,
  Activity,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex' | 'commodity' | 'etf';
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  spread: number;
  volume: string;
  high24h: number;
  low24h: number;
}

interface Order {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop';
  quantity: number;
  price: number;
  total: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: Date;
}

const assets: Asset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 178.52, change: 2.34, changePercent: 1.33, bid: 178.50, ask: 178.54, spread: 0.04, volume: '52.3M', high24h: 179.80, low24h: 176.20 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', price: 378.91, change: -1.23, changePercent: -0.32, bid: 378.88, ask: 378.94, spread: 0.06, volume: '21.1M', high24h: 381.50, low24h: 377.00 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', price: 141.80, change: 1.56, changePercent: 1.11, bid: 141.78, ask: 141.82, spread: 0.04, volume: '18.7M', high24h: 143.20, low24h: 140.10 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 248.50, change: 5.80, changePercent: 2.39, bid: 248.45, ask: 248.55, spread: 0.10, volume: '98.2M', high24h: 252.00, low24h: 242.30 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', price: 495.22, change: 12.45, changePercent: 2.58, bid: 495.18, ask: 495.26, spread: 0.08, volume: '45.6M', high24h: 498.00, low24h: 480.00 },
  { symbol: 'BTC/USD', name: 'Bitcoin', type: 'crypto', price: 43521.80, change: 1234.50, changePercent: 2.92, bid: 43520.00, ask: 43523.60, spread: 3.60, volume: '28.5B', high24h: 44200.00, low24h: 42100.00 },
  { symbol: 'ETH/USD', name: 'Ethereum', type: 'crypto', price: 2285.40, change: 45.20, changePercent: 2.02, bid: 2285.20, ask: 2285.60, spread: 0.40, volume: '12.3B', high24h: 2320.00, low24h: 2240.00 },
  { symbol: 'EUR/USD', name: 'Euro/USD', type: 'forex', price: 1.0842, change: 0.0012, changePercent: 0.11, bid: 1.0841, ask: 1.0843, spread: 0.0002, volume: '180B', high24h: 1.0865, low24h: 1.0820 },
  { symbol: 'GOLD', name: 'Gold', type: 'commodity', price: 2024.50, change: 8.30, changePercent: 0.41, bid: 2024.30, ask: 2024.70, spread: 0.40, volume: '156K', high24h: 2032.00, low24h: 2015.00 },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf', price: 478.92, change: 2.15, changePercent: 0.45, bid: 478.90, ask: 478.94, spread: 0.04, volume: '62.1M', high24h: 480.50, low24h: 476.20 },
];

export default function TradePage() {
  const [liveAssets, setLiveAssets] = useState<Asset[]>(assets);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [quantity, setQuantity] = useState<string>('1');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['AAPL', 'BTC/USD', 'GOLD']);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Fetch real market data
  const fetchMarketData = useCallback(async () => {
    try {
      const updatedAssets: Asset[] = [];

      // Fetch stock prices
      for (const symbol of ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']) {
        try {
          const res = await fetch(`${API_BASE}/real-market/stock/${symbol}`);
          const data = await res.json();
          if (data.success && data.data) {
            const d = data.data;
            updatedAssets.push({
              symbol,
              name: d.name || `${symbol}`,
              type: 'stock',
              price: d.price || 0,
              change: d.change || 0,
              changePercent: d.changePercent || 0,
              bid: d.price * 0.9999,
              ask: d.price * 1.0001,
              spread: d.price * 0.0002,
              volume: d.volume ? `${(d.volume / 1e6).toFixed(1)}M` : '0',
              high24h: d.high || d.price * 1.02,
              low24h: d.low || d.price * 0.98,
            });
          }
        } catch (e) { /* skip on error */ }
      }

      // Fetch crypto prices
      for (const symbol of ['BTC', 'ETH']) {
        try {
          const res = await fetch(`${API_BASE}/real-market/crypto/${symbol}`);
          const data = await res.json();
          if (data.success && data.data) {
            const d = data.data;
            updatedAssets.push({
              symbol: `${symbol}/USD`,
              name: d.name || symbol,
              type: 'crypto',
              price: d.price || 0,
              change: d.change24h || 0,
              changePercent: d.changePercent24h || 0,
              bid: d.price * 0.999,
              ask: d.price * 1.001,
              spread: d.price * 0.002,
              volume: d.volume24h ? `${(d.volume24h / 1e9).toFixed(1)}B` : '0',
              high24h: d.high24h || d.price * 1.05,
              low24h: d.low24h || d.price * 0.95,
            });
          }
        } catch (e) { /* skip on error */ }
      }

      if (updatedAssets.length > 0) {
        // Merge with existing assets to keep favorites
        setLiveAssets(prev => {
          const merged = [...updatedAssets];
          prev.forEach(p => {
            if (!merged.find(m => m.symbol === p.symbol)) {
              merged.push(p);
            }
          });
          return merged;
        });

        // Update selected asset if it's in the updated list
        const updatedSelected = updatedAssets.find(a => a.symbol === selectedAsset.symbol);
        if (updatedSelected) {
          setSelectedAsset(updatedSelected);
        }

        setIsConnected(true);
      }
    } catch (error) {
      // Error handled - keeps demo data
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedAsset.symbol]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Real-time price simulation for smoother updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedAsset(prev => {
        const change = (Math.random() - 0.5) * prev.price * 0.0005;
        return {
          ...prev,
          price: prev.price + change,
          bid: prev.price + change - prev.spread / 2,
          ask: prev.price + change + prev.spread / 2,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMarketData();
  };

  const filteredAssets = liveAssets.filter(a =>
    a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = orderType === 'market'
      ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid)
      : (orderType === 'limit' ? parseFloat(limitPrice) || 0 : parseFloat(stopPrice) || 0);
    return qty * price;
  };

  const handlePlaceOrder = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid quantity' });
      return;
    }
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setNotification({ type: 'error', message: 'Please enter a valid limit price' });
      return;
    }
    if (orderType === 'stop' && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      setNotification({ type: 'error', message: 'Please enter a valid stop price' });
      return;
    }
    setShowConfirmation(true);
  };

  const confirmOrder = async () => {
    setIsPlacingOrder(true);
    setShowConfirmation(false);

    try {
      // Submit REAL order to backend via Smart Order Routing
      const response = await fetch(`${API_BASE}/advanced-broker/smart-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if user is logged in
          ...(typeof window !== 'undefined' && localStorage.getItem('time_auth_token')
            ? { 'Authorization': `Bearer ${localStorage.getItem('time_auth_token')}` }
            : {}),
        },
        body: JSON.stringify({
          symbol: selectedAsset.symbol.replace('/USD', ''),  // Clean symbol for API
          side: orderSide,
          quantity: parseFloat(quantity),
          orderType: orderType === 'market' ? 'adaptive' : orderType,
          limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
          urgency: 'medium',
          darkPoolPriority: false,
          maxSlippageBps: 10,
          useAI: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Create local order record from API response
        const newOrder: Order = {
          id: data.data.orderId || `ORD-${Date.now()}`,
          symbol: selectedAsset.symbol,
          type: orderSide,
          orderType: orderType,
          quantity: parseFloat(quantity),
          price: data.data.avgFillPrice || (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid),
          total: data.data.avgFillPrice ? data.data.avgFillPrice * parseFloat(quantity) : calculateTotal(),
          status: data.data.status === 'filled' || data.data.status === 'completed' ? 'filled' : 'pending',
          timestamp: new Date(),
        };

        setOrders(prev => [newOrder, ...prev]);
        setQuantity('1');
        setLimitPrice('');
        setStopPrice('');

        setNotification({
          type: 'success',
          message: `Order ${data.data.orderId || ''} ${orderSide.toUpperCase()} ${quantity} ${selectedAsset.symbol} - Routed to ${data.data.executionPlan?.venueCount || 1} venues`
        });
      } else {
        throw new Error(data.error || 'Order submission failed');
      }
    } catch (error: any) {
      // Error handled - falls back to demo mode

      // Fallback: Store order locally (demo mode)
      const newOrder: Order = {
        id: `DEMO-${Date.now()}`,
        symbol: selectedAsset.symbol,
        type: orderSide,
        orderType: orderType,
        quantity: parseFloat(quantity),
        price: orderType === 'market'
          ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid)
          : (orderType === 'limit' ? parseFloat(limitPrice) : parseFloat(stopPrice)),
        total: calculateTotal(),
        status: 'pending',
        timestamp: new Date(),
      };

      setOrders(prev => [newOrder, ...prev]);
      setQuantity('1');
      setLimitPrice('');
      setStopPrice('');

      setNotification({
        type: 'error',
        message: `Demo mode: ${error.message || 'Broker not connected'}. Order saved locally.`
      });
    } finally {
      setIsPlacingOrder(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' as const } : o
    ));
    setNotification({ type: 'success', message: 'Order cancelled successfully' });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade</h1>
          <p className="text-slate-400 mt-1">Buy and sell stocks, crypto, forex, and more</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isConnected
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live Prices' : 'Demo Mode'}
          </div>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Prices"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
            <Activity className="w-4 h-4" />
            Markets Open
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Asset List */}
        <div className="col-span-3 card p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-time-primary/50"
            />
          </div>

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2">Favorites</h3>
              {assets.filter(a => favorites.includes(a.symbol)).map(asset => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    selectedAsset.symbol === asset.symbol ? 'bg-time-primary/20 border border-time-primary/30' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-white">{asset.symbol}</span>
                  </div>
                  <span className={`text-sm ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* All Assets */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2">All Assets</h3>
            {filteredAssets.map(asset => (
              <div
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  selectedAsset.symbol === asset.symbol ? 'bg-time-primary/20 border border-time-primary/30' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.symbol); }}
                    className="text-slate-500 hover:text-yellow-400"
                  >
                    <Star className={`w-4 h-4 ${favorites.includes(asset.symbol) ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                  </button>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white block">{asset.symbol}</span>
                    <span className="text-xs text-slate-500">{asset.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-white block">${asset.price.toFixed(2)}</span>
                  <span className={`text-xs ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Trading Area */}
        <div className="col-span-6 space-y-4">
          {/* Selected Asset Info */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedAsset.symbol}</h2>
                  <p className="text-sm text-slate-400">{selectedAsset.name}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedAsset.type === 'stock' ? 'bg-blue-500/20 text-blue-400' :
                  selectedAsset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' :
                  selectedAsset.type === 'forex' ? 'bg-purple-500/20 text-purple-400' :
                  selectedAsset.type === 'commodity' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {selectedAsset.type.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => toggleFavorite(selectedAsset.symbol)}
                className={`p-2 rounded-lg ${favorites.includes(selectedAsset.symbol) ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-400 hover:text-yellow-400'}`}
              >
                <Star className={`w-5 h-5 ${favorites.includes(selectedAsset.symbol) ? 'fill-yellow-400' : ''}`} />
              </button>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <span className="text-3xl font-bold text-white">
                ${selectedAsset.price.toFixed(selectedAsset.type === 'forex' ? 4 : 2)}
              </span>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${selectedAsset.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {selectedAsset.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {selectedAsset.change >= 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Bid</p>
                <p className="text-sm font-semibold text-white">${selectedAsset.bid.toFixed(selectedAsset.type === 'forex' ? 4 : 2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Ask</p>
                <p className="text-sm font-semibold text-white">${selectedAsset.ask.toFixed(selectedAsset.type === 'forex' ? 4 : 2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">24h High</p>
                <p className="text-sm font-semibold text-green-400">${selectedAsset.high24h.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">24h Low</p>
                <p className="text-sm font-semibold text-red-400">${selectedAsset.low24h.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="card p-4">
            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setOrderSide('buy')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  orderSide === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  orderSide === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Order Type */}
            <div className="flex gap-2 mb-4">
              {(['market', 'limit', 'stop'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    orderType === type
                      ? 'bg-time-primary text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Quantity Input */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Quantity</label>
                <div className="relative">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-lg font-semibold focus:outline-none focus:border-time-primary/50"
                    placeholder="0.00"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => setQuantity(prev => (parseFloat(prev) / 4).toString())}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                    >
                      25%
                    </button>
                    <button
                      onClick={() => setQuantity(prev => (parseFloat(prev) / 2).toString())}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setQuantity('100')}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Limit Price */}
              {orderType === 'limit' && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Limit Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                      placeholder={selectedAsset.price.toFixed(2)}
                    />
                  </div>
                </div>
              )}

              {/* Stop Price */}
              {orderType === 'stop' && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Stop Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                      placeholder={selectedAsset.price.toFixed(2)}
                    />
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Price per unit</span>
                  <span className="text-white font-medium">
                    ${orderType === 'market'
                      ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid).toFixed(selectedAsset.type === 'forex' ? 4 : 2)
                      : (orderType === 'limit' ? limitPrice || '0.00' : stopPrice || '0.00')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Quantity</span>
                  <span className="text-white font-medium">{quantity || '0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Fee (0.1%)</span>
                  <span className="text-white font-medium">${(calculateTotal() * 0.001).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Total</span>
                    <span className="text-xl font-bold text-white">${(calculateTotal() * 1.001).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                  orderSide === 'buy'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedAsset.symbol}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="col-span-3 card p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Order History
          </h3>

          {orders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm">Your orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        order.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-white">{order.symbol}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-600/50 text-slate-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="text-slate-300">{order.orderType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qty:</span>
                      <span className="text-slate-300">{order.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="text-slate-300">${order.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="text-white font-medium">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="w-full mt-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Order</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Action</span>
                <span className={`font-medium ${orderSide === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {orderSide.toUpperCase()} {selectedAsset.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order Type</span>
                <span className="text-white">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity</span>
                <span className="text-white">{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Price</span>
                <span className="text-white">
                  ${orderType === 'market'
                    ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid).toFixed(2)
                    : (orderType === 'limit' ? limitPrice : stopPrice)}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-xl font-bold text-white">${(calculateTotal() * 1.001).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className={`flex-1 py-3 rounded-lg font-medium text-white ${
                  orderSide === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                Confirm {orderSide === 'buy' ? 'Buy' : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
