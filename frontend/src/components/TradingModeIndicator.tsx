'use client';

/**
 * Trading Mode Indicator Component
 *
 * Shows current Paper/Live trading mode status.
 * Can be placed in header, sidebar, or any trading page.
 */

import { useState, useCallback } from 'react';
import { useTradingMode } from '@/hooks/useTradingMode';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  ShieldAlert,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react';

interface TradingModeIndicatorProps {
  showBrokers?: boolean;
  showToggle?: boolean;
  compact?: boolean;
}

export function TradingModeIndicator({
  showBrokers = false,
  showToggle = false,
  compact = false,
}: TradingModeIndicatorProps) {
  const {
    mode,
    isPractice,
    isLive,
    liveUnlocked,
    brokers,
    warnings,
    isLoading,
    error,
    toggleMode,
    unlockLiveTrading,
    lockLiveTrading,
  } = useTradingMode();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleToggle = async () => {
    if (isPractice && !liveUnlocked) {
      // Need to unlock first
      setShowConfirmation(true);
      return;
    }

    if (isPractice) {
      // Need confirmation to switch to live
      setShowConfirmation(true);
      return;
    }

    // Switching from live to practice - no confirmation needed
    setIsToggling(true);
    await toggleMode();
    setIsToggling(false);
  };

  const handleConfirmLive = async () => {
    setIsToggling(true);

    if (!liveUnlocked) {
      // First unlock live trading
      const unlockResult = await unlockLiveTrading('I_ACCEPT_ALL_TRADING_RISKS_AND_RESPONSIBILITY');
      if (!unlockResult.success) {
        showNotification('error', unlockResult.message);
        setIsToggling(false);
        setShowConfirmation(false);
        return;
      }
    }

    // Then switch to live mode
    const result = await toggleMode('I_UNDERSTAND_LIVE_TRADING_RISKS');
    if (!result.success) {
      showNotification('error', result.message);
    } else {
      showNotification('success', 'Switched to LIVE mode');
    }

    setIsToggling(false);
    setShowConfirmation(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-yellow-500">{compact ? 'Offline' : error}</span>
      </div>
    );
  }

  const connectedBrokers = brokers.filter(b => b.liveEnabled).length;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isLive
            ? 'bg-red-500/20 border border-red-500/30 hover:bg-red-500/30'
            : 'bg-green-500/20 border border-green-500/30 hover:bg-green-500/30'
        }`}
        onClick={showToggle ? handleToggle : undefined}
      >
        {isLive ? (
          <>
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">LIVE</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">PAPER</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast Notification */}
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
      {/* Main Indicator */}
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
          isLive
            ? 'bg-red-500/20 border border-red-500/30 hover:bg-red-500/30'
            : 'bg-green-500/20 border border-green-500/30 hover:bg-green-500/30'
        }`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {isLive ? (
          <>
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-red-500">LIVE TRADING</span>
              <span className="text-xs text-red-400">Real money at risk</span>
            </div>
          </>
        ) : (
          <>
            <Shield className="w-5 h-5 text-green-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-green-500">PAPER TRADING</span>
              <span className="text-xs text-green-400">Simulated - No risk</span>
            </div>
          </>
        )}
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Trading Mode</h3>

            {/* Mode Toggle */}
            {showToggle && (
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">
                  {isPractice ? 'Switch to Live' : 'Switch to Paper'}
                </span>
                <button
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isPractice
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  } disabled:opacity-50`}
                >
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPractice ? (
                    'Go Live'
                  ) : (
                    'Go Paper'
                  )}
                </button>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mb-4 space-y-2">
                {warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-yellow-400">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Broker Status */}
            {showBrokers && brokers.length > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Connected Brokers</h4>
                <div className="space-y-2">
                  {brokers.map((broker) => (
                    <div
                      key={broker.id}
                      className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {broker.liveEnabled ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-500" />
                        )}
                        <span className="text-sm text-gray-300">{broker.name}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          broker.mode === 'live'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {broker.mode.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
              {isPractice ? (
                <p>Paper trading uses simulated funds. No real money is at risk.</p>
              ) : (
                <p className="text-red-400">
                  Live trading executes real orders. Your capital is at risk.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-500/30 rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-white">Enable Live Trading?</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                You are about to enable LIVE trading mode. This means:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                <li>Real orders will be sent to connected brokers</li>
                <li>Real money will be used for trades</li>
                <li>Losses are real and cannot be undone</li>
                <li>All bots and automated systems will execute real trades</li>
              </ul>
              <p className="text-red-400 text-sm font-medium">
                Only proceed if you understand and accept these risks.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLive}
                disabled={isToggling}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isToggling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  'I Accept - Go Live'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingModeIndicator;
