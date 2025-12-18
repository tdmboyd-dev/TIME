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

// Backend API Configuration
const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

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

  // Mock data for fallback
  const mockYearlySummary: YearlySummary = {
    year: 2025,
    totalHarvested: 12500,
    totalTaxSavings: 3125,
    harvestCount: 8,
  };

  const mockWashSaleCalendar: WashSaleEntry[] = [
    { symbol: 'AAPL', canTradeAfter: '2025-12-30', dayesRemaining: 14 },
    { symbol: 'TSLA', canTradeAfter: '2025-12-25', dayesRemaining: 9 },
  ];

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
      // Error handled - uses fallback mock data
      setYearlySummary(mockYearlySummary);
      setWashSaleCalendar(mockWashSaleCalendar);
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
      // Mock portfolio data - in production this would come from user's actual portfolio
      const mockPositions = [
        { symbol: 'SPY', shares: 50, costBasis: 22500, currentPrice: 420, purchaseDate: new Date('2024-01-15'), accountId: 'acc1', lotId: 'lot1' },
        { symbol: 'QQQ', shares: 30, costBasis: 12000, currentPrice: 360, purchaseDate: new Date('2024-03-01'), accountId: 'acc1', lotId: 'lot2' },
        { symbol: 'VTI', shares: 100, costBasis: 25000, currentPrice: 230, purchaseDate: new Date('2023-06-15'), accountId: 'acc1', lotId: 'lot3' },
      ];

      const mockTaxLots = mockPositions.map(p => ({
        lotId: p.lotId,
        symbol: p.symbol,
        shares: p.shares,
        purchasePrice: p.costBasis / p.shares,
        purchaseDate: p.purchaseDate,
        accountId: p.accountId,
      }));

      const res = await fetch(`${API_BASE}/tax/harvest/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: mockPositions,
          taxLots: mockTaxLots,
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
      setIsConnected(false);
    } finally {
      setIsScanning(false);
    }
  };

  const executeHarvest = async (opportunity: HarvestOpportunity) => {
    try {
      const res = await fetch(`${API_BASE}/tax/harvest/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Tax-loss harvest executed! Estimated tax savings: $${opportunity.estimatedTaxSavings.toFixed(2)}`);
        setIsConnected(true);
        fetchData();
        scanForOpportunities();
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Error handled - shows alert
      setIsConnected(false);
      alert('Failed to execute harvest. Backend may be unavailable.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
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
