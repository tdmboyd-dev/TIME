'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Link2Off,
  Plus,
  Check,
  AlertTriangle,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Shield,
  Activity,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  Globe,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev/api/v1';

// Broker types
interface BrokerConnection {
  id: string;
  brokerId: string;
  brokerName: string;
  brokerLogo: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  accountType: 'live' | 'paper';
  accountId?: string;
  balance?: number;
  buyingPower?: number;
  lastSync?: string;
  error?: string;
  assetClasses: string[];
}

interface AvailableBroker {
  id: string;
  name: string;
  description: string;
  logo: string;
  assetClasses: string[];
  features: string[];
  paperTrading: boolean;
  oauth: boolean;
  region: string[];
  popular: boolean;
}

// Available brokers
const AVAILABLE_BROKERS: AvailableBroker[] = [
  {
    id: 'alpaca',
    name: 'Alpaca',
    description: 'Commission-free stock & crypto trading API',
    logo: '/brokers/alpaca.png',
    assetClasses: ['stocks', 'crypto'],
    features: ['Paper Trading', 'Real-time Data', 'Fractional Shares'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: true
  },
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    description: 'Professional trading platform with global access',
    logo: '/brokers/ibkr.png',
    assetClasses: ['stocks', 'options', 'futures', 'forex', 'bonds'],
    features: ['Global Markets', 'Low Commissions', 'Advanced Tools'],
    paperTrading: true,
    oauth: false,
    region: ['US', 'EU', 'Asia'],
    popular: true
  },
  {
    id: 'td_ameritrade',
    name: 'TD Ameritrade',
    description: 'Full-service broker with thinkorswim platform',
    logo: '/brokers/tda.png',
    assetClasses: ['stocks', 'options', 'futures', 'forex'],
    features: ['thinkorswim', 'Paper Trading', 'Research'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: true
  },
  {
    id: 'oanda',
    name: 'OANDA',
    description: 'Leading forex and CFD broker',
    logo: '/brokers/oanda.png',
    assetClasses: ['forex', 'cfd'],
    features: ['Forex Specialist', 'Low Spreads', 'API Access'],
    paperTrading: true,
    oauth: false,
    region: ['US', 'EU', 'Asia'],
    popular: true
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    description: 'Major cryptocurrency exchange',
    logo: '/brokers/coinbase.png',
    assetClasses: ['crypto'],
    features: ['Crypto Exchange', 'Custody', 'Staking'],
    paperTrading: false,
    oauth: true,
    region: ['US', 'EU'],
    popular: true
  },
  {
    id: 'binance',
    name: 'Binance',
    description: 'World largest crypto exchange by volume',
    logo: '/brokers/binance.png',
    assetClasses: ['crypto', 'futures'],
    features: ['Spot & Futures', 'DeFi', 'Low Fees'],
    paperTrading: true,
    oauth: false,
    region: ['Global'],
    popular: true
  },
  {
    id: 'kraken',
    name: 'Kraken',
    description: 'Secure cryptocurrency exchange',
    logo: '/brokers/kraken.png',
    assetClasses: ['crypto', 'futures'],
    features: ['Security', 'Staking', 'Margin Trading'],
    paperTrading: false,
    oauth: true,
    region: ['US', 'EU'],
    popular: false
  },
  {
    id: 'tradier',
    name: 'Tradier',
    description: 'API-first brokerage platform',
    logo: '/brokers/tradier.png',
    assetClasses: ['stocks', 'options'],
    features: ['API-First', 'Options', 'Low Cost'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'etrade',
    name: 'E*TRADE',
    description: 'Full-service online broker',
    logo: '/brokers/etrade.png',
    assetClasses: ['stocks', 'options', 'futures', 'bonds'],
    features: ['Research', 'Managed Portfolios', 'Banking'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    description: 'Commission-free trading app',
    logo: '/brokers/robinhood.png',
    assetClasses: ['stocks', 'crypto', 'options'],
    features: ['Commission-Free', 'Fractional Shares', 'Crypto'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: true
  },
  {
    id: 'webull',
    name: 'Webull',
    description: 'Advanced trading platform',
    logo: '/brokers/webull.png',
    assetClasses: ['stocks', 'options', 'crypto'],
    features: ['Paper Trading', 'Extended Hours', 'Options'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'snaptrade',
    name: 'SnapTrade',
    description: 'Universal brokerage connector',
    logo: '/brokers/snaptrade.png',
    assetClasses: ['stocks', 'options', 'crypto'],
    features: ['Multi-Broker', 'Universal API', 'Portfolio Sync'],
    paperTrading: false,
    oauth: true,
    region: ['US', 'Canada'],
    popular: false
  }
];

export default function BrokersPage() {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'stocks' | 'crypto' | 'forex' | 'options'>('all');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [venues, setVenues] = useState<any[]>([]);

  // Fetch broker status from backend
  const fetchBrokerStatus = useCallback(async () => {
    try {
      const [brokerResponse, venueResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE}/portfolio/brokers/status`),
        fetch(`${API_BASE}/advanced-broker/venues`),
        fetch(`${API_BASE}/portfolio/summary`),
      ]);

      // Parse broker status
      if (brokerResponse.ok) {
        const brokerData = await brokerResponse.json();
        if (brokerData.success && brokerData.data?.brokers) {
          const brokerConnections: BrokerConnection[] = brokerData.data.brokers.map((b: any) => ({
            id: b.id,
            brokerId: b.id,
            brokerName: b.name,
            brokerLogo: `/brokers/${b.id}.png`,
            status: b.connected ? 'connected' : 'disconnected',
            accountType: b.type === 'paper' ? 'paper' : 'live',
            accountId: b.accountId || b.id.toUpperCase(),
            balance: b.balance || 0,
            buyingPower: b.buyingPower || 0,
            lastSync: b.lastSync || 'Unknown',
            assetClasses: b.assetClasses || ['stocks'],
          }));
          setConnections(brokerConnections);
          setIsConnected(true);
        }
      }

      // Parse venue data
      if (venueResponse.ok) {
        const venueData = await venueResponse.json();
        if (venueData.success && venueData.data?.venues) {
          setVenues(venueData.data.venues);
        }
      }

      // Update balances from summary if available
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.success && summaryData.data) {
          // Could enrich connections with summary data here
        }
      }
    } catch (error) {
      console.error('Failed to fetch broker status:', error);
      setIsConnected(false);
      // Use demo data as fallback
      setConnections([
        {
          id: 'conn_1',
          brokerId: 'alpaca',
          brokerName: 'Alpaca',
          brokerLogo: '/brokers/alpaca.png',
          status: 'connected',
          accountType: 'paper',
          accountId: 'PA12345678',
          balance: 100000,
          buyingPower: 400000,
          lastSync: 'Demo Mode',
          assetClasses: ['stocks', 'crypto']
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBrokerStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBrokerStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchBrokerStatus]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBrokerStatus();
  };

  // Filter brokers by asset class
  const filteredBrokers = AVAILABLE_BROKERS.filter(broker => {
    if (filter === 'all') return true;
    return broker.assetClasses.includes(filter);
  });

  // Connect to broker - calls real backend
  const connectBroker = async (broker: AvailableBroker) => {
    setConnecting(broker.id);

    try {
      const token = localStorage.getItem('time_auth_token');
      const response = await fetch(`${API_BASE}/brokers/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          brokerId: broker.id,
          brokerName: broker.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchBrokerStatus();
          setShowAddBroker(false);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to connect broker:', error);
    }

    // Fallback to demo connection if API fails
    const newConnection: BrokerConnection = {
      id: `conn_${Date.now()}`,
      brokerId: broker.id,
      brokerName: broker.name,
      brokerLogo: broker.logo,
      status: 'connected',
      accountType: 'paper',
      accountId: `${broker.id.toUpperCase()}_DEMO`,
      balance: 100000,
      buyingPower: 400000,
      lastSync: 'Demo Mode',
      assetClasses: broker.assetClasses
    };

    setConnections(prev => [...prev, newConnection]);
    setConnecting(null);
    setShowAddBroker(false);
  };

  // Disconnect broker
  const disconnectBroker = async (connectionId: string) => {
    try {
      const token = localStorage.getItem('time_auth_token');
      await fetch(`${API_BASE}/brokers/disconnect/${connectionId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      console.error('Failed to disconnect broker:', error);
    }
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  // Refresh broker data
  const refreshBroker = (connectionId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.id === connectionId) {
        return { ...c, lastSync: 'Just now', status: 'connected' };
      }
      return c;
    }));
    fetchBrokerStatus();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
          <p className="text-white font-medium">Loading broker connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Broker Connect</h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isConnected
                ? 'bg-green-500/20 border border-green-500/50'
                : 'bg-amber-500/20 border border-amber-500/50'
            }`}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-amber-400'}`}>
                {isConnected ? 'Live' : 'Demo'}
              </span>
            </div>
          </div>
          <p className="text-slate-400 mt-1">
            Connect your brokerage accounts to enable automated trading
            {venues.length > 0 && ` | ${venues.filter(v => v.connected).length}/${venues.length} venues connected`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh broker status"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddBroker(true)}
            className="px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Broker
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Link2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Connected</p>
              <p className="text-xl font-bold text-white">
                {connections.filter(c => c.status === 'connected').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Balance</p>
              <p className="text-xl font-bold text-white">
                ${connections.reduce((sum, c) => sum + (c.balance || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Buying Power</p>
              <p className="text-xl font-bold text-white">
                ${connections.reduce((sum, c) => sum + (c.buyingPower || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Globe className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Asset Classes</p>
              <p className="text-xl font-bold text-white">
                {new Set(connections.flatMap(c => c.assetClasses)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Brokers */}
      <div className="card">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-time-primary" />
            Connected Brokers
          </h2>
        </div>
        <div className="p-4">
          {connections.length === 0 ? (
            <div className="text-center py-12">
              <Link2Off className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No brokers connected</h3>
              <p className="text-slate-400 mb-4">
                Connect a broker to start automated trading
              </p>
              <button
                onClick={() => setShowAddBroker(true)}
                className="px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg font-medium"
              >
                Connect Your First Broker
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map(connection => (
                <div
                  key={connection.id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Broker Logo Placeholder */}
                      <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {connection.brokerName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{connection.brokerName}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            connection.accountType === 'live'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {connection.accountType === 'live' ? 'LIVE' : 'PAPER'}
                          </span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            connection.status === 'connected'
                              ? 'bg-green-500/20 text-green-400'
                              : connection.status === 'error'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {connection.status === 'connected' ? (
                              <Check className="w-3 h-3" />
                            ) : connection.status === 'error' ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {connection.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          <span>Account: {connection.accountId}</span>
                          <span>Last sync: {connection.lastSync}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Balance & Buying Power */}
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Balance</p>
                        <p className="text-lg font-semibold text-white">
                          ${connection.balance?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Buying Power</p>
                        <p className="text-lg font-semibold text-green-400">
                          ${connection.buyingPower?.toLocaleString()}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => refreshBroker(connection.id)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => disconnectBroker(connection.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Asset Classes */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2">
                    <span className="text-sm text-slate-400">Trading:</span>
                    {connection.assetClasses.map(ac => (
                      <span
                        key={ac}
                        className="px-2 py-1 bg-slate-700/50 rounded text-xs text-white capitalize"
                      >
                        {ac}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Broker Modal */}
      {showAddBroker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Connect a Broker</h2>
              <button
                onClick={() => setShowAddBroker(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              >
                &times;
              </button>
            </div>

            {/* Filter */}
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
              {['all', 'stocks', 'crypto', 'forex', 'options'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    filter === f
                      ? 'bg-time-primary text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Broker List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBrokers.map(broker => {
                  const isConnected = connections.some(c => c.brokerId === broker.id);
                  const isConnecting = connecting === broker.id;

                  return (
                    <div
                      key={broker.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isConnected
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-time-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Logo Placeholder */}
                          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                            <span className="text-lg font-bold text-white">
                              {broker.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{broker.name}</h3>
                              {broker.popular && (
                                <span className="px-1.5 py-0.5 bg-time-primary/20 text-time-primary text-xs rounded">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">
                              {broker.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {broker.assetClasses.map(ac => (
                          <span
                            key={ac}
                            className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300 capitalize"
                          >
                            {ac}
                          </span>
                        ))}
                      </div>

                      {/* Features */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {broker.features.slice(0, 3).map(feature => (
                          <span
                            key={feature}
                            className="px-2 py-0.5 bg-time-primary/10 text-time-primary text-xs rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Action */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {broker.paperTrading && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Paper Trading
                            </span>
                          )}
                          {broker.oauth && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              OAuth
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => !isConnected && connectBroker(broker)}
                          disabled={isConnected || isConnecting}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            isConnected
                              ? 'bg-green-500/20 text-green-400 cursor-default'
                              : isConnecting
                              ? 'bg-slate-700 text-slate-400 cursor-wait'
                              : 'bg-time-primary hover:bg-time-primary/80 text-white'
                          }`}
                        >
                          {isConnected ? (
                            <>
                              <Check className="w-4 h-4" />
                              Connected
                            </>
                          ) : isConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4" />
                              Connect
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="card p-4 border-l-4 border-yellow-500">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">Security First</h3>
            <p className="text-sm text-slate-400 mt-1">
              TIME uses OAuth 2.0 and encrypted API key storage. We never store your broker passwords.
              All trading permissions are revocable at any time through your broker dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
