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
  CheckCircle
} from 'lucide-react';
import clsx from 'clsx';

type Tab = 'profile' | 'notifications' | 'security' | 'brokers' | 'preferences';

interface BrokerConnection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: Date;
}

const mockBrokers: BrokerConnection[] = [
  { id: '1', name: 'Alpaca', type: 'Stock/Crypto', status: 'connected', lastSync: new Date() },
  { id: '2', name: 'OANDA', type: 'Forex', status: 'disconnected', lastSync: new Date(Date.now() - 86400000) },
  { id: '3', name: 'Interactive Brokers', type: 'Multi-Asset', status: 'disconnected', lastSync: new Date(Date.now() - 172800000) },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

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
    setTimeout(() => setIsSaving(false), 1500);
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
                <button className="btn-primary text-sm">Add Broker</button>
              </div>

              <div className="space-y-4">
                {mockBrokers.map((broker) => (
                  <div key={broker.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        broker.status === 'connected' ? 'bg-green-500/20' :
                        broker.status === 'error' ? 'bg-red-500/20' : 'bg-slate-700'
                      )}>
                        <Wallet className={clsx(
                          'w-5 h-5',
                          broker.status === 'connected' ? 'text-green-400' :
                          broker.status === 'error' ? 'text-red-400' : 'text-slate-400'
                        )} />
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
                          ) : broker.status === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-500" />
                          )}
                          <span className={clsx(
                            'text-sm capitalize',
                            broker.status === 'connected' ? 'text-green-400' :
                            broker.status === 'error' ? 'text-red-400' : 'text-slate-400'
                          )}>
                            {broker.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Last sync: {broker.lastSync.toLocaleDateString()}
                        </p>
                      </div>
                      <button className="btn-secondary text-sm">
                        {broker.status === 'connected' ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                <p className="text-sm text-slate-400 text-center">
                  Connect more brokers to enable multi-asset trading and better diversification
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
    </div>
  );
}
