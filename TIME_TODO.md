# TIME BEYOND US - TODO

## Mobile App Builds
- [x] Create mobile app assets from SVGs
- [x] Android build complete - AAB: https://expo.dev/artifacts/eas/6yzb9upXsWQNwFtHSE2fmZ.aab
- [x] iOS credentials configured (cert, provisioning, push key, ASC API key)
- [x] **iOS SUBMITTED TO APP STORE!** - App Name: TIME APEX
  - Build #15, Version 1.0.0
  - Apple ID: 6757105143
  - TestFlight: https://appstoreconnect.apple.com/apps/6757105143/testflight/ios
  - All capabilities: Push, Sign in with Apple, NFC, Siri, HealthKit, Apple Pay
- [x] Complete App Store screenshots and metadata
- [x] Fix App Privacy (removed NSUserTrackingUsageDescription conflict)
- [x] Submit for App Review - PENDING APPLE REVIEW
- [ ] Submit Android app to Google Play (guide in mobile/GOOGLE_PLAY_SUBMISSION_GUIDE.md)
- [ ] AAB file ready: mobile/application-2d09f050-0f4c-4307-ad9d-d07ffbd8a741.aab

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
Last Updated: 2025-12-28
