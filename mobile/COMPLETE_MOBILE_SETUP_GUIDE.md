# TIME BEYOND US - Complete Mobile App Setup Guide

## STEP-BY-STEP INSTRUCTIONS TO GET EVERYTHING FOR APP STORES

---

## PART 1: APPLE APP STORE SETUP

### Step 1.1: Create Apple Developer Account
1. Go to https://developer.apple.com/programs/enroll/
2. Click "Start Your Enrollment"
3. Sign in with your Apple ID (or create one)
4. Choose "Individual" or "Organization"
5. Pay $99/year fee
6. Wait 24-48 hours for approval

### Step 1.2: Get Your Apple Team ID
1. Go to https://developer.apple.com/account
2. Click "Membership" in the sidebar
3. Copy your **Team ID** (format: ABCDE12345)
4. Save this - you'll need it for eas.json

### Step 1.3: Create App ID (Bundle Identifier)
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click the "+" button
3. Select "App IDs" → Continue
4. Select "App" → Continue
5. Enter:
   - Description: `TIME BEYOND US`
   - Bundle ID: Select "Explicit" and enter `com.timebeyondus.trading`
6. Enable these capabilities:
   - [x] Push Notifications
   - [x] Associated Domains
   - [x] Sign In with Apple (optional)
7. Click "Continue" → "Register"

### Step 1.4: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platforms: iOS
   - Name: `TIME BEYOND US`
   - Primary Language: English (U.S.)
   - Bundle ID: Select `com.timebeyondus.trading`
   - SKU: `timebeyondus-trading-001`
   - User Access: Full Access
4. Click "Create"
5. Copy your **App Store Connect App ID** (number in URL or App Information page)

### Step 1.5: Get Your Apple ID for Submission
1. Your Apple ID is the email you used to create your Apple Developer Account
2. Example: `your-email@gmail.com`

### Step 1.6: Update eas.json with Apple Credentials
Open `mobile/eas.json` and update:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

---

## PART 2: GOOGLE PLAY STORE SETUP

### Step 2.1: Create Google Play Developer Account
1. Go to https://play.google.com/console/signup
2. Sign in with your Google Account
3. Accept the Developer Agreement
4. Pay $25 one-time fee
5. Complete identity verification (may take 48 hours)

### Step 2.2: Create Your App in Play Console
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: `TIME BEYOND US`
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free
4. Check the declarations and click "Create app"

### Step 2.3: Create Service Account for API Access
1. Go to https://play.google.com/console/developers/api-access
2. Click "Create new service account"
3. Follow the link to Google Cloud Console
4. In Google Cloud Console:
   a. Click "Create Service Account"
   b. Name: `play-store-upload`
   c. Click "Create and Continue"
   d. Role: Select "Service Account User"
   e. Click "Done"
5. Click on the new service account
6. Go to "Keys" tab → "Add Key" → "Create new key"
7. Select "JSON" → "Create"
8. Download the JSON file
9. Rename it to `android-upload-key.json`
10. Move it to your `mobile/` folder

### Step 2.4: Grant Access to Service Account
1. Go back to https://play.google.com/console/developers/api-access
2. Click "Grant access" next to your service account
3. Set permissions:
   - [x] Release to production, exclude devices, and use Play App Signing
   - [x] Manage testing tracks and edit tester lists
4. Click "Invite user" → "Send invite"

### Step 2.5: Update eas.json with Android Credentials
The file `android-upload-key.json` should be in your `mobile/` folder.
eas.json is already configured to use it:
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./android-upload-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## PART 3: EXPO/EAS SETUP

### Step 3.1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 3.2: Login to Expo
```bash
eas login
```
Enter your Expo account credentials (create one at https://expo.dev if needed)

### Step 3.3: Configure EAS Project
```bash
cd mobile
eas init
```
This will create a project and give you an EAS Project ID.

### Step 3.4: Update app.json with EAS Project ID
Open `mobile/app.json` and replace `YOUR_EAS_PROJECT_ID`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    },
    "updates": {
      "url": "https://u.expo.dev/your-actual-project-id"
    }
  }
}
```

### Step 3.5: Configure Credentials
```bash
# For iOS (EAS will guide you through setup)
eas credentials --platform ios

# For Android (EAS will guide you through setup)
eas credentials --platform android
```

---

## PART 4: CREATE APP ASSETS

### Step 4.1: App Icon (Required)
Create these files in `mobile/assets/`:

**icon.png** - Main app icon
- Size: 1024x1024 pixels
- Format: PNG (no transparency for iOS)
- No rounded corners (system adds them)

**adaptive-icon.png** - Android adaptive icon foreground
- Size: 1024x1024 pixels
- Format: PNG with transparency OK
- Icon should be in center 66% of canvas

### Step 4.2: Splash Screen
**splash.png**
- Size: 1284x2778 pixels (iPhone 12 Pro Max)
- Format: PNG
- Background: #020617 (dark blue)
- Logo centered

### Step 4.3: Notification Icon (Android)
**notification-icon.png**
- Size: 96x96 pixels
- Format: PNG with transparency
- Single color (white) on transparent background

### Step 4.4: Screenshots (Required for Stores)

**iPhone Screenshots** (at least 3):
- 6.7" Display: 1290 x 2796 pixels
- 6.5" Display: 1284 x 2778 pixels
- 5.5" Display: 1242 x 2208 pixels

**Android Screenshots** (at least 2):
- Phone: 1080 x 1920 pixels minimum
- Can upload up to 8 screenshots

**Screenshot Ideas:**
1. Home Dashboard showing P&L
2. Bot Builder with AI creation
3. Trading interface
4. Portfolio chart
5. Leaderboard
6. Bot Marketplace

### Step 4.5: Feature Graphic (Android Only)
- Size: 1024 x 500 pixels
- Shows on Play Store listing

---

## PART 5: BUILD YOUR APP

### Step 5.1: Install Dependencies
```bash
cd mobile
npm install
```

### Step 5.2: Build for Both Platforms
```bash
# Build for both iOS and Android
eas build --platform all --profile production
```

Or build separately:
```bash
# iOS only
eas build --platform ios --profile production

# Android only
eas build --platform android --profile production
```

### Step 5.3: Wait for Build
- Builds take 15-30 minutes each
- You'll get a URL to download the builds when done
- Check status at https://expo.dev

---

## PART 6: SUBMIT TO STORES

### Step 6.1: Submit to Apple App Store
```bash
eas submit --platform ios --profile production
```

Then complete in App Store Connect:
1. Go to your app in App Store Connect
2. Fill in "App Information":
   - Privacy Policy URL: `https://timebeyondus.com/privacy`
   - Category: Finance
   - Age Rating: 17+
3. Fill in "Pricing and Availability":
   - Price: Free
   - Availability: All territories
4. Fill in "App Privacy":
   - Data types collected: Contact Info, Identifiers, Usage Data, Financial Info
5. Upload screenshots for each device size
6. Write "What's New in This Version"
7. Click "Submit for Review"

### Step 6.2: Submit to Google Play Store
```bash
eas submit --platform android --profile production
```

Then complete in Play Console:
1. Go to your app
2. Complete "Store listing":
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - App icon
   - Feature graphic
   - Screenshots
3. Complete "Content rating" questionnaire
4. Complete "Target audience and content"
5. Select countries for distribution
6. Go to "Release" → "Production" → "Create new release"
7. Upload your AAB file (or use EAS submit)
8. Click "Review release" → "Start rollout to Production"

---

## PART 7: IN-APP PURCHASES SETUP

### Step 7.1: Apple In-App Purchases
1. In App Store Connect, go to your app
2. Click "In-App Purchases" → "+"
3. Select "Auto-Renewable Subscription"
4. Create subscription group: "TIME Subscriptions"
5. Add products:

| Reference Name | Product ID | Price |
|---------------|------------|-------|
| BASIC Monthly | `time_basic_monthly` | $19.99 |
| PRO Monthly | `time_pro_monthly` | $49.99 |
| PREMIUM Monthly | `time_premium_monthly` | $99.99 |
| ENTERPRISE Monthly | `time_enterprise_monthly` | $249.99 |

### Step 7.2: Google Play In-App Purchases
1. In Play Console, go to your app
2. Click "Monetize" → "Subscriptions"
3. Click "Create subscription"
4. Create same products with same IDs as Apple

---

## PART 8: PUSH NOTIFICATIONS SETUP

### Step 8.1: iOS Push Notifications
EAS handles this automatically when you run:
```bash
eas credentials --platform ios
```

### Step 8.2: Android Push Notifications (Firebase)
1. Go to https://console.firebase.google.com
2. Create a new project: "TIME BEYOND US"
3. Add an Android app:
   - Package name: `com.timebeyondus.trading`
   - Download `google-services.json`
4. Place `google-services.json` in `mobile/` folder

---

## QUICK REFERENCE: WHAT YOU NEED

### For Apple (iOS):
- [ ] Apple Developer Account ($99/year)
- [ ] Apple Team ID
- [ ] App Store Connect App ID
- [ ] Apple ID (email)
- [ ] App icon 1024x1024
- [ ] Screenshots (3 sizes)
- [ ] Privacy policy URL

### For Android:
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Service account JSON key
- [ ] App icon 1024x1024
- [ ] Adaptive icon 1024x1024
- [ ] Feature graphic 1024x500
- [ ] Screenshots
- [ ] google-services.json (for push notifications)

### Files to Update:
- [ ] `mobile/app.json` - Add EAS Project ID
- [ ] `mobile/eas.json` - Add Apple credentials
- [ ] `mobile/android-upload-key.json` - Add service account key
- [ ] `mobile/google-services.json` - Add Firebase config

---

## COMMANDS CHEAT SHEET

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS project
eas init

# Configure credentials
eas credentials --platform ios
eas credentials --platform android

# Build for production
eas build --platform all --profile production

# Submit to stores
eas submit --platform all

# Push OTA updates (after initial release)
eas update --branch production
```

---

## TIMELINE

| Step | Time Required |
|------|---------------|
| Apple Developer Account approval | 24-48 hours |
| Google Play Developer verification | 24-48 hours |
| Create assets (icons, screenshots) | 2-4 hours |
| Build apps | 30-60 minutes |
| Fill in store listings | 1-2 hours |
| App Store review | 24 hours - 7 days |
| Play Store review | 1-3 days |

**Total time to first release: ~1 week**

---

## TROUBLESHOOTING

### Build Fails
```bash
# Clear cache and rebuild
eas build --platform all --profile production --clear-cache
```

### Credentials Issues
```bash
# Reset and reconfigure credentials
eas credentials --platform ios --reset
eas credentials --platform android --reset
```

### App Rejected
1. Read rejection reason carefully
2. Fix the issue
3. Resubmit with notes explaining the fix

---

## SUPPORT LINKS

- Expo Documentation: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Apple Developer: https://developer.apple.com/support/
- Google Play Console: https://support.google.com/googleplay/android-developer/

---

*Your trading empire, ready for the world.* - TIME BEYOND US
