'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Zap, Lock, Unlock, CheckCircle2 } from 'lucide-react';

interface BrokerMode {
  id: string;
  name: string;
  mode: 'practice' | 'live';
  supportsToggle: boolean;
  liveEnabled: boolean;
}

interface TradingModeStatus {
  globalMode: 'practice' | 'live';
  liveUnlocked: boolean;
  brokers: BrokerMode[];
  warnings: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function TradingModeToggle() {
  const [status, setStatus] = useState<TradingModeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/trading-mode/status`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (err) {
      setError('Failed to fetch trading mode status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Toggle global mode
  const toggleMode = async () => {
    if (!status) return;

    // If switching to live, need to check if unlocked
    if (status.globalMode === 'practice') {
      if (!status.liveUnlocked) {
        setShowUnlockModal(true);
        return;
      }
      setShowConfirmation(true);
      return;
    }

    // Switching to practice mode - no confirmation needed
    setSwitching(true);
    try {
      const res = await fetch(`${API_BASE}/trading-mode/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'practice' })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        setError(data.data?.message || 'Failed to switch mode');
      }
    } catch (err) {
      setError('Failed to switch trading mode');
    } finally {
      setSwitching(false);
    }
  };

  // Confirm switch to live mode
  const confirmLiveMode = async () => {
    setSwitching(true);
    setShowConfirmation(false);
    try {
      const res = await fetch(`${API_BASE}/trading-mode/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'live',
          confirmation: 'I_UNDERSTAND_LIVE_TRADING_RISKS'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        setError(data.data?.message || 'Failed to switch to live mode');
      }
    } catch (err) {
      setError('Failed to switch to live mode');
    } finally {
      setSwitching(false);
    }
  };

  // Unlock live trading
  const unlockLiveTrading = async () => {
    setSwitching(true);
    try {
      const res = await fetch(`${API_BASE}/trading-mode/unlock-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acknowledgement: 'I_ACCEPT_ALL_TRADING_RISKS_AND_RESPONSIBILITY'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowUnlockModal(false);
        fetchStatus();
        // Now show the confirmation to switch to live
        setShowConfirmation(true);
      } else {
        setError(data.data?.message || 'Failed to unlock live trading');
      }
    } catch (err) {
      setError('Failed to unlock live trading');
    } finally {
      setSwitching(false);
    }
  };

  // Lock live trading
  const lockLiveTrading = async () => {
    setSwitching(true);
    try {
      const res = await fetch(`${API_BASE}/trading-mode/lock-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      setError('Failed to lock live trading');
    } finally {
      setSwitching(false);
    }
  };

  // Toggle individual broker mode
  const toggleBrokerMode = async (brokerId: string, currentMode: 'practice' | 'live') => {
    if (!status?.liveUnlocked && currentMode === 'practice') {
      setShowUnlockModal(true);
      return;
    }

    const newMode = currentMode === 'practice' ? 'live' : 'practice';

    try {
      const res = await fetch(`${API_BASE}/trading-mode/broker/${brokerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: newMode,
          confirmation: newMode === 'live' ? 'I_UNDERSTAND_LIVE_TRADING_RISKS' : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        setError(data.data?.message || `Failed to switch ${brokerId} mode`);
      }
    } catch (err) {
      setError(`Failed to switch ${brokerId} mode`);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
        <p className="text-red-400">Failed to load trading mode status</p>
      </div>
    );
  }

  const isPractice = status.globalMode === 'practice';

  return (
    <div className="space-y-6">
      {/* Main Toggle Card */}
      <div className={`rounded-lg p-6 border-2 transition-all ${
        isPractice
          ? 'bg-blue-900/30 border-blue-500'
          : 'bg-red-900/30 border-red-500'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isPractice ? (
              <Shield className="w-8 h-8 text-blue-400" />
            ) : (
              <Zap className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isPractice ? 'PRACTICE MODE' : 'LIVE MODE'}
              </h2>
              <p className={`text-sm ${isPractice ? 'text-blue-300' : 'text-red-300'}`}>
                {isPractice
                  ? 'Paper trading - No real money at risk'
                  : 'REAL MONEY - Trades will be executed!'}
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleMode}
            disabled={switching}
            className={`relative w-24 h-12 rounded-full transition-all ${
              isPractice ? 'bg-blue-600' : 'bg-red-600'
            } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
          >
            <div className={`absolute top-1 w-10 h-10 bg-white rounded-full shadow-lg transition-all ${
              isPractice ? 'left-1' : 'left-13 translate-x-full'
            }`} style={{ left: isPractice ? '4px' : 'calc(100% - 44px)' }}>
              {isPractice ? (
                <Shield className="w-6 h-6 text-blue-600 m-2" />
              ) : (
                <Zap className="w-6 h-6 text-red-600 m-2" />
              )}
            </div>
          </button>
        </div>

        {/* Warnings */}
        {status.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            {status.warnings.map((warning, i) => (
              <div key={i} className="flex items-center gap-2 text-yellow-400 bg-yellow-900/30 rounded px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Live Trading Lock Status */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status.liveUnlocked ? (
              <>
                <Unlock className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 text-sm">Live trading unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-sm">Live trading locked</span>
              </>
            )}
          </div>

          {status.liveUnlocked && (
            <button
              onClick={lockLiveTrading}
              disabled={switching}
              className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              Lock Live Trading
            </button>
          )}
        </div>
      </div>

      {/* Broker-Specific Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Broker-Specific Modes</h3>
        <div className="space-y-3">
          {status.brokers.map((broker) => (
            <div
              key={broker.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                broker.mode === 'practice' ? 'bg-blue-900/20' : 'bg-red-900/20'
              }`}
            >
              <div>
                <p className="font-medium text-white">{broker.name}</p>
                <p className={`text-sm ${
                  broker.mode === 'practice' ? 'text-blue-300' : 'text-red-300'
                }`}>
                  {broker.mode === 'practice' ? 'Practice Mode' : 'LIVE MODE'}
                </p>
              </div>

              {broker.supportsToggle ? (
                <button
                  onClick={() => toggleBrokerMode(broker.id, broker.mode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    broker.mode === 'practice'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {broker.mode === 'practice' ? 'Switch to Live' : 'Switch to Practice'}
                </button>
              ) : (
                <span className="text-gray-500 text-sm">No toggle available</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            &times;
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 border border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-white">Switch to LIVE Trading?</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                You are about to enable <strong className="text-red-400">LIVE TRADING MODE</strong>.
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
                <li>All trades will use REAL MONEY</li>
                <li>Losses are permanent and cannot be reversed</li>
                <li>All connected brokers will execute real orders</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmLiveMode}
                disabled={switching}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold"
              >
                {switching ? 'Switching...' : 'Enable LIVE MODE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Live Trading Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 border border-yellow-500">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-8 h-8 text-yellow-500" />
              <h3 className="text-xl font-bold text-white">Unlock Live Trading</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                Live trading is currently <strong className="text-yellow-400">LOCKED</strong> for your safety.
              </p>
              <p className="text-gray-400 text-sm">
                By unlocking, you acknowledge that:
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
                <li>You accept ALL trading risks</li>
                <li>You are responsible for any losses</li>
                <li>TIME is not liable for trading outcomes</li>
                <li>You have tested thoroughly in practice mode</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={unlockLiveTrading}
                disabled={switching}
                className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-black font-bold"
              >
                {switching ? 'Unlocking...' : 'I Accept & Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for header/navbar
export function TradingModeIndicator() {
  const [mode, setMode] = useState<'practice' | 'live'>('practice');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const res = await fetch(`${API_BASE}/trading-mode/global`);
        const data = await res.json();
        if (data.success) {
          setMode(data.data.mode);
        }
      } catch (err) {
        console.error('Failed to fetch trading mode');
      } finally {
        setLoading(false);
      }
    };

    fetchMode();
    const interval = setInterval(fetchMode, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="w-20 h-6 bg-gray-700 rounded animate-pulse"></div>;
  }

  const isPractice = mode === 'practice';

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
      isPractice
        ? 'bg-blue-600/30 text-blue-400 border border-blue-500'
        : 'bg-red-600/30 text-red-400 border border-red-500 animate-pulse'
    }`}>
      {isPractice ? (
        <>
          <Shield className="w-4 h-4" />
          <span>PRACTICE</span>
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          <span>LIVE</span>
        </>
      )}
    </div>
  );
}

export default TradingModeToggle;
