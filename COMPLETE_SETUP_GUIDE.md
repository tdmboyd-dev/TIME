# TIME BEYOND US - Complete Setup & Deployment Guide

## Current Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| Backend API | LIVE | https://time-backend-hosting.fly.dev |
| Frontend Web | LIVE | https://timebeyondus.com |
| iOS App | App Store | com.timebeyondus.trading |
| Android App | Built | Needs Play Store submission |

---

## Part 1: Google Play Store Submission (Android)

### Step 1: Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **+ CREATE SERVICE ACCOUNT**
5. Fill in:
   - Name: `time-play-store-upload`
   - Description: `Service account for uploading TIME app to Play Store`
6. Click **CREATE AND CONTINUE**
7. Skip roles (we'll set them in Play Console)
8. Click **DONE**

### Step 2: Create JSON Key

1. Click on the service account you just created
2. Go to **KEYS** tab
3. Click **ADD KEY** > **Create new key**
4. Select **JSON**
5. Click **CREATE**
6. Save the downloaded file as `android-upload-key.json`
7. Move it to: `C:\Users\Timeb\OneDrive\TIME\mobile\android-upload-key.json`

### Step 3: Link Service Account to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Settings** (gear icon) > **API access**
3. Click **Link** next to the Google Cloud project
4. Find your service account in the list
5. Click **Grant access**
6. Set permissions:
   - **Admin** (all permissions) OR
   - At minimum: **Release to production**, **Manage testing tracks**
7. Click **Invite user**
8. Click **Send invite**

### Step 4: Create App in Play Console (if not already done)

1. Go to [Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - App name: `TIME BEYOND US`
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
4. Accept the declarations
5. Click **Create app**

### Step 5: Complete Store Listing

Navigate to each section and fill in:

**Main store listing:**
- App name: `TIME BEYOND US`
- Short description (max 80 chars):
  ```
  AI-powered trading platform with 182+ bots. We beat time, so you don't have to.
  ```
- Full description:
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

  SECURITY FIRST
  - Biometric authentication (Face ID / Fingerprint)
  - Two-factor authentication (MFA)
  - Bank-level encryption

  Download TIME BEYOND US today and let AI work for your portfolio.

  Note: Trading involves risk. Past performance does not guarantee future results.
  ```

**Graphics:**
- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots: At least 2 phone screenshots (1080x1920 or similar)

**App category:**
- Category: Finance
- Tags: Trading, Investment, AI, Stocks, Crypto

### Step 6: Complete App Content

**Privacy policy:**
- URL: `https://timebeyondus.com/privacy`

**App access:**
- Select: All functionality is available without special access

**Ads:**
- Select: No, my app does not contain ads

**Content rating:**
- Complete the questionnaire (select "No" for violence, mature content, etc.)
- Expected rating: Everyone / PEGI 3

**Target audience:**
- Select: 18 and over (financial app)

**Data safety:**
- Data collected: Personal info, Financial info
- Data encrypted in transit: Yes
- Users can request data deletion: Yes

### Step 7: Submit Android App

Open PowerShell/Terminal and run:

```powershell
cd C:\Users\Timeb\OneDrive\TIME\mobile
npx eas submit -p android --latest
```

When prompted, the command will:
1. Find the `android-upload-key.json` file
2. Upload the latest AAB build to Play Store
3. Submit to the internal testing track

### Step 8: Review and Publish

1. Go to Play Console > Your App > **Testing** > **Internal testing**
2. Review the uploaded build
3. Create a release and add release notes
4. Submit for review
5. Once approved, promote to **Production**

---

## Part 2: Environment Variables Reference

### Backend (Fly.io Secrets)

Set these using `flyctl secrets set KEY=value`:

```bash
# Required
JWT_SECRET=your-secure-jwt-secret
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Brokers
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
COINBASE_API_KEY=...
COINBASE_API_SECRET=...

# Data Providers
FMP_API_KEY=...
FINNHUB_API_KEY=...
TWELVEDATA_API_KEY=...

# Notifications
RESEND_API_KEY=...
TELEGRAM_BOT_TOKEN=...
DISCORD_WEBHOOK_URL=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Frontend (Vercel Dashboard)

Already configured:
- `NEXT_PUBLIC_API_URL` = https://time-backend-hosting.fly.dev
- `NEXT_PUBLIC_WS_URL` = wss://time-backend-hosting.fly.dev
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Mobile (EAS Secrets)

Set using `eas secret:create`:

```bash
eas secret:create --name API_URL --value "https://time-backend-hosting.fly.dev/api/v1" --scope project
eas secret:create --name WS_URL --value "wss://time-backend-hosting.fly.dev" --scope project
```

---

## Part 3: Deployment Commands

### Deploy Backend (Fly.io)

```powershell
cd C:\Users\Timeb\OneDrive\TIME
flyctl deploy --now
```

### Deploy Frontend (Vercel)

```powershell
cd C:\Users\Timeb\OneDrive\TIME
npx vercel deploy --prod
```

### Build & Submit iOS

```powershell
cd C:\Users\Timeb\OneDrive\TIME\mobile
npx eas build -p ios --profile production
npx eas submit -p ios --latest
```

### Build & Submit Android

```powershell
cd C:\Users\Timeb\OneDrive\TIME\mobile
npx eas build -p android --profile production
npx eas submit -p android --latest
```

---

## Part 4: Monitoring & Troubleshooting

### Check Backend Health

```powershell
curl https://time-backend-hosting.fly.dev/health
```

### View Backend Logs

```powershell
flyctl logs -a time-backend-hosting
```

### Check Fly.io Status

```powershell
flyctl status -a time-backend-hosting
```

### View Vercel Deployment

```powershell
npx vercel inspect --logs
```

### Check EAS Build Status

```powershell
npx eas build:list
```

---

## Part 5: Database Management

### Create Database Indexes

```powershell
cd C:\Users\Timeb\OneDrive\TIME
npx ts-node src/backend/database/create_indexes.ts
```

### MongoDB Atlas Access

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to your cluster
3. Click **Browse Collections** to view data
4. Use **Metrics** tab to monitor performance

---

## Part 6: Quick Reference URLs

| Service | URL |
|---------|-----|
| Frontend | https://timebeyondus.com |
| Backend API | https://time-backend-hosting.fly.dev/api/v1 |
| Health Check | https://time-backend-hosting.fly.dev/health |
| WebSocket | wss://time-backend-hosting.fly.dev |
| Fly.io Dashboard | https://fly.io/apps/time-backend-hosting |
| Vercel Dashboard | https://vercel.com/tdmboyd-devs-projects/time |
| EAS Dashboard | https://expo.dev/accounts/timebeunus/projects/time-beyond-us |
| Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |

---

## Part 7: Common Issues & Solutions

### "App not listening on port 8080" (Fly.io)

The backend may have started but health check timed out. Check:
```powershell
flyctl status
curl https://time-backend-hosting.fly.dev/health
```

If health returns OK, the app is working.

### "Service account not found" (Play Store)

1. Verify `android-upload-key.json` exists in `mobile/` directory
2. Check the service account has Play Console access
3. Wait 24 hours after granting access (sometimes required)

### "Build failed" (EAS)

Check build logs:
```powershell
npx eas build:view <build-id>
```

### "Domain not working" (Vercel)

1. Check DNS settings point to Vercel
2. Wait for DNS propagation (up to 48 hours)
3. Verify in Vercel dashboard under Domains

---

## Summary Checklist

- [x] Backend deployed to Fly.io
- [x] Frontend deployed to Vercel (timebeyondus.com)
- [x] Android app built (AAB ready)
- [x] iOS app on App Store
- [x] Environment variables configured
- [x] System documentation created
- [ ] **NEXT: Submit Android to Play Store** (needs service account)

---

*Last Updated: January 17, 2026*
