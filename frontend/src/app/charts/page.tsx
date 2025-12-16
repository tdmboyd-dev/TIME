'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  CandlestickChart,
  LineChart,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
  Layers,
  Activity,
  Target,
  Download,
  CheckCircle,
  X,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev/api/v1';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface APICandle {
  timestamp: string;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const symbols = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'stock' },
  { symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto', apiSymbol: 'bitcoin' },
  { symbol: 'ethereum', name: 'Ethereum', type: 'crypto', apiSymbol: 'ethereum' },
  { symbol: 'EUR/USD', name: 'Euro/USD', type: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound/USD', type: 'forex' },
];

const timeframes = [
  { label: '1m', value: '1min', minutes: 1 },
  { label: '5m', value: '5min', minutes: 5 },
  { label: '15m', value: '15min', minutes: 15 },
  { label: '1H', value: '1h', minutes: 60 },
  { label: '4H', value: '4h', minutes: 240 },
  { label: '1D', value: '1day', minutes: 1440 },
  { label: '1W', value: '1week', minutes: 10080 },
];

const indicators = [
  { id: 'sma', name: 'SMA (20)', active: true },
  { id: 'ema', name: 'EMA (50)', active: false },
  { id: 'rsi', name: 'RSI (14)', active: true },
  { id: 'macd', name: 'MACD', active: false },
  { id: 'bb', name: 'Bollinger Bands', active: false },
  { id: 'volume', name: 'Volume', active: true },
];

// Fallback demo data generator (only used when API fails)
function generateDemoCandles(count: number, basePrice: number, timeframeMinutes: number = 60): CandleData[] {
  const candles: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const volatilityMultiplier = Math.sqrt(timeframeMinutes / 60);

  for (let i = count - 1; i >= 0; i--) {
    const volatility = currentPrice * 0.02 * volatilityMultiplier;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000000 * volatilityMultiplier) + 500000;

    candles.push({
      time: now - i * timeframeMinutes * 60000,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

export default function ChartsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframes[3]);
  const [chartType, setChartType] = useState<'candle' | 'line' | 'bar'>('candle');
  const [activeIndicators, setActiveIndicators] = useState(indicators);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${selectedSymbol.symbol}_${selectedTimeframe.label}_chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setNotification({ type: 'success', message: 'Chart exported as PNG!' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
    setNotification({ type: 'success', message: `Zoom: ${Math.round((zoomLevel + 0.25) * 100)}%` });
    setTimeout(() => setNotification(null), 1500);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    setNotification({ type: 'success', message: `Zoom: ${Math.round((zoomLevel - 0.25) * 100)}%` });
    setTimeout(() => setNotification(null), 1500);
  };

  const handleFullscreen = () => {
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer && document.fullscreenEnabled) {
      if (!document.fullscreenElement) {
        chartContainer.requestFullscreen();
        setNotification({ type: 'success', message: 'Entered fullscreen mode' });
      } else {
        document.exitFullscreen();
        setNotification({ type: 'success', message: 'Exited fullscreen mode' });
      }
      setTimeout(() => setNotification(null), 2000);
    }
  };

  // Fetch REAL candlestick data from backend API
  const fetchChartData = useCallback(async () => {
    setIsLoading(true);

    try {
      // Build API URL based on asset type
      const symbolForApi = (selectedSymbol as any).apiSymbol || selectedSymbol.symbol;
      const url = `${API_BASE}/charts/candles?symbol=${symbolForApi}&interval=${selectedTimeframe.value}&type=${selectedSymbol.type}&limit=100`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data?.candles?.length > 0) {
        // Convert API response to our format
        const chartCandles: CandleData[] = data.data.candles.map((c: APICandle) => ({
          time: new Date(c.timestamp).getTime(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
        }));

        setCandles(chartCandles);
        setIsLive(true);
        setDataSource(data.data.meta?.source || 'API');
        setNotification({ type: 'success', message: `Real data loaded from ${data.data.meta?.source || 'API'}` });
        setTimeout(() => setNotification(null), 2000);
      } else {
        throw new Error('No data returned');
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      // Fallback to demo data
      const basePrice = selectedSymbol.type === 'crypto' ? 43000 :
                       selectedSymbol.type === 'forex' ? 1.08 :
                       180;
      const candleCount = selectedTimeframe.minutes <= 15 ? 150 :
                          selectedTimeframe.minutes <= 60 ? 100 :
                          selectedTimeframe.minutes <= 240 ? 80 : 50;
      setCandles(generateDemoCandles(candleCount, basePrice, selectedTimeframe.minutes));
      setIsLive(false);
      setDataSource('Demo');
      setNotification({ type: 'error', message: 'Using demo data (API unavailable)' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, selectedTimeframe]);

  // Fetch data when symbol or timeframe changes
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Real-time updates (simulated tick updates for demo, real WebSocket would be better)
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const lastCandle = prev[prev.length - 1];
        const volatility = lastCandle.close * 0.0005; // Small tick updates
        const newClose = lastCandle.close + (Math.random() - 0.5) * volatility;

        return [
          ...prev.slice(0, -1),
          {
            ...lastCandle,
            close: newClose,
            high: Math.max(lastCandle.high, newClose),
            low: Math.min(lastCandle.low, newClose),
          },
        ];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice + padding - ((maxPrice - minPrice + padding * 2) / 5) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), width - 10, y + 4);
    }

    // Draw candles
    const candleWidth = Math.max(2, (width - 60) / candles.length - 2);
    const scaleY = (height - 20) / (priceRange + padding * 2);

    candles.forEach((candle, i) => {
      const x = 10 + i * (candleWidth + 2);
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#22c55e' : '#ef4444';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const wickX = x + candleWidth / 2;
      ctx.moveTo(wickX, height - 10 - (candle.high - minPrice + padding) * scaleY);
      ctx.lineTo(wickX, height - 10 - (candle.low - minPrice + padding) * scaleY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = height - 10 - (Math.max(candle.open, candle.close) - minPrice + padding) * scaleY;
      const bodyBottom = height - 10 - (Math.min(candle.open, candle.close) - minPrice + padding) * scaleY;
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Draw SMA if active
    if (activeIndicators.find(i => i.id === 'sma' && i.active)) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const period = 20;
      for (let i = period; i < candles.length; i++) {
        const sma = candles.slice(i - period, i).reduce((sum, c) => sum + c.close, 0) / period;
        const x = 10 + i * (candleWidth + 2) + candleWidth / 2;
        const y = height - 10 - (sma - minPrice + padding) * scaleY;
        if (i === period) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

  }, [candles, activeIndicators]);

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const priceChangePercent = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev =>
      prev.map(ind => ind.id === id ? { ...ind, active: !ind.active } : ind)
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col chart-container">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Symbol Selector */}
          <select
            value={selectedSymbol.symbol}
            onChange={(e) => setSelectedSymbol(symbols.find(s => s.symbol === e.target.value) || symbols[0])}
            className="px-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-white font-medium focus:outline-none focus:border-time-primary/50"
          >
            {symbols.map(s => (
              <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
            ))}
          </select>

          {/* Current Price */}
          {lastCandle && (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">
                {lastCandle.close.toFixed(selectedSymbol.type === 'forex' ? 4 : 2)}
              </span>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center gap-2">
          {/* Data Source Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          }`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {dataSource || 'Loading...'}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchChartData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Chart Type */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setChartType('candle')}
              className={`p-2 rounded ${chartType === 'candle' ? 'bg-time-primary text-white' : 'text-slate-400 hover:text-white'}`}
              title="Candlestick"
            >
              <CandlestickChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${chartType === 'line' ? 'bg-time-primary text-white' : 'text-slate-400 hover:text-white'}`}
              title="Line"
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-time-primary text-white' : 'text-slate-400 hover:text-white'}`}
              title="Bar"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>

          {/* Indicators */}
          <button
            onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
            className={`p-2 rounded-lg ${showIndicatorPanel ? 'bg-time-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Zoom */}
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Download Chart"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`p-2 rounded-lg transition-colors ${showSettingsPanel ? 'bg-time-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        {timeframes.map(tf => (
          <button
            key={tf.label}
            onClick={() => setSelectedTimeframe(tf)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTimeframe.label === tf.label
                ? 'bg-time-primary text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tf.label}
          </button>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 ml-4 text-slate-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading chart data...
          </div>
        )}
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 flex gap-4">
        {/* Chart */}
        <div className="flex-1 card p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Indicator Panel */}
        {showIndicatorPanel && (
          <div className="w-64 card p-4 space-y-4">
            <h3 className="font-medium text-white">Indicators</h3>
            <div className="space-y-2">
              {activeIndicators.map(ind => (
                <div
                  key={ind.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer"
                  onClick={() => toggleIndicator(ind.id)}
                >
                  <span className={`text-sm ${ind.active ? 'text-white' : 'text-slate-400'}`}>
                    {ind.name}
                  </span>
                  <div className={`w-4 h-4 rounded border ${ind.active ? 'bg-time-primary border-time-primary' : 'border-slate-600'}`}>
                    {ind.active && (
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettingsPanel && (
          <div className="w-64 card p-4 space-y-4">
            <h3 className="font-medium text-white">Chart Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Grid Lines</label>
                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-white">
                  <option value="both">Both</option>
                  <option value="horizontal">Horizontal Only</option>
                  <option value="vertical">Vertical Only</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Candle Colors</label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span className="text-xs text-slate-300">Up</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-xs text-slate-300">Down</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Zoom Level</label>
                <div className="text-sm text-white">{Math.round(zoomLevel * 100)}%</div>
              </div>
              <div className="pt-2 border-t border-slate-700/50">
                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setNotification({ type: 'success', message: 'Settings reset to default' });
                    setTimeout(() => setNotification(null), 2000);
                  }}
                  className="w-full py-2 text-sm text-time-primary hover:text-time-primary/80"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel - OHLCV Data */}
      <div className="card p-4">
        <div className="grid grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Open</p>
            <p className="text-sm font-medium text-white">{lastCandle?.open.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">High</p>
            <p className="text-sm font-medium text-green-400">{lastCandle?.high.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Low</p>
            <p className="text-sm font-medium text-red-400">{lastCandle?.low.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Close</p>
            <p className="text-sm font-medium text-white">{lastCandle?.close.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Volume</p>
            <p className="text-sm font-medium text-white">{lastCandle?.volume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Change</p>
            <p className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
