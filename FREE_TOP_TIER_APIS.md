# BEST FREE APIs THAT RIVAL PAID ONES
## Top-Tier Free Financial Data Sources for TIME
### Researched December 2025

---

## STOCK MARKET DATA - FREE & POWERFUL

### 1. ALPACA (BEST OVERALL FREE)
**Website**: https://alpaca.markets
**Why It's Best**: Commission-free trading + FREE data
**Free Tier**:
- 10,000 API calls/minute (INSANE!)
- 7+ years historical data
- Real-time IEX quotes
- WebSocket streaming
- Paper trading sandbox

**Rivals**: $199/mo Polygon Business tier

```env
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
ALPACA_PAPER=true
```

---

### 2. FINNHUB (BEST FREE REAL-TIME)
**Website**: https://finnhub.io
**Why It's Best**: 60 calls/minute FREE, real-time
**Free Tier**:
- 60 API calls/min
- Real-time stock quotes
- Company profiles & financials
- Market news
- Earnings calendar
- Pattern recognition
- Social sentiment data
- Insider transactions
- Congressional trading data!

**Rivals**: $300/mo for similar coverage elsewhere

```env
FINNHUB_API_KEY=your_key
```

**Get Key**: https://finnhub.io/register (takes 30 seconds)

---

### 3. FINANCIAL MODELING PREP (BEST FREE FUNDAMENTALS)
**Website**: https://financialmodelingprep.com
**Why It's Best**: Deep fundamental data free
**Free Tier**:
- 250 calls/day
- Income statements, balance sheets, cash flow
- DCF valuations
- Stock screener
- Insider trading
- Social sentiment from Reddit, Twitter, StockTwits

**Rivals**: $500+/mo Bloomberg fundamentals

```env
FMP_API_KEY=your_key
```

**Get Key**: https://financialmodelingprep.com/developer/docs/

---

### 4. ALPHA VANTAGE (BEST FREE TECHNICAL)
**Website**: https://alphavantage.co
**Why It's Best**: 50+ technical indicators free
**Free Tier**:
- 25 calls/day (5/min)
- 50+ technical indicators (RSI, MACD, Bollinger, etc.)
- Intraday data
- Fundamental data
- Forex & crypto
- News sentiment API!

**Rivals**: $50/mo paid services

```env
ALPHA_VANTAGE_API_KEY=your_key
```

**Get Key**: https://www.alphavantage.co/support/#api-key (instant, free)

---

### 5. POLYGON.IO (BEST FREE STARTER)
**Website**: https://polygon.io
**Why It's Best**: Institutional-grade quality
**Free Basic Tier**:
- 5 calls/minute
- 2 years historical data
- End-of-day prices
- Reference data

**Note**: Paid tiers unlock real-time ($29-199/mo)

---

## CRYPTOCURRENCY - FREE & UNLIMITED

### 1. COINGECKO (BEST FREE CRYPTO)
**Website**: https://www.coingecko.com
**Why It's Best**: 13M+ tokens, NO API KEY NEEDED!
**Free Tier**:
- NO rate limits for basic calls
- 13M+ tokens across 240 networks
- 1600+ exchanges
- Historical OHLCV
- Market cap rankings
- Trending coins

**Rivals**: Paid crypto data services

```typescript
// No key needed!
const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
```

---

### 2. BINANCE (BEST FREE TRADING API)
**Website**: https://binance.com
**Why It's Best**: #1 exchange, generous free limits
**Free Tier**:
- 1200 requests/minute
- Real-time WebSocket
- All trading pairs
- Klines (candlesticks)
- Order book depth
- 24h stats

**No API key needed for market data!**

```typescript
// Public endpoint - no key!
const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
```

---

### 3. COINMARKETCAP (BEST FREE RANKINGS)
**Website**: https://coinmarketcap.com/api
**Why It's Best**: Industry standard rankings
**Free Basic Tier**:
- 333 calls/day
- 10k credits/month
- Latest quotes
- Market pairs
- Global metrics

---

## SENTIMENT ANALYSIS - FREE

### 1. STOCKGEIST (BEST FREE SENTIMENT)
**Website**: https://stockgeist.ai
**Why It's Best**: Real-time social sentiment
**Free Tier**:
- 10k free credits
- 5 free API streams
- Twitter, Reddit, news analysis
- Real-time alerts

---

### 2. APE WISDOM (FREE REDDIT TRACKER)
**Website**: https://apewisdom.io
**Why It's Best**: 100% free Reddit sentiment
**Free**:
- Tracks WallStreetBets
- Top mentioned stocks
- Sentiment scoring
- Historical trends

**No API needed - scrape their site or use their data**

---

### 3. FINNHUB SOCIAL SENTIMENT (INCLUDED FREE)
Already in Finnhub API!
- Twitter mentions
- Reddit mentions
- Sentiment scores
- 24-hour changes

---

## ALTERNATIVE DATA - FREE

### 1. CAPITOL TRADES (FREE INSIDER POLITICS)
**Website**: https://www.capitoltrades.com
**Why It's Best**: Track Congress stock trades FREE
**100% Free**:
- All congressional trades
- Timing analysis
- Performance tracking
- No API needed (web scraping OK)

---

### 2. ALTINDEX (FREE ALTERNATIVE DATA)
**Website**: https://altindex.com
**Why It's Best**: Aggregated alt data dashboard
**Free**:
- Social media signals
- Website traffic
- App downloads
- Job postings
- Sentiment

---

### 3. QUIVER QUANTITATIVE (FREE CONGRESS + MORE)
**Website**: https://www.quiverquant.com
**Why It's Best**: Multiple alt data sources free
**Free API**:
- Congressional trading
- Corporate lobbying
- Government contracts
- Reddit/WSB sentiment

---

## NEWS & EVENTS - FREE

### 1. FINNHUB NEWS (INCLUDED FREE)
- Company news
- Market news
- Press releases
- Forex news

### 2. NEWSAPI.ORG
**Website**: https://newsapi.org
**Free Tier**:
- 100 requests/day
- News search
- Headlines
- Multi-source

---

## ECONOMIC DATA - FREE

### 1. FRED (FEDERAL RESERVE - 100% FREE)
**Website**: https://fred.stlouisfed.org
**Why It's Best**: Official government data
**100% Free**:
- 800,000+ data series
- GDP, unemployment, inflation
- Treasury yields
- All economic indicators

```env
FRED_API_KEY=your_key
```

**Get Key**: https://fred.stlouisfed.org/docs/api/api_key.html

---

### 2. WORLD BANK API (FREE)
**Website**: https://data.worldbank.org
**100% Free**:
- Global economic indicators
- Development data
- Historical series

---

## WEB3 / DEFI - FREE

### 1. ALCHEMY (BEST FREE WEB3)
**Website**: https://alchemy.com
**Free Tier**:
- 100M compute units/month
- Ethereum, Polygon, Arbitrum
- NFT APIs
- Transaction APIs

```env
ALCHEMY_API_KEY=your_key
```

---

### 2. MORALIS (FREE DEFI DATA)
**Website**: https://moralis.io
**Free Tier**:
- Multi-chain support
- Token balances
- NFT data
- DeFi positions

---

## SUMMARY: THE FREE STACK THAT RIVALS $1000+/MONTH PAID

| Category | Free API | Rivals |
|----------|----------|--------|
| Stock Trading + Data | Alpaca | Polygon Business ($199/mo) |
| Real-time Quotes | Finnhub | Refinitiv ($1000+/mo) |
| Fundamentals | FMP | Bloomberg ($2000+/mo) |
| Technical Analysis | Alpha Vantage | TradingView Pro ($50/mo) |
| Crypto Data | CoinGecko | Kaiko ($500+/mo) |
| Crypto Trading | Binance | Any exchange |
| Sentiment | StockGeist/Finnhub | Sentifi ($200/mo) |
| Congress Trades | Capitol Trades | Unusual Whales ($50/mo) |
| Economic Data | FRED | Quandl ($50/mo) |
| DeFi | Alchemy/Moralis | Covalent ($100/mo) |

**TOTAL COST: $0**
**WOULD COST: $4,000+/month**

---

## QUICK SETUP FOR TIME

Add these to your `.env` file:

```env
# MUST HAVE - CRITICAL FREE APIs
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=

# RECOMMENDED FREE APIs
FMP_API_KEY=
FRED_API_KEY=
ALCHEMY_API_KEY=

# NO KEY NEEDED (Public)
# CoinGecko - just call the API
# Binance public endpoints - just call
# Ape Wisdom - web scraping
```

---

## API KEY ACQUISITION TIME

| API | Time | Link |
|-----|------|------|
| Alpaca | 2 min | https://alpaca.markets |
| Finnhub | 30 sec | https://finnhub.io/register |
| Alpha Vantage | 30 sec | https://alphavantage.co/support/#api-key |
| FMP | 1 min | https://financialmodelingprep.com/developer/docs/ |
| FRED | 1 min | https://fred.stlouisfed.org/docs/api/api_key.html |
| Alchemy | 2 min | https://alchemy.com |
| CoinGecko | 0 sec | No key needed! |
| Binance | 0 sec | No key for public data! |

**Total Time: ~8 minutes for institutional-grade data access**

---

*Document researched and compiled by TIME Meta-Intelligence System*
*Last Updated: December 2025*
