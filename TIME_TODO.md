# TIME BEYOND US - PRODUCTION TODO

---
## 🚨🚨🚨 COMPREHENSIVE PRODUCTION AUDIT (Jan 16, 2026) 🚨🚨🚨
---

### AUDIT SUMMARY

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security - Authentication | 3 | 4 | 6 | 1 |
| Security - API Routes | 2 | 5 | 4 | 0 |
| Security - Secrets Exposure | 5 | 8 | 3 | 0 |
| Database | 2 | 4 | 3 | 0 |
| TypeScript Errors | 0 | 1 | 0 | 0 |
| Dependencies | 1 | 2 | 0 | 9 |
| Mobile App | 2 | 4 | 10 | 2 |
| **TOTAL** | **15** | **28** | **26** | **12** |

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

### 2. HARDCODED JWT SECRET FALLBACKS (CRITICAL)
**Status:** ⚠️ AUTHENTICATION BYPASS POSSIBLE

**File:** `src/backend/middleware/auth.ts` (Line 18)
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'time-jwt-secret-change-in-production';
```

**File:** `src/backend/services/sms_auth_service.ts` (Lines 101-105)
```typescript
const secret = process.env.JWT_SECRET || 'time-beyond-us-secret';
```

**Impact:** If JWT_SECRET env var is not set, attackers can forge valid tokens.

**Fix:**
- [ ] Remove ALL hardcoded JWT secret fallbacks
- [ ] Make JWT_SECRET required - throw error if not set
- [ ] Generate cryptographically secure 256-bit secret

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

### 5. iOS/ANDROID CERTIFICATES IN REPOSITORY (CRITICAL)
**Status:** ⚠️ APP SIGNING COMPROMISED

**Files committed to repository:**
- [ ] `mobile/AuthKey_79B4P2SWK8.p8` - iOS App Store Connect Auth Key
- [ ] `mobile/AuthKey_ASC_Y3N7H63S44.p8` - iOS App Store Connect Auth Key
- [ ] `mobile/ios_distribution.key` - iOS Distribution Key
- [ ] `mobile/distribution.pem` - Distribution Certificate
- [ ] `mobile/DistributionCertificate.p12` - PKCS#12 Certificate
- [ ] `mobile/TIME.mobileprovision` - Provisioning Profile

**Fix:**
- [ ] Remove ALL certificate files from repository
- [ ] Add to .gitignore: `*.p8`, `*.p12`, `*.pem`, `*.cer`, `*.mobileprovision`
- [ ] Revoke and regenerate all iOS certificates
- [ ] Use EAS secrets for credential storage

---

### 6. CSRF DISABLED FOR AUTH ENDPOINTS (HIGH)
**Status:** ⚠️ CSRF ATTACKS POSSIBLE

**File:** `src/backend/security/csrf_middleware.ts` (Lines 68-73)
```typescript
if (req.path.includes('/auth/login') || req.path.includes('/auth/register') || req.path.includes('/auth/admin')) {
    logger.info('Skipping CSRF for auth endpoint', { path: req.path });
    return next();
}
```

**Fix:**
- [ ] Re-enable CSRF for auth endpoints
- [ ] Use SameSite=Strict cookies as alternative
- [ ] Implement double-submit cookie pattern

---

### 7. N+1 DATABASE QUERIES (HIGH - PERFORMANCE)
**Status:** ⚠️ SEVERE PERFORMANCE DEGRADATION

**File:** `src/backend/database/repositories.ts`

**Affected Methods:**
- Line 249-251: `findByBot()` - Loads ALL trades, filters in memory
- Line 254-256: `findByStrategy()` - Loads ALL trades, filters in memory
- Line 300-310: `getPerformanceStats()` - Loads ALL closed trades
- Line 339-346: `findByBot()` (SignalRepository) - Loads ALL signals
- Line 462-467: `markAllRead()` - Individual update per notification
- Line 630-677: ACATS methods - Load ALL transfers

**Fix:**
- [ ] Refactor to use proper MongoDB queries with filters
- [ ] Add database indexes for frequently queried fields
- [ ] Use `findMany({ botId })` instead of `findMany({}).filter()`

---

### 8. FAKE TRANSACTION IMPLEMENTATION (HIGH)
**Status:** ⚠️ NO ACID GUARANTEES

**File:** `src/backend/database/client.ts` (Lines 128-134)
```typescript
$transaction: async (operations: any[]) => {
    const results = [];
    for (const op of operations) {
        results.push(await op);  // Sequential, NOT atomic
    }
    return results;
},
```

**Impact:** Operations fail midway without rollback, causing data corruption.

**Fix:**
- [ ] Implement proper MongoDB session-based transactions
- [ ] Use `startSession()` and `withTransaction()`

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

### 10. TYPESCRIPT COMPILATION ERRORS (80+ errors)

**Major Categories:**
- OrderRequest type mismatch in brokers (missing `quantity` property)
- ExecutionLog missing `requestedQuantity` property
- Axios headers type incompatibility
- InMemoryCollection/MongoDB type mismatches
- Unknown type access on error objects

**Key Files:**
- `src/backend/autonomous/autonomous_capital_agent.ts`: Lines 1016, 1064, 1071
- `src/backend/backtesting/trade_logger.ts`: Lines 236, 241, 258, 263, 288, 293
- `src/backend/brokers/index.ts`: Lines 28, 31, 39, 62, 72, 75, 126
- `src/backend/email/mailgun_service.ts`: 15+ type errors
- `src/backend/email/sendgrid_service.ts`: 8+ type errors

**Current Workaround:** `noEmitOnError: false` in tsconfig
**Proper Fix:**
- [ ] Fix all type errors for compile-time safety
- [ ] Enable strict TypeScript checking

---

## 🟠 HIGH PRIORITY ISSUES

### 11. Multiple Socket.IO Server Instances (HIGH)
**Files creating Socket.IO servers:**
1. `src/backend/websocket/realtime_service.ts` (Lines 238-246)
2. `src/backend/websocket/realtime_hub.ts` (Lines 148-159)
3. `src/backend/services/socket_service.ts` (Lines 31-47)

**Issue:** Three separate Socket.IO servers with identical CORS configs conflict.

**Fix:**
- [ ] Consolidate to single Socket.IO server with namespaces
- [ ] Remove duplicate implementations

---

### 12. Missing Authentication on API Routes (HIGH)
**Unauthenticated endpoints:**
- [ ] `POST /api/v1/public/keys/generate` - API key generation (public_api.ts:152)
- [ ] `POST /api/v1/bots/register-absorbed` - Bulk bot registration (bots.ts:67)
- [ ] `POST /api/v1/bots/bulk-register` - Bulk bot registration (bots.ts:125)
- [ ] `POST /api/v1/payment/create` - Payment creation (subscription-payments.ts:86)

**Fix:**
- [ ] Add `authMiddleware` to all sensitive endpoints
- [ ] Verify ownership on all resource modifications

---

### 13. Missing Input Validation (HIGH)
**Affected endpoints:**
- `PUT /api/v1/users/profile` - No length/format validation
- `POST /api/v1/campaigns/create` - No XSS prevention
- `POST /api/v1/marketing/promo` - No discount/date validation
- Search endpoints - Potential NoSQL injection

**Fix:**
- [ ] Add Zod schema validation to all endpoints
- [ ] Sanitize all user input before storage
- [ ] Validate query parameters

---

### 14. In-Memory Rate Limiting (HIGH)
**Issue:** Rate limiting uses in-memory Map, not distributed.

**File:** `src/backend/middleware/csrf_middleware.ts` (Lines 121-169)

**Impact:** Rate limits reset on server restart, bypass possible across servers.

**Fix:**
- [ ] Implement Redis-based rate limiting
- [ ] Use `rate-limiter-flexible` with Redis store

---

### 15. Password Change Logs Out All Users (HIGH)
**File:** `src/backend/routes/auth.ts` (Line 619)
```typescript
await databaseManager.cacheDelete(`session:*`);
```

**Impact:** Wildcard delete logs out ALL platform users when ANY user changes password.

**Fix:**
- [ ] Delete only user's own sessions: `session:${userId}:*`

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
1. [ ] Rotate ALL exposed API keys
2. [ ] Remove hardcoded JWT secret fallbacks
3. [ ] Enable admin MFA verification
4. [ ] Add auth to payment endpoint
5. [ ] Remove certificates from repository
6. [ ] Set TRADING_MODE=paper

### Phase 2: HIGH SECURITY (This Week)
1. [ ] Re-enable CSRF for auth endpoints
2. [ ] Fix N+1 database queries
3. [ ] Run npm audit fix
4. [ ] Consolidate Socket.IO servers
5. [ ] Add auth to unauthenticated routes
6. [ ] Implement input validation

### Phase 3: RELIABILITY (Next Week)
1. [ ] Fix TypeScript compilation errors
2. [ ] Add database indexes
3. [ ] Enable Redis reconnection
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
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] TypeScript compiles without errors (strict mode)
- [ ] All critical endpoints have authentication
- [ ] Rate limiting works across server instances
- [ ] Database indexes created

---

Last Updated: 2026-01-16
Version: v74.21.0 (Security Audit)
