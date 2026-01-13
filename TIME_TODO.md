# TIME BEYOND US - PRODUCTION TODO

## CRITICAL FIXES NEEDED

### 1. CSRF Token Fix ✅ DEPLOYED (Jan 13, 2026)
- [x] Frontend CSRF token handling fixed
- [x] Login, Register, Admin-Login pages now properly fetch and include CSRF tokens
- [x] Frontend deployed to Vercel: https://timebeyondus.com
- Note: Backend already has CSRF middleware, frontend wasn't sending tokens

### 2. Backend TypeScript Build Errors 🔴 NEEDS FIX
The following TypeScript errors are blocking new backend deployments:

**Missing Modules:**
- [ ] `../database/client` - module not found in drip_campaign_service.ts
- [ ] `../middleware/auth` - module not found in campaigns.ts

**Type Errors:**
- [ ] SnapTrade broker config - clientId type mismatch (string vs number)
- [ ] Stripe API version - outdated "2024-12-18.acacia" needs update to "2025-02-24.acacia"
- [ ] InMemoryCollection missing methods: `sort`, `updateMany`, `insertMany`, `matchedCount`
- [ ] Various `unknown` type errors in email services (Mailgun, SendGrid)
- [ ] Push notification service type errors
- [ ] Analytics routes: TradeSchema and BotSchema missing userId property

**Temporary Fix Applied:**
- tsconfig.json updated to `strict: false`, `noEmitOnError: false`
- Proper fix needed: Add missing types and fix InMemoryCollection interface

### 3. iOS App Store Status 📱
- **STATUS: RE-SUBMITTED - PENDING APPLE REVIEW**
- App Name: TIME APEX (TIME BEYOND US)
- Apple ID: 6757105143
- Build #13, Version 1.0.0
- Original Submission: Dec 27, 2025
- Re-submitted: Jan 13, 2026
- Apple review typically takes 24-48 hours
- **NOT YET VISIBLE** on App Store until Apple approves

---

## Mobile App Builds
- [x] Create mobile app assets from SVGs
- [x] Android build complete - AAB: https://expo.dev/artifacts/eas/6yzb9upXsWQNwFtHSE2fmZ.aab
- [x] iOS credentials configured (cert, provisioning, push key, ASC API key)
- [x] **iOS SUBMITTED TO APP STORE!** - App Name: TIME APEX
  - Build #13, Version 1.0.0
  - Apple ID: 6757105143
  - TestFlight: https://appstoreconnect.apple.com/apps/6757105143/testflight/ios
  - All capabilities: Push, Sign in with Apple, NFC, Siri, HealthKit, Apple Pay
- [x] Complete App Store screenshots and metadata
- [x] Fix App Privacy (removed NSUserTrackingUsageDescription conflict)
- [x] Submit for App Review - PENDING APPLE REVIEW
- [ ] **ANDROID SUBMISSION** - Do later
  - Guide: mobile/GOOGLE_PLAY_SUBMISSION_GUIDE.md
  - AAB file: mobile/application-2d09f050-0f4c-4307-ad9d-d07ffbd8a741.aab
  - Need to complete Step 4+ in Google Play Console

## iOS App Store Updates (After Jan 1st 2026)
- [ ] Update PREMIUM tier description to "unlimited capital" (currently shows $100K)
- [ ] Change App Store icon to TIME letter logo (same as sidebar logo)
- [ ] Update app description with unlimited capital for PREMIUM tier

## Master Admin Feature Control Panel ✅ COMPLETE
- [x] Build admin UI for feature flag management (/admin/features)
- [x] Create feature flags database table
- [x] API endpoints for toggling features
- [x] Real-time feature flag sync to mobile/web
- [x] Feature flag caching system

## Auto-Announcement System ✅ COMPLETE
- [x] Announcement creation on feature enable
- [x] Push notification broadcast
- [x] In-app announcement banner
- [x] Email notification option
- [x] Announcement history/archive

## User Segment Targeting ✅ COMPLETE
- [x] User segments database (premium, free, beta, etc.)
- [x] Segment-based feature rollout
- [x] Percentage-based gradual rollout
- [x] Geographic targeting (by_country)
- [x] Device-based targeting

## A/B Testing Framework
- [ ] Experiment creation UI
- [ ] Variant assignment logic
- [ ] Analytics tracking per variant
- [ ] Statistical significance calculator
- [ ] Winner selection and full rollout

## iOS Capabilities Implementation ✅ UPDATED in app.json
- [x] Push Notifications - trade alerts, price alerts, bot signals
- [x] Associated Domains - deep linking configured
- [x] Sign In with Apple - authentication option
- [x] In-App Purchases - premium subscriptions (merchant ID configured)
- [x] Data Protection - secure financial data
- [x] Time Sensitive Notifications - urgent alerts
- [x] iCloud - sync settings across devices
- [ ] App Groups - widget support, extensions (needs additional setup)
- [x] Siri - Hey Siri show my portfolio
- [ ] Wallet - trading cards/passes (needs additional setup)
- [x] NFC Tag Reading - hardware wallet integration
- [x] HealthKit - stress tracking during trading
- [ ] WeatherKit - market sentiment correlation (needs API key)
- [ ] Maps - find brokers/ATMs (needs implementation)
- [ ] FinanceKit - finance data access (needs additional setup)

## Security
- [x] Remove exposed passwords from batch files (GitGuardian incident fixed)
- [x] Add batch files to .gitignore
- [x] CSRF token protection properly implemented (Jan 13, 2026)
- [ ] Revoke old app-specific passwords in Apple ID settings

## Apple Developer Setup (for full capabilities)
- [ ] Apple Pay Payment Processing Certificate (for accepting payments)
- [ ] Apple Pay Merchant Identity Certificate (for web payments)
- [ ] Register merchant domains for Apple Pay on web
- [ ] Configure Push Notification certificates if needed

## Mobile Web Bug Fix
- [x] Fix "application error: a client-side exception has occurred" on mobile browsers
  - v71.0.0 already deployed fix for mobile Chrome
  - If still seeing error, force refresh (pull down on mobile or Ctrl+Shift+R)

---

## PRODUCTION AUDIT FINDINGS (Jan 13, 2026)

### Deployment Status
| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ LIVE | https://timebeyondus.com |
| Backend | ✅ LIVE | https://time-backend-hosting.fly.dev |
| iOS App | ⏳ PENDING REVIEW | App Store Connect |
| Android App | 📦 BUILT | Not submitted yet |

### Backend Health
- 1 of 2 Fly.io machines healthy (version 112)
- Failed machine (version 114) was stopped
- Previous working deployment still serving traffic

### Frontend Changes Deployed
- CSRF token fetch on page load
- CSRF token included in all POST/PUT/DELETE requests
- Updated: login, register, admin-login pages

### Recommended Priority Actions
1. **IMMEDIATE**: Monitor Apple review status for iOS app approval
2. **HIGH**: Fix InMemoryCollection interface to add missing MongoDB methods
3. **HIGH**: Update Stripe API version to 2025-02-24.acacia
4. **MEDIUM**: Create missing module stubs (database/client, middleware/auth)
5. **MEDIUM**: Complete Android Play Store submission

---
Last Updated: 2026-01-13
