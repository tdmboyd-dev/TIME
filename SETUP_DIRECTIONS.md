# TIME Platform - COMPLETE SETUP DIRECTIONS

**Last Updated:** 2025-12-23
**Purpose:** Step-by-step directions with exact links for everything you need to set up

---

## TABLE OF CONTENTS

1. [Broker Setup (Demo & Live)](#1-broker-setup-demo--live)
2. [FREE Social Media Marketing](#2-free-social-media-marketing)
3. [Banking Partner for TIME Pay](#3-banking-partner-for-time-pay)
4. [Options Trading Setup](#4-options-trading-setup)

---

## 1. BROKER SETUP (DEMO & LIVE)

### ALPACA (Stocks & Crypto) - NEED LIVE KEYS

**Current Status:** You have PAPER keys (start with "PK"). Need LIVE keys (start with "AK").

**Step-by-Step to Get LIVE Keys:**

```
1. Go to: https://app.alpaca.markets/

2. Log in to your account

3. In the left sidebar, click "Go to Live Account"
   (You may need to complete identity verification first)

4. Complete these requirements for LIVE:
   - Full legal name
   - Date of birth
   - Social Security Number (SSN)
   - Address verification
   - Employment information
   - Net worth / income questions

5. Once approved (usually instant), go to:
   Account → API Keys → Generate New Key

6. Copy your LIVE keys (they start with "AK"):
   - API Key ID: AKxxxxxxxxxxxxxxxx
   - Secret Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

7. Update your .env file:
   ALPACA_API_KEY=AKxxxxxxxxxxxxxxxx
   ALPACA_SECRET_KEY=your_secret_key
   ALPACA_PAPER=false

TO SWITCH BACK TO DEMO:
   ALPACA_PAPER=true
```

---

### BINANCE (Crypto) - ALREADY LIVE

**Current Status:** ✅ LIVE (BINANCE_TESTNET=false)

**To switch to DEMO (Testnet):**
```
1. Go to: https://testnet.binance.vision/

2. Log in (or create testnet account)

3. Generate testnet API keys

4. Update .env:
   BINANCE_TESTNET=true
   (Use testnet keys)
```

---

### KRAKEN (Crypto) - ALREADY CONFIGURED

**Current Status:** ✅ Ready for LIVE

**Demo Trading:** Kraken doesn't have a public testnet. Use small amounts for testing.

---

### OANDA (Forex) - ALREADY LIVE

**Current Status:** ✅ LIVE (OANDA_PRACTICE=false)

**To switch to DEMO:**
```
1. Go to: https://www.oanda.com/demo-account/

2. Create a demo account (free, no verification needed)

3. Go to: Manage API Access → Generate token for demo account

4. Update .env:
   OANDA_API_KEY=your_demo_token
   OANDA_ACCOUNT_ID=your_demo_account_id
   OANDA_PRACTICE=true
```

---

### INTERACTIVE BROKERS - FOR OPTIONS

**IMPORTANT:** IB API is NOT available for commission-free accounts. You need a standard IB Pro account.

**Step-by-Step:**
```
1. Create IB Pro Account (NOT IBKR Lite):
   https://www.interactivebrokers.com/en/index.php?f=4969

2. Choose "IBKR Pro" (has API access, per-share commissions)

3. Complete verification (takes 1-3 business days):
   - ID verification
   - Proof of address
   - Financial information

4. Download TWS (Trader Workstation):
   https://www.interactivebrokers.com/en/trading/tws.php

5. Install and log in to TWS

6. Enable API in TWS:
   - File → Global Configuration → API → Settings
   - Check "Enable ActiveX and Socket Clients"
   - Check "Allow connections from localhost only"
   - Port: 7496 (live) or 7497 (paper)
   - Click OK

7. Your .env already has:
   IB_HOST=127.0.0.1
   IB_PORT=7497  ← Change to 7496 for LIVE
   IB_CLIENT_ID=1

DEMO: Use port 7497 (paper trading)
LIVE: Use port 7496 (requires funded account)
```

---

### SNAPTRADE (Multi-Broker Aggregator) - ALREADY CONFIGURED

**Current Status:** ✅ Keys configured

**What SnapTrade Does:**
- Connects to 20+ brokers through one API
- Includes: Robinhood, Webull, Fidelity, Schwab, etc.
- Read-only access to portfolios
- Some brokers support trading through SnapTrade

**No action needed** - your keys are already set up.

---

## 2. FREE SOCIAL MEDIA MARKETING

### DISCORD WEBHOOK - 100% FREE

**Step-by-Step:**
```
1. Go to your Discord server

2. Click the gear icon next to your channel name (Edit Channel)

3. Click "Integrations" in the left sidebar

4. Click "Webhooks"

5. Click "New Webhook"

6. Give it a name (e.g., "TIME Bot")

7. Click "Copy Webhook URL"
   It looks like: https://discord.com/api/webhooks/1234567890/abcdefghijklmnop

8. Add to your .env file:
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
```

**Direct Link:** https://discord.com/developers/docs/resources/webhook

---

### TELEGRAM BOT - 100% FREE

**Step-by-Step:**
```
1. Open Telegram app (mobile or desktop)

2. Search for: @BotFather

3. Start a chat and send: /newbot

4. BotFather will ask for a name. Enter: TIME Trading Bot

5. BotFather will ask for a username. Enter: TIMETradingBot
   (must end in "bot" and be unique)

6. BotFather will give you a token like:
   123456789:ABCdefGHIjklMNOpqrSTUvwxYZ

7. Create a channel for your bot:
   - In Telegram, tap "New Channel"
   - Name it (e.g., "TIME Trading Updates")
   - Make it public, set username (e.g., @TIMETradingUpdates)
   - Add your bot as administrator

8. Add to your .env file:
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
   TELEGRAM_CHANNEL_ID=@TIMETradingUpdates
```

**Direct Link to BotFather:** https://t.me/BotFather

---

### REDDIT APP - 100% FREE

**Step-by-Step:**
```
1. Log in to Reddit

2. Go to: https://www.reddit.com/prefs/apps

3. Scroll down and click "create another app..."

4. Fill in the form:
   - Name: TIME Trading Bot
   - Select: "script"
   - Description: (optional)
   - About URL: (leave blank)
   - Redirect URI: http://localhost:8080

5. Click "create app"

6. You'll see:
   - Client ID: Under "personal use script" (short string)
   - Client Secret: Next to "secret"

7. Add to your .env file:
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_client_secret
   REDDIT_USERNAME=your_reddit_username
   REDDIT_PASSWORD=your_reddit_password
   REDDIT_SUBREDDIT=algotrading
```

**Direct Link:** https://www.reddit.com/prefs/apps

---

## 3. BANKING PARTNER FOR TIME PAY

**IMPORTANT:** To offer real APY and hold customer funds, you need a banking partner.

### Option A: Banking-as-a-Service Platforms (Recommended)

**1. UNIT (Easiest to Start)**
```
Website: https://www.unit.co/

What they provide:
- FDIC-insured accounts
- Debit cards
- ACH transfers
- Interest-bearing accounts

Steps:
1. Go to: https://www.unit.co/contact
2. Click "Get Started" or "Contact Sales"
3. Fill out the form with your business info
4. They'll schedule a call to discuss your needs

Cost: Typically $10,000-50,000 to integrate
Timeline: 2-4 months
```

**2. TREASURY PRIME**
```
Website: https://www.treasuryprime.com/

What they provide:
- Bank account APIs
- Multiple partner banks
- Full compliance support

Steps:
1. Go to: https://www.treasuryprime.com/contact
2. Fill out the partnership inquiry form
3. They'll reach out within 1-2 business days

Cost: Similar to Unit
Timeline: 3-6 months
```

**3. SYNAPSE (Now Tabapay)**
```
Website: https://www.tabapay.com/

Note: Synapse had issues in 2024. Check current status.
```

### Option B: Money Transmitter License (Hard Way)

```
If you want to handle money yourself (NOT recommended for starting out):

1. Register with FinCEN as a Money Services Business (MSB)
   https://www.fincen.gov/msb-registrant-search

2. Apply for state Money Transmitter Licenses
   - Each state has different requirements
   - Cost: $10,000-100,000 per state
   - Time: 6-18 months per state

3. Implement full compliance program:
   - KYC (Know Your Customer)
   - AML (Anti-Money Laundering)
   - BSA (Bank Secrecy Act) compliance

Total estimated cost: $500,000 - $2,000,000
Timeline: 1-3 years
```

### Recommendation

**Start with Unit or Treasury Prime.** They handle:
- Banking licenses
- FDIC insurance
- Compliance
- You just integrate their API

---

## 4. OPTIONS TRADING SETUP

### Why Interactive Brokers?

IB is the only broker with:
- Full options API access
- Professional-grade execution
- Multi-asset support (stocks, options, futures, forex)

### Account Type Matters

| Account Type | API Access | Cost |
|--------------|------------|------|
| IBKR Lite | ❌ NO API | Free trades |
| IBKR Pro | ✅ Full API | Per-share commission |

**You MUST use IBKR Pro for API trading.**

### Step-by-Step Options Setup

```
1. Create IBKR Pro Account:
   https://www.interactivebrokers.com/en/index.php?f=4969

2. Apply for options trading:
   - Log in to Account Management
   - Settings → Trading Permissions
   - Request "Options" permission
   - Complete options agreement questionnaire

3. Get approved (1-3 days)

4. Download TWS and enable API (see IB section above)

5. Your TIME platform can now:
   - Get real-time options chains
   - Place options orders
   - Manage spreads, straddles, etc.
```

### Alternative: tastytrade

```
Website: https://tastytrade.com/

Steps:
1. Create account at tastytrade.com
2. Contact them about API access: support@tastytrade.com
3. They may provide API access for qualified accounts

Note: tastytrade has excellent options trading but API access
is not as open as Interactive Brokers.
```

---

## QUICK REFERENCE: DEMO vs LIVE

| Broker | Demo Setting | Live Setting |
|--------|--------------|--------------|
| Alpaca | ALPACA_PAPER=true | ALPACA_PAPER=false |
| Binance | BINANCE_TESTNET=true | BINANCE_TESTNET=false |
| OANDA | OANDA_PRACTICE=true | OANDA_PRACTICE=false |
| IBKR | IB_PORT=7497 | IB_PORT=7496 |

---

## SUMMARY: WHAT TO DO NOW

### Immediate (Do Today):
1. [ ] Set up Discord webhook (5 min)
2. [ ] Create Telegram bot (10 min)
3. [ ] Create Reddit app (5 min)

### This Week:
4. [ ] Get Alpaca LIVE keys (requires verification)
5. [ ] Create OANDA demo account (for testing)

### If You Want Options:
6. [ ] Create IBKR Pro account (NOT Lite)
7. [ ] Apply for options permissions
8. [ ] Download TWS and enable API

### For TIME Pay Banking:
9. [ ] Contact Unit.co for banking partnership
10. [ ] Budget $10,000-50,000 for integration

---

## LINKS QUICK REFERENCE

| Service | Link |
|---------|------|
| Alpaca | https://app.alpaca.markets |
| Binance | https://www.binance.com/en/my/settings/api-management |
| Binance Testnet | https://testnet.binance.vision |
| OANDA | https://www.oanda.com/account/developer |
| OANDA Demo | https://www.oanda.com/demo-account |
| Interactive Brokers | https://www.interactivebrokers.com |
| Discord Webhooks | https://discord.com/developers/docs/resources/webhook |
| Telegram BotFather | https://t.me/BotFather |
| Reddit Apps | https://www.reddit.com/prefs/apps |
| Unit (Banking) | https://www.unit.co |
| Treasury Prime | https://www.treasuryprime.com |
| tastytrade | https://tastytrade.com |

---

## TROUBLESHOOTING

### Alpaca "Forbidden" Error
- Make sure you're using the right keys for paper vs live
- Paper keys start with "PK", Live keys start with "AK"

### IBKR "Not Connected"
- Make sure TWS is running
- Check API is enabled in TWS settings
- Verify port number matches your .env

### Discord Webhook Not Posting
- Make sure the webhook URL is complete
- Check the channel still exists
- Verify bot has permission to post

### Telegram Bot Not Working
- Make sure bot is admin of the channel
- Channel ID must start with @ for public channels
- Use chat ID (number) for private chats

---

**Questions?** All code is ready - you just need to get the API keys and configure them.
