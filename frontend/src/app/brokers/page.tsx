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

import { API_BASE, getAuthHeaders } from '@/lib/api';

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

// Available brokers - ALL major brokers including traditional
const AVAILABLE_BROKERS: AvailableBroker[] = [
  // ===== POPULAR BROKERS =====
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
  // ===== TRADITIONAL BROKERS (Vanguard, Fidelity, Schwab) =====
  {
    id: 'vanguard',
    name: 'Vanguard',
    description: 'Low-cost index funds & retirement accounts',
    logo: '/brokers/vanguard.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    features: ['Low-Cost Index Funds', 'Retirement Planning', 'Admiral Shares'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: true
  },
  {
    id: 'fidelity',
    name: 'Fidelity',
    description: 'Full-service broker with extensive research',
    logo: '/brokers/fidelity.png',
    assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    features: ['Zero Expense Funds', 'Active Trader Pro', 'Research'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: true
  },
  {
    id: 'schwab',
    name: 'Charles Schwab',
    description: 'Full-service broker with banking integration',
    logo: '/brokers/schwab.png',
    assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'futures'],
    features: ['Schwab Intelligent Portfolios', 'Banking', 'Research'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: true
  },
  {
    id: 'merrill',
    name: 'Merrill Edge',
    description: 'Bank of America integrated brokerage',
    logo: '/brokers/merrill.png',
    assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    features: ['Preferred Rewards', 'Guided Investing', 'Banking Integration'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'morgan_stanley',
    name: 'Morgan Stanley',
    description: 'Full-service wealth management',
    logo: '/brokers/morgan_stanley.png',
    assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    features: ['Wealth Management', 'Research', 'Financial Planning'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'jpmorgan',
    name: 'J.P. Morgan Self-Directed',
    description: 'Chase-integrated investing',
    logo: '/brokers/jpmorgan.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    features: ['Chase Integration', 'Retirement Planning', 'Wealth Management'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'wells_fargo',
    name: 'Wells Fargo Advisors',
    description: 'Bank-integrated wealth management',
    logo: '/brokers/wells_fargo.png',
    assetClasses: ['stocks', 'bonds', 'options', 'etfs', 'mutual_funds'],
    features: ['WellsTrade', 'Financial Advisors', 'Banking Integration'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'ubs',
    name: 'UBS',
    description: 'Global wealth management',
    logo: '/brokers/ubs.png',
    assetClasses: ['stocks', 'bonds', 'options', 'forex', 'etfs'],
    features: ['Global Access', 'Wealth Management', 'Private Banking'],
    paperTrading: false,
    oauth: true,
    region: ['US', 'EU', 'Asia'],
    popular: false
  },
  {
    id: 'goldman',
    name: 'Goldman Sachs',
    description: 'Marcus and wealth management',
    logo: '/brokers/goldman.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    features: ['Marcus', 'Wealth Management', 'Institutional Quality'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  // ===== MOBILE-FIRST / ROBO ADVISORS =====
  {
    id: 'cashapp',
    name: 'Cash App Investing',
    description: 'Square-owned mobile investing',
    logo: '/brokers/cashapp.png',
    assetClasses: ['stocks', 'crypto'],
    features: ['Free Stock Trading', 'Bitcoin', 'Cash Card'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'stash',
    name: 'Stash',
    description: 'Beginner-friendly investing app',
    logo: '/brokers/stash.png',
    assetClasses: ['stocks', 'etfs'],
    features: ['Fractional Shares', 'Auto-Invest', 'Banking'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'acorns',
    name: 'Acorns',
    description: 'Round-up investing app',
    logo: '/brokers/acorns.png',
    assetClasses: ['etfs'],
    features: ['Round-Ups', 'Auto-Invest', 'Retirement Accounts'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'betterment',
    name: 'Betterment',
    description: 'Leading robo-advisor',
    logo: '/brokers/betterment.png',
    assetClasses: ['etfs', 'bonds'],
    features: ['Robo-Advisor', 'Tax-Loss Harvesting', 'Goal-Based'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'wealthfront',
    name: 'Wealthfront',
    description: 'Automated investing platform',
    logo: '/brokers/wealthfront.png',
    assetClasses: ['etfs', 'bonds', 'crypto'],
    features: ['Robo-Advisor', 'Tax-Loss Harvesting', 'Cash Account'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'm1_finance',
    name: 'M1 Finance',
    description: 'Free automated investing',
    logo: '/brokers/m1_finance.png',
    assetClasses: ['stocks', 'etfs'],
    features: ['Pies', 'Auto-Invest', 'Fractional Shares'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'ally',
    name: 'Ally Invest',
    description: 'Bank-integrated online broker',
    logo: '/brokers/ally.png',
    assetClasses: ['stocks', 'options', 'etfs', 'mutual_funds', 'forex'],
    features: ['Low Commissions', 'Robo Portfolios', 'Banking'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'moomoo',
    name: 'moomoo',
    description: 'Feature-rich trading platform',
    logo: '/brokers/moomoo.png',
    assetClasses: ['stocks', 'options', 'etfs'],
    features: ['Advanced Charts', 'Free Level 2', 'Paper Trading'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: false
  },
  // ===== RETIREMENT SPECIALISTS =====
  {
    id: 'tiaa',
    name: 'TIAA',
    description: 'Retirement for education & nonprofits',
    logo: '/brokers/tiaa.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds', 'annuities'],
    features: ['403(b) Plans', 'Annuities', 'Target-Date Funds'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'principal',
    name: 'Principal Financial',
    description: 'Retirement and benefits provider',
    logo: '/brokers/principal.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    features: ['401(k) Plans', 'Pension', 'Insurance'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'empower',
    name: 'Empower Retirement',
    description: 'Retirement plan services',
    logo: '/brokers/empower.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    features: ['401(k) Management', 'Personal Capital', 'Wealth Tools'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'voya',
    name: 'Voya Financial',
    description: 'Retirement and employee benefits',
    logo: '/brokers/voya.png',
    assetClasses: ['stocks', 'bonds', 'etfs', 'mutual_funds'],
    features: ['401(k)', '403(b)', 'IRAs'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  // ===== CRYPTO EXCHANGES =====
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
    id: 'gemini',
    name: 'Gemini',
    description: 'Regulated cryptocurrency exchange',
    logo: '/brokers/gemini.png',
    assetClasses: ['crypto'],
    features: ['Regulated', 'Earn Interest', 'ActiveTrader'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  // ===== FOREX BROKERS =====
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
    id: 'forex_com',
    name: 'FOREX.com',
    description: 'Major forex and CFD trading platform',
    logo: '/brokers/forex_com.png',
    assetClasses: ['forex', 'cfd', 'crypto'],
    features: ['70+ Currency Pairs', 'Advanced Charts', 'MT4/MT5'],
    paperTrading: true,
    oauth: false,
    region: ['US', 'EU'],
    popular: false
  },
  {
    id: 'ig',
    name: 'IG',
    description: 'Global CFD and forex broker',
    logo: '/brokers/ig.png',
    assetClasses: ['forex', 'cfd', 'stocks', 'indices'],
    features: ['17,000+ Markets', 'Spread Betting', 'ProRealTime'],
    paperTrading: true,
    oauth: false,
    region: ['UK', 'EU', 'US'],
    popular: false
  },
  // ===== OPTIONS & FUTURES SPECIALISTS =====
  {
    id: 'tastytrade',
    name: 'tastytrade',
    description: 'Options-focused trading platform',
    logo: '/brokers/tastytrade.png',
    assetClasses: ['stocks', 'options', 'futures'],
    features: ['Options Analytics', 'Low Commissions', 'Education'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
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
    id: 'tradestation',
    name: 'TradeStation',
    description: 'Professional trading platform',
    logo: '/brokers/tradestation.png',
    assetClasses: ['stocks', 'options', 'futures', 'crypto'],
    features: ['EasyLanguage', 'Advanced Charting', 'Backtesting'],
    paperTrading: true,
    oauth: true,
    region: ['US'],
    popular: false
  },
  // ===== OTHER ONLINE BROKERS =====
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
    id: 'sofi',
    name: 'SoFi Invest',
    description: 'All-in-one financial platform',
    logo: '/brokers/sofi.png',
    assetClasses: ['stocks', 'crypto', 'etfs'],
    features: ['Fractional Shares', 'Auto-Invest', 'Crypto'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'public',
    name: 'Public',
    description: 'Social investing platform',
    logo: '/brokers/public.png',
    assetClasses: ['stocks', 'crypto', 'etfs', 'bonds'],
    features: ['Social Features', 'Fractional Shares', 'Treasury Bills'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  {
    id: 'firstrade',
    name: 'Firstrade',
    description: 'Commission-free online broker',
    logo: '/brokers/firstrade.png',
    assetClasses: ['stocks', 'options', 'etfs', 'mutual_funds'],
    features: ['Commission-Free', 'Options Trading', 'Research'],
    paperTrading: false,
    oauth: true,
    region: ['US'],
    popular: false
  },
  // ===== INTERNATIONAL BROKERS =====
  {
    id: 'degiro',
    name: 'DEGIRO',
    description: 'Low-cost European broker',
    logo: '/brokers/degiro.png',
    assetClasses: ['stocks', 'etfs', 'options', 'futures'],
    features: ['Low Fees', 'Global Markets', 'ETF Selection'],
    paperTrading: false,
    oauth: true,
    region: ['EU'],
    popular: false
  },
  {
    id: 'saxo',
    name: 'Saxo Bank',
    description: 'Multi-asset trading and investment platform',
    logo: '/brokers/saxo.png',
    assetClasses: ['stocks', 'forex', 'options', 'futures', 'bonds', 'cfd'],
    features: ['40,000+ Instruments', 'Professional Tools', 'Research'],
    paperTrading: true,
    oauth: true,
    region: ['EU', 'Asia', 'Middle East'],
    popular: false
  },
  {
    id: 'trading212',
    name: 'Trading 212',
    description: 'Commission-free investing app',
    logo: '/brokers/trading212.png',
    assetClasses: ['stocks', 'etfs', 'cfd'],
    features: ['Commission-Free', 'Fractional Shares', 'Pies'],
    paperTrading: true,
    oauth: true,
    region: ['UK', 'EU'],
    popular: false
  },
  // ===== AGGREGATORS =====
  {
    id: 'snaptrade',
    name: 'SnapTrade',
    description: 'Universal brokerage connector (90+ brokers)',
    logo: '/brokers/snaptrade.png',
    assetClasses: ['stocks', 'options', 'crypto'],
    features: ['Multi-Broker', 'Universal API', 'Portfolio Sync'],
    paperTrading: false,
    oauth: true,
    region: ['US', 'Canada'],
    popular: false
  },
  {
    id: 'plaid',
    name: 'Plaid',
    description: 'Financial data aggregator',
    logo: '/brokers/plaid.png',
    assetClasses: ['stocks', 'etfs', 'mutual_funds'],
    features: ['Bank Connections', 'Portfolio Import', 'Transaction History'],
    paperTrading: false,
    oauth: true,
    region: ['US', 'Canada', 'UK'],
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

  // Credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<AvailableBroker | null>(null);
  const [credentialsForm, setCredentialsForm] = useState({
    apiKey: '',
    apiSecret: '',
    isPaper: true,
    passphrase: '', // For some brokers like Coinbase Pro
  });
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Broker settings modal state
  const [showBrokerSettings, setShowBrokerSettings] = useState(false);
  const [editingBroker, setEditingBroker] = useState<BrokerConnection | null>(null);
  const [brokerSettingsForm, setBrokerSettingsForm] = useState({
    isPaper: true,
    tradingEnabled: true,
    maxPositionSize: 10,
    defaultOrderType: 'market' as 'market' | 'limit',
    stopLossPercent: 5,
    riskLevel: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
  });

  // Fetch broker connections from MongoDB via backend
  const fetchBrokerStatus = useCallback(async () => {
    try {
      // Fetch user's saved broker connections from MongoDB
      const connectionsResponse = await fetch(`${API_BASE}/brokers/connections`, {
        headers: getAuthHeaders(),
      });

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        if (connectionsData.success && connectionsData.data) {
          const brokerConnections: BrokerConnection[] = connectionsData.data.map((b: any) => ({
            id: b.id,
            brokerId: b.brokerId,
            brokerName: b.brokerName,
            brokerLogo: b.brokerLogo || `/brokers/${b.brokerId}.png`,
            status: b.status || 'connected',
            accountType: b.accountType || 'paper',
            accountId: b.accountId,
            balance: b.balance || 0,
            buyingPower: b.buyingPower || 0,
            lastSync: b.lastSync ? new Date(b.lastSync).toLocaleString() : 'Unknown',
            assetClasses: b.assetClasses || ['stocks'],
          }));
          setConnections(brokerConnections);
          setIsConnected(brokerConnections.length > 0);
        } else {
          setConnections([]);
          setIsConnected(false);
        }
      } else {
        // API failed - show empty state (NO mock data!)
        setConnections([]);
        setIsConnected(false);
      }

      // Also fetch venue data for display
      try {
        const venueResponse = await fetch(`${API_BASE}/advanced-broker/venues`, {
          headers: getAuthHeaders(),
        });
        if (venueResponse.ok) {
          const venueData = await venueResponse.json();
          if (venueData.success && venueData.data?.venues) {
            setVenues(venueData.data.venues);
          }
        }
      } catch {
        // Venues are optional - don't fail the whole page
      }
    } catch (error) {
      // Error handled - show empty state (NO mock data!)
      setConnections([]);
      setIsConnected(false);
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

  // Open credentials modal for broker connection
  const openCredentialsModal = (broker: AvailableBroker) => {
    setSelectedBroker(broker);
    setCredentialsForm({
      apiKey: '',
      apiSecret: '',
      isPaper: broker.paperTrading, // Default to paper if available
      passphrase: '',
    });
    setCredentialsError(null);
    setShowCredentialsModal(true);
  };

  // Connect to broker with credentials - actually connects to real broker API
  const connectBrokerWithCredentials = async () => {
    if (!selectedBroker) return;

    // Validate inputs
    if (!credentialsForm.apiKey.trim()) {
      setCredentialsError('API Key is required');
      return;
    }
    if (!credentialsForm.apiSecret.trim()) {
      setCredentialsError('API Secret is required');
      return;
    }

    setIsVerifying(true);
    setCredentialsError(null);
    setConnecting(selectedBroker.id);

    try {
      // First verify the credentials work by connecting to the real broker
      const response = await fetch(`${API_BASE}/brokers/connect`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          brokerId: selectedBroker.id,
          brokerName: selectedBroker.name,
          apiKey: credentialsForm.apiKey.trim(),
          apiSecret: credentialsForm.apiSecret.trim(),
          passphrase: credentialsForm.passphrase.trim() || undefined,
          isPaper: credentialsForm.isPaper,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success! Close modals and refresh
        setShowCredentialsModal(false);
        setShowAddBroker(false);
        setSelectedBroker(null);
        await fetchBrokerStatus();
      } else {
        // Show specific error
        setCredentialsError(data.error || 'Failed to connect. Check your API credentials.');
      }
    } catch (error) {
      setCredentialsError('Network error. Please check your connection.');
    } finally {
      setIsVerifying(false);
      setConnecting(null);
    }
  };

  // Disconnect broker - removes from MongoDB via backend
  const disconnectBroker = async (connectionId: string) => {
    // Find the broker to get its brokerId
    const connection = connections.find(c => c.id === connectionId);
    const brokerId = connection?.brokerId || connectionId;

    try {
      const response = await fetch(`${API_BASE}/brokers/disconnect/${brokerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        // Success - refresh the list
        await fetchBrokerStatus();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to disconnect broker');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  // Refresh broker data - updates lastSync in MongoDB
  const refreshBroker = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    const brokerId = connection?.brokerId || connectionId;

    try {
      await fetch(`${API_BASE}/brokers/${brokerId}/sync`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      // Refresh the list to show updated lastSync
      await fetchBrokerStatus();
    } catch (error) {
      // Silent fail - just refresh anyway
      fetchBrokerStatus();
    }
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
                          onClick={() => {
                            setEditingBroker(connection);
                            setBrokerSettingsForm({
                              isPaper: connection.accountType === 'paper',
                              tradingEnabled: true,
                              maxPositionSize: 10,
                              defaultOrderType: 'market',
                              stopLossPercent: 5,
                              riskLevel: 'moderate',
                            });
                            setShowBrokerSettings(true);
                          }}
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
                  const isAlreadyConnected = connections.some(c => c.brokerId === broker.id);
                  const isConnecting = connecting === broker.id;

                  return (
                    <div
                      key={broker.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isAlreadyConnected
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
                          onClick={() => !isAlreadyConnected && openCredentialsModal(broker)}
                          disabled={isAlreadyConnected || isConnecting}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            isAlreadyConnected
                              ? 'bg-green-500/20 text-green-400 cursor-default'
                              : isConnecting
                              ? 'bg-slate-700 text-slate-400 cursor-wait'
                              : 'bg-time-primary hover:bg-time-primary/80 text-white'
                          }`}
                        >
                          {isAlreadyConnected ? (
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

      {/* API Credentials Modal */}
      {showCredentialsModal && selectedBroker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {selectedBroker.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Connect {selectedBroker.name}</h2>
                  <p className="text-xs text-slate-400">Enter your API credentials</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setSelectedBroker(null);
                  setCredentialsError(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 text-xl"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* Error message */}
              {credentialsError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400">{credentialsError}</span>
                </div>
              )}

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={credentialsForm.apiKey}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-time-primary focus:border-transparent"
                />
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  API Secret <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKeys[selectedBroker.id] ? 'text' : 'password'}
                    value={credentialsForm.apiSecret}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, apiSecret: e.target.value })}
                    placeholder="Enter your API secret"
                    className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-time-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeys({ ...showApiKeys, [selectedBroker.id]: !showApiKeys[selectedBroker.id] })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                  >
                    {showApiKeys[selectedBroker.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Passphrase (for some brokers like Coinbase Pro) */}
              {(selectedBroker.id === 'coinbase' || selectedBroker.id === 'kraken') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Passphrase
                  </label>
                  <input
                    type="password"
                    value={credentialsForm.passphrase}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, passphrase: e.target.value })}
                    placeholder="Enter passphrase (if required)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-time-primary focus:border-transparent"
                  />
                </div>
              )}

              {/* Paper/Live Toggle */}
              {selectedBroker.paperTrading && (
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Trading Mode</p>
                    <p className="text-xs text-slate-400">
                      {credentialsForm.isPaper ? 'Paper trading - no real money' : 'LIVE trading - real money!'}
                    </p>
                  </div>
                  <button
                    onClick={() => setCredentialsForm({ ...credentialsForm, isPaper: !credentialsForm.isPaper })}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      credentialsForm.isPaper ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        credentialsForm.isPaper ? 'translate-x-0' : 'translate-x-7'
                      }`}
                    />
                    <span className={`absolute top-1.5 text-xs font-bold ${
                      credentialsForm.isPaper ? 'right-2 text-yellow-900' : 'left-1.5 text-green-900'
                    }`}>
                      {credentialsForm.isPaper ? 'P' : 'L'}
                    </span>
                  </button>
                </div>
              )}

              {/* Help text */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Where to find your API keys:</strong> Log into {selectedBroker.name},
                  go to Settings → API Keys → Create New Key. Make sure to enable trading permissions.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setSelectedBroker(null);
                  setCredentialsError(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={connectBrokerWithCredentials}
                disabled={isVerifying}
                className="flex-1 py-2.5 bg-time-primary hover:bg-time-primary/80 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect Broker
                  </>
                )}
              </button>
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

      {/* Broker Settings Modal */}
      {showBrokerSettings && editingBroker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-time-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{editingBroker.brokerName} Settings</h2>
                  <p className="text-xs text-slate-400">Configure broker connection</p>
                </div>
              </div>
              <button
                onClick={() => setShowBrokerSettings(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Account Info */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Account ID</span>
                  <span className="text-sm font-mono text-white">{editingBroker.accountId || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Balance</span>
                  <span className="text-sm font-semibold text-white">
                    ${editingBroker.balance?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Last Sync</span>
                  <span className="text-sm text-slate-300">
                    {editingBroker.lastSync || 'Never'}
                  </span>
                </div>
              </div>

              {/* Trading Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Trading Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBrokerSettingsForm({ ...brokerSettingsForm, isPaper: true })}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      brokerSettingsForm.isPaper
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <p className="font-medium">Paper Trading</p>
                    <p className="text-xs mt-1">No real money</p>
                  </button>
                  <button
                    onClick={() => setBrokerSettingsForm({ ...brokerSettingsForm, isPaper: false })}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      !brokerSettingsForm.isPaper
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <p className="font-medium">Live Trading</p>
                    <p className="text-xs mt-1">Real money</p>
                  </button>
                </div>
              </div>

              {/* Trading Enabled */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Trading Enabled</p>
                  <p className="text-xs text-slate-500">Allow TIME to execute trades</p>
                </div>
                <button
                  onClick={() => setBrokerSettingsForm({ ...brokerSettingsForm, tradingEnabled: !brokerSettingsForm.tradingEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    brokerSettingsForm.tradingEnabled ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      brokerSettingsForm.tradingEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Risk Settings */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Risk Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setBrokerSettingsForm({ ...brokerSettingsForm, riskLevel: level })}
                      className={`p-3 rounded-lg border text-center transition-all text-sm ${
                        brokerSettingsForm.riskLevel === level
                          ? level === 'conservative' ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : level === 'moderate' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                          : 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Size */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Position Size (% of portfolio)
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brokerSettingsForm.maxPositionSize}
                  onChange={(e) => setBrokerSettingsForm({ ...brokerSettingsForm, maxPositionSize: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1%</span>
                  <span className="text-white font-medium">{brokerSettingsForm.maxPositionSize}%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Stop Loss */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Default Stop Loss (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={brokerSettingsForm.stopLossPercent}
                  onChange={(e) => setBrokerSettingsForm({ ...brokerSettingsForm, stopLossPercent: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-time-primary"
                />
              </div>

              {/* Default Order Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Default Order Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['market', 'limit'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setBrokerSettingsForm({ ...brokerSettingsForm, defaultOrderType: type })}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        brokerSettingsForm.defaultOrderType === type
                          ? 'bg-time-primary/20 border-time-primary text-time-primary'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowBrokerSettings(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Save settings to backend
                  try {
                    await fetch(`${API_BASE}/brokers/connections/${editingBroker.id}/settings`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders(),
                      },
                      body: JSON.stringify(brokerSettingsForm),
                    });
                  } catch (e) {
                    // Settings saved locally
                  }

                  // Update local state
                  setConnections(connections.map(c => {
                    if (c.id === editingBroker.id) {
                      return {
                        ...c,
                        accountType: brokerSettingsForm.isPaper ? 'paper' : 'live',
                      };
                    }
                    return c;
                  }));

                  setShowBrokerSettings(false);
                }}
                className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
