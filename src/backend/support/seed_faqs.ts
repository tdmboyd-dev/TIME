/**
 * Seed FAQ Data
 *
 * Initialize support FAQ database with common questions and answers
 */

import { getDatabase } from '../database/connection';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('SeedFAQs');

const faqs = [
  // Trading Category
  {
    question: 'How do I start trading on TIME BEYOND US?',
    answer: `To start trading:

1. Connect a broker in Settings > Broker Connect
2. Choose from Alpaca, Interactive Brokers, OANDA, or others
3. Start in Practice Mode to learn without risk
4. Enable bots in the Bots or LIVE Bot Trading page
5. Monitor your trades in the Trade History page

We recommend starting with Practice Mode to familiarize yourself with the platform before switching to Live Mode.`,
    category: 'trading',
    keywords: ['start', 'trading', 'begin', 'first', 'how to trade'],
    order: 1,
  },
  {
    question: 'What is the difference between Practice Mode and Live Mode?',
    answer: `Practice Mode:
- Uses simulated funds (paper trading)
- No real money at risk
- Perfect for learning and testing strategies
- All features available except real money execution

Live Mode:
- Uses real money from your connected broker account
- Actual trades executed on the market
- Requires broker connection and sufficient funds
- All profits and losses are real

You can switch between modes anytime in Settings.`,
    category: 'trading',
    keywords: ['practice', 'live', 'mode', 'paper trading', 'demo'],
    order: 2,
  },

  // Bot Category
  {
    question: 'My bot isn\'t trading. What should I check?',
    answer: `If your bot isn't trading, verify:

1. Bot is enabled in LIVE Bot Trading page
2. Broker connection is active (check Settings > Broker Connect)
3. You're in the correct mode (Practice or Live)
4. Bot has sufficient balance/buying power
5. Market is open (for stock bots)
6. Bot's risk limits haven't been exceeded

Check the bot's status indicator and recent activity logs for more details.`,
    category: 'bot',
    keywords: ['bot', 'not trading', 'not working', 'inactive', 'stopped'],
    order: 1,
  },
  {
    question: 'What are the 151+ bots and how do they work?',
    answer: `TIME BEYOND US has 151+ AI trading bots:
- 133 absorbed from open-source (GitHub, MQL5, TradingView)
- 18 fused meta-strategies combining multiple approaches

Each bot specializes in:
- Different market conditions (trending, ranging, volatile)
- Various strategies (momentum, mean reversion, breakout)
- Multiple asset classes (stocks, crypto, forex)

Bots automatically analyze markets and generate trading signals. You can enable/disable individual bots or use ensemble strategies that combine multiple bots.`,
    category: 'bot',
    keywords: ['bots', 'strategies', 'how many', 'what are', 'absorbed'],
    order: 2,
  },

  // Broker Category
  {
    question: 'How do I connect my broker to TIME BEYOND US?',
    answer: `To connect your broker:

1. Go to Settings > Broker Connect
2. Select your broker (Alpaca, Interactive Brokers, OANDA, etc.)
3. Follow the OAuth flow or enter API keys
4. Grant necessary permissions
5. Verify connection status shows "Active"

Supported brokers:
- Alpaca (stocks, paper & live)
- Interactive Brokers (multi-asset)
- OANDA (forex)
- Binance & Kraken (crypto)
- More via SnapTrade integration

Your API keys are encrypted and stored securely.`,
    category: 'broker',
    keywords: ['connect', 'broker', 'alpaca', 'oanda', 'ib', 'api keys'],
    order: 1,
  },
  {
    question: 'Which brokers are supported?',
    answer: `Currently supported brokers:

Stocks & ETFs:
- Alpaca (paper & live trading)
- Interactive Brokers (multi-asset platform)
- Via SnapTrade: Robinhood, E*TRADE, TD Ameritrade, and more

Forex:
- OANDA (live & practice)
- Interactive Brokers

Crypto:
- Binance (spot trading)
- Kraken (spot trading)

We're constantly adding new broker integrations. Contact support if you need a specific broker.`,
    category: 'broker',
    keywords: ['brokers', 'supported', 'which', 'list', 'integrations'],
    order: 2,
  },

  // Billing Category
  {
    question: 'What are the pricing tiers and premium features?',
    answer: `TIME BEYOND US Pricing:

SUBSCRIPTION TIERS:
- FREE: $0/month - 3 bots, paper trading only (add more via Bot Marketplace)
- BASIC: $19/month - 5 bots (add more via Bot Marketplace)
- PRO: $49/month - 7 bots
- PREMIUM: $109/month - 11 Super Bots
- ENTERPRISE: $450/month - Unlimited bots

OPTIONAL ADD-ONS (can be added to ANY tier):
- DROPBOT AutoPilot: +$39/month
  Fully automated "set it and forget it" trading
  AI manages everything for you

- Ultimate Money Machine (UMM): +$59/month
  25 Super Bots with institutional-grade edge
  Market Attack Strategies
  Self-learning AI that improves over time

Bot Marketplace: $5-50/day per bot
- Rent individual premium bots
- No long-term commitment
- Try before you subscribe`,
    category: 'billing',
    keywords: ['pricing', 'cost', 'price', 'subscription', 'premium', 'paid'],
    order: 1,
  },
  {
    question: 'What is DROPBOT AutoPilot?',
    answer: `DROPBOT AutoPilot is our premium add-on feature for +$39/month.

Key Features:
- Fully automated "set it and forget it" trading
- AI manages all trading decisions 24/7
- Risk management built-in
- Works with any subscription tier
- No manual intervention needed

Perfect for:
- Busy professionals who don't have time to monitor markets
- Beginners who want AI to handle trading
- Anyone who wants passive income from trading

Add DROPBOT to your subscription in Settings > Payments.`,
    category: 'billing',
    keywords: ['dropbot', 'autopilot', 'automated', 'set and forget', 'passive'],
    order: 2,
  },
  {
    question: 'What is the Ultimate Money Machine (UMM)?',
    answer: `The Ultimate Money Machine (UMM) is our most advanced add-on for +$59/month.

Includes:
- 25 Super Bots with institutional-grade strategies
- Market Attack Strategies for aggressive growth
- Self-learning AI that improves with every trade
- Combines multiple strategies for maximum returns
- Works with any subscription tier

Best for:
- Serious traders looking for maximum edge
- Those who want institutional-quality trading
- Users who want self-improving AI strategies

Add UMM to your subscription in Settings > Payments.`,
    category: 'billing',
    keywords: ['umm', 'ultimate', 'money machine', 'super bots', 'institutional'],
    order: 3,
  },

  // Account Category
  {
    question: 'How do I reset my password?',
    answer: `To reset your password:

1. Go to the login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your email for reset link
5. Click the link and create a new password

If you don't receive the email:
- Check your spam folder
- Verify you used the correct email
- Wait a few minutes and try again
- Contact support if issues persist`,
    category: 'account',
    keywords: ['password', 'reset', 'forgot', 'change', 'login'],
    order: 1,
  },

  // Technical Category
  {
    question: 'The platform is slow or not loading. What should I do?',
    answer: `Try these troubleshooting steps:

1. Refresh the page (Ctrl/Cmd + R)
2. Clear browser cache and cookies
3. Try a different browser (Chrome, Firefox, Safari)
4. Check your internet connection
5. Disable browser extensions temporarily
6. Try incognito/private mode

If issues persist:
- Check our status page for outages
- Try again in a few minutes
- Contact support with details (browser, device, error messages)`,
    category: 'technical',
    keywords: ['slow', 'loading', 'not working', 'error', 'bug', 'broken'],
    order: 1,
  },
];

export async function seedFAQs(): Promise<void> {
  try {
    const db = await getDatabase();
    const faqCollection = db.collection('support_faq');

    // Check if FAQs already exist
    const count = await faqCollection.countDocuments();
    if (count > 0) {
      logger.info('FAQs already seeded', { count });
      return;
    }

    // Insert FAQs
    const faqDocuments = faqs.map((faq, index) => ({
      ...faq,
      _id: `faq_${index + 1}`,
      helpfulness: 0,
      views: 0,
      helpful_votes: 0,
      unhelpful_votes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      published: true,
    }));

    await faqCollection.insertMany(faqDocuments);

    logger.info('FAQs seeded successfully', { count: faqDocuments.length });
  } catch (error) {
    logger.error('Error seeding FAQs', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedFAQs()
    .then(() => {
      console.log('FAQ seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('FAQ seeding failed:', error);
      process.exit(1);
    });
}
