'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  TrendingDown,
  Leaf,
  AlertTriangle,
  DollarSign,
  Calendar,
  CheckCircle2,
  RefreshCcw,
  ArrowRight,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { API_BASE, getAuthHeadersWithCSRF } from '@/lib/api';

interface HarvestOpportunity {
  id: string;
  position: {
    symbol: string;
    shares: number;
    currentPrice: number;
    costBasis: number;
  };
  unrealizedLoss: number;
  estimatedTaxSavings: number;
  isLongTerm: boolean;
  taxRate: number;
  replacement: {
    symbol: string;
    correlation: number;
  };
  washSaleRisk: {
    hasRisk: boolean;
    waitUntil: string | null;
  };
  recommendation: 'harvest' | 'wait' | 'skip';
  recommendationReason: string;
}

interface WashSaleEntry {
  symbol: string;
  canTradeAfter: string;
  dayesRemaining: number;
}

interface YearlySummary {
  year: number;
  totalHarvested: number;
  totalTaxSavings: number;
  harvestCount: number;
}

export default function TaxPage() {
  const [opportunities, setOpportunities] = useState<HarvestOpportunity[]>([]);
  const [washSaleCalendar, setWashSaleCalendar] = useState<WashSaleEntry[]>([]);
  const [yearlySummary, setYearlySummary] = useState<YearlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch yearly summary
      const summaryRes = await fetch(`${API_BASE}/tax/harvest/summary`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const summaryData = await summaryRes.json();

      if (summaryData.success && summaryData.data) {
        setYearlySummary(summaryData.data);
        setIsConnected(true);
      } else {
        throw new Error('Invalid response format');
      }

      // Fetch wash sale calendar
      const calendarRes = await fetch(`${API_BASE}/tax/harvest/wash-sale-calendar`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const calendarData = await calendarRes.json();

      if (calendarData.success && calendarData.data) {
        setWashSaleCalendar(calendarData.data.calendar || []);
        setIsConnected(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // No mock data - show empty state when API unavailable
      setYearlySummary({ year: new Date().getFullYear(), totalHarvested: 0, totalTaxSavings: 0, harvestCount: 0 });
      setWashSaleCalendar([]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
  }, [fetchData]);

  const scanForOpportunities = async () => {
    setIsScanning(true);
    try {
      // Fetch real portfolio positions from backend
      const portfolioRes = await fetch(`${API_BASE}/portfolio/positions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const portfolioData = await portfolioRes.json();

      let positions: any[] = [];
      let taxLots: any[] = [];

      if (portfolioData.success && portfolioData.positions) {
        // Map real positions to tax harvest format
        positions = portfolioData.positions.map((p: any, idx: number) => ({
          symbol: p.symbol,
          shares: p.qty || p.quantity || p.shares || 0,
          costBasis: (p.avg_entry_price || p.averagePrice || p.costBasis || 0) * (p.qty || p.quantity || p.shares || 0),
          currentPrice: p.current_price || p.currentPrice || p.lastPrice || 0,
          purchaseDate: p.created_at ? new Date(p.created_at) : new Date(),
          accountId: p.account_id || 'default',
          lotId: `lot-${idx}`,
        }));

        taxLots = positions.map(p => ({
          lotId: p.lotId,
          symbol: p.symbol,
          shares: p.shares,
          purchasePrice: p.costBasis / (p.shares || 1),
          purchaseDate: p.purchaseDate,
          accountId: p.accountId,
        }));
      }

      // If no positions, show empty state
      if (positions.length === 0) {
        setOpportunities([]);
        setIsConnected(true);
        return;
      }

      const headers = await getAuthHeadersWithCSRF();
      const res = await fetch(`${API_BASE}/tax/harvest/opportunities`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          positions,
          taxLots,
          options: { minLoss: 100 },
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setOpportunities(data.data.opportunities || []);
        setIsConnected(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Error handled - shows empty opportunities
      setOpportunities([]);
      setIsConnected(false);
    } finally {
      setIsScanning(false);
    }
  };

  const executeHarvest = async (opportunity: HarvestOpportunity) => {
    try {
      const headers = await getAuthHeadersWithCSRF();
      const res = await fetch(`${API_BASE}/tax/harvest/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ opportunity }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', `Tax-loss harvest executed! Estimated savings: $${opportunity.estimatedTaxSavings.toFixed(2)}`);
        setIsConnected(true);
        fetchData();
        scanForOpportunities();
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Error handled - shows notification
      setIsConnected(false);
      showNotification('error', 'Failed to execute harvest. Backend may be unavailable.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500/90 text-white' :
            notification.type === 'error' ? 'bg-red-500/90 text-white' :
            'bg-blue-500/90 text-white'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {notification.type === 'error' && <AlertTriangle className="w-5 h-5" />}
            {notification.type === 'info' && <Calendar className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              ×
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Leaf className="w-8 h-8 text-green-400" />
                Tax-Loss Harvesting
              </h1>
              {/* Connection Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                isConnected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Demo</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-400 mt-2">
              Automatically optimize your taxes by harvesting losses
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
              title="Refresh data"
            >
              {isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCcw className="w-5 h-5" />
              )}
            </button>
            {/* Scan Portfolio Button */}
            <button
              onClick={scanForOpportunities}
              disabled={isScanning}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {isScanning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCcw className="w-5 h-5" />
              )}
              Scan Portfolio
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Tax Savings YTD</span>
            </div>
            <p className="text-2xl font-bold">
              ${yearlySummary?.totalTaxSavings.toLocaleString() || '0'}
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <span className="text-gray-400 text-sm">Losses Harvested</span>
            </div>
            <p className="text-2xl font-bold">
              ${yearlySummary?.totalHarvested.toLocaleString() || '0'}
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Harvests This Year</span>
            </div>
            <p className="text-2xl font-bold">{yearlySummary?.harvestCount || 0}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Wash Sale Blocks</span>
            </div>
            <p className="text-2xl font-bold">{washSaleCalendar.length}</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl p-6 mb-8 border border-green-500/30">
          <h2 className="text-xl font-bold mb-4">How Tax-Loss Harvesting Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">1</div>
              <p className="text-sm text-gray-300">We find positions with unrealized losses in your portfolio</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">2</div>
              <p className="text-sm text-gray-300">Sell the losing position to "realize" the loss for tax purposes</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">3</div>
              <p className="text-sm text-gray-300">Immediately buy a similar (but not identical) investment</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">4</div>
              <p className="text-sm text-gray-300">Use the loss to offset gains and reduce your tax bill!</p>
            </div>
          </div>
        </div>

        {/* Opportunities */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 mb-8">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold">Harvesting Opportunities</h2>
          </div>

          {opportunities.length === 0 ? (
            <div className="p-12 text-center">
              <Leaf className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">No Opportunities Found</h3>
              <p className="text-gray-500 mt-2">
                Click "Scan Portfolio" to check for tax-loss harvesting opportunities
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {opportunities.map((opp) => (
                <div key={opp.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{opp.position.symbol}</h3>
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                          <span className="text-blue-400">{opp.replacement.symbol}</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {opp.position.shares} shares • {opp.isLongTerm ? 'Long-term' : 'Short-term'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-red-400 font-semibold">
                          -${opp.unrealizedLoss.toFixed(2)} loss
                        </p>
                        <p className="text-sm text-gray-400">
                          {(opp.taxRate * 100).toFixed(0)}% tax rate
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-green-400 font-semibold">
                          +${opp.estimatedTaxSavings.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-400">estimated savings</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {opp.washSaleRisk.hasRisk && (
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-sm flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Wash Sale Risk
                        </span>
                      )}

                      {opp.recommendation === 'harvest' ? (
                        <button
                          onClick={() => executeHarvest(opp)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Harvest
                        </button>
                      ) : (
                        <span className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg">
                          {opp.recommendation === 'wait' ? 'Wait' : 'Skip'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-400">{opp.recommendationReason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wash Sale Calendar */}
        {washSaleCalendar.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Wash Sale Calendar
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                These symbols cannot be repurchased until the dates shown (to avoid wash sale rule)
              </p>
            </div>

            <div className="divide-y divide-gray-800">
              {washSaleCalendar.map((entry) => (
                <div key={entry.symbol} className="p-4 flex items-center justify-between">
                  <span className="font-semibold">{entry.symbol}</span>
                  <div className="text-right">
                    <p className="text-yellow-400">
                      {entry.dayesRemaining} days remaining
                    </p>
                    <p className="text-sm text-gray-400">
                      Can trade after {new Date(entry.canTradeAfter).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
