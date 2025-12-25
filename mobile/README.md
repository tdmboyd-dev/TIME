# TIME BEYOND US - Mobile App

Production-ready React Native mobile application for TIME BEYOND US trading platform.

## Features

- **Biometric Authentication**: Face ID / Fingerprint support for secure login
- **Real-time Portfolio Tracking**: Live portfolio value and position updates via WebSocket
- **151+ AI Trading Bots**: Control and monitor all 133 absorbed + 18 fused meta-strategies
- **Quick Trade Interface**: Execute trades instantly with market/limit orders
- **Push Notifications**: Real-time alerts for trades, bot activity, and price movements
- **Dark Theme**: Optimized dark mode design consistent with web app
- **Offline Support**: Local caching for critical data

## Tech Stack

- **Framework**: React Native with Expo SDK 50
- **Navigation**: React Navigation v6 (Native Stack + Bottom Tabs)
- **State Management**: Zustand + React Query
- **API Client**: Axios with interceptors
- **Authentication**: Expo SecureStore + Local Authentication
- **Notifications**: Expo Notifications
- **Charts**: React Native Chart Kit
- **Language**: TypeScript

## Project Structure

```
mobile/
├── App.tsx                      # Main app entry point
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── assets/                      # Images, fonts, etc.
└── src/
    ├── components/              # Reusable UI components
    │   ├── Header.tsx
    │   ├── BottomNav.tsx
    │   ├── PortfolioCard.tsx
    │   ├── PositionItem.tsx
    │   ├── TradeForm.tsx
    │   └── BotCard.tsx
    ├── screens/                 # App screens
    │   ├── HomeScreen.tsx       # Dashboard
    │   ├── PortfolioScreen.tsx  # Full portfolio view
    │   ├── TradeScreen.tsx      # Quick trade interface
    │   ├── BotScreen.tsx        # Bot management
    │   ├── AlertsScreen.tsx     # Notification history
    │   ├── SettingsScreen.tsx   # App settings
    │   ├── LoginScreen.tsx      # Authentication
    │   └── TradeDetailScreen.tsx
    ├── navigation/              # Navigation setup
    │   ├── RootNavigator.tsx
    │   └── TabNavigator.tsx
    ├── services/                # API and utilities
    │   ├── api.ts              # Backend API client
    │   ├── auth.ts             # Authentication service
    │   ├── push.ts             # Push notifications
    │   └── storage.ts          # Local storage wrapper
    ├── hooks/                   # Custom React hooks
    ├── store/                   # Global state management
    └── types/                   # TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS: Xcode 14+ (macOS only)
- Android: Android Studio + JDK 17

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Start development server:
```bash
npm start
```

3. Run on device/simulator:

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Web (for testing):**
```bash
npm run web
```

### From Root Directory

You can also run mobile commands from the project root:

```bash
npm run mobile:install     # Install dependencies
npm run mobile:start       # Start Expo dev server
npm run mobile:ios         # Run on iOS
npm run mobile:android     # Run on Android
```

## Building for Production

### iOS (Apple App Store)

1. Configure signing in Xcode
2. Update version in `app.json`
3. Build:
```bash
npm run prebuild
npm run build:ios
```

### Android (Google Play Store)

1. Generate upload key
2. Update version in `app.json`
3. Build:
```bash
npm run prebuild
npm run build:android
```

## Configuration

### Environment Variables

Set in `app.json` under `extra`:

```json
{
  "extra": {
    "apiUrl": "https://time-backend-hosting.fly.dev/api/v1",
    "wsUrl": "wss://time-backend-hosting.fly.dev"
  }
}
```

### Push Notifications

1. iOS: Configure APNs in Apple Developer Console
2. Android: Add `google-services.json`
3. Register device token with backend on login

### Biometric Authentication

Automatically enabled if device supports Face ID or Fingerprint.

## Design System

### Colors

- **Primary**: `#00ff88` (Green)
- **Background**: `#020617` (Slate 950)
- **Card**: `#1e293b` (Slate 800)
- **Text**: `#f8fafc` (Slate 50)
- **Border**: `#334155` (Slate 700)
- **Success**: `#00ff88`
- **Error**: `#ef4444`
- **Warning**: `#f59e0b`

### Typography

- **Title**: 28px, Bold
- **Heading**: 20px, Bold
- **Body**: 16px, Regular
- **Caption**: 14px, Regular
- **Small**: 12px, Regular

## API Integration

The app connects to the TIME backend API for:

- User authentication
- Portfolio data
- Trading operations
- Bot management
- Market data
- Notifications

See `src/services/api.ts` for all available endpoints.

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint
```

## Type Checking

```bash
npm run typecheck
```

## Troubleshooting

### iOS Build Issues

- Clear build folder: `rm -rf ios/build`
- Clean pods: `cd ios && pod dealloc && pod install`

### Android Build Issues

- Clean gradle: `cd android && ./gradlew clean`
- Reset cache: `npm start -- --clear`

### Metro Bundler Issues

- Clear cache: `npm start -- --reset-cache`
- Delete node_modules: `rm -rf node_modules && npm install`

## License

PROPRIETARY - TIME BEYOND US

## Support

For issues or questions, contact: support@timebeyondus.com
