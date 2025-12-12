# TIME Manual Setup Instructions
## Things YOU Need To Do (Claude Can't Do These)

Last Updated: December 2025

---

## REQUIRED: API Keys Setup

I've built all the integrations, but you need to get API keys from these providers. Here's exactly where to go and what to do:

---

### 1. ALPHA VANTAGE (FREE - Stock Data)
**Why**: Free stock quotes, technical indicators, fundamental data
**Limits**: 25 calls/day, 5 calls/min (free tier)

**Steps**:
1. Go to: https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Click "GET FREE API KEY"
4. Copy the key

**Add to .env**:
```
ALPHA_VANTAGE_API_KEY=your_key_here
```

---

### 2. FINNHUB (FREE - Real-time Stock Data)
**Why**: 60 calls/min free, real-time quotes, company info, news
**Best For**: Live stock prices, market news

**Steps**:
1. Go to: https://finnhub.io/register
2. Create account (email/password)
3. Go to Dashboard
4. Copy API key from dashboard

**Add to .env**:
```
FINNHUB_API_KEY=your_key_here
```

---

### 3. POLYGON.IO (PAID - Best Real-time Data)
**Why**: Institutional-grade data, tick-level, WebSocket streaming
**Cost**: $29/mo (Starter) - $199/mo (Business)

**Steps**:
1. Go to: https://polygon.io/pricing
2. Choose a plan (Starter is fine to start)
3. Create account
4. Go to Dashboard > API Keys
5. Copy your API key

**Add to .env**:
```
POLYGON_API_KEY=your_key_here
```

---

### 4. ALPACA (FREE - Trading + Data)
**Why**: Commission-free trading, paper trading sandbox
**CRITICAL**: This is for ACTUAL TRADING

**Steps**:
1. Go to: https://alpaca.markets/
2. Click "Sign Up"
3. Complete account verification (ID required)
4. Go to: https://app.alpaca.markets/paper/dashboard/overview
5. Click "View API Keys"
6. Generate new key
7. **SAVE BOTH KEY AND SECRET** (secret only shown once!)

**Add to .env**:
```
ALPACA_API_KEY=your_key_id_here
ALPACA_SECRET_KEY=your_secret_key_here
ALPACA_PAPER=true
```

**To switch to LIVE trading later**:
```
ALPACA_PAPER=false
```

---

### 5. BINANCE (FREE - Crypto Trading)
**Why**: #1 crypto exchange, 300+ trading pairs
**Note**: May need VPN if restricted in your country

**Steps**:
1. Go to: https://www.binance.com/en/register
2. Create account (email verification required)
3. Complete KYC if required
4. Go to: API Management (User Icon > API Management)
5. Create new API key
6. Enable Spot trading (disable Withdrawals for security!)
7. **SAVE BOTH KEY AND SECRET**

**Add to .env**:
```
BINANCE_API_KEY=your_key_here
BINANCE_SECRET=your_secret_here
BINANCE_TESTNET=true
```

---

### 6. OANDA (FREE Account - Forex Trading)
**Why**: Forex trading, 70+ currency pairs

**Steps**:
1. Go to: https://www.oanda.com/
2. Click "Open a Demo Account" (or Live)
3. Complete registration
4. Go to: Manage API Access in your account
5. Generate API token
6. Note your Account ID

**Add to .env**:
```
OANDA_API_KEY=your_token_here
OANDA_ACCOUNT_ID=your_account_id_here
OANDA_PRACTICE=true
```

---

### 7. COINBASE (Optional - US Crypto)
**Why**: US-regulated, good for USD pairs

**Steps**:
1. Go to: https://www.coinbase.com/
2. Create/login to account
3. Go to: Settings > API
4. Create new API key with trading permissions

---

## OPTIONAL BUT RECOMMENDED

### 8. GITHUB TOKEN (For Bot Research)
**Why**: Higher rate limits for searching GitHub for trading bots

**Steps**:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:user`
4. Generate and copy token

**Add to .env**:
```
GITHUB_TOKEN=your_token_here
```

---

### 9. OPENAI (For AI Analysis)
**Why**: GPT-4 for market analysis, sentiment

**Steps**:
1. Go to: https://platform.openai.com/
2. Create account
3. Go to: API Keys
4. Create new secret key

**Add to .env**:
```
OPENAI_API_KEY=sk-your_key_here
```

---

### 10. ALCHEMY/INFURA (For DeFi)
**Why**: Ethereum node access for DeFi protocols

**Alchemy (Recommended)**:
1. Go to: https://www.alchemy.com/
2. Create account
3. Create new app (Ethereum Mainnet)
4. Copy API key

**Add to .env**:
```
ALCHEMY_API_KEY=your_key_here
```

---

## DATABASE SETUP (Optional - For Production)

### MongoDB
The app works without MongoDB (uses in-memory), but for production:

**Option 1: MongoDB Atlas (Cloud - Free Tier)**
1. Go to: https://www.mongodb.com/atlas
2. Create free cluster
3. Get connection string
4. Add to .env: `MONGODB_URI=mongodb+srv://...`

**Option 2: Local MongoDB**
1. Install MongoDB locally
2. Default: `MONGODB_URI=mongodb://localhost:27017/time_db`

### Redis (Optional - For Caching)
1. Install Redis locally or use Redis Cloud
2. Add to .env: `REDIS_URL=redis://localhost:6379`

---

## NOTIFICATIONS SETUP (Optional)

### Twilio (SMS Alerts)
1. Go to: https://www.twilio.com/
2. Create account (free trial)
3. Get Account SID, Auth Token, Phone Number

**Add to .env**:
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Email (SMTP)
Use your email provider or a service like SendGrid:

**Add to .env**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## COMPLETE .ENV TEMPLATE

Create a file called `.env` in `C:\Users\Timeb\OneDrive\TIME\` with:

```env
# ===========================================
# TIME Meta-Intelligence Trading Governor
# Environment Configuration
# ===========================================

# Server
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# JWT (Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Admin
ADMIN_EMAIL=your_email@example.com
ADMIN_PHONE=+1234567890

# Evolution Mode
DEFAULT_EVOLUTION_MODE=controlled

# ===========================================
# MARKET DATA APIs (GET THESE FIRST!)
# ===========================================

# Alpha Vantage (FREE) - https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=

# Finnhub (FREE) - https://finnhub.io/register
FINNHUB_API_KEY=

# Polygon.io (PAID) - https://polygon.io/pricing
POLYGON_API_KEY=

# TwelveData (optional)
TWELVE_DATA_API_KEY=

# ===========================================
# BROKER CONNECTIONS
# ===========================================

# Alpaca (FREE) - https://alpaca.markets/
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_PAPER=true
ALPACA_DATA_FEED=iex

# OANDA (Forex) - https://www.oanda.com/
OANDA_API_KEY=
OANDA_ACCOUNT_ID=
OANDA_PRACTICE=true

# SnapTrade (Multi-broker)
SNAPTRADE_CLIENT_ID=
SNAPTRADE_CONSUMER_KEY=

# Interactive Brokers
IB_HOST=127.0.0.1
IB_PORT=7497
IB_CLIENT_ID=1

# ===========================================
# CRYPTO EXCHANGES
# ===========================================

# Binance - https://www.binance.com/
BINANCE_API_KEY=
BINANCE_SECRET=
BINANCE_TESTNET=true

# Bybit
BYBIT_API_KEY=
BYBIT_SECRET=
BYBIT_TESTNET=true

# ===========================================
# DATABASE
# ===========================================

# MongoDB
MONGODB_URI=mongodb://localhost:27017/time_db

# Redis
REDIS_URL=redis://localhost:6379

# ===========================================
# NOTIFICATIONS
# ===========================================

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ===========================================
# AI & RESEARCH
# ===========================================

# OpenAI
OPENAI_API_KEY=

# GitHub (for bot research)
GITHUB_TOKEN=

# ===========================================
# DEFI (Ethereum)
# ===========================================

# Alchemy
ALCHEMY_API_KEY=

# Infura
INFURA_API_KEY=

# ===========================================
# RISK DEFAULTS
# ===========================================
MAX_POSITION_SIZE=0.02
MAX_PORTFOLIO_RISK=0.10
MAX_DRAWDOWN=0.15
MAX_DAILY_LOSS=0.05

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/time.log
```

---

## QUICK START CHECKLIST

1. [ ] Get Alpha Vantage API key (FREE, 2 min)
2. [ ] Get Finnhub API key (FREE, 2 min)
3. [ ] Create Alpaca account for trading (FREE, 5 min)
4. [ ] Create Binance account for crypto (FREE, 5 min)
5. [ ] Create `.env` file with your keys
6. [ ] Run `npm install` in both root and frontend
7. [ ] Start backend: `npm run dev` (port 3001)
8. [ ] Start frontend: `cd frontend && npm run dev` (port 3000)
9. [ ] Open http://localhost:3000

---

## TESTING YOUR SETUP

After adding API keys, test the real market data:

1. Start the backend
2. Open browser to: `http://localhost:3001/api/real-market/status`
3. You should see which providers are configured
4. Test search: `http://localhost:3001/api/real-market/search?q=apple`
5. Test stock: `http://localhost:3001/api/real-market/stock/AAPL`
6. Test crypto: `http://localhost:3001/api/real-market/crypto/BTC`

---

## SECURITY NOTES

1. **NEVER commit .env to git** - It's in .gitignore
2. **Use paper trading first** - Set `ALPACA_PAPER=true`
3. **Disable withdrawals** - On Binance API, only enable trading
4. **Use 2FA** - Enable on all exchange accounts
5. **Rotate keys** - If compromised, regenerate immediately

---

## NEED HELP?

- Check TIME documentation in COPILOT1.md
- Check TIMEBEUNUS_FINANCIAL.md for API details
- Backend logs: `./logs/time.log`
- Frontend console: Browser DevTools

---

*Document auto-generated by TIME Meta-Intelligence System*
