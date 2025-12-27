# iOS Build Fix Instructions

## Problem
The iOS distribution certificate stored on EAS servers is corrupted and cannot be imported during builds.

## Error Message
```
Distribution certificate with fingerprint 3C2985B2F9A43D9B2E275DF5433DAD0D242F1B4F hasn't been imported successfully
```

## Solution

### Step 1: Open Command Prompt
Navigate to the mobile folder:
```bash
cd C:\Users\Timeb\OneDrive\TIME\mobile
```

### Step 2: Run EAS Credentials Manager
```bash
eas credentials --platform ios
```

### Step 3: Follow the Prompts
1. Select **production** profile
2. Choose **Distribution Certificate** options
3. Select **Remove current certificate**
4. Then select **Generate new certificate**
5. Follow the prompts (you may need your Apple ID password)

### Step 4: Similarly Fix Provisioning Profile
1. Select **Provisioning Profile** options
2. Remove and regenerate

### Step 5: Run New Build
```bash
eas build --platform ios --profile production
```

## Alternative: Quick Fix Script
Double-click: `FIX-iOS-CREDENTIALS.bat`

## Notes
- You need your Apple ID: timebeunus.boyd@icloud.com
- Team ID: DB9BF4C58Y
- This is a one-time fix - once done, builds will work

## Current Status
- Android build: READY (AAB file available)
- Vercel: DEPLOYED (https://timebeyondus.com)
- iOS: Needs credential fix

---
Last Updated: 2025-12-27
