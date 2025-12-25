# TIME BEYOND US - React Native Mobile App

## Production-Ready Mobile Trading Platform

Version: 1.0.0
Status: 100% COMPLETE - Ready for App Store/Play Store Submission

---

## Overview

A comprehensive React Native mobile application built with Expo for the TIME BEYOND US trading platform. This app provides full-featured trading capabilities, portfolio management, and 151+ AI trading bot controls - all from your mobile device.

---

## Features

### 1. Authentication & Security
- Email/password login
- Biometric authentication (Face ID on iOS, Fingerprint on Android)
- Secure token storage with expo-secure-store
- Session validation and auto-logout
- Password recovery flow

### 2. Dashboard (Home Screen)
- Portfolio value card with 24h change percentage
- Active bots counter
- Open trades counter
- Quick action buttons (Start Bot, Markets, Portfolio, Settings)
- Recent activity feed
- Pull-to-refresh for real-time updates
- React Query for data caching and synchronization

### 3. Portfolio Management
- Total portfolio value display
- Position list with profit/loss
- Individual position cards with:
  - Symbol and asset name
  - Current price
  - Amount held
  - Total value
  - Profit/Loss in $ and %
  - Average buy price
- Performance charts (coming soon)
- Asset allocation breakdown (coming soon)
- Swipe-to-refresh functionality

### 4. Trading Interface
- Trading pair selector (BTC/USDT, ETH/USDT, SOL/USDT, AVAX/USDT, and more)
- Order type toggle (Market, Limit, Stop-Loss)
- Buy/Sell toggle with color coding (green for buy, red for sell)
- Amount input with quick percentage buttons (25%, 50%, 75%, 100%)
- Price input for limit and stop orders
- Order summary with estimated fees
- Available balance display
- Real-time order validation
- Risk warnings and confirmations

### 5. AI Bot Management
- View all 151+ AI trading bots
- Bot status indicators:
  - Active (green) - Bot is running
  - Paused (yellow) - Bot is temporarily stopped
  - Inactive (gray) - Bot is off
- Start/Stop/Pause controls via toggle switches
- Real-time bot statistics:
  - P/L (profit/loss in dollars and percentage)
  - Trades executed in last 24 hours
  - Win rate percentage
  - Active trading pairs
- Filter by status (All, Active, Paused, Inactive)
- Bot performance cards with color-coded P/L
- Stats overview dashboard:
  - Total bots
  - Active bots
  - Total P/L across all bots
  - Total trades in last 24h
- Create new bot button
- Tap bot card for detailed configuration

### 6. Push Notifications
- Real-time push notifications for:
  - Trade executions
  - Bot alerts and performance updates
  - Price alerts
  - System notifications
- Notification history with filtering
- Mark as read/unread functionality
- Mark all as read button
- Delete individual notifications
- Priority indicators (High, Medium, Low)
- Timestamp with relative time (e.g., "5 minutes ago")
- Unread badge on notification bell
- Pull-to-refresh
- Empty state handling

### 7. Settings & Preferences
- Account settings:
  - Profile management
  - Subscription tier
  - Connected brokers
- Trading settings:
  - Paper trading mode toggle
  - Risk settings
  - Trading preferences
- Security settings:
  - Biometric login toggle
  - Change password
  - Two-factor authentication (2FA)
- Notification preferences:
  - Push notifications toggle
  - Email alerts
- Support section:
  - Help center
  - Contact support
  - Terms of service
  - Privacy policy
- Logout with confirmation dialog
- App version display

---

## Technical Architecture

### Tech Stack
- **Framework:** React Native 0.73
- **Platform:** Expo SDK 50
- **Language:** TypeScript
- **Navigation:** React Navigation v6
  - Native Stack Navigator
  - Bottom Tab Navigator
- **State Management:**
  - Zustand for client state
  - React Query for server state
- **Storage:**
  - expo-secure-store for sensitive data (tokens)
  - AsyncStorage for preferences
- **Authentication:** expo-local-authentication (Face ID/Fingerprint)
- **Notifications:** expo-notifications
- **HTTP Client:** Axios with interceptors
- **Charts:** react-native-chart-kit
- **WebSocket:** socket.io-client (for real-time updates)
- **Date Utilities:** date-fns

### Project Structure

```
mobile/
├── App.tsx                          # Main app entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── eas.json                         # EAS Build config
├── babel.config.js                  # Babel config
├── .eslintrc.js                     # ESLint config
├── assets/                          # Images, fonts, icons
└── src/
    ├── components/                  # Reusable UI components
    │   ├── BotCard.tsx              # Bot status card
    │   ├── BottomNav.tsx            # Custom bottom navigation
    │   ├── Header.tsx               # App header
    │   ├── PortfolioCard.tsx        # Portfolio summary card
    │   ├── PositionItem.tsx         # Position row component
    │   └── TradeForm.tsx            # Trade form component
    ├── screens/                     # App screens
    │   ├── LoginScreen.tsx          # Authentication
    │   ├── HomeScreen.tsx           # Dashboard
    │   ├── PortfolioScreen.tsx      # Full portfolio view
    │   ├── TradeScreen.tsx          # Quick trade interface
    │   ├── BotScreen.tsx            # Bot management
    │   ├── AlertsScreen.tsx         # Notification history
    │   ├── SettingsScreen.tsx       # App settings
    │   └── TradeDetailScreen.tsx    # Trade details modal
    ├── navigation/                  # Navigation setup
    │   ├── RootNavigator.tsx        # Root stack (Auth vs Main)
    │   └── TabNavigator.tsx         # Bottom tabs (6 tabs)
    ├── services/                    # API and utilities
    │   ├── api.ts                   # Backend API client
    │   ├── auth.ts                  # Authentication service
    │   ├── push.ts                  # Push notifications
    │   └── storage.ts               # Local storage wrapper
    ├── hooks/                       # Custom React hooks
    │   └── useApi.ts                # Typed API hook
    ├── store/                       # Zustand state management
    │   ├── authStore.ts             # Auth state
    │   └── portfolioStore.ts        # Portfolio state
    └── types/                       # TypeScript types
        └── index.ts                 # Type definitions
```

### Navigation Flow

```
RootNavigator (Stack)
├── Login Screen (if not authenticated)
└── Main (if authenticated)
    └── TabNavigator (Bottom Tabs)
        ├── Home (Dashboard)
        ├── Portfolio (Positions & Performance)
        ├── Trade (Quick Trade)
        ├── Bots (AI Bot Management)
        ├── Alerts (Notifications)
        └── Settings (Account & Preferences)
```

### API Integration

**Base URL:** `https://time-backend-hosting.fly.dev/api/v1`

**Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - Logout
- `GET /portfolio` - Get portfolio summary
- `GET /portfolio/positions` - Get all positions
- `GET /portfolio/history` - Get portfolio value history
- `POST /trades/order` - Create new order
- `GET /trades/orders` - Get user orders
- `DELETE /trades/orders/:id` - Cancel order
- `GET /bots` - Get all bots
- `GET /bots/:id` - Get bot details
- `POST /bots/:id/start` - Start bot
- `POST /bots/:id/stop` - Stop bot
- `POST /bots/:id/pause` - Pause bot
- `GET /markets` - Get market data
- `GET /markets/:symbol` - Get symbol quote
- `GET /markets/:symbol/candles` - Get historical data
- `GET /notifications` - Get notifications
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update profile
- `GET /user/settings` - Get user settings
- `PUT /user/settings` - Update settings

### State Management

**Zustand Stores:**

1. **authStore** - Authentication state
   - `user` - Current user object
   - `token` - Auth token
   - `isAuthenticated` - Boolean auth status
   - `login()` - Login method
   - `logout()` - Logout method
   - `checkAuth()` - Validate session

2. **portfolioStore** - Portfolio state
   - `portfolio` - Portfolio data
   - `positions` - Array of positions
   - `setPortfolio()` - Update portfolio
   - `setPositions()` - Update positions
   - `updatePosition()` - Update single position
   - `clearPortfolio()` - Clear all data

**React Query:**
- Server state caching
- Automatic refetching
- Optimistic updates
- Error handling
- Loading states

---

## Design System

### Theme
- **Mode:** Dark theme optimized
- **Background:** #020617 (slate-950)
- **Card Background:** #1e293b (slate-800)
- **Border:** #334155 (slate-700)
- **Text Primary:** #f8fafc (slate-50)
- **Text Secondary:** #94a3b8 (slate-400)
- **Text Muted:** #64748b (slate-500)
- **Accent Primary:** #00ff88 (TIME green)
- **Success:** #00ff88 (green)
- **Error:** #ef4444 (red)
- **Warning:** #f59e0b (amber)
- **Info:** #6366f1 (indigo)

### Typography
- **Title:** 28px bold (Headings)
- **Heading:** 20px bold (Section titles)
- **Subheading:** 18px semibold
- **Body:** 16px regular (Main text)
- **Caption:** 14px regular (Labels)
- **Small:** 12px regular (Timestamps, hints)

### Spacing
- **Base unit:** 4px
- **Small:** 8px
- **Medium:** 16px
- **Large:** 20px
- **XLarge:** 24px

### Border Radius
- **Small:** 8px
- **Medium:** 12px
- **Large:** 16px
- **Circle:** 50%

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- iOS: Xcode 14+ (macOS only)
- Android: Android Studio + JDK 17
- Expo CLI (optional, but recommended)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/TIME.git
cd TIME/mobile
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
The API URL is already configured in `app.json`:
```json
{
  "extra": {
    "apiUrl": "https://time-backend-hosting.fly.dev/api/v1",
    "wsUrl": "wss://time-backend-hosting.fly.dev"
  }
}
```

4. **Start development server:**
```bash
npm start
```

This will open the Expo DevTools in your browser.

5. **Run on device/simulator:**

**iOS Simulator:**
```bash
npm run ios
# or press 'i' in the terminal
```

**Android Emulator:**
```bash
npm run android
# or press 'a' in the terminal
```

**Physical Device:**
1. Install Expo Go app on your device
2. Scan the QR code shown in the terminal

### Development

**Available Scripts:**
```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web (for testing)
npm test               # Run Jest tests
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript type checking
npm run prebuild       # Generate native projects
```

**Hot Reload:**
- File changes automatically reload
- Shake device to open developer menu
- CMD+D (iOS) or CMD+M (Android) for dev menu

---

## Production Build

### iOS (Apple App Store)

1. **Configure app signing:**
   - Open the project in Xcode: `open ios/timetrading.xcworkspace`
   - Select your team in Signing & Capabilities
   - Configure bundle identifier: `com.timebeyondus.trading`

2. **Update version:**
   - Edit `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.0",
       "ios": {
         "buildNumber": "1"
       }
     }
   }
   ```

3. **Build for production:**
```bash
npm run prebuild
npm run build:ios
```

Or use EAS Build (recommended):
```bash
eas build --platform ios
```

4. **Submit to App Store:**
```bash
eas submit --platform ios
```

### Android (Google Play Store)

1. **Generate upload key:**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

2. **Update version:**
   - Edit `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.0",
       "android": {
         "versionCode": 1
       }
     }
   }
   ```

3. **Build for production:**
```bash
npm run prebuild
npm run build:android
```

Or use EAS Build (recommended):
```bash
eas build --platform android
```

4. **Submit to Play Store:**
```bash
eas submit --platform android
```

---

## Push Notifications Setup

### iOS (APNs)

1. **Apple Developer Console:**
   - Create App ID with Push Notifications capability
   - Generate APNs authentication key (.p8 file)
   - Download and save the key

2. **Configure in Expo:**
   - Add to `eas.json`:
   ```json
   {
     "build": {
       "production": {
         "ios": {
           "apnsKey": {
             "keyId": "YOUR_KEY_ID",
             "teamId": "YOUR_TEAM_ID",
             "apnsKeyP8": "./path/to/AuthKey.p8"
           }
         }
       }
     }
   }
   ```

3. **Register device token:**
   - Token registration happens automatically on login
   - See `App.tsx` lines 70-76 for implementation

### Android (FCM)

1. **Firebase Console:**
   - Create a Firebase project
   - Add Android app with package name: `com.timebeyondus.trading`
   - Download `google-services.json`

2. **Add to project:**
   - Place `google-services.json` in `mobile/` directory
   - Already configured in `app.json`:
   ```json
   {
     "android": {
       "googleServicesFile": "./google-services.json"
     }
   }
   ```

3. **Configure channels:**
   - Notification channels are created automatically
   - See `src/services/push.ts` lines 47-76

---

## Testing

### Unit Tests
```bash
npm test
```

Tests use Jest and React Native Testing Library.

### Type Checking
```bash
npm run typecheck
```

Ensures all TypeScript types are correct.

### Linting
```bash
npm run lint
```

Runs ESLint to check code quality.

### E2E Testing (Optional)
To add E2E tests with Detox:
```bash
npm install --save-dev detox
```

---

## Troubleshooting

### iOS Build Issues

**Pod install fails:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Clear build folder:**
```bash
rm -rf ios/build
```

**Reset Metro cache:**
```bash
npm start -- --reset-cache
```

### Android Build Issues

**Gradle build fails:**
```bash
cd android
./gradlew clean
cd ..
```

**Clear cache:**
```bash
npm start -- --clear
```

**Reinstall dependencies:**
```bash
rm -rf node_modules
npm install
```

### Common Errors

**"Unable to resolve module":**
- Clear Metro cache: `npm start -- --reset-cache`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Biometric authentication not working:**
- Ensure device has Face ID/Fingerprint set up
- Check permissions in `app.json`
- Physical device required (doesn't work on simulators)

**Push notifications not received:**
- Check notification permissions
- Verify device token is registered
- Check backend API is sending to correct token
- iOS: Verify APNs key is configured
- Android: Verify `google-services.json` is present

---

## Security

### Authentication
- Tokens stored securely in expo-secure-store (iOS Keychain, Android Keystore)
- Biometric authentication for sensitive operations
- Auto-logout on token expiry
- HTTPS only for all API calls

### Data Protection
- No sensitive data in AsyncStorage
- Input validation on all forms
- XSS protection on rendered content
- Certificate pinning ready for implementation

### Best Practices
- Regular security audits
- Dependency updates
- Vulnerability scanning
- Code obfuscation in production builds

---

## Performance

### Optimizations
- React.memo for expensive components
- FlatList for long lists (virtualization)
- Image optimization and lazy loading
- Code splitting with React.lazy (web)
- Bundle size optimization

### Monitoring
- Error tracking ready (add Sentry)
- Performance monitoring ready (add Firebase Performance)
- Analytics ready (add Google Analytics/Mixpanel)

---

## Roadmap

### Phase 1 (Current - v1.0.0)
- ✅ Authentication with biometrics
- ✅ Portfolio management
- ✅ Trading interface
- ✅ Bot management
- ✅ Push notifications
- ✅ Settings

### Phase 2 (v1.1.0)
- [ ] WebSocket real-time updates
- [ ] Advanced charts (candlesticks)
- [ ] Offline mode with local cache
- [ ] Price alerts customization
- [ ] Bot performance charts

### Phase 3 (v1.2.0)
- [ ] Copy trading feature
- [ ] Social features (follow traders)
- [ ] In-app chat support
- [ ] QR code scanner
- [ ] Face ID/Touch ID for transactions

### Phase 4 (v2.0.0)
- [ ] Widgets (iOS 14+, Android)
- [ ] Apple Watch/Wear OS apps
- [ ] Siri/Google Assistant shortcuts
- [ ] Dark/Light theme toggle
- [ ] Multi-language support

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

**Code Style:**
- Follow existing patterns
- Use TypeScript
- Add comments for complex logic
- Run lint before committing: `npm run lint`

---

## Support

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)

### Issues
Report bugs or request features:
- GitHub Issues: https://github.com/yourusername/TIME/issues
- Email: support@timebeyondus.com

### Community
- Discord: [Join our community](https://discord.gg/timebeyondus)
- Twitter: [@timebeyondus](https://twitter.com/timebeyondus)

---

## License

Proprietary - TIME BEYOND US

All rights reserved. This software is the intellectual property of TIME BEYOND US and may not be copied, distributed, or modified without explicit written permission.

---

## Changelog

### v1.0.0 (2025-12-25) - Initial Release
- Complete mobile app with 8 screens
- Biometric authentication
- Real-time portfolio tracking
- Trading interface (market/limit/stop)
- 151+ bot management
- Push notifications
- Dark theme design
- Production-ready build

---

## Credits

**Developed by:** TIME BEYOND US Team
**Design:** TIME Design System
**Icons:** Expo Vector Icons (Ionicons)
**Charts:** React Native Chart Kit
**Platform:** Expo SDK 50

---

**Ready to trade on the go. Download TIME BEYOND US today.**
