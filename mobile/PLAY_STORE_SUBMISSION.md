# TIME BEYOND US - Google Play Store Submission Guide

## Pre-Submission Checklist

### 1. App Configuration (COMPLETED)
- [x] Package name: `com.timebeyondus.trading`
- [x] Version code: 14
- [x] Target SDK: 34 (Android 14)
- [x] Build type: App Bundle (AAB)
- [x] EAS Submit configured

### 2. Required Store Listing Assets

#### App Icon
- [x] 512x512 PNG icon (Hi-res)
- Location: `./assets/icon.png`

#### Screenshots (REQUIRED - Create these)
You need at least 2 screenshots for each device type:

**Phone Screenshots (1080x1920 or 1080x2340):**
- [ ] Home/Dashboard screen
- [ ] Portfolio view
- [ ] Trade execution screen
- [ ] Bot management screen
- [ ] Market overview
- [ ] Settings/Profile

**Tablet Screenshots (7-inch and 10-inch):**
- [ ] Landscape dashboard
- [ ] Trading interface

#### Feature Graphic
- [ ] 1024x500 PNG feature graphic for Play Store header

### 3. Store Listing Information

**App Name:** TIME BEYOND US

**Short Description (80 chars max):**
```
AI-powered trading platform with 182+ bots. We beat time, so you don't have to.
```

**Full Description:**
```
TIME BEYOND US is the ultimate AI-powered trading platform that puts sophisticated algorithmic trading at your fingertips.

KEY FEATURES:

INTELLIGENT TRADING
- 182+ AI trading bots covering stocks, crypto, and forex
- Real-time market signals from multiple data sources
- Advanced strategy synthesis with machine learning

COMPLETE PORTFOLIO MANAGEMENT
- Unified view across all connected brokers
- Real-time P&L tracking and analytics
- Risk management tools and position sizing

MULTI-BROKER SUPPORT
- Connect Alpaca, Coinbase, Kraken, and more
- Execute trades across multiple platforms
- Automatic portfolio rebalancing

REAL-TIME MARKET DATA
- Live price feeds and alerts
- Big moves detection and notifications
- Technical indicator analysis

SOCIAL TRADING
- Follow top performers on the leaderboard
- Copy successful trading strategies
- Community insights and discussions

SECURITY FIRST
- Biometric authentication (Face ID / Fingerprint)
- Two-factor authentication (MFA)
- Bank-level encryption

Download TIME BEYOND US today and let AI work for your portfolio.

Note: Trading involves risk. Past performance does not guarantee future results.
```

**Category:** Finance

**Tags:**
- Trading
- Investment
- AI Trading
- Stock Market
- Cryptocurrency
- Portfolio
- Algorithmic Trading

### 4. Content Rating

Complete the content rating questionnaire with these answers:
- Violence: None
- Sexual Content: None
- Language: None
- Controlled Substances: None
- User-Generated Content: No (our system generates)
- Real Gambling: No (simulated trading with paper mode)
- Data Collection: Yes (financial data for trading)

Expected Rating: **PEGI 3 / Everyone**

### 5. Privacy Policy (REQUIRED)

Privacy policy URL must be accessible:
```
https://timebeyondus.com/privacy
```

### 6. Data Safety Section

**Data Collected:**
- Personal info (name, email)
- Financial info (portfolio, trades)
- Device identifiers
- App activity

**Data Usage:**
- App functionality
- Analytics
- Account management

**Data Security:**
- Data is encrypted in transit (TLS)
- Data can be deleted on request

### 7. Build & Submit Commands

```bash
# Navigate to mobile directory
cd mobile

# Build for production
eas build --platform android --profile production

# Submit to Play Store (after build completes)
eas submit --platform android --profile production

# Or do both in one command
eas build --platform android --profile production --auto-submit
```

### 8. Google Play Console Setup

1. **Create App:**
   - Go to: https://play.google.com/console
   - Create new app
   - App name: TIME BEYOND US
   - Default language: English (US)
   - App type: App
   - Free/Paid: Free

2. **Set Up Your App:**
   - App access: All functionality available (with login)
   - Ads: Does not contain ads
   - Content rating: Complete questionnaire
   - Target audience: 18+ (financial app)

3. **Store Listing:**
   - Upload all assets
   - Add screenshots
   - Fill in descriptions

4. **App Signing:**
   - Google Play App Signing is automatic with EAS

### 9. Service Account Key

The `android-upload-key.json` should be a Google Cloud service account with:
- Play Console Developer role
- Upload APKs permission

**To create:**
1. Google Cloud Console -> IAM -> Service Accounts
2. Create account with "Play Console" permissions
3. Download JSON key
4. Place in mobile directory (gitignored)

### 10. Release Tracks

| Track | Purpose | Review Required |
|-------|---------|-----------------|
| Internal | Team testing | No |
| Closed | Beta testers | No |
| Open | Public beta | Yes |
| Production | Public release | Yes |

**Recommended Flow:**
1. Internal testing first
2. Closed beta with select users
3. Production rollout (staged 1% -> 10% -> 100%)

---

## Quick Commands

```bash
# Check EAS CLI version
eas --version

# Login to EAS
eas login

# Build Android production
eas build -p android --profile production

# Submit to Play Store
eas submit -p android

# Check build status
eas build:list

# View credentials
eas credentials
```

---

## Troubleshooting

### Build Failed
- Check `eas.json` configuration
- Ensure `google-services.json` is present
- Verify SDK versions match

### Submit Failed
- Verify service account key path
- Check Play Console permissions
- Ensure app is created in console

### Version Conflict
- Increment `versionCode` in app.json
- Use `"autoIncrement": true` in eas.json

---

Last Updated: January 17, 2026
