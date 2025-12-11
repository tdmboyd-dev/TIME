'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const generateMockCandles = (count: number): CandleData[] => {
  const candles: CandleData[] = [];
  let price = 100;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.5) * 4;
    const high = open + Math.random() * 2;
    const low = open - Math.random() * 2;
    const close = open + change;
    price = close;

    candles.push({
      time: now - (count - i) * 60000,
      open,
      high: Math.max(open, close, high),
      low: Math.min(open, close, low),
      close,
      volume: Math.floor(Math.random() * 10000) + 1000,
    });
  }

  return candles;
};

const mockPrices: PriceData[] = [
  { symbol: 'BTC/USD', price: 43567.89, change: 1234.56, changePercent: 2.91 },
  { symbol: 'ETH/USD', price: 2345.67, change: -45.23, changePercent: -1.89 },
  { symbol: 'SPY', price: 478.92, change: 3.45, changePercent: 0.73 },
  { symbol: 'QQQ', price: 412.34, change: 5.67, changePercent: 1.39 },
];

export function LiveChart() {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [prices, setPrices] = useState<PriceData[]>(mockPrices);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setCandles(generateMockCandles(50));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Update prices
      setPrices(prev => prev.map(p => {
        const changeAmount = (Math.random() - 0.5) * p.price * 0.001;
        const newPrice = p.price + changeAmount;
        const newChange = p.change + changeAmount;
        return {
          ...p,
          price: newPrice,
          change: newChange,
          changePercent: (newChange / (newPrice - newChange)) * 100,
        };
      }));

      // Add new candle
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.5) * 2;
        const newClose = last.close + change;

        const newCandle: CandleData = {
          time: Date.now(),
          open: last.close,
          high: Math.max(last.close, newClose) + Math.random() * 0.5,
          low: Math.min(last.close, newClose) - Math.random() * 0.5,
          close: newClose,
          volume: Math.floor(Math.random() * 10000) + 1000,
        };

        return [...prev.slice(1), newCandle];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const candleWidth = chartWidth / candles.length;

    // Helper functions
    const priceToY = (price: number) =>
      padding.top + chartHeight * (1 - (price - minPrice + pricePadding) / (priceRange + pricePadding * 2));

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice + pricePadding - ((priceRange + pricePadding * 2) / 4) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
    }

    // Draw candles
    candles.forEach((candle, i) => {
      const x = padding.left + i * candleWidth + candleWidth / 2;
      const isGreen = candle.close >= candle.open;

      // Wick
      ctx.strokeStyle = isGreen ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(candle.high));
      ctx.lineTo(x, priceToY(candle.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
      const bodyTop = priceToY(Math.max(candle.open, candle.close));
      const bodyBottom = priceToY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

      ctx.fillRect(
        x - candleWidth * 0.35,
        bodyTop,
        candleWidth * 0.7,
        bodyHeight
      );
    });

    // Draw current price line
    const lastCandle = candles[candles.length - 1];
    const currentY = priceToY(lastCandle.close);
    ctx.strokeStyle = lastCandle.close >= lastCandle.open ? '#22c55e' : '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = lastCandle.close >= lastCandle.open ? '#22c55e' : '#ef4444';
    ctx.fillRect(width - padding.right, currentY - 10, padding.right, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lastCandle.close.toFixed(2), width - padding.right / 2, currentY + 4);
  }, [candles]);

  return (
    <div className="space-y-4">
      {/* Price Ticker */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {prices.map((price) => (
          <button
            key={price.symbol}
            onClick={() => setSelectedSymbol(price.symbol)}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              selectedSymbol === price.symbol
                ? 'bg-slate-700/70 border border-slate-600'
                : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
            }`}
          >
            <span className="text-sm font-medium text-white">{price.symbol}</span>
            <span className="text-sm font-mono text-white">
              ${price.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium ${
              price.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {price.changePercent >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-64 bg-slate-800/30 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />

        {/* Timeframe selector */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-slate-900/80 rounded-lg p-1">
          {['1m', '5m', '15m', '1H', '4H', '1D'].map((tf) => (
            <button
              key={tf}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                tf === '5m'
                  ? 'bg-time-primary/20 text-time-primary'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-300">LIVE</span>
        </div>
      </div>
    </div>
  );
}
