# TIME Stripe Payment Integration

Complete production-ready Stripe integration for TIME trading platform subscription management.

## Features Implemented

### 1. Subscription Service (`src/backend/payments/stripe_service.ts`)

Complete StripeService class with all required methods:

- **createCheckoutSession(userId, tierId, successUrl, cancelUrl)** - Creates Stripe checkout session for subscription
- **createPortalSession(userId, returnUrl)** - Creates customer portal for subscription management
- **handleWebhook(rawBody, signature)** - Processes Stripe webhook events with signature verification
- **getUserSubscription(userId)** - Gets current subscription for a user
- **cancelSubscription(userId)** - Cancels subscription at period end
- **hasAccess(userId, feature)** - Checks if user has access to specific features

### 2. Subscription Tiers

Five tiers as specified:

| Tier | Price | Bots | Capital | Features |
|------|-------|------|---------|----------|
| **FREE** | $0/mo | 3 | Paper only | Basic trading, community support |
| **BASIC** | $19/mo | 10 | $5,000 | Real trading, email support |
| **PRO** | $39/mo | 50 | $50,000 | Priority execution, API access |
| **PREMIUM** | $59/mo | 999 | $500,000 | Ultimate Money Machine, 24/7 support |
| **ENTERPRISE** | $250/mo | Unlimited | Unlimited | White-label, dedicated manager |

### 3. Webhook Handlers

Fully implemented webhook handlers for:

- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription activated
- `customer.subscription.updated` - Subscription changed (upgrade/downgrade)
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

### 4. API Routes (`src/backend/routes/stripe.ts`)

Complete REST API endpoints:

- `POST /api/v1/stripe/create-checkout` - Create checkout session
- `POST /api/v1/stripe/create-portal` - Open customer portal
- `POST /api/v1/stripe/webhook` - Handle webhook events (no auth)
- `GET /api/v1/stripe/subscription` - Get current subscription
- `GET /api/v1/stripe/tiers` - Get all available tiers
- `POST /api/v1/stripe/cancel` - Cancel subscription
- `POST /api/v1/stripe/reactivate` - Reactivate canceled subscription

### 5. Frontend Integration (`frontend/src/app/payments/page.tsx`)

Complete payments page with:

- Subscription tier cards with features
- Current plan indicator
- Upgrade/downgrade buttons
- Manage subscription button (opens Stripe portal)
- Billing period display
- Cancellation warning display

### 6. Database Schema (`src/backend/database/schemas.ts`)

Added SubscriptionSchema with fields:

- User and Stripe IDs
- Subscription tier and status
- Billing period dates
- Cancellation tracking
- Payment history

## Setup Instructions

### 1. Install Dependencies

```bash
npm install stripe
```

### 2. Configure Stripe Dashboard

1. Create account at https://stripe.com
2. Get API keys from https://dashboard.stripe.com/apikeys
3. Create 4 products with recurring prices:
   - BASIC: $19/month
   - PRO: $39/month
   - PREMIUM: $59/month
   - ENTERPRISE: $250/month
4. Copy Price IDs (starts with `price_`)

### 3. Set Up Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/v1/stripe/webhook`
4. Select events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy webhook signing secret (starts with `whsec_`)

### 4. Configure Environment Variables

Copy `.env.stripe.example` to `.env` and fill in:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Price IDs
STRIPE_PRICE_BASIC=price_YOUR_BASIC_PRICE_ID
STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID
STRIPE_PRICE_PREMIUM=price_YOUR_PREMIUM_PRICE_ID
STRIPE_PRICE_ENTERPRISE=price_YOUR_ENTERPRISE_PRICE_ID

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

### 5. Start the Backend

```bash
npm run dev:backend
```

## Testing

### Test Mode

Use Stripe test mode for development:

- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC
- Any ZIP code

### Test Webhooks Locally

Use Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:5000/api/v1/stripe/webhook
```

## Production Deployment

### 1. Switch to Live Mode

Replace test keys with live keys:
- `sk_live_...` instead of `sk_test_...`
- `pk_live_...` instead of `pk_test_...`

### 2. Update Webhook URL

Point webhook to production URL:
```
https://time-backend-hosting.fly.dev/api/v1/stripe/webhook
```

### 3. Update Frontend URL

```bash
FRONTEND_URL=https://your-domain.com
```

## Usage Examples

### Create Checkout Session

```typescript
const response = await fetch('https://api.time.com/v1/stripe/create-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    tierId: 'premium'
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe checkout
```

### Get Current Subscription

```typescript
const response = await fetch('https://api.time.com/v1/stripe/subscription', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const { subscription, tier } = await response.json();
console.log(`Current tier: ${tier.name} - ${tier.price}/mo`);
```

### Cancel Subscription

```typescript
await fetch('https://api.time.com/v1/stripe/cancel', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

## Feature Access Control

Use the `hasAccess` method to control feature access:

```typescript
import { stripeService } from './payments/stripe_service';

// Check if user can use Ultimate Money Machine
const canUseUMM = await stripeService.hasAccess(userId, 'bots');
if (!canUseUMM) {
  throw new Error('Upgrade to PREMIUM to access Ultimate Money Machine');
}

// Get user's tier
const tier = await stripeService.getUserTier(userId);
const botLimit = tier.limits.bots; // -1 = unlimited
```

## Security Features

1. **Webhook Signature Verification** - All webhooks verified using Stripe signature
2. **Authentication Required** - All user endpoints require JWT authentication
3. **Environment Variables** - Sensitive keys stored in env vars
4. **Raw Body Parsing** - Webhook endpoint uses raw body for signature verification
5. **HTTPS Only** - Production webhooks require HTTPS

## Event Handling

The service emits events for integration with other systems:

```typescript
stripeService.on('subscription:created', (subscription) => {
  console.log('New subscription:', subscription);
  // Update user permissions, send welcome email, etc.
});

stripeService.on('subscription:updated', (subscription) => {
  console.log('Subscription updated:', subscription);
  // Update user tier, adjust limits, etc.
});

stripeService.on('payment:failed', ({ subscription, invoice }) => {
  console.log('Payment failed:', subscription);
  // Send payment failure notification
});
```

## Error Handling

All methods include comprehensive error handling:

- Invalid tier ID → 400 Bad Request
- Missing customer → Creates new customer
- Webhook verification failure → 400 Bad Request
- No active subscription → Returns null / FREE tier

## Support

For issues or questions:
- Check Stripe Dashboard logs
- Review webhook event history
- Test with Stripe CLI
- Check server logs for error messages

## License

PROPRIETARY - TIME Trading Platform
© 2025 Timebeunus Boyd
