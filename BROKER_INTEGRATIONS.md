# TIME BEYOND US - Broker Integrations

## Overview

TIME BEYOND US now supports **8 major broker integrations**, providing comprehensive access to stocks, options, crypto, forex, and futures markets.

## Supported Brokers

### 1. Coinbase (Crypto)
**Asset Classes:** Cryptocurrency
**Features:**
- OAuth 2.0 authentication
- Real-time WebSocket price data
- Market, limit, stop, and stop-limit orders
- Coinbase Advanced Trade API (formerly Pro)
- 24/7 crypto trading

**Setup:**
1. Create Coinbase account at https://www.coinbase.com
2. Generate API credentials at https://www.coinbase.com/settings/api
3. Add to `.env`:
```env
COINBASE_CLIENT_ID=your_client_id
COINBASE_CLIENT_SECRET=your_client_secret
COINBASE_PASSPHRASE=your_passphrase  # Optional
COINBASE_SANDBOX=false  # Set true for testing
```

**Implementation:**
- File: `src/backend/brokers/coinbase_broker.ts`
- HMAC SHA256 request signing
- WebSocket streaming for real-time quotes
- Support for multiple crypto pairs (BTC, ETH, etc.)

---

### 2. Webull (Stocks, Options, Crypto)
**Asset Classes:** Stocks, Options, Cryptocurrency
**Features:**
- Paper trading support
- Extended hours trading
- Real-time market data
- Multi-asset trading
- Commission-free

**Setup:**
1. Create Webull account at https://www.webull.com
2. Generate API credentials (contact Webull for API access)
3. Add to `.env`:
```env
WEBULL_API_KEY=your_api_key
WEBULL_API_SECRET=your_api_secret
WEBULL_DEVICE_ID=auto_generated  # Auto-generated if not provided
WEBULL_PAPER=true  # Set false for live trading
```

**Implementation:**
- File: `src/backend/brokers/webull_broker.ts`
- Device ID-based authentication
- Automatic account type selection (paper/live)
- Full order management (create, modify, cancel)

---

### 3. TD Ameritrade / Charles Schwab (Stocks, Options, Futures, Forex)
**Asset Classes:** Stocks, Options, Futures, Forex
**Features:**
- OAuth 2.0 authentication
- Paper trading support
- Options chain data
- Real-time streaming
- Advanced order types
- thinkorswim integration

**Setup:**
1. Create TD Ameritrade account at https://www.tdameritrade.com
2. Register developer app at https://developer.tdameritrade.com
3. Generate OAuth tokens
4. Add to `.env`:
```env
TD_CLIENT_ID=your_client_id@AMER.OAUTHAP
TD_REDIRECT_URI=https://localhost:8080/callback
TD_REFRESH_TOKEN=your_refresh_token
```

**OAuth Flow:**
1. Visit: `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri={REDIRECT_URI}&client_id={CLIENT_ID}%40AMER.OAUTHAP`
2. Login and authorize
3. Exchange code for refresh token

**Implementation:**
- File: `src/backend/brokers/td_ameritrade_broker.ts`
- Bearer token authentication
- Automatic token refresh
- Full market data and trading capabilities

---

### 4. Robinhood (Stocks, Options, Crypto)
**Asset Classes:** Stocks, Options, Cryptocurrency
**Features:**
- Commission-free trading
- Fractional shares
- Crypto trading
- Extended hours
- MFA support

**Setup:**
1. Create Robinhood account at https://robinhood.com
2. Use account credentials for API access
3. Add to `.env`:
```env
ROBINHOOD_USERNAME=your_email
ROBINHOOD_DEVICE_TOKEN=auto_generated  # Generated on first login
```

**Important Notes:**
- Robinhood uses username/password authentication
- MFA may be required on first login
- Device token is saved for subsequent logins
- No official public API - uses internal endpoints

**Implementation:**
- File: `src/backend/brokers/robinhood_broker.ts`
- OAuth 2.0 authentication
- Device token persistence
- Full position and order management

---

## Already Supported Brokers

### 5. Alpaca (Stocks, Crypto)
**Asset Classes:** Stocks, Cryptocurrency
**Features:**
- Commission-free
- Paper trading
- Real-time data
- Fractional shares

**Setup:**
```env
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
ALPACA_PAPER=true
```

---

### 6. OANDA (Forex, CFDs)
**Asset Classes:** Forex, CFDs, Commodities
**Features:**
- Global forex broker
- Practice accounts
- Low spreads
- API access

**Setup:**
```env
OANDA_API_KEY=your_key
OANDA_ACCOUNT_ID=your_account_id
OANDA_PRACTICE=true
```

---

### 7. Interactive Brokers (via SnapTrade)
**Asset Classes:** Stocks, Options, Futures, Forex, Bonds
**Features:**
- Global markets
- Professional platform
- Low commissions
- Advanced tools

**Setup:**
```env
SNAPTRADE_CLIENT_ID=your_client_id
SNAPTRADE_CONSUMER_KEY=your_consumer_key
```

---

### 8. MetaTrader 4/5 (Forex, CFDs)
**Asset Classes:** Forex, CFDs, Indices, Commodities
**Features:**
- MT Bridge integration
- Expert Advisors
- Algorithmic trading
- Global broker support

**Setup:**
```env
MT_BRIDGE_ENABLED=true
MT_BRIDGE_PORT=15555
```

---

## Broker Comparison

| Broker | Stocks | Options | Crypto | Forex | Futures | Paper Trading | OAuth |
|--------|--------|---------|--------|-------|---------|---------------|-------|
| Coinbase | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ Sandbox | ✅ |
| Webull | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| TD Ameritrade | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Robinhood | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Alpaca | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| OANDA | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| IB (SnapTrade) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| MT4/MT5 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## Usage

### Connecting a Broker

```typescript
import { BrokerManager } from './backend/brokers/broker_manager';

const manager = BrokerManager.getInstance();

// Add Coinbase
await manager.addBroker('my-coinbase', 'coinbase', {
  apiKey: process.env.COINBASE_CLIENT_ID!,
  apiSecret: process.env.COINBASE_CLIENT_SECRET!,
  passphrase: process.env.COINBASE_PASSPHRASE,
  sandbox: false,
  isPaper: false,
}, { isPrimary: true, name: 'Coinbase Production' });

// Connect
await manager.connectBroker('my-coinbase');

// Get account info
const account = await manager.getAccount('my-coinbase');
console.log('Balance:', account.balance);

// Submit order
const order = await manager.submitOrder({
  symbol: 'BTC-USD',
  side: 'buy',
  type: 'market',
  quantity: 0.001,
}, 'crypto', 'my-coinbase');
```

### Via Frontend UI

1. Navigate to `/brokers` page
2. Click "Add Broker"
3. Select broker from list
4. Enter API credentials
5. Toggle Paper/Live mode
6. Click "Connect Broker"
7. View connected brokers and balances

---

## Architecture

### BrokerInterface
All brokers implement the `BrokerInterface` abstract class:

```typescript
export abstract class BrokerInterface extends EventEmitter {
  // Connection
  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract isReady(): boolean;

  // Account
  public abstract getAccount(): Promise<Account>;
  public abstract getPositions(): Promise<Position[]>;

  // Orders
  public abstract submitOrder(request: OrderRequest): Promise<Order>;
  public abstract cancelOrder(orderId: string): Promise<boolean>;
  public abstract modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order>;

  // Market Data
  public abstract getQuote(symbol: string): Promise<Quote>;
  public abstract getBars(symbol: string, timeframe: string, start: Date, end: Date): Promise<Bar[]>;

  // Streaming (optional)
  public abstract subscribeQuotes(symbols: string[]): Promise<void>;
  public abstract subscribeBars(symbols: string[], timeframe: string): Promise<void>;
}
```

### Broker Manager
Centralized manager for all broker connections:
- Auto-routing by asset class
- Aggregated portfolio view
- Failover and load balancing
- Event-driven architecture
- Paper/Live mode toggle

---

## Security

### Best Practices
1. **Never commit credentials** - Use `.env` file (gitignored)
2. **Use environment variables** - Keep secrets out of code
3. **Enable MFA** - Where supported (Robinhood, TD Ameritrade)
4. **Use OAuth** - Prefer OAuth 2.0 over API keys
5. **Paper trading first** - Test with paper accounts
6. **Rotate credentials** - Regularly update API keys
7. **Monitor access** - Review broker dashboard for unauthorized access

### Credential Storage
- Credentials stored in MongoDB encrypted
- API keys never logged
- Sensitive data masked in responses
- HTTPS/WSS connections only

---

## Error Handling

All brokers implement comprehensive error handling:

```typescript
try {
  await broker.connect();
} catch (error) {
  if (error.message.includes('MFA required')) {
    // Handle MFA flow
  } else if (error.message.includes('Invalid credentials')) {
    // Prompt user to re-enter credentials
  } else {
    // Generic error handling
  }
}
```

Events emitted:
- `connected` - Successful connection
- `disconnected` - Connection lost
- `error` - Error occurred
- `orderUpdate` - Order status changed
- `positionUpdate` - Position changed
- `quote` - Real-time quote received
- `trade` - Trade executed

---

## Rate Limits

| Broker | Rate Limit | Notes |
|--------|------------|-------|
| Coinbase | 10 req/sec | Per API key |
| Webull | Unknown | Conservative use recommended |
| TD Ameritrade | 120 req/min | Per access token |
| Robinhood | ~10 req/sec | Unofficial API |
| Alpaca | 200 req/min | Paper vs live separate |
| OANDA | 20 req/sec | Practice account |

---

## WebSocket Support

| Broker | WebSocket | Channels |
|--------|-----------|----------|
| Coinbase | ✅ | ticker, user, matches |
| Webull | ⚠️ Polling | REST API only |
| TD Ameritrade | ⚠️ Future | Streaming API exists |
| Robinhood | ❌ | No streaming API |
| Alpaca | ✅ | trades, quotes, bars |
| OANDA | ✅ | pricing, transactions |

---

## Testing

### Unit Tests
```bash
npm test src/backend/brokers/coinbase_broker.test.ts
npm test src/backend/brokers/webull_broker.test.ts
npm test src/backend/brokers/td_ameritrade_broker.test.ts
npm test src/backend/brokers/robinhood_broker.test.ts
```

### Integration Tests
```bash
npm run test:integration:brokers
```

### Manual Testing
1. Use paper/sandbox accounts
2. Test connection flow
3. Submit test orders
4. Verify order status
5. Check position updates
6. Test disconnection

---

## Troubleshooting

### Coinbase
- **"Invalid signature"** - Check API secret, ensure correct timestamp
- **"Insufficient funds"** - Verify account balance
- **WebSocket disconnects** - Auto-reconnect implemented

### Webull
- **"Account not found"** - Verify device ID
- **"Invalid credentials"** - Re-authenticate
- **Paper account issues** - Ensure paper mode enabled

### TD Ameritrade
- **"Token expired"** - Refresh token implementation handles this
- **"Account access denied"** - Check OAuth permissions
- **Rate limit exceeded** - Implement backoff

### Robinhood
- **"MFA required"** - Save device token after first login
- **"Account locked"** - Check Robinhood dashboard
- **Unofficial API** - May break with Robinhood updates

---

## Roadmap

### Planned Integrations
- [ ] E*TRADE
- [ ] Fidelity (via SnapTrade)
- [ ] Charles Schwab native API (when available)
- [ ] Kraken (crypto)
- [ ] Binance.US (crypto)
- [ ] Tastytrade (options)

### Planned Features
- [ ] Multi-leg options strategies
- [ ] Margin trading controls
- [ ] Portfolio rebalancing
- [ ] Tax-loss harvesting
- [ ] Social trading (copy trading)
- [ ] Backtesting integration

---

## Support

For issues or questions:
1. Check broker documentation
2. Review error logs
3. Test with paper accounts
4. Contact broker support
5. Open GitHub issue

---

## License

All broker integrations are part of TIME BEYOND US and follow the same license.

**IMPORTANT:** Each broker has their own Terms of Service and API usage policies. Review before using.
