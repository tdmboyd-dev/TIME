# TIME BEYOND US - App Store Submission Guide

## Quick Start Commands

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Build for production
eas build --platform all --profile production

# Submit to stores
eas submit --platform all
```

---

## STEP 1: Prerequisites

### Apple App Store (iOS)
- [ ] Apple Developer Account ($99/year) - https://developer.apple.com
- [ ] App Store Connect access
- [ ] Create App ID in Apple Developer Portal
- [ ] Generate Distribution Certificate
- [ ] Generate Provisioning Profile

### Google Play Store (Android)
- [ ] Google Play Developer Account ($25 one-time) - https://play.google.com/console
- [ ] Create app in Google Play Console
- [ ] Generate upload keystore
- [ ] Create service account for API access

---

## STEP 2: Configure EAS Credentials

### For iOS:
```bash
# Let EAS manage credentials (recommended)
eas credentials --platform ios

# Or manually configure in eas.json
```

### For Android:
```bash
# Generate keystore
eas credentials --platform android

# Download service account key from Google Cloud Console
# Save as: mobile/android-upload-key.json
```

---

## STEP 3: Update eas.json

Replace the placeholder values in `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./android-upload-key.json",
        "track": "production"
      }
    }
  }
}
```

---

## STEP 4: App Store Listing Content

### App Name
**TIME BEYOND US**

### Subtitle (iOS only, 30 chars)
**AI Trading & Bot Platform**

### Short Description (Android, 80 chars)
**AI-powered trading bots. Build, deploy, and profit with automated strategies.**

### Full Description

```
TIME BEYOND US is the ultimate AI-powered trading platform that puts professional-grade trading tools in your pocket.

KEY FEATURES:

AUTOMATED TRADING BOTS
- Create custom trading bots in seconds with AI
- 25+ pre-built strategy templates
- Works with stocks, crypto, forex, options & futures

REAL-TIME PORTFOLIO TRACKING
- Live P&L updates
- Multi-broker integration
- Performance analytics

ADVANCED TRADING TOOLS
- AI-powered trading signals
- Technical analysis charts
- Price alerts & notifications

BOT MARKETPLACE
- Subscribe to top-performing bots
- Share your strategies and earn
- TIMEBEUNUS fusion for +15% performance boost

SECURITY FIRST
- Biometric authentication (Face ID / Fingerprint)
- Bank-grade encryption
- Never stores your broker credentials

SUBSCRIPTION TIERS:
- FREE: 1 bot, paper trading
- BASIC ($19/mo): 3 bots, $5K capital
- PRO ($49/mo): 7 bots, $25K capital
- PREMIUM ($99/mo): 15 bots, $100K capital
- ENTERPRISE ($249/mo): Unlimited bots

Start with $100 and let AI build profitable trading bots for you!

Download now and transform how you trade.
```

### Keywords (iOS, 100 chars total)
```
trading,bots,ai,stocks,crypto,forex,automated,investing,portfolio,alerts,signals,strategy
```

### Category
- Primary: Finance
- Secondary: Business

---

## STEP 5: Required Assets

### App Icon
- iOS: 1024x1024 PNG (no alpha)
- Android: 512x512 PNG

Location: `mobile/assets/icon.png`

### Screenshots (Required)
Create screenshots for:

**iPhone:**
- 6.7" (1290 x 2796) - iPhone 14 Pro Max
- 6.5" (1284 x 2778) - iPhone 12 Pro Max
- 5.5" (1242 x 2208) - iPhone 8 Plus

**iPad:**
- 12.9" (2048 x 2732)

**Android:**
- Phone: 1080 x 1920 or larger
- Tablet: 1920 x 1080

### Screenshot Content Ideas:
1. Home dashboard with P&L
2. Bot creation with AI
3. Trading interface
4. Portfolio chart
5. Leaderboard
6. Bot marketplace

### Feature Graphic (Android only)
- 1024 x 500 PNG

---

## STEP 6: Build for Production

```bash
# Build for both platforms
eas build --platform all --profile production

# Or build separately
eas build --platform ios --profile production
eas build --platform android --profile production
```

Wait for builds to complete (usually 15-30 minutes each).

---

## STEP 7: Submit to Stores

### iOS App Store
```bash
eas submit --platform ios --profile production
```

Then in App Store Connect:
1. Add app description, keywords, screenshots
2. Set pricing (Free with In-App Purchases)
3. Configure in-app purchases for subscriptions
4. Submit for review

### Google Play Store
```bash
eas submit --platform android --profile production
```

Then in Google Play Console:
1. Complete store listing
2. Add screenshots
3. Set up pricing and subscriptions
4. Select release track (internal -> closed -> open -> production)
5. Submit for review

---

## STEP 8: Configure In-App Purchases

### iOS (App Store Connect)
Create subscription products:
| Product ID | Name | Price |
|------------|------|-------|
| `time_basic_monthly` | BASIC Monthly | $19.99 |
| `time_pro_monthly` | PRO Monthly | $49.99 |
| `time_premium_monthly` | PREMIUM Monthly | $99.99 |
| `time_enterprise_monthly` | ENTERPRISE Monthly | $249.99 |

### Android (Google Play Console)
Create subscription products with same IDs.

---

## STEP 9: Privacy & Compliance

### Privacy Policy URL
https://timebeyondus.com/privacy

### Terms of Service URL
https://timebeyondus.com/terms

### App Privacy (iOS)
Data collected:
- Contact Info (email)
- Identifiers (user ID)
- Usage Data
- Financial Info (trading data)

Purpose: App Functionality, Analytics

---

## STEP 10: Post-Submission

### Review Timeline
- **iOS**: 24-48 hours (can take up to 7 days)
- **Android**: 1-7 days

### Common Rejection Reasons:
1. Crashesor bugs
2. Missing privacy policy
3. Financial app compliance issues
4. Incomplete functionality
5. In-app purchase issues

### If Rejected:
1. Read rejection notes carefully
2. Fix issues
3. Resubmit with release notes explaining fixes

---

## Support Contacts

**Apple Developer Support**
https://developer.apple.com/contact/

**Google Play Developer Support**
https://support.google.com/googleplay/android-developer/

---

## Quick Commands Reference

```bash
# Development
npm start                    # Start Expo dev server
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator

# Building
eas build -p ios             # Build iOS
eas build -p android         # Build Android
eas build -p all             # Build both

# Submitting
eas submit -p ios            # Submit to App Store
eas submit -p android        # Submit to Play Store
eas submit -p all            # Submit to both

# Updates (after initial release)
eas update                   # Push OTA update
eas update --branch preview  # Push to preview channel
```

---

*"Your trading empire, in your pocket."* - TIME BEYOND US
