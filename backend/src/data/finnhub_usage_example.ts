/**
 * FINNHUB SERVICE USAGE EXAMPLES
 *
 * This file shows how to use the real_finnhub_service.ts
 */

import {
  getQuote,
  getCandles,
  subscribeToPrice,
  getMultipleQuotes,
  getConnectionStatus,
  closeConnections,
} from './real_finnhub_service';

// ============================================================
// EXAMPLE 1: Get a real-time quote
// ============================================================
async function example1_GetQuote() {
  try {
    console.log('Fetching SPY quote...');
    const quote = await getQuote('SPY');

    console.log('SPY Quote:', {
      current: quote.c,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      previousClose: quote.pc,
      change: quote.d,
      changePercent: quote.dp,
      timestamp: new Date(quote.t * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error getting quote:', error);
  }
}

// ============================================================
// EXAMPLE 2: Get historical candles
// ============================================================
async function example2_GetCandles() {
  try {
    console.log('Fetching AAPL daily candles for last 30 days...');

    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 24 * 60 * 60); // 30 days ago

    const candles = await getCandles('AAPL', 'D', from, to);

    console.log(`Received ${candles.length} candles`);
    console.log('Latest candle:', {
      time: new Date(candles[candles.length - 1].time * 1000).toISOString(),
      open: candles[candles.length - 1].open,
      high: candles[candles.length - 1].high,
      low: candles[candles.length - 1].low,
      close: candles[candles.length - 1].close,
      volume: candles[candles.length - 1].volume,
    });
  } catch (error) {
    console.error('Error getting candles:', error);
  }
}

// ============================================================
// EXAMPLE 3: Subscribe to real-time price updates
// ============================================================
function example3_SubscribeToPrice() {
  console.log('Subscribing to MSFT real-time prices...');

  const unsubscribe = subscribeToPrice('MSFT', (data) => {
    console.log('MSFT Update:', {
      symbol: data.symbol,
      price: data.price,
      volume: data.volume,
      timestamp: new Date(data.timestamp).toISOString(),
    });
  });

  // Unsubscribe after 60 seconds
  setTimeout(() => {
    console.log('Unsubscribing from MSFT...');
    unsubscribe();
  }, 60000);
}

// ============================================================
// EXAMPLE 4: Subscribe to multiple symbols
// ============================================================
function example4_MultipleSubscriptions() {
  const symbols = ['SPY', 'AAPL', 'MSFT', 'GOOGL', 'TSLA'];
  const unsubscribers: (() => void)[] = [];

  console.log(`Subscribing to ${symbols.length} symbols...`);

  symbols.forEach(symbol => {
    const unsubscribe = subscribeToPrice(symbol, (data) => {
      console.log(`${data.symbol}: $${data.price} (${new Date(data.timestamp).toLocaleTimeString()})`);
    });
    unsubscribers.push(unsubscribe);
  });

  // Unsubscribe from all after 60 seconds
  setTimeout(() => {
    console.log('Unsubscribing from all symbols...');
    unsubscribers.forEach(unsub => unsub());
  }, 60000);
}

// ============================================================
// EXAMPLE 5: Get multiple quotes at once
// ============================================================
async function example5_MultipleQuotes() {
  try {
    const symbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI'];
    console.log(`Fetching quotes for ${symbols.length} symbols...`);

    const quotes = await getMultipleQuotes(symbols);

    quotes.forEach((quote, symbol) => {
      console.log(`${symbol}:`, {
        price: quote.c,
        change: quote.d?.toFixed(2),
        changePercent: quote.dp?.toFixed(2) + '%',
      });
    });
  } catch (error) {
    console.error('Error getting multiple quotes:', error);
  }
}

// ============================================================
// EXAMPLE 6: Check connection status
// ============================================================
function example6_CheckStatus() {
  const status = getConnectionStatus();
  console.log('Connection Status:', status);
  console.log(`WebSocket: ${status.websocket}`);
  console.log(`Active Subscriptions: ${status.subscriptions}`);
  console.log(`Rate Limit Usage: ${status.rateLimit}/60 requests per minute`);
}

// ============================================================
// EXAMPLE 7: Building a trading bot with Finnhub
// ============================================================
async function example7_TradingBot() {
  console.log('Starting simple trading bot...');

  // 1. Get initial quote
  const initialQuote = await getQuote('SPY');
  console.log(`Initial SPY price: $${initialQuote.c}`);

  // 2. Subscribe to real-time updates
  let lastPrice = initialQuote.c;
  const unsubscribe = subscribeToPrice('SPY', (data) => {
    const priceChange = ((data.price - lastPrice) / lastPrice) * 100;

    console.log(`SPY: $${data.price} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)`);

    // Simple trading logic
    if (priceChange > 0.5) {
      console.log('🚀 SIGNAL: Price up 0.5% - Consider buying!');
    } else if (priceChange < -0.5) {
      console.log('📉 SIGNAL: Price down 0.5% - Consider selling!');
    }

    lastPrice = data.price;
  });

  // 3. Get historical data for context
  const to = Math.floor(Date.now() / 1000);
  const from = to - (7 * 24 * 60 * 60); // 7 days
  const candles = await getCandles('SPY', 'D', from, to);

  const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
  console.log(`Average volume (7 days): ${avgVolume.toLocaleString()}`);

  // Run for 5 minutes
  setTimeout(() => {
    console.log('Stopping trading bot...');
    unsubscribe();
  }, 5 * 60 * 1000);
}

// ============================================================
// EXAMPLE 8: Rate limiting and error handling
// ============================================================
async function example8_RateLimiting() {
  console.log('Testing rate limiting...');

  const symbols = [
    'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VEA', 'VWO', 'AGG', 'BND',
    'GLD', 'SLV', 'USO', 'UNG', 'EEM', 'EFA', 'TLT', 'HYG', 'LQD',
  ];

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      console.log(`${symbol}: $${quote.c}`);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1100)); // ~55 requests/min
    } catch (error: any) {
      if (error.message.includes('Rate limit')) {
        console.log('Rate limit hit - waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else {
        console.error(`Error getting ${symbol}:`, error.message);
      }
    }
  }
}

// ============================================================
// RUN EXAMPLES
// ============================================================
async function runExamples() {
  console.log('\n=== FINNHUB SERVICE EXAMPLES ===\n');

  // Uncomment the examples you want to run:

  // await example1_GetQuote();
  // await example2_GetCandles();
  // example3_SubscribeToPrice();
  // example4_MultipleSubscriptions();
  // await example5_MultipleQuotes();
  // example6_CheckStatus();
  // await example7_TradingBot();
  // await example8_RateLimiting();

  console.log('\n=== EXAMPLES COMPLETE ===\n');
}

// Uncomment to run:
// runExamples();

export {
  example1_GetQuote,
  example2_GetCandles,
  example3_SubscribeToPrice,
  example4_MultipleSubscriptions,
  example5_MultipleQuotes,
  example6_CheckStatus,
  example7_TradingBot,
  example8_RateLimiting,
};
