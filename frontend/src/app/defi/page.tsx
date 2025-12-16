'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  TrendingUp,
  Percent,
  Lock,
  Unlock,
  ArrowRightLeft,
  Droplets,
  Wallet,
  Shield,
  Zap,
  Clock,
  AlertTriangle,
  ExternalLink,
  Info,
  X,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

interface Pool {
  id: string;
  name: string;
  protocol: string;
  tokens: string[];
  tvl: number;
  apy: number;
  apr: number;
  rewards: string;
  risk: 'low' | 'medium' | 'high';
  userStaked?: number;
  userRewards?: number;
}

interface StakingOption {
  id: string;
  token: string;
  name: string;
  apy: number;
  lockPeriod: string;
  minStake: number;
  totalStaked: number;
  userStaked?: number;
}

const liquidityPools: Pool[] = [
  { id: '1', name: 'ETH/USDC', protocol: 'Uniswap V3', tokens: ['ETH', 'USDC'], tvl: 245000000, apy: 12.5, apr: 11.2, rewards: 'UNI', risk: 'low', userStaked: 5000, userRewards: 125.50 },
  { id: '2', name: 'BTC/ETH', protocol: 'Curve', tokens: ['WBTC', 'ETH'], tvl: 180000000, apy: 8.2, apr: 7.8, rewards: 'CRV', risk: 'low', userStaked: 3200, userRewards: 65.20 },
  { id: '3', name: 'USDC/USDT', protocol: 'Aave', tokens: ['USDC', 'USDT'], tvl: 420000000, apy: 4.5, apr: 4.2, rewards: 'AAVE', risk: 'low' },
  { id: '4', name: 'ETH/TIME', protocol: 'TIME DEX', tokens: ['ETH', 'TIME'], tvl: 12500000, apy: 45.8, apr: 38.5, rewards: 'TIME', risk: 'medium', userStaked: 1500, userRewards: 340.00 },
  { id: '5', name: 'SOL/USDC', protocol: 'Raydium', tokens: ['SOL', 'USDC'], tvl: 85000000, apy: 18.3, apr: 16.2, rewards: 'RAY', risk: 'medium' },
  { id: '6', name: 'AVAX/ETH', protocol: 'TraderJoe', tokens: ['AVAX', 'ETH'], tvl: 45000000, apy: 22.1, apr: 19.5, rewards: 'JOE', risk: 'medium' },
];

const stakingOptions: StakingOption[] = [
  { id: '1', token: 'ETH', name: 'Ethereum Staking', apy: 4.2, lockPeriod: 'Flexible', minStake: 0.1, totalStaked: 28500000, userStaked: 2.5 },
  { id: '2', token: 'TIME', name: 'TIME Governance', apy: 25.5, lockPeriod: '30 days', minStake: 100, totalStaked: 5200000, userStaked: 500 },
  { id: '3', token: 'MATIC', name: 'Polygon Staking', apy: 5.8, lockPeriod: '21 days', minStake: 1, totalStaked: 15800000 },
  { id: '4', token: 'SOL', name: 'Solana Staking', apy: 7.2, lockPeriod: '2 epochs', minStake: 0.01, totalStaked: 42000000 },
  { id: '5', token: 'ATOM', name: 'Cosmos Staking', apy: 18.5, lockPeriod: '21 days', minStake: 0.1, totalStaked: 8900000 },
];

export default function DeFiPage() {
  const [activeTab, setActiveTab] = useState<'pools' | 'staking' | 'yield'>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // API connection state
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiPools, setApiPools] = useState<Pool[]>([]);
  const [apiStaking, setApiStaking] = useState<StakingOption[]>([]);
  const [apiPortfolio, setApiPortfolio] = useState<any>(null);

  const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', popular: true },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', popular: true },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', popular: true },
    { id: 'phantom', name: 'Phantom', icon: '👻', popular: false },
    { id: 'trust', name: 'Trust Wallet', icon: '🛡️', popular: false },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈', popular: false },
  ];

  // Fetch DeFi data from API
  const fetchDeFiData = useCallback(async () => {
    const startTime = Date.now();
    setIsRefreshing(true);

    try {
      const [protocolsRes, yieldRes, portfolioRes] = await Promise.all([
        fetch(`${API_BASE}/defi/protocols`).catch(() => null),
        fetch(`${API_BASE}/defi/yield-opportunities`).catch(() => null),
        fetch(`${API_BASE}/defi/portfolio`).catch(() => null),
      ]);

      if (protocolsRes?.ok) {
        const data = await protocolsRes.json();
        // Map API data to Pool format if available
        if (data.protocols && Array.isArray(data.protocols)) {
          setApiPools(data.protocols);
        }
      }

      if (yieldRes?.ok) {
        const data = await yieldRes.json();
        // Map API data to StakingOption format if available
        if (data.opportunities && Array.isArray(data.opportunities)) {
          setApiStaking(data.opportunities);
        }
      }

      if (portfolioRes?.ok) {
        const data = await portfolioRes.json();
        setApiPortfolio(data);
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch DeFi data:', error);
      setIsConnected(false);
    } finally {
      // Ensure loading indicator shows for at least 500ms
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed);
      setTimeout(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      }, remaining);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDeFiData();
  }, [fetchDeFiData]);

  // Refresh handler
  const handleRefresh = () => {
    fetchDeFiData();
  };

  const connectWallet = async (walletId: string) => {
    setIsConnecting(true);
    // Simulate wallet connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);
    setWalletAddress(mockAddress);
    setWalletConnected(true);
    setIsConnecting(false);
    setShowWalletModal(false);
    setNotification({ type: 'success', message: `Connected to ${wallets.find(w => w.id === walletId)?.name}!` });
    setTimeout(() => setNotification(null), 3000);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setNotification({ type: 'success', message: 'Wallet disconnected' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid amount' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsConnecting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnecting(false);
    setShowDepositModal(false);
    setDepositAmount('');
    setNotification({ type: 'success', message: `Successfully deposited $${depositAmount} to TIME Yield Optimizer!` });
    setTimeout(() => setNotification(null), 5000);
  };

  // Use API data if available, otherwise fallback to mock data
  const displayPools = apiPools.length > 0 ? apiPools : liquidityPools;
  const displayStaking = apiStaking.length > 0 ? apiStaking : stakingOptions;

  const totalTVL = displayPools.reduce((sum, p) => sum + p.tvl, 0);
  const userTotalStaked = displayPools.reduce((sum, p) => sum + (p.userStaked || 0), 0) +
                          displayStaking.reduce((sum, s) => sum + (s.userStaked || 0) * 100, 0);
  const userTotalRewards = displayPools.reduce((sum, p) => sum + (p.userRewards || 0), 0);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  // Show loading state on initial load
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
            <p className="text-white font-medium">Loading DeFi data...</p>
            <p className="text-sm text-slate-400 mt-1">Connecting to backend API</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">DeFi</h1>
            <p className="text-slate-400 mt-1">Earn yield through decentralized finance protocols</p>
          </div>
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            isConnected
              ? 'bg-green-500/20 border-green-500/30'
              : 'bg-yellow-500/20 border-yellow-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-yellow-500'
            } ${isConnected ? 'animate-pulse' : ''}`}></span>
            <span className={`text-xs font-medium ${
              isConnected ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {isConnected ? 'Live' : 'Demo'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {walletConnected ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-green-400 font-mono">{walletAddress}</span>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">Total TVL</span>
          </div>
          <p className="text-2xl font-bold text-white">${(totalTVL / 1000000000).toFixed(2)}B</p>
          <p className="text-xs text-green-400 mt-1">+2.4% this week</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-400">Your Staked</span>
          </div>
          <p className="text-2xl font-bold text-white">${userTotalStaked.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Across all protocols</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-slate-400">Pending Rewards</span>
          </div>
          <p className="text-2xl font-bold text-green-400">${userTotalRewards.toFixed(2)}</p>
          <button className="text-xs text-time-primary hover:text-time-primary/80 mt-1">Claim All</button>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">Avg APY</span>
          </div>
          <p className="text-2xl font-bold text-white">18.5%</p>
          <p className="text-xs text-slate-500 mt-1">Weighted average</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'pools', label: 'Liquidity Pools', icon: Droplets },
          { id: 'staking', label: 'Staking', icon: Lock },
          { id: 'yield', label: 'Yield Farming', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'pools' | 'staking' | 'yield')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-time-primary text-time-primary'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liquidity Pools Tab */}
      {activeTab === 'pools' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-3 font-medium">Pool</th>
                <th className="px-4 py-3 font-medium">Protocol</th>
                <th className="px-4 py-3 font-medium">TVL</th>
                <th className="px-4 py-3 font-medium">APY</th>
                <th className="px-4 py-3 font-medium">Rewards</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Your Position</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {displayPools.map(pool => (
                <tr key={pool.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {pool.tokens.map((token, i) => (
                          <div key={token} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white">
                            {token.slice(0, 2)}
                          </div>
                        ))}
                      </div>
                      <span className="font-medium text-white">{pool.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{pool.protocol}</td>
                  <td className="px-4 py-4 text-white font-medium">
                    ${(pool.tvl / 1000000).toFixed(1)}M
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-green-400 font-semibold">{pool.apy}%</span>
                    <span className="text-xs text-slate-500 ml-1">APY</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-slate-700 rounded text-xs text-white">
                      {pool.rewards}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(pool.risk)}`}>
                      {pool.risk.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {pool.userStaked ? (
                      <div>
                        <p className="text-white font-medium">${pool.userStaked.toLocaleString()}</p>
                        <p className="text-xs text-green-400">+${pool.userRewards?.toFixed(2)} rewards</p>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedPool(pool); setShowStakeModal(true); }}
                        className="px-3 py-1.5 bg-time-primary hover:bg-time-primary/80 rounded text-xs text-white font-medium"
                      >
                        Add
                      </button>
                      {pool.userStaked && (
                        <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white font-medium">
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staking Tab */}
      {activeTab === 'staking' && (
        <div className="grid grid-cols-3 gap-4">
          {displayStaking.map(option => (
            <div key={option.id} className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center text-white font-bold">
                    {option.token.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{option.name}</h3>
                    <p className="text-sm text-slate-400">{option.token}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">{option.apy}%</p>
                  <p className="text-xs text-slate-500">APY</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <p className="text-xs text-slate-500">Lock Period</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {option.lockPeriod}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <p className="text-xs text-slate-500">Min Stake</p>
                  <p className="text-white font-medium">{option.minStake} {option.token}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Total Staked</span>
                  <span>${(option.totalStaked / 1000000).toFixed(1)}M</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-time-primary to-time-secondary rounded-full"
                    style={{ width: `${Math.min((option.totalStaked / 50000000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {option.userStaked ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-green-400">Your Stake</p>
                      <p className="text-lg font-bold text-white">{option.userStaked} {option.token}</p>
                    </div>
                    <button className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded text-xs text-green-400 font-medium">
                      Unstake
                    </button>
                  </div>
                </div>
              ) : (
                <button className="w-full py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium transition-colors">
                  Stake {option.token}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Yield Farming Tab */}
      {activeTab === 'yield' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">TIME Yield Optimizer</h3>
                <p className="text-sm text-slate-400">Auto-compound your yields across multiple protocols</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Base APY</p>
                <p className="text-lg font-bold text-white">12.5%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Boost APY</p>
                <p className="text-lg font-bold text-green-400">+8.2%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Total APY</p>
                <p className="text-lg font-bold text-time-primary">20.7%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">TVL</p>
                <p className="text-lg font-bold text-white">$45.2M</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-300">
                The TIME Yield Optimizer automatically rebalances your position across the highest-yielding protocols
                while managing risk through diversification.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => walletConnected ? setShowDepositModal(true) : setShowWalletModal(true)}
                className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium transition-colors"
              >
                {walletConnected ? 'Deposit & Start Earning' : 'Connect Wallet to Deposit'}
              </button>
              <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Learn More
              </button>
            </div>
          </div>

          {/* Risk Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400 mb-1">DeFi Risk Disclaimer</h4>
              <p className="text-sm text-yellow-300/80">
                DeFi protocols carry inherent risks including smart contract vulnerabilities, impermanent loss,
                and market volatility. Only invest what you can afford to lose. Always do your own research.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stake Modal */}
      {showStakeModal && selectedPool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Add Liquidity to {selectedPool.name}</h3>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Pool APY</span>
                  <span className="text-green-400 font-semibold">{selectedPool.apy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Protocol</span>
                  <span className="text-white">{selectedPool.protocol}</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    placeholder="0.00"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600">
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="w-4 h-4" />
                <span>Risk Level: <span className={getRiskColor(selectedPool.risk).split(' ')[0]}>{selectedPool.risk}</span></span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStakeModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                >
                  Cancel
                </button>
                <button className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium">
                  Add Liquidity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Connect Wallet</h3>
              <button onClick={() => setShowWalletModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isConnecting ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
                <p className="text-white font-medium">Connecting...</p>
                <p className="text-sm text-slate-400 mt-1">Please approve the connection in your wallet</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-4">Select a wallet to connect to TIME DeFi</p>

                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Popular</p>
                  {wallets.filter(w => w.popular).map(wallet => (
                    <button
                      key={wallet.id}
                      onClick={() => connectWallet(wallet.id)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-time-primary/50 rounded-lg transition-colors"
                    >
                      <span className="text-2xl">{wallet.icon}</span>
                      <span className="text-white font-medium">{wallet.name}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">More Options</p>
                  {wallets.filter(w => !w.popular).map(wallet => (
                    <button
                      key={wallet.id}
                      onClick={() => connectWallet(wallet.id)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-time-primary/50 rounded-lg transition-colors"
                    >
                      <span className="text-2xl">{wallet.icon}</span>
                      <span className="text-white font-medium">{wallet.name}</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500 text-center mt-4">
                  By connecting, you agree to TIME&apos;s Terms of Service and Privacy Policy
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Deposit to TIME Yield Optimizer</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isConnecting ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-time-primary mx-auto animate-spin mb-4" />
                <p className="text-white font-medium">Processing Deposit...</p>
                <p className="text-sm text-slate-400 mt-1">Please confirm the transaction in your wallet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Current APY</span>
                    <span className="text-green-400 font-semibold">20.7%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Your Wallet</span>
                    <span className="text-white font-mono text-xs">{walletAddress}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Deposit Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-8 pr-20 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setDepositAmount('1000')}
                        className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                      >
                        $1K
                      </button>
                      <button
                        onClick={() => setDepositAmount('5000')}
                        className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                      >
                        $5K
                      </button>
                    </div>
                  </div>
                </div>

                {depositAmount && parseFloat(depositAmount) > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-sm text-green-400">
                      Estimated yearly earnings: <span className="font-bold">${(parseFloat(depositAmount) * 0.207).toFixed(2)}</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeposit}
                    className="flex-1 py-3 bg-time-primary hover:bg-time-primary/80 rounded-lg text-white font-medium"
                  >
                    Deposit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
