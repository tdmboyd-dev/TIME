/**
 * REAL Finnhub Market Data Service
 *
 * Connects to Finnhub API for real-time market data
 * - REST API for quotes and historical data
 * - WebSocket for real-time price updates
 * - Rate limiting and error handling
 */

import WebSocket from 'ws';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_REST_URL = 'https://finnhub.io/api/v1';
const FINNHUB_WS_URL = FINNHUB_API_KEY ? `wss://ws.finnhub.io?token=${FINNHUB_API_KEY}` : '';

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequestsPerMinute: 60,
  requests: [] as number[],
};

// WebSocket management
let wsConnection: WebSocket | null = null;
let wsReconnectTimer: NodeJS.Timeout | null = null;
const wsSubscriptions = new Map<string, Set<(data: MarketData) => void>>();
let wsConnectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

// Type definitions
export interface QuoteData {
  c: number;  // Current price
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
  d?: number; // Change
  dp?: number; // Percent change
}

export interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: number;
}

export interface CandleData {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  v: number[];  // Volume data
  t: number[];  // Timestamps
  s: string;    // Status
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Rate limiting check
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove old requests
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => time > oneMinuteAgo);

  // Check if we're under the limit
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequestsPerMinute) {
    console.warn('Rate limit reached. Please wait before making more requests.');
    return false;
  }

  // Add current request
  RATE_LIMIT.requests.push(now);
  return true;
}

/**
 * Fetch data from Finnhub REST API
 */
async function fetchFromFinnhub(endpoint: string): Promise<any> {
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const url = `${FINNHUB_REST_URL}${endpoint}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      throw new Error(`Finnhub API error: ${data.error}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching from Finnhub:', error);
    throw error;
  }
}

/**
 * Get real-time quote for a symbol
 */
export async function getQuote(symbol: string): Promise<QuoteData> {
  try {
    const data = await fetchFromFinnhub(`/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`);

    // Add calculated fields
    if (data.c && data.pc) {
      data.d = data.c - data.pc;
      data.dp = ((data.c - data.pc) / data.pc) * 100;
    }

    return data as QuoteData;
  } catch (error) {
    console.error(`Error getting quote for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get historical candle data
 */
export async function getCandles(
  symbol: string,
  resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M',
  from: number,
  to: number
): Promise<Candle[]> {
  try {
    const data = await fetchFromFinnhub(
      `/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    ) as CandleData;

    // Check if data is valid
    if (data.s === 'no_data') {
      console.warn(`No candle data available for ${symbol}`);
      return [];
    }

    if (!data.c || data.c.length === 0) {
      return [];
    }

    // Transform to more usable format
    const candles: Candle[] = [];
    for (let i = 0; i < data.c.length; i++) {
      candles.push({
        time: data.t[i],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      });
    }

    return candles;
  } catch (error) {
    console.error(`Error getting candles for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket(): void {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return; // Already connected
  }

  try {
    console.log('Connecting to Finnhub WebSocket...');
    wsConnection = new WebSocket(FINNHUB_WS_URL);

    wsConnection.on('open', () => {
      console.log('Finnhub WebSocket connected');
      wsConnectionAttempts = 0;

      // Resubscribe to all symbols
      wsSubscriptions.forEach((_, symbol) => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'subscribe',
            symbol: symbol.toUpperCase(),
          }));
          console.log(`Subscribed to ${symbol}`);
        }
      });
    });

    wsConnection.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle trade messages
        if (message.type === 'trade' && message.data) {
          message.data.forEach((trade: any) => {
            const symbol = trade.s;
            const callbacks = wsSubscriptions.get(symbol);

            if (callbacks) {
              const marketData: MarketData = {
                symbol: symbol,
                price: trade.p,
                volume: trade.v,
                timestamp: trade.t,
              };

              // Call all subscribers
              callbacks.forEach(callback => {
                try {
                  callback(marketData);
                } catch (err) {
                  console.error('Error in subscriber callback:', err);
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    wsConnection.on('error', (error) => {
      console.error('Finnhub WebSocket error:', error);
    });

    wsConnection.on('close', () => {
      console.log('Finnhub WebSocket disconnected');
      wsConnection = null;

      // Attempt to reconnect if we have active subscriptions
      if (wsSubscriptions.size > 0 && wsConnectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        wsConnectionAttempts++;
        console.log(`Reconnecting to WebSocket (attempt ${wsConnectionAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

        wsReconnectTimer = setTimeout(() => {
          initializeWebSocket();
        }, RECONNECT_DELAY);
      }
    });

    wsConnection.on('ping', () => {
      if (wsConnection) {
        wsConnection.pong();
      }
    });

  } catch (error) {
    console.error('Error initializing WebSocket:', error);
  }
}

/**
 * Subscribe to real-time price updates for a symbol
 */
export function subscribeToPrice(
  symbol: string,
  callback: (data: MarketData) => void
): () => void {
  const normalizedSymbol = symbol.toUpperCase();

  // Initialize WebSocket if needed
  if (!wsConnection) {
    initializeWebSocket();
  }

  // Add callback to subscriptions
  if (!wsSubscriptions.has(normalizedSymbol)) {
    wsSubscriptions.set(normalizedSymbol, new Set());
  }
  wsSubscriptions.get(normalizedSymbol)!.add(callback);

  // Subscribe to symbol via WebSocket
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(JSON.stringify({
      type: 'subscribe',
      symbol: normalizedSymbol,
    }));
    console.log(`Subscribed to ${normalizedSymbol}`);
  }

  // Return unsubscribe function
  return () => {
    const callbacks = wsSubscriptions.get(normalizedSymbol);
    if (callbacks) {
      callbacks.delete(callback);

      // If no more callbacks, unsubscribe from WebSocket
      if (callbacks.size === 0) {
        wsSubscriptions.delete(normalizedSymbol);

        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'unsubscribe',
            symbol: normalizedSymbol,
          }));
          console.log(`Unsubscribed from ${normalizedSymbol}`);
        }

        // Close WebSocket if no more subscriptions
        if (wsSubscriptions.size === 0 && wsConnection) {
          wsConnection.close();
          wsConnection = null;

          if (wsReconnectTimer) {
            clearTimeout(wsReconnectTimer);
            wsReconnectTimer = null;
          }
        }
      }
    }
  };
}

/**
 * Get multiple quotes at once
 */
export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
  const quotes = new Map<string, QuoteData>();

  // Use Promise.allSettled to handle partial failures
  const results = await Promise.allSettled(
    symbols.map(symbol => getQuote(symbol))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      quotes.set(symbols[index], result.value);
    } else {
      console.error(`Failed to get quote for ${symbols[index]}:`, result.reason);
    }
  });

  return quotes;
}

/**
 * Close all WebSocket connections
 */
export function closeConnections(): void {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }

  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }

  wsSubscriptions.clear();
  wsConnectionAttempts = 0;
}

/**
 * Get connection status
 */
export function getConnectionStatus(): {
  websocket: string;
  subscriptions: number;
  rateLimit: number;
} {
  return {
    websocket: wsConnection?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
    subscriptions: wsSubscriptions.size,
    rateLimit: RATE_LIMIT.requests.length,
  };
}

// Clean up on process exit
process.on('exit', () => {
  closeConnections();
});

process.on('SIGINT', () => {
  closeConnections();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeConnections();
  process.exit(0);
});

export default {
  getQuote,
  getCandles,
  subscribeToPrice,
  getMultipleQuotes,
  closeConnections,
  getConnectionStatus,
};
