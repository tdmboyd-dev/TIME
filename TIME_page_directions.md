# TIME Platform - Complete Page & Feature Guide

**Version:** 45.0.0
**Last Updated:** 2025-12-23
**Purpose:** Complete documentation of every page, feature, and how everything works

---

## Table of Contents

1. [GET STARTED - Step by Step](#get-started---step-by-step)
2. [Master Admin Access](#master-admin-access)
3. [How Broker API Keys Work](#how-broker-api-keys-work)
4. [Connecting Brokers](#connecting-brokers)
5. [Subscription Tiers](#subscription-tiers)
6. [All Pages Explained](#all-pages-explained)
7. [Backend API Reference](#backend-api-reference)
8. [Environment Variables](#environment-variables)

---

# GET STARTED - Step by Step

## Quick Start Checklist

Use this checklist to get TIME fully operational:

- [ ] Step 1: Get your broker API keys
- [ ] Step 2: Get market data API keys
- [ ] Step 3: Configure environment variables
- [ ] Step 4: Deploy backend
- [ ] Step 5: Deploy frontend
- [ ] Step 6: Test connections
- [ ] Step 7: Make your first trade

---

## Step 1: Get Broker API Keys (15-30 minutes)

You need at least ONE broker to trade. Pick the ones you want:

### Option A: Alpaca (RECOMMENDED - Easiest)
**Best for:** US Stocks + Crypto, beginners
**Time:** 5-10 minutes

1. Go to https://alpaca.markets
2. Click "Get Started for Free"
3. Create account with email
4. Verify email
5. Go to "Paper Trading" (left sidebar)
6. Click "View API Keys"
7. Click "Generate New Keys"
8. **SAVE BOTH:**
   - API Key ID: `PKXXXXXXXXXXXXXXXX`
   - Secret Key: `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Option B: Binance (Crypto)
**Best for:** Crypto trading, more coins
**Time:** 10-15 minutes

1. Go to https://www.binance.com
2. Register account
3. Complete identity verification (required)
4. Go to Profile → API Management
5. Create new API key (name it "TIME")
6. Enable "Enable Spot & Margin Trading"
7. **SAVE:**
   - API Key: `XXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - Secret Key: `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Option C: OANDA (Forex)
**Best for:** Currency trading
**Time:** 10 minutes

1. Go to https://www.oanda.com
2. Click "Start Trading" → "Open a demo account"
3. Fill registration form
4. Login to your account
5. Go to "Manage API Access"
6. Generate personal access token
7. **SAVE:**
   - API Token: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
   - Account ID: `XXX-XXX-XXXXXXXX-XXX`

---

## Step 2: Get Market Data API Keys (5 minutes)

### Financial Modeling Prep (Required for stocks)
1. Go to https://financialmodelingprep.com/developer
2. Click "Get my API Key" (free tier = 250/day)
3. Create account
4. Copy your API key from dashboard

---

## Step 3: Configure Environment Variables

### Create/Edit .env file
Location: `C:\Users\Timeb\OneDrive\TIME\.env`

Copy this template and fill in YOUR keys:

```env
# ==============================================
# BROKER API KEYS (Add the ones you signed up for)
# ==============================================

# Alpaca (US Stocks + Crypto) - RECOMMENDED
ALPACA_API_KEY=PKXXXXXXXXXXXXXXXXXX
ALPACA_SECRET_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ALPACA_PAPER=true

# Binance (Crypto)
BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret

# OANDA (Forex)
OANDA_API_KEY=your_oanda_token
OANDA_ACCOUNT_ID=your_account_id
OANDA_PRACTICE=true

# Kraken (Crypto)
KRAKEN_API_KEY=your_kraken_key
KRAKEN_API_SECRET=your_kraken_secret

# ==============================================
# MARKET DATA (Required)
# ==============================================

FMP_API_KEY=your_fmp_key

# ==============================================
# PLATFORM (Already configured - don't change)
# ==============================================

ADMIN_API_KEY=TIME_ADMIN_2025
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url

# ==============================================
# OPTIONAL - AI Features
# ==============================================

OPENAI_API_KEY=your_openai_key
```

---

## Step 4: Deploy Backend

Open terminal in TIME folder:

```bash
cd C:\Users\Timeb\OneDrive\TIME

# Build
npm run build

# Deploy to Fly.io
flyctl deploy -a time-backend-hosting --remote-only
```

Wait for "Deployed successfully" message.

---

## Step 5: Deploy Frontend

```bash
cd frontend

# Deploy to Vercel
npx vercel --prod
```

Wait for URL confirmation.

---

## Step 6: Test Connections

### Test Backend Health
Open browser: https://time-backend-hosting.fly.dev/health

You should see:
```json
{
  "status": "ok",
  "database": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

### Test Admin Access
```bash
curl -X GET "https://time-backend-hosting.fly.dev/api/v1/timebeunus/dashboard" \
  -H "x-admin-key: TIME_ADMIN_2025"
```

You should see dashboard data.

### Test via Browser
1. Go to https://timebeyondus.com/timebeunus
2. You should see the TIMEBEUNUS dashboard
3. All controls should be visible

---

## Step 7: Make Your First Trade

### From TIMEBEUNUS Dashboard

1. Go to https://timebeyondus.com/timebeunus
2. Click the green **"New Trade"** button
3. Enter:
   - Symbol: `AAPL`
   - Action: `BUY`
   - Quantity: `1`
4. Click **"BUY AAPL"**
5. Check Activity Log for confirmation

### From Manual Trade Tab

1. Click "Manual Trade" tab in Owner Panel
2. Use the Quick Trade form
3. Same process as above

---

## Step 8: Start the Bot (Optional)

### Start Auto-Trading

1. On TIMEBEUNUS page, find "Bot Controls"
2. Click **"START"** button
3. Select dominance mode:
   - **Stealth** (slow, quiet)
   - **Balanced** (normal)
   - **Aggressive** (more trades)
   - **DESTROY** (max power)
4. Bot will start trading automatically

### Stop Bot
Click **"PAUSE"** or **"STOP"**

---

## Common Issues & Fixes

### "Broker not connected"
- Check API keys are correct in .env
- Verify broker account is active
- Check if using paper/live mode correctly

### "Trade failed"
- Check market hours (stocks: 9:30am-4pm ET)
- Verify symbol is correct
- Check broker has sufficient balance

### "Authentication required"
- Make sure x-admin-key header is set
- Check you're using the correct admin key

### Page not loading
- Clear browser cache
- Check if backend is deployed
- Verify frontend URL is correct

---

## What Each Dominance Mode Does

| Mode | Speed | Risk | Best For |
|------|-------|------|----------|
| Stealth | Slow | Low | Testing, quiet accumulation |
| Defensive | Medium | Very Low | Market uncertainty |
| Balanced | Normal | Medium | Daily operation |
| Aggressive | Fast | High | Strong trends |
| Competition | Fast | High | Outperforming benchmarks |
| DESTROY | Maximum | Maximum | Full conviction plays |

---

## What Each Automation Toggle Does

| Toggle | ON = | OFF = |
|--------|------|-------|
| Auto Trade | Bot executes trades automatically | You approve each trade |
| Auto Invest | Profits reinvested automatically | Profits stay as cash |
| Auto Yield | Idle funds earn yield in DeFi | Funds sit idle |
| Auto Rebalance | Portfolio stays balanced | Allocations drift |
| Auto Hedge | Protects during drawdowns | No protection |
| Auto Scale | Position sizes grow with account | Fixed sizes |
| Auto Tax | Harvests tax losses | No tax optimization |
| Auto Compound | Reinvests earnings | Simple interest only |

---

## Next Steps After Setup

1. **Explore other pages:**
   - /trade - Manual trading
   - /bots - Create custom bots
   - /portfolio - View holdings
   - /charts - Technical analysis

2. **Connect more brokers:**
   - Go to /brokers
   - Add additional brokers

3. **Set up alerts:**
   - Go to /alerts
   - Create price alerts

4. **Optimize strategies:**
   - Go to /backtest
   - Test before live trading

---

# Master Admin Access

## What is Master Admin?

As the platform owner, you have **MASTER ADMIN** access which gives you:

- **0% trading fees** - You pay nothing on any trade
- **Unlimited bots** - No bot limit
- **Unlimited capital** - No capital restrictions
- **Unlimited trades** - No monthly trade limit
- **Access to ALL features** - Every tier feature unlocked
- **Full TIMEBEUNUS dashboard** - Complete platform control
- **Gift access management** - Give users free upgrades

## How to Authenticate as Admin

### Method 1: Admin Key Header (Recommended for API)
```
Header: x-admin-key: TIME_ADMIN_2025
```

Example:
```bash
curl -X GET "https://time-backend-hosting.fly.dev/api/v1/timebeunus/dashboard" \
  -H "x-admin-key: TIME_ADMIN_2025" \
  -H "Content-Type: application/json"
```

### Method 2: User Role
If your user account has `role: 'owner'` or `role: 'admin'` in the database.

### Method 3: User ID
If your user has `id: 'admin'` in the database.

## What Admin Key Gives Access To

| Feature | Regular User | Admin |
|---------|-------------|-------|
| TIMEBEUNUS Dashboard | No | Yes |
| Manual Trading | No | Yes |
| Bot Controls | No | Yes |
| Close All Positions | No | Yes |
| Automation Toggles | No | Yes |
| Yield Farming | No | Yes |
| Bot Suggestions | No | Yes |
| Platform Fee Config | No | Yes |
| Gift Access Management | No | Yes |

---

# How Broker API Keys Work

## Important: You Use YOUR OWN Broker Accounts

The TIME platform connects to **YOUR** broker accounts. You need to:

1. **Create accounts** at each broker you want to use
2. **Generate API keys** from each broker
3. **Add those keys** to the TIME environment variables
4. **TIME executes trades** on your behalf using those keys

## Your Broker Keys vs Platform Keys

| Type | What It Is | Who Sets It Up |
|------|------------|----------------|
| **Your Broker Keys** | API keys from Alpaca, Binance, Kraken, etc. | YOU create accounts and get keys |
| **Platform Admin Key** | `TIME_ADMIN_2025` for platform access | Already set up |
| **Data Provider Keys** | FMP, CoinGecko, etc. for market data | YOU get these (most have free tiers) |

## Do You Need New API Keys?

**YES** - You need to:
1. Create accounts at the brokers you want to use
2. Generate API keys from each broker's developer portal
3. Add them to your `.env` file

**NO** - You don't need to change:
- The platform admin key (`TIME_ADMIN_2025`)
- The authentication system

---

# Connecting Brokers

## Step-by-Step Broker Setup

### 1. Alpaca (US Stocks + Crypto)

**Website:** https://alpaca.markets

**Steps:**
1. Go to https://alpaca.markets
2. Click "Sign Up" (free account)
3. Verify your identity (required for live trading)
4. Go to "API Keys" in your dashboard
5. Click "Generate New Key"
6. Copy both the API Key and Secret Key

**Add to .env:**
```env
ALPACA_API_KEY=your_api_key_here
ALPACA_SECRET_KEY=your_secret_key_here
ALPACA_PAPER=true   # Set to false for live trading
```

**What You Can Trade:** US Stocks, ETFs, Crypto (BTC, ETH, etc.)

---

### 2. Binance (Crypto)

**Website:** https://www.binance.com (or binance.us for US users)

**Steps:**
1. Go to https://www.binance.com
2. Create account and complete verification
3. Go to "API Management" (in account settings)
4. Create new API key
5. Enable "Spot Trading" permission
6. Whitelist your server IP (optional but recommended)

**Add to .env:**
```env
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_here
```

**What You Can Trade:** 500+ cryptocurrencies, futures, margin

---

### 3. Kraken (Crypto)

**Website:** https://www.kraken.com

**Steps:**
1. Go to https://www.kraken.com
2. Create account and verify
3. Go to Settings > API
4. Create new API key
5. Set permissions: Query Funds, Query Orders, Create Orders

**Add to .env:**
```env
KRAKEN_API_KEY=your_api_key_here
KRAKEN_API_SECRET=your_secret_here
```

**What You Can Trade:** 100+ cryptocurrencies

---

### 4. OANDA (Forex)

**Website:** https://www.oanda.com

**Steps:**
1. Go to https://www.oanda.com
2. Create account (practice or live)
3. Go to "Manage API Access"
4. Generate new API token
5. Note your Account ID

**Add to .env:**
```env
OANDA_API_KEY=your_api_token_here
OANDA_ACCOUNT_ID=your_account_id_here
OANDA_PRACTICE=true   # Set to false for live trading
```

**What You Can Trade:** 70+ forex pairs, CFDs

---

### 5. Interactive Brokers (Everything)

**Website:** https://www.interactivebrokers.com

**Steps:**
1. Create IBKR account
2. Enable API access in Account Management
3. Download TWS or IB Gateway
4. Configure API settings

**Add to .env:**
```env
IB_HOST=127.0.0.1
IB_PORT=7497        # 7496 for live, 7497 for paper
IB_CLIENT_ID=1
```

**What You Can Trade:** Stocks, Options, Futures, Forex, Bonds, Funds

---

### 6. MetaTrader 4/5 (Forex/CFDs)

**Steps:**
1. Open MT4/MT5 with your broker
2. Enable "Allow DLL imports" in options
3. Enable "Allow WebRequest for listed URL"
4. Add TIME server to allowed URLs

**Add to .env:**
```env
MT_HOST=your_mt_server
MT_PORT=443
MT_LOGIN=your_login
MT_PASSWORD=your_password
```

**What You Can Trade:** Forex, CFDs, Commodities

---

### 7. SnapTrade (Multi-Broker Aggregator)

**Website:** https://snaptrade.com

**Steps:**
1. Sign up for SnapTrade developer account
2. Get Client ID and Consumer Key
3. Users connect their own brokerages through SnapTrade

**Add to .env:**
```env
SNAPTRADE_CLIENT_ID=your_client_id
SNAPTRADE_CONSUMER_KEY=your_consumer_key
```

**What It Does:** Connects to 20+ brokers through one API

---

## Data Provider API Keys

### Financial Modeling Prep (FMP) - Stock Data
**Website:** https://financialmodelingprep.com
**Free Tier:** 250 requests/day
```env
FMP_API_KEY=your_key_here
```

### CoinGecko - Crypto Data
**Website:** https://www.coingecko.com/en/api
**Free Tier:** Yes (rate limited)
```env
COINGECKO_API_KEY=your_key_here
```

### Alchemy - Blockchain Data
**Website:** https://www.alchemy.com
**Free Tier:** Yes
```env
ALCHEMY_API_KEY=your_key_here
```

---

# Subscription Tiers

## Tier Comparison

| Tier | Monthly | Annual | Bots | Capital | Trades/Mo |
|------|---------|--------|------|---------|-----------|
| **FREE** | $0 | $0 | 3 (paper) | $0 | 0 |
| **STARTER** | $24.99 | $239.88 | 1 | $10,000 | 50 |
| **PRO** | $79 | $758.40 | 5 | $100,000 | 500 |
| **UNLIMITED** | $149 | $1,430.40 | Unlimited | Unlimited | Unlimited |
| **ENTERPRISE** | $499 | $4,790.40 | Unlimited | Unlimited | Unlimited |

## Feature Access by Tier

| Feature | FREE | STARTER | PRO | UNLIMITED | ENTERPRISE |
|---------|------|---------|-----|-----------|------------|
| Paper Trading | Yes | Yes | Yes | Yes | Yes |
| Basic Charts | Yes | Yes | Yes | Yes | Yes |
| Live Trading | No | Yes | Yes | Yes | Yes |
| Robo Advisor | No | Yes | Yes | Yes | Yes |
| Advanced Charts | No | No | Yes | Yes | Yes |
| AutoPilot | No | No | Yes | Yes | Yes |
| Tax Harvesting | No | No | Yes | Yes | Yes |
| Bot Marketplace | No | No | Yes | Yes | Yes |
| Premium Data | No | No | Yes | Yes | Yes |
| Dynasty Trust | No | No | No | Yes | Yes |
| Family Legacy AI | No | No | No | Yes | Yes |
| White-Label | No | No | No | No | Yes |
| API Access | No | No | No | No | Yes |

## Transaction Fees

| Fee Type | Amount | Who Pays |
|----------|--------|----------|
| Per-trade fee | $0.99 or 0.2% (greater) | All users except owner |
| Crypto spread | 0.5% | All users except owner |
| Performance fee | 15% of profits | All users except owner |
| AUM fee | 0.5% annual | All users except owner |
| Marketplace cut | 25% | Bot creators |
| **Owner/Admin** | **0%** | **You pay nothing** |

---

# All Pages Explained

## Public Pages (No Login Required)

### / (Home)
**URL:** https://timebeyondus.com/
**Purpose:** Landing page with platform overview
**Features:**
- Hero section with value proposition
- Feature highlights
- Pricing preview
- Call-to-action buttons

### /login
**URL:** https://timebeyondus.com/login
**Purpose:** User authentication
**Features:**
- Email/password login
- Google OAuth
- Apple OAuth
- WebAuthn (biometric)
- Remember me option
- Password reset link

### /register
**URL:** https://timebeyondus.com/register
**Purpose:** New user signup
**Features:**
- Email/password registration
- OAuth signup options
- Terms acceptance
- Email verification

---

## Main Trading Pages

### /trade
**URL:** https://timebeyondus.com/trade
**Purpose:** Execute manual trades
**Features:**
- Symbol search
- Buy/Sell buttons
- Order types (market, limit, stop)
- Position size calculator
- Real-time quotes
- Order history

**How to Use:**
1. Enter symbol (e.g., AAPL, BTC)
2. Select Buy or Sell
3. Enter quantity
4. Choose order type
5. Click Execute

### /markets
**URL:** https://timebeyondus.com/markets
**Purpose:** View market data and prices
**Features:**
- Stock watchlist
- Crypto prices
- Forex rates
- Market movers (gainers/losers)
- Sector performance
- Economic calendar

### /charts
**URL:** https://timebeyondus.com/charts
**Purpose:** Advanced charting with TradingView
**Features:**
- Full TradingView integration
- Multiple timeframes
- 100+ indicators
- Drawing tools
- Multiple chart layouts
- Save chart templates

### /portfolio
**URL:** https://timebeyondus.com/portfolio
**Purpose:** View your holdings and performance
**Features:**
- Position summary
- Asset allocation pie chart
- P&L tracking
- Performance history
- Dividend tracking
- Tax lot view

### /history
**URL:** https://timebeyondus.com/history
**Purpose:** View all past trades
**Features:**
- Trade log with filters
- Export to CSV
- P&L per trade
- Win rate statistics
- Date range filtering

---

## Bot & Automation Pages

### /bots
**URL:** https://timebeyondus.com/bots
**Purpose:** Manage your trading bots
**Features:**
- List of active bots
- Bot performance metrics
- Start/Stop controls
- Bot configuration
- Strategy parameters
- Risk settings

**How to Use:**
1. Click "Create Bot" or select existing
2. Configure strategy parameters
3. Set risk limits
4. Allocate capital
5. Click Start

### /autopilot
**URL:** https://timebeyondus.com/autopilot
**Purpose:** Set-and-forget automated trading
**Features:**
- Risk profile selector
- Asset allocation
- Rebalancing settings
- Auto-invest rules
- Performance dashboard
- Goal tracking

**Requires:** PRO tier or higher

### /strategies
**URL:** https://timebeyondus.com/strategies
**Purpose:** Browse and create trading strategies
**Features:**
- Strategy library
- Backtest results
- Copy strategies
- Custom strategy builder
- Parameter optimization

### /backtest
**URL:** https://timebeyondus.com/backtest
**Purpose:** Test strategies on historical data
**Features:**
- Date range selection
- Strategy parameters
- Walk-forward optimization
- Monte Carlo simulation
- Drawdown analysis
- Sharpe ratio calculation

### /live-trading
**URL:** https://timebeyondus.com/live-trading
**Purpose:** Monitor live bot activity
**Features:**
- Real-time trade feed
- Open positions
- Pending orders
- P&L ticker
- Risk exposure
- Emergency stop button

### /execution
**URL:** https://timebeyondus.com/execution
**Purpose:** Order execution analytics
**Features:**
- Slippage analysis
- Fill rates
- Execution speed
- Best execution reports
- Broker comparison

### /marketplace
**URL:** https://timebeyondus.com/marketplace
**Purpose:** Buy/rent trading bots from others
**Features:**
- Bot listings
- Performance verified
- Pricing (rent/buy)
- Reviews and ratings
- One-click deploy

**Requires:** PRO tier or higher

---

## Investment & Wealth Pages

### /invest
**URL:** https://timebeyondus.com/invest
**Purpose:** Long-term investment management
**Features:**
- Portfolio builder
- ETF recommendations
- Dividend tracking
- DCA (Dollar Cost Averaging)
- Goal-based investing

### /robo
**URL:** https://timebeyondus.com/robo
**Purpose:** Robo-advisor automated investing
**Features:**
- Risk questionnaire
- Portfolio recommendations
- Auto-rebalancing
- Tax-loss harvesting
- Fractional shares

**Requires:** STARTER tier or higher

### /retirement
**URL:** https://timebeyondus.com/retirement
**Purpose:** Retirement planning tools
**Features:**
- Retirement calculator
- 401k/IRA tracking
- Social Security estimates
- Withdrawal strategies
- Monte Carlo projections

### /wealth
**URL:** https://timebeyondus.com/wealth
**Purpose:** Advanced wealth management
**Features:**
- Dynasty Trust planning
- Estate planning tools
- Family Legacy AI
- Generational wealth
- Tax optimization

**Requires:** UNLIMITED tier or higher

### /tax
**URL:** https://timebeyondus.com/tax
**Purpose:** Tax reporting and optimization
**Features:**
- Tax-loss harvesting
- Wash sale tracking
- Form 8949 generation
- Tax estimates
- CPA export

**Requires:** PRO tier or higher

### /goals
**URL:** https://timebeyondus.com/goals
**Purpose:** Financial goal tracking
**Features:**
- Goal creation
- Progress tracking
- Milestone alerts
- Projected completion
- Goal prioritization

---

## Special Features Pages

### /dropzone
**URL:** https://timebeyondus.com/dropzone
**Purpose:** Upload files to create bots
**Features:**
- Drag & drop interface
- PDF/CSV/JSON support
- AI strategy extraction
- One-click bot creation
- Strategy validation

**How to Use:**
1. Drag a file (PDF, CSV, or JSON)
2. AI analyzes the strategy
3. Review extracted parameters
4. Click "Create Bot"
5. Bot is ready to trade

### /ai-trade-god
**URL:** https://timebeyondus.com/ai-trade-god
**Purpose:** AI-powered trading assistant
**Features:**
- Natural language commands
- Market analysis
- Trade suggestions
- Portfolio advice
- News interpretation

**How to Use:**
1. Type a command like "Buy 10 AAPL"
2. Or ask "What's happening with Tesla?"
3. AI responds and can execute

### /vision
**URL:** https://timebeyondus.com/vision
**Purpose:** ML-based market analysis
**Features:**
- Pattern recognition
- Trend prediction
- Anomaly detection
- Sentiment analysis
- Signal generation

### /alerts
**URL:** https://timebeyondus.com/alerts
**Purpose:** Price and event alerts
**Features:**
- Price alerts
- Volume alerts
- News alerts
- Technical alerts
- Multi-channel delivery (email, SMS, push)

### /risk
**URL:** https://timebeyondus.com/risk
**Purpose:** Risk management dashboard
**Features:**
- Portfolio VaR
- Stress testing
- Correlation matrix
- Exposure analysis
- Risk limits

### /social
**URL:** https://timebeyondus.com/social
**Purpose:** Social trading features
**Features:**
- Follow top traders
- Copy trades
- Leaderboard
- Trading ideas
- Discussion forums

---

## DeFi & Crypto Pages

### /defi
**URL:** https://timebeyondus.com/defi
**Purpose:** Decentralized finance features
**Features:**
- Wallet connection (MetaMask, etc.)
- Yield farming
- Liquidity pools
- Staking
- DEX aggregator

**How to Use:**
1. Connect wallet
2. Browse opportunities
3. Deposit funds
4. Earn yield

### /transfers
**URL:** https://timebeyondus.com/transfers
**Purpose:** Move funds between accounts
**Features:**
- Deposit funds
- Withdraw funds
- Transfer between brokers
- Crypto deposits/withdrawals
- Bank linking

---

## Account & Settings Pages

### /settings
**URL:** https://timebeyondus.com/settings
**Purpose:** Account settings and preferences
**Features:**
- Profile settings
- Security (2FA, password)
- Notifications
- Connected accounts
- API keys
- Subscription management

### /brokers
**URL:** https://timebeyondus.com/brokers
**Purpose:** Manage broker connections
**Features:**
- Add brokers
- View connected brokers
- API key management
- Connection status
- Set primary broker

**How to Use:**
1. Click "Add Broker"
2. Select broker type
3. Enter API credentials
4. Test connection
5. Save

### /payments
**URL:** https://timebeyondus.com/payments
**Purpose:** Subscription and billing
**Features:**
- Current plan
- Upgrade/downgrade
- Payment methods
- Billing history
- Invoices

---

## Admin Pages

### /admin
**URL:** https://timebeyondus.com/admin
**Purpose:** Admin dashboard
**Requires:** Admin role

### /admin-login
**URL:** https://timebeyondus.com/admin-login
**Purpose:** Admin authentication
**Features:**
- Admin-only login
- Enhanced security

### /admin-portal
**URL:** https://timebeyondus.com/admin-portal
**Purpose:** Full admin control panel
**Features:**
- User management
- System status
- Analytics
- Configuration

### /admin/health
**URL:** https://timebeyondus.com/admin/health
**Purpose:** System health monitoring
**Features:**
- Service status
- Database connections
- API health
- Error rates

### /gift-access
**URL:** https://timebeyondus.com/gift-access
**Purpose:** Gift premium access to users
**Features:**
- Gift tier access
- Set duration
- Revoke access
- AI recommendations
- Promo calendar

**How to Use:**
1. Enter user email
2. Select tier to gift
3. Choose duration
4. Add reason
5. Click Gift

---

## Owner-Only Pages

### /timebeunus
**URL:** https://timebeyondus.com/timebeunus
**Purpose:** MASTER CONTROL - Platform owner dashboard
**Requires:** Owner/Admin access

**Features:**
- **Bot Controls:** Start/Stop/Pause TIMEBEUNUS bot
- **Dominance Modes:** Stealth, Defensive, Balanced, Aggressive, Competition, DESTROY
- **Manual Trading:** Execute trades with 0% fees
- **Positions:** View all open positions
- **Automation Toggles:** Auto-trade, Auto-invest, Auto-yield, etc.
- **Yield Farming:** Deposit to DeFi protocols
- **Bot Suggestions:** AI-recommended bot improvements
- **Platform Fees:** View fee collection stats
- **Activity Log:** Real-time feed of all actions

**How to Use:**
1. Navigate to /timebeunus
2. You're automatically authenticated via admin key
3. Use controls to manage the platform
4. Click "New Trade" to execute trades
5. Toggle automations as needed

### /ultimate
**URL:** https://timebeyondus.com/ultimate
**Purpose:** Ultimate Money Machine ($59/mo premium)
**Features:**
- Questionnaire-based setup
- AI-generated strategy
- Full automation
- Guaranteed features

---

# Backend API Reference

## Base URL
```
https://time-backend-hosting.fly.dev/api/v1
```

## Authentication Headers
```
x-admin-key: TIME_ADMIN_2025
Content-Type: application/json
```

## Key Endpoints

### TIMEBEUNUS (Owner Only)
```
GET  /timebeunus/dashboard     - Full dashboard data
GET  /timebeunus/positions     - Current positions
GET  /timebeunus/trades        - Trade history
GET  /timebeunus/automation    - Automation settings
PUT  /timebeunus/automation    - Update automation
GET  /timebeunus/yield         - Yield opportunities
GET  /timebeunus/fees          - Platform fee stats
POST /timebeunus/trade         - Execute trade
POST /timebeunus/trade/close-all - Close all positions
```

### Trading (Authenticated)
```
GET  /trading/timebeunus/status  - Bot status
POST /trading/timebeunus/start   - Start bot
POST /trading/timebeunus/pause   - Pause bot
POST /trading/timebeunus/resume  - Resume bot
POST /trading/timebeunus/mode    - Change mode
POST /trading/timebeunus/stop    - Stop and close all
```

### Market Data
```
GET /real-market/quote/{symbol}    - Stock quote
GET /real-market/crypto/{symbol}   - Crypto price
GET /real-market/forex/{pair}      - Forex rate
```

### Bots
```
GET  /bots                    - List bots
POST /bots                    - Create bot
GET  /bots/{id}              - Get bot details
PUT  /bots/{id}              - Update bot
DELETE /bots/{id}            - Delete bot
POST /bots/{id}/start        - Start bot
POST /bots/{id}/stop         - Stop bot
```

---

# Environment Variables

## Required for Trading

```env
# Alpaca (US Stocks + Crypto)
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
ALPACA_PAPER=true

# Binance (Crypto)
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret

# Kraken (Crypto)
KRAKEN_API_KEY=your_key
KRAKEN_API_SECRET=your_secret

# OANDA (Forex)
OANDA_API_KEY=your_key
OANDA_ACCOUNT_ID=your_account
OANDA_PRACTICE=true
```

## Required for Market Data

```env
# Financial Modeling Prep
FMP_API_KEY=your_key

# CoinGecko (optional - has free tier)
COINGECKO_API_KEY=your_key

# Alchemy (blockchain data)
ALCHEMY_API_KEY=your_key
```

## Required for Platform

```env
# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=your_secret_key
ADMIN_API_KEY=TIME_ADMIN_2025

# Frontend URL
FRONTEND_URL=https://timebeyondus.com
```

## Optional

```env
# AI Features
OPENAI_API_KEY=your_key

# Notifications
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat

# Marketing
TWITTER_API_KEY=your_key
LINKEDIN_API_KEY=your_key
```

---

# Quick Start for New Setup

## 1. Get Broker API Keys
- Sign up at Alpaca, Binance, Kraken, or OANDA
- Generate API keys from each platform
- Add keys to `.env` file

## 2. Get Data Provider Keys
- Sign up at Financial Modeling Prep (free tier available)
- Add FMP_API_KEY to `.env`

## 3. Deploy
```bash
# Backend
cd backend
flyctl deploy -a time-backend-hosting

# Frontend
cd frontend
npx vercel --prod
```

## 4. Access Admin Dashboard
- Go to https://timebeyondus.com/timebeunus
- All admin features available automatically

## 5. Start Trading
- Click "New Trade" button
- Enter symbol, quantity, action
- Execute with 0% fees

---

# Troubleshooting

## "Authentication required" Error
- Make sure `x-admin-key: TIME_ADMIN_2025` header is set
- Or ensure you're logged in with admin role

## Broker Not Connected
- Check API keys in `.env`
- Verify keys are valid on broker's website
- Check if paper/live mode is correct

## Trades Not Executing
- Verify broker is connected (check /brokers page)
- Check if market is open
- Verify sufficient balance

## 404 on API Calls
- Use `/api/v1/` prefix (not `/api/`)
- Check endpoint spelling

---

# Support

- **GitHub Issues:** https://github.com/tdmboyd-dev/TIME/issues
- **Documentation:** This file + TIMEBEUNUS.md + DROP_THIS_TO_COPILOT.md

---

**Last Updated:** 2025-12-23
**Generated by Claude Code**
