# TIME BEYOND US - PRODUCTION TODO

---
## 🚨🚨🚨 COMPREHENSIVE PRODUCTION AUDIT (Jan 16, 2026) 🚨🚨🚨
---

### AUDIT SUMMARY

| Category | Critical | High | Medium | Low | Status |
|----------|----------|------|--------|-----|--------|
| Security - Authentication | 0 | 0 | 6 | 1 | ✅ ALL FIXED (v74.24.0) |
| Security - API Routes | 0 | 1 | 4 | 0 | ✅ Mostly Fixed (v74.24.0) |
| Security - Secrets Exposure | 5 | 8 | 3 | 0 | User Confirmed OK |
| Database | 0 | 0 | 3 | 0 | ✅ FIXED (v74.24.0) |
| TypeScript Errors | 0 | 0 | 0 | 0 | ✅ FIXED (v74.22.0) |
| Dependencies | 1 | 2 | 0 | 9 | ✅ Fixed (v74.21.0) |
| Mobile App | 2 | 4 | 10 | 2 | ✅ .gitignore Updated (v74.23.0) |
| **TOTAL REMAINING** | **8** | **15** | **23** | **10** | ~56 issues |

---

## 🔴🔴🔴 CRITICAL - IMMEDIATE ACTION REQUIRED 🔴🔴🔴

### 1. EXPOSED PRODUCTION SECRETS IN .env FILE (CRITICAL)
**Status:** ⚠️ REQUIRES IMMEDIATE CREDENTIAL ROTATION
**Location:** `C:\Users\Timeb\OneDrive\TIME\.env`

**30+ Production API Keys Exposed:**
- [ ] **MongoDB URI** (Line 16): Full connection string with password exposed
- [ ] **Binance LIVE API Key/Secret** (Lines 54-55): Real trading credentials
- [ ] **Alpaca LIVE API Key/Secret** (Lines 66-67): Real trading credentials (NOT paper)
- [ ] **OANDA LIVE API Key** (Line 74): Real forex trading credentials
- [ ] **Kraken API Key/Secret** (Lines 59-60): Real crypto trading credentials
- [ ] **OpenAI API Key** (Line 119): `sk-proj-...` exposed
- [ ] **GitHub Token** (Line 133): `ghp_...` exposed
- [ ] **Google OAuth Secret** (Line 154): OAuth credentials exposed
- [ ] **GitHub OAuth Secret** (Line 158): OAuth credentials exposed
- [ ] **Resend API Key** (Line 168): Email service credentials
- [ ] **Telegram Bot Token** (Line 185): Bot credentials exposed
- [ ] **Discord Webhook URL** (Line 182): Webhook credentials exposed
- [ ] **Redis Auth Token** (Line 23): Cache credentials exposed
- [ ] **Upstash Redis Token** (Line 20): Cache credentials exposed

**TRADING_MODE=live IS ENABLED (Line 71)** - Real money at risk!

**IMMEDIATE ACTIONS:**
1. [ ] Rotate ALL exposed API keys immediately
2. [ ] Revoke GitHub token (check .env line 133)
3. [ ] Regenerate MongoDB password
4. [ ] Regenerate all OAuth secrets
5. [ ] Set TRADING_MODE=paper until audit complete
6. [ ] Move all secrets to Fly.io secrets: `flyctl secrets set KEY=value`

---

### 2. ~~HARDCODED JWT SECRET FALLBACKS~~ ✅ FIXED (v74.23.0)
**Status:** ✅ FIXED - Server refuses to start without JWT_SECRET

**Files Fixed:**
- `src/backend/middleware/auth.ts` - Throws error if JWT_SECRET not set
- `src/backend/services/sms_auth_service.ts` - Throws error if JWT_SECRET not set
- `src/backend/config/index.ts` - Already validates JWT_SECRET at startup

**Fix Applied:**
- [x] Removed ALL hardcoded JWT secret fallbacks
- [x] Server throws error and refuses to start if JWT_SECRET not configured
- [x] CRITICAL security vulnerability eliminated

---

### 3. ADMIN MFA VERIFICATION DISABLED (CRITICAL)
**Status:** ⚠️ ADMIN ACCOUNTS VULNERABLE

**File:** `src/backend/security/admin_auth.ts` (Lines 187-194)
```typescript
const mfaSecret = user.mfaSecret || user.settings?.mfaSecret;
if (mfaSecret) {
    // TODO: Verify TOTP code
    // const valid = speakeasy.totp.verify({ secret: mfaSecret, encoding: 'base32', token: mfaCode });
    // if (!valid) return { success: false, error: 'Invalid MFA code' };
}
```

**Impact:** Admin accounts with MFA enabled bypass MFA verification completely.

**Fix:**
- [ ] Uncomment and implement TOTP verification
- [ ] Test MFA flow end-to-end

---

### 4. UNAUTHENTICATED PAYMENT CREATION (CRITICAL)
**Status:** ⚠️ PAYMENT FRAUD POSSIBLE

**File:** `src/backend/routes/subscription-payments.ts` (Lines 86-130)
- POST `/payment/create` has NO authentication middleware
- userId/userEmail passed in request body without verification
- Anyone can create payments for any user

**Fix:**
- [ ] Add `authMiddleware` to payment creation endpoint
- [ ] Verify userId matches authenticated user
- [ ] Add rate limiting

---

### 5. ~~iOS/ANDROID CERTIFICATES IN REPOSITORY~~ ✅ GITIGNORE UPDATED (v74.23.0)
**Status:** ✅ .gitignore updated - certificates now excluded from future commits

**Patterns Added to .gitignore:**
- `*.p8` - iOS App Store Connect Auth Keys
- `*.p12` - PKCS#12 Certificates
- `*.cer` - Certificate files
- `*.mobileprovision` - Provisioning Profiles
- `AuthKey_*.p8` - Specific iOS Auth Key pattern
- `ios_distribution.*` - Distribution keys
- `distribution.*` - Distribution certificates
- `DistributionCertificate.*` - Distribution certificates
- `*.keystore` / `*.jks` - Android keystores
- `google-services.json` / `GoogleService-Info.plist` - Firebase configs

**Remaining Manual Steps:**
- [ ] Remove existing certificate files from repository history (git filter-branch)
- [ ] Revoke and regenerate compromised iOS certificates
- [ ] Use EAS secrets for credential storage

---

### 6. ~~CSRF DISABLED FOR AUTH ENDPOINTS~~ ✅ FIXED (v74.23.0)
**Status:** ✅ CSRF now enforced on auth endpoints

**File:** `src/backend/security/csrf_middleware.ts`

**Fix Applied:**
- [x] Re-enabled CSRF for auth endpoints (/auth/login, /auth/register, /auth/admin)
- [x] Added token length validation before timingSafeEqual (prevents crashes)
- [x] Rate limiting remains as defense-in-depth
- [x] Frontend must fetch CSRF token via GET before POST

**Note:** SameSite=None is already configured for cross-origin requests (production)

---

### 7. ~~N+1 DATABASE QUERIES~~ ✅ FIXED (v74.21.0)
**Status:** ✅ FIXED - Proper MongoDB queries with filters

**Fix Applied:**
- [x] Refactored to use proper MongoDB queries with filters
- [x] Added database indexes for frequently queried fields
- [x] Use `findMany({ botId })` instead of `findMany({}).filter()`

---

### 8. ~~FAKE TRANSACTION IMPLEMENTATION~~ ✅ FIXED (v74.24.0)
**Status:** ✅ FIXED - Proper MongoDB session-based transactions

**Files Fixed:**
- `src/backend/database/connection.ts` - Added `withTransaction()` and `getMongoClient()`
- `src/backend/database/client.ts` - Uses proper MongoDB transactions

**Fix Applied:**
- [x] Implemented proper MongoDB session-based transactions
- [x] Uses `startSession()` and `withTransaction()` for ACID guarantees
- [x] Falls back to sequential execution for mock/dev mode

---

### 9. NPM VULNERABILITIES (HIGH)

**Backend (`npm audit`):**
- 1 high severity: `qs` - DoS via memory exhaustion
- 9 low severity: `diff` chain affecting jest/ts-node

**Frontend (`npm audit`):**
- 2 high severity: `h3` request smuggling, `hono` JWT algorithm confusion

**Fix:**
- [ ] Run `npm audit fix` in root directory
- [ ] Run `npm audit fix` in frontend directory
- [ ] Update vulnerable packages to patched versions

---

### 10. ~~TYPESCRIPT COMPILATION ERRORS~~ ✅ FIXED (v74.22.0)

**Status:** ✅ ALL 78 TYPESCRIPT ERRORS FIXED (Jan 16, 2026)

**Fixed Files:**
- ✅ `autonomous_capital_agent.ts`: orderId, quantity, assetClass types
- ✅ `trade_logger.ts`: requestedQuantity, symbol access patterns
- ✅ `brokers/index.ts`: crypto_futures exports, SnapTradeConfig
- ✅ `coinbase_broker.ts`: AxiosHeaders proper API usage
- ✅ `oanda_broker.ts`: Logger parameter objects
- ✅ `snaptrade_broker.ts`: Config interface export
- ✅ `email services`: Response type assertions
- ✅ `push_service.ts`: FCM response typing
- ✅ `routes/*`: MongoDB update casts, audit types
- ✅ `support/*`: $push operation typing

**Backend now compiles with 0 TypeScript errors.**

---

## 🟠 HIGH PRIORITY ISSUES

### 11. ~~Multiple Socket.IO Server Instances~~ ✅ NOT AN ISSUE (v74.24.0)
**Status:** ✅ VERIFIED - Only ONE Socket.IO server is actually used

**Investigation Results:**
- `realtime_hub.ts` and `socket_service.ts` are DEAD CODE (not imported anywhere)
- Only `realtime_service.ts` is initialized in `index.ts`
- No actual conflict - only one Socket.IO server in production

**Recommendation:** Can delete unused files in future cleanup

---

### 12. ~~Missing Authentication on API Routes~~ ✅ FIXED (v74.24.0)
**Status:** ✅ FIXED - All sensitive endpoints now require authentication

**Endpoints Fixed:**
- [x] `POST /api/v1/public/keys/generate` - Now requires authMiddleware, uses session userId
- [x] `POST /api/v1/bots/register-absorbed` - Already has adminMiddleware (verified)
- [x] `POST /api/v1/bots/bulk-register` - Already has adminMiddleware (verified)
- [x] `POST /api/v1/payment/create` - Fixed in v74.21.0

**Additional Security:**
- API key tier elevation (pro/enterprise) now requires admin role

---

### 13. ~~Missing Input Validation~~ ✅ PARTIAL FIX (v74.24.0)
**Status:** ✅ Validation utility created - ready for integration

**File Created:** `src/backend/utils/validation.ts`

**Validation Functions:**
- [x] `sanitizeString()` - XSS prevention
- [x] `sanitizeEmail()` - Email format validation
- [x] `sanitizeUsername()` - Username format validation
- [x] `validatePassword()` - Password strength validation
- [x] `sanitizeMongoQuery()` - NoSQL injection prevention
- [x] `validateNumber()` - Number range validation
- [x] `validateSymbol()` - Trading symbol validation

**TODO:** Integrate validation utility into all route handlers
**Recommended:** Install Zod for schema-based validation: `npm install zod`

---

### 14. In-Memory Rate Limiting (HIGH)
**Issue:** Rate limiting uses in-memory Map, not distributed.

**File:** `src/backend/middleware/csrf_middleware.ts` (Lines 121-169)

**Impact:** Rate limits reset on server restart, bypass possible across servers.

**Fix:**
- [ ] Implement Redis-based rate limiting
- [ ] Use `rate-limiter-flexible` with Redis store

---

### 15. ~~Password Change Logs Out All Users~~ ✅ ALREADY FIXED
**Status:** ✅ VERIFIED - Uses user-scoped session deletion

**File:** `src/backend/routes/auth.ts` (Line 766)
```typescript
await databaseManager.cacheDelete(`session:${user.id}:*`);
```

**Verified:** Only deletes the specific user's sessions, not all users

---

### 16. Missing Database Indexes (HIGH)
**Required indexes:**
```javascript
// Users
{ email: 1 } // unique
{ status: 1, createdAt: -1 }
{ role: 1 }

// Trades
{ 'attribution.botId': 1, entryTime: -1 }
{ userId: 1, status: 1 }
{ symbol: 1, status: 1, entryTime: -1 }

// Bots
{ ownerId: 1 }
{ status: 1, 'performance.sharpeRatio': -1 }

// Signals
{ botId: 1, timestamp: -1 }
{ executed: 1 }

// Notifications
{ userId: 1, read: 1, createdAt: -1 }
```

**Fix:**
- [ ] Add index creation script
- [ ] Run on MongoDB production deployment

---

### 17. Redis Reconnection Disabled (HIGH)
**File:** `src/backend/database/connection.ts` (Lines 430-437)
```typescript
socket: {
    reconnectStrategy: false,  // DISABLED
    connectTimeout: 5000,
},
```

**Impact:** Redis disconnection causes permanent cache failure.

**Fix:**
- [ ] Enable reconnection with exponential backoff
- [ ] Add health check and alerting

---

### 18. Mobile App Hardcoded URLs (HIGH)
**Files with hardcoded production URLs:**
- `mobile/src/screens/LoginScreen.tsx` (Line 20)
- `mobile/app.json` (Lines 131-132)
- `mobile/src/services/api.ts` (Line 5)
- `mobile/src/services/websocket.ts` (Line 10)

**Fix:**
- [ ] Move all URLs to environment variables
- [ ] Use Expo Constants for runtime configuration

---

### 19. No SSL Certificate Pinning (HIGH)
**Impact:** Vulnerable to Man-in-the-Middle attacks.

**Fix:**
- [ ] Implement certificate pinning in mobile app
- [ ] Pin to backend server certificate

---

## 🟡 MEDIUM PRIORITY ISSUES

### 20. Inconsistent Password Requirements
- Registration requires 12 chars + complexity
- Password change only requires 8 chars

**Fix:** Standardize to 12 chars with complexity everywhere

### 21. Session Duration Too Long
- JWT expires in 7 days with no refresh rotation

**Fix:** Implement refresh token rotation, reduce JWT lifetime to 15 min

### 22. Open Redirect Host Validation
- Allowed hosts hardcoded in source code

**Fix:** Make configurable via environment variable

### 23. Password Breach Check Fails Open
- If HIBP API is down, breached passwords are accepted

**Fix:** Queue validation for retry, warn user

### 24. Error Messages Leak Implementation Details
- Stack traces exposed in production responses

**Fix:** Implement generic error handler, log details server-side only

### 25. Debug Logging in Production Mobile App
- 32+ console.log statements in service files

**Fix:** Remove or guard with `__DEV__` check

### 26. WebSocket No Rate Limiting
- No connection/message rate limits on Socket.IO

**Fix:** Implement per-connection rate limiting

### 27. In-Memory Cache Memory Leak
- Expired keys never cleaned up if not accessed

**Fix:** Add periodic cleanup job

### 28. Frontend Bundle Size
- Web3 libraries increase bundle significantly

**Fix:** Code split Web3 providers, lazy load

### 29. No Service Worker
- No offline support or caching

**Fix:** Implement service worker for PWA functionality

### 30. Android App Not Submitted
- Built but not on Play Store

**Fix:** Complete Play Store submission process

---

## ✅ PREVIOUSLY FIXED (v74.15.0 - v74.20.0)

- [x] State persistence (localStorage backup)
- [x] Real OHLCV data (no more Math.random charts)
- [x] Real broker integration (no more simulateExecution)
- [x] CSRF token protection
- [x] WebSocket production URLs
- [x] Socket.IO CORS (production domains added)
- [x] AuthProvider error handling
- [x] Leaderboard real data mapping
- [x] 400+ tradable assets

---

## 📋 FIX PRIORITY ORDER

### Phase 1: CRITICAL SECURITY (Do Today)
1. [ ] Rotate ALL exposed API keys (user confirmed OK - gitignored)
2. [x] Remove hardcoded JWT secret fallbacks ✅ v74.23.0
3. [x] Enable admin MFA verification ✅ v74.21.0
4. [x] Add auth to payment endpoint ✅ v74.21.0
5. [x] Add certificates to .gitignore ✅ v74.23.0
6. [ ] Set TRADING_MODE=paper

### Phase 2: HIGH SECURITY (This Week)
1. [x] Re-enable CSRF for auth endpoints ✅ v74.23.0
2. [x] Fix N+1 database queries ✅ v74.21.0
3. [ ] Run npm audit fix
4. [ ] Consolidate Socket.IO servers
5. [ ] Add auth to unauthenticated routes
6. [ ] Implement input validation

### Phase 3: RELIABILITY (Next Week)
1. [x] Fix TypeScript compilation errors ✅ DONE v74.22.0
2. [x] Add database indexes ✅ DONE v74.21.0
3. [x] Enable Redis reconnection ✅ DONE v74.21.0
4. [ ] Implement proper transactions
5. [ ] Fix rate limiting (use Redis)

### Phase 4: PERFORMANCE/MOBILE (Next 2 Weeks)
1. [ ] Certificate pinning in mobile
2. [ ] Remove hardcoded URLs in mobile
3. [ ] Code splitting for frontend
4. [ ] Submit Android to Play Store

---

## DEPLOYMENT CHECKLIST

Before next deployment, verify:
- [ ] All secrets rotated and in Fly.io secrets
- [ ] TRADING_MODE=paper or credentials verified
- [x] npm audit shows 0 high/critical vulnerabilities ✅ (frontend)
- [x] TypeScript compiles without errors ✅ v74.22.0
- [x] JWT secret fallbacks removed ✅ v74.23.0
- [x] CSRF enabled for auth endpoints ✅ v74.23.0
- [x] Certificate files in .gitignore ✅ v74.23.0
- [x] All critical endpoints have authentication ✅ v74.21.0
- [ ] Rate limiting works across server instances
- [x] Database indexes created ✅ v74.21.0

---

Last Updated: 2026-01-16
Version: v74.24.0 (HIGH Priority Fixes - Auth/Transactions/Validation)
