'use client';

import { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  Key,
  Wallet,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Plus,
  ExternalLink,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';
import clsx from 'clsx';

type Tab = 'profile' | 'notifications' | 'security' | 'brokers' | 'preferences';

interface BrokerConnection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastSync: Date;
  apiKey?: string;
  accountId?: string;
}

interface AvailableBroker {
  id: string;
  name: string;
  type: string;
  description: string;
  logo: string;
  requiresApiKey: boolean;
  requiresSecret: boolean;
  requiresAccountId: boolean;
  paperTrading: boolean;
  docsUrl: string;
}

const availableBrokers: AvailableBroker[] = [
  {
    id: 'alpaca',
    name: 'Alpaca',
    type: 'Stock/Crypto',
    description: 'Commission-free stock and crypto trading API',
    logo: '🦙',
    requiresApiKey: true,
    requiresSecret: true,
    requiresAccountId: false,
    paperTrading: true,
    docsUrl: 'https://alpaca.markets/docs/api-documentation/'
  },
  {
    id: 'oanda',
    name: 'OANDA',
    type: 'Forex',
    description: 'Professional forex trading with 70+ currency pairs',
    logo: '💱',
    requiresApiKey: true,
    requiresSecret: false,
    requiresAccountId: true,
    paperTrading: true,
    docsUrl: 'https://developer.oanda.com/rest-live-v20/introduction/'
  },
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    type: 'Multi-Asset',
    description: 'Global trading across stocks, options, futures, forex',
    logo: '🏦',
    requiresApiKey: false,
    requiresSecret: false,
    requiresAccountId: true,
    paperTrading: true,
    docsUrl: 'https://interactivebrokers.github.io/tws-api/'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Pro',
    type: 'Crypto',
    description: 'Advanced cryptocurrency trading platform',
    logo: '🪙',
    requiresApiKey: true,
    requiresSecret: true,
    requiresAccountId: false,
    paperTrading: false,
    docsUrl: 'https://docs.cloud.coinbase.com/exchange/docs'
  },
  {
    id: 'binance',
    name: 'Binance',
    type: 'Crypto/Futures',
    description: 'World\'s largest crypto exchange with spot and futures',
    logo: '⚡',
    requiresApiKey: true,
    requiresSecret: true,
    requiresAccountId: false,
    paperTrading: true,
    docsUrl: 'https://binance-docs.github.io/apidocs/'
  },
  {
    id: 'mt5',
    name: 'MetaTrader 5',
    type: 'Forex/CFD',
    description: 'Connect to any MT5 broker account',
    logo: '📊',
    requiresApiKey: false,
    requiresSecret: false,
    requiresAccountId: true,
    paperTrading: true,
    docsUrl: 'https://www.mql5.com/en/docs'
  },
];

const initialBrokers: BrokerConnection[] = [
  { id: '1', name: 'Alpaca', type: 'Stock/Crypto', status: 'disconnected', lastSync: new Date() },
  { id: '2', name: 'OANDA', type: 'Forex', status: 'disconnected', lastSync: new Date(Date.now() - 86400000) },
  { id: '3', name: 'Interactive Brokers', type: 'Multi-Asset', status: 'disconnected', lastSync: new Date(Date.now() - 172800000) },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  // Broker connection states
  const [brokers, setBrokers] = useState<BrokerConnection[]>(initialBrokers);
  const [showAddBrokerModal, setShowAddBrokerModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<AvailableBroker | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Connection form
  const [connectionForm, setConnectionForm] = useState({
    apiKey: '',
    secretKey: '',
    accountId: '',
    paperTrading: true,
  });

  // Form states
  const [profile, setProfile] = useState({
    name: 'Timebeunus Boyd',
    email: 'timebeunus@example.com',
    timezone: 'America/New_York',
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    tradeExecutions: true,
    dailySummary: true,
    weeklyReport: true,
    riskAlerts: true,
    insightAlerts: true,
  });

  const [riskSettings, setRiskSettings] = useState({
    maxPositionSize: 2,
    maxDailyLoss: 5,
    maxDrawdown: 15,
    emergencyBrakeEnabled: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setNotification({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setNotification(null), 3000);
    }, 1500);
  };

  const openConnectModal = (broker: AvailableBroker) => {
    setSelectedBroker(broker);
    setConnectionForm({ apiKey: '', secretKey: '', accountId: '', paperTrading: true });
    setShowConnectModal(true);
  };

  const handleConnect = async () => {
    if (!selectedBroker) return;

    // Validate required fields
    if (selectedBroker.requiresApiKey && !connectionForm.apiKey) {
      setNotification({ type: 'error', message: 'API Key is required' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (selectedBroker.requiresSecret && !connectionForm.secretKey) {
      setNotification({ type: 'error', message: 'Secret Key is required' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (selectedBroker.requiresAccountId && !connectionForm.accountId) {
      setNotification({ type: 'error', message: 'Account ID is required' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsConnecting(true);

    // Simulate API call to backend
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Update broker status
    const existingIndex = brokers.findIndex(b => b.name === selectedBroker.name);
    if (existingIndex >= 0) {
      setBrokers(prev => prev.map((b, i) =>
        i === existingIndex
          ? { ...b, status: 'connected' as const, lastSync: new Date(), apiKey: connectionForm.apiKey }
          : b
      ));
    } else {
      setBrokers(prev => [...prev, {
        id: Date.now().toString(),
        name: selectedBroker.name,
        type: selectedBroker.type,
        status: 'connected',
        lastSync: new Date(),
        apiKey: connectionForm.apiKey,
        accountId: connectionForm.accountId,
      }]);
    }

    setIsConnecting(false);
    setShowConnectModal(false);
    setShowAddBrokerModal(false);
    setNotification({ type: 'success', message: `Successfully connected to ${selectedBroker.name}!` });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDisconnect = async (brokerId: string) => {
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker) return;

    setBrokers(prev => prev.map(b =>
      b.id === brokerId ? { ...b, status: 'disconnected' as const } : b
    ));

    setNotification({ type: 'success', message: `Disconnected from ${broker.name}` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSyncBroker = async (brokerId: string) => {
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker || broker.status !== 'connected') return;

    setBrokers(prev => prev.map(b =>
      b.id === brokerId ? { ...b, status: 'connecting' as const } : b
    ));

    await new Promise(resolve => setTimeout(resolve, 1500));

    setBrokers(prev => prev.map(b =>
      b.id === brokerId ? { ...b, status: 'connected' as const, lastSync: new Date() } : b
    ));

    setNotification({ type: 'success', message: `${broker.name} synced successfully!` });
    setTimeout(() => setNotification(null), 3000);
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Risk', icon: Shield },
    { id: 'brokers', label: 'Broker Connections', icon: Wallet },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400">Manage your account and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
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
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Profile Settings</h2>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-time-primary to-time-secondary flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <button className="btn-secondary text-sm">Change Avatar</button>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400">Delivery Methods</h3>
                {[
                  { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive notifications via email' },
                  { key: 'smsAlerts', label: 'SMS Alerts', desc: 'Receive text message notifications' },
                  { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({
                        ...notifications,
                        [item.key]: !notifications[item.key as keyof typeof notifications]
                      })}
                      className={clsx(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-time-primary'
                          : 'bg-slate-600'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400">Alert Types</h3>
                {[
                  { key: 'tradeExecutions', label: 'Trade Executions', desc: 'When trades are opened or closed' },
                  { key: 'riskAlerts', label: 'Risk Alerts', desc: 'Important risk warnings and breaches' },
                  { key: 'insightAlerts', label: 'Insight Alerts', desc: 'New insights and opportunities' },
                  { key: 'dailySummary', label: 'Daily Summary', desc: 'End of day performance summary' },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly performance report' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({
                        ...notifications,
                        [item.key]: !notifications[item.key as keyof typeof notifications]
                      })}
                      className={clsx(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-time-primary'
                          : 'bg-slate-600'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">Risk Management</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Position Size (%)
                    </label>
                    <input
                      type="number"
                      value={riskSettings.maxPositionSize}
                      onChange={(e) => setRiskSettings({ ...riskSettings, maxPositionSize: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Maximum % of portfolio per trade</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Daily Loss (%)
                    </label>
                    <input
                      type="number"
                      value={riskSettings.maxDailyLoss}
                      onChange={(e) => setRiskSettings({ ...riskSettings, maxDailyLoss: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Stop trading after this daily loss</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Drawdown (%)
                    </label>
                    <input
                      type="number"
                      value={riskSettings.maxDrawdown}
                      onChange={(e) => setRiskSettings({ ...riskSettings, maxDrawdown: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Maximum portfolio drawdown allowed</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Emergency Brake</p>
                      <p className="text-xs text-slate-400">Automatically halt all trading on risk breach</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRiskSettings({
                      ...riskSettings,
                      emergencyBrakeEnabled: !riskSettings.emergencyBrakeEnabled
                    })}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      riskSettings.emergencyBrakeEnabled ? 'bg-red-500' : 'bg-slate-600'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        riskSettings.emergencyBrakeEnabled ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white">Security</h2>

                <button className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-slate-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Change Password</p>
                      <p className="text-xs text-slate-500">Update your account password</p>
                    </div>
                  </div>
                  <span className="text-slate-400">→</span>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-slate-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-500">Add an extra layer of security</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">Not Enabled</span>
                </button>
              </div>
            </div>
          )}

          {/* Brokers Tab */}
          {activeTab === 'brokers' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Broker Connections</h2>
                <button
                  onClick={() => setShowAddBrokerModal(true)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Broker
                </button>
              </div>

              <div className="space-y-4">
                {brokers.map((broker) => (
                  <div key={broker.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        broker.status === 'connected' ? 'bg-green-500/20' :
                        broker.status === 'connecting' ? 'bg-blue-500/20' :
                        broker.status === 'error' ? 'bg-red-500/20' : 'bg-slate-700'
                      )}>
                        {broker.status === 'connecting' ? (
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        ) : (
                          <Wallet className={clsx(
                            'w-5 h-5',
                            broker.status === 'connected' ? 'text-green-400' :
                            broker.status === 'error' ? 'text-red-400' : 'text-slate-400'
                          )} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{broker.name}</p>
                        <p className="text-xs text-slate-500">{broker.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {broker.status === 'connected' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : broker.status === 'connecting' ? (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          ) : broker.status === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-500" />
                          )}
                          <span className={clsx(
                            'text-sm capitalize',
                            broker.status === 'connected' ? 'text-green-400' :
                            broker.status === 'connecting' ? 'text-blue-400' :
                            broker.status === 'error' ? 'text-red-400' : 'text-slate-400'
                          )}>
                            {broker.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Last sync: {broker.lastSync.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {broker.status === 'connected' && (
                          <button
                            onClick={() => handleSyncBroker(broker.id)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title="Sync broker"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {broker.status === 'connected' ? (
                          <button
                            onClick={() => handleDisconnect(broker.id)}
                            className="btn-secondary text-sm flex items-center gap-1 text-red-400 hover:text-red-300"
                          >
                            <Unlink className="w-3 h-3" />
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const availBroker = availableBrokers.find(b => b.name === broker.name);
                              if (availBroker) openConnectModal(availBroker);
                            }}
                            className="btn-primary text-sm flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                onClick={() => setShowAddBrokerModal(true)}
                className="p-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700 cursor-pointer hover:border-time-primary/50 hover:bg-slate-800/50 transition-all"
              >
                <p className="text-sm text-slate-400 text-center">
                  + Connect more brokers to enable multi-asset trading and better diversification
                </p>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Display Preferences</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Theme
                  </label>
                  <div className="flex gap-3">
                    {[
                      { id: 'dark', icon: Moon, label: 'Dark' },
                      { id: 'light', icon: Sun, label: 'Light' },
                      { id: 'system', icon: Monitor, label: 'System' },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setTheme(option.id as typeof theme)}
                          className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all',
                            theme === option.id
                              ? 'bg-time-primary/20 border-time-primary/50 text-time-primary'
                              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Language
                  </label>
                  <select className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Currency Display
                  </label>
                  <select className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={clsx(
          'fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up',
          notification.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
        )}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-white" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-white" />
          )}
          <span className="text-white font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Broker Modal */}
      {showAddBrokerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700/50 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Add Broker Connection</h2>
                <p className="text-sm text-slate-400 mt-1">Select a broker to connect your trading account</p>
              </div>
              <button
                onClick={() => setShowAddBrokerModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableBrokers.map((broker) => {
                  const isAlreadyConnected = brokers.some(b => b.name === broker.name && b.status === 'connected');
                  return (
                    <div
                      key={broker.id}
                      onClick={() => !isAlreadyConnected && openConnectModal(broker)}
                      className={clsx(
                        'p-4 rounded-lg border transition-all',
                        isAlreadyConnected
                          ? 'bg-green-500/10 border-green-500/30 cursor-not-allowed'
                          : 'bg-slate-800/50 border-slate-700/50 cursor-pointer hover:border-time-primary/50 hover:bg-slate-800'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{broker.logo}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">{broker.name}</h3>
                            {isAlreadyConnected && (
                              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{broker.type}</p>
                          <p className="text-xs text-slate-400 mt-2">{broker.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            {broker.paperTrading && (
                              <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                                Paper Trading
                              </span>
                            )}
                            <a
                              href={broker.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-time-primary hover:underline flex items-center gap-1"
                            >
                              Docs <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Broker Modal */}
      {showConnectModal && selectedBroker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700/50 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selectedBroker.logo}</div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Connect {selectedBroker.name}</h2>
                  <p className="text-xs text-slate-400">{selectedBroker.type}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedBroker(null);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* API Key */}
              {selectedBroker.requiresApiKey && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Key <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={connectionForm.apiKey}
                      onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
                      placeholder="Enter your API key"
                      className="w-full px-4 py-2 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Secret Key */}
              {selectedBroker.requiresSecret && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Secret Key <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={connectionForm.secretKey}
                      onChange={(e) => setConnectionForm({ ...connectionForm, secretKey: e.target.value })}
                      placeholder="Enter your secret key"
                      className="w-full px-4 py-2 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Account ID */}
              {selectedBroker.requiresAccountId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Account ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={connectionForm.accountId}
                    onChange={(e) => setConnectionForm({ ...connectionForm, accountId: e.target.value })}
                    placeholder="Enter your account ID"
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                  />
                </div>
              )}

              {/* Paper Trading Toggle */}
              {selectedBroker.paperTrading && (
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Paper Trading</p>
                    <p className="text-xs text-slate-500">Use simulated trading (no real money)</p>
                  </div>
                  <button
                    onClick={() => setConnectionForm({
                      ...connectionForm,
                      paperTrading: !connectionForm.paperTrading
                    })}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      connectionForm.paperTrading ? 'bg-time-primary' : 'bg-slate-600'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        connectionForm.paperTrading ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              )}

              {/* Security Notice */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Security Notice</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Your credentials are encrypted and stored securely. We recommend using API keys with trading-only permissions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Connect {selectedBroker.name}
                  </>
                )}
              </button>

              {/* Help Link */}
              <p className="text-xs text-center text-slate-500">
                Need help?{' '}
                <a
                  href={selectedBroker.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-time-primary hover:underline"
                >
                  View {selectedBroker.name} documentation
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
