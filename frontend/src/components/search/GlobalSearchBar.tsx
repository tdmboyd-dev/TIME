'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, TrendingUp, Coins, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  currency: string;
}

interface QuickQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  type: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Popular symbols for quick access
const popularSymbols = [
  { symbol: 'AAPL', name: 'Apple', type: 'stock' },
  { symbol: 'GOOGL', name: 'Google', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', type: 'stock' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
];

export function GlobalSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quickQuotes, setQuickQuotes] = useState<Map<string, QuickQuote>>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl/Cmd + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      // Escape to close
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search API call
  const searchSymbols = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/real-market/search?q=${encodeURIComponent(searchQuery)}&type=all`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data.slice(0, 10));
        setSelectedIndex(0);

        // Fetch quick quotes for results
        const symbols = data.data.slice(0, 5).map((r: SearchResult) => r.symbol);
        fetchQuickQuotes(symbols);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        searchSymbols(query);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchSymbols]);

  // Fetch quick quotes
  const fetchQuickQuotes = async (symbols: string[]) => {
    for (const symbol of symbols) {
      try {
        const response = await fetch(`${API_BASE}/real-market/quick-quote/${symbol}`);
        const data = await response.json();
        if (data.success) {
          setQuickQuotes(prev => new Map(prev).set(symbol, data.data));
        }
      } catch (error) {
        // Silently fail for individual quote errors
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = results.length > 0 ? results : popularSymbols;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = items[selectedIndex];
      if (selected) {
        handleSelect(selected.symbol, selected.type);
      }
    }
  };

  // Handle selection
  const handleSelect = (symbol: string, type: string) => {
    setIsOpen(false);
    setQuery('');

    // Navigate to appropriate page
    if (type === 'crypto') {
      router.push(`/trade?symbol=${symbol}&type=crypto`);
    } else {
      router.push(`/trade?symbol=${symbol}&type=stock`);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(6);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search Input */}
      <div
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
          isOpen
            ? 'bg-slate-800 border-time-primary ring-2 ring-time-primary/20'
            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
        )}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search stocks, crypto, ETFs... (Ctrl+K)"
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
          suppressHydrationWarning
        />
        {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        {query && !loading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              setResults([]);
            }}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 bg-slate-900 rounded border border-slate-700">
          <span className="text-[10px]">Ctrl</span>K
        </kbd>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
          {/* Results or Popular Symbols */}
          <div className="max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Search Results
                </div>
                {results.map((result, index) => {
                  const quote = quickQuotes.get(result.symbol);
                  const isUp = quote && quote.changePercent > 0;

                  return (
                    <button
                      key={`${result.symbol}-${result.exchange}`}
                      onClick={() => handleSelect(result.symbol, result.type)}
                      className={clsx(
                        'w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors',
                        index === selectedIndex && 'bg-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          result.type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                        )}>
                          {result.type === 'crypto' ? (
                            <Coins className="w-4 h-4 text-orange-400" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="text-white font-medium text-sm">{result.symbol}</div>
                          <div className="text-slate-500 text-xs truncate max-w-[200px]">{result.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {quote ? (
                          <>
                            <div className="text-white font-medium text-sm">
                              ${formatPrice(quote.price)}
                            </div>
                            <div className={clsx(
                              'text-xs flex items-center gap-0.5 justify-end',
                              isUp ? 'text-green-400' : 'text-red-400'
                            )}>
                              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(quote.changePercent).toFixed(2)}%
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-600 text-xs">{result.exchange}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <div className="px-3 py-2 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Popular Symbols
                </div>
                {popularSymbols.map((item, index) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol, item.type)}
                    className={clsx(
                      'w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-800 transition-colors',
                      index === selectedIndex && 'bg-slate-800'
                    )}
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      item.type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                    )}>
                      {item.type === 'crypto' ? (
                        <Coins className="w-4 h-4 text-orange-400" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium text-sm">{item.symbol}</div>
                      <div className="text-slate-500 text-xs">{item.name}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">
                  <ArrowUpRight className="w-2.5 h-2.5 rotate-180" />
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">Enter</kbd>
                Select
              </span>
            </div>
            <span>Press ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalSearchBar;
