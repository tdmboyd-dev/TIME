/**
 * AI Chat Support Handler
 *
 * Provides intelligent 24/7 support using OpenAI GPT-4
 * - Context-aware responses about TIME BEYOND US platform
 * - Intent detection and classification
 * - Rate limiting to prevent abuse
 * - Escalation to human support when needed
 */

import OpenAI from 'openai';
import { createComponentLogger } from '../utils/logger';
import { getDatabase } from '../database/connection';

const logger = createComponentLogger('AIChatHandler');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting: Max 20 messages per user per hour
interface RateLimit {
  userId: string;
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimit>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Intent categories
export type Intent =
  | 'trading_help'
  | 'broker_connection'
  | 'bot_question'
  | 'billing_payment'
  | 'technical_issue'
  | 'account_help'
  | 'feature_request'
  | 'general_question'
  | 'escalate_human';

// Platform knowledge base - ACCURATE PRICING
const PLATFORM_CONTEXT = `
You are the AI support assistant for TIME BEYOND US, an advanced AI-powered trading platform.

PLATFORM FEATURES:
- 151+ AI Trading Bots (133 absorbed from open source, 18 fused meta-strategies)
- DROPBOT AutoPilot (+$39/mo add-on) - Fully automated "set it and forget it" trading
- Ultimate Money Machine (UMM) (+$59/mo add-on) - 25 Super Bots with institutional edge
- LIVE Bot Trading - Real-time bot execution with Practice or Live modes
- Big Moves Alerts - Whale tracking, government policy, institutional moves
- AI Vision Engine - Market analysis and predictions
- Bot Marketplace - Rent bots from $5/day
- Backtesting - Industry-standard with Monte Carlo simulation
- Social Trading - Copy successful traders
- Robo Advisor - Goal-based automated investing
- DeFi Integration - Real yields from DefiLlama
- Wealth Management - Dynasty trusts, family legacy planning
- Retirement Planning - IRA, 401k, RMD tracking
- Tax Optimization - Tax-loss harvesting, wash sale tracking
- Broker Connections - Alpaca, Interactive Brokers, OANDA, and more
- Multi-asset Support - Stocks, crypto, forex, options
- 24/7 AI Support - Instant help anytime

SUPPORTED BROKERS:
- Alpaca (stocks, paper & live)
- Interactive Brokers (multi-asset)
- OANDA (forex)
- Binance (crypto)
- Kraken (crypto)
- More via SnapTrade integration (Robinhood, E*TRADE, TD Ameritrade)

TRADING MODES:
- Practice Mode: Paper trading with simulated funds - perfect for learning
- Live Mode: Real money trading (requires broker connection and funds)

=== OFFICIAL PRICING (ALWAYS USE THESE EXACT PRICES) ===

SUBSCRIPTION TIERS:
- FREE: $0/month - 1 bot, paper trading only
- BASIC: $19/month - 3 bots
- PRO: $49/month - 7 bots
- PREMIUM: $109/month - 11 Super Bots
- ENTERPRISE: $450/month - Unlimited bots

OPTIONAL ADD-ONS (can be added to ANY subscription tier):
- DROPBOT AutoPilot: +$39/month
  Fully automated trading, set it and forget it, AI manages everything

- Ultimate Money Machine (UMM): +$59/month
  25 Super Bots with institutional-grade edge
  Market Attack Strategies
  Self-learning AI that improves over time

BOT MARKETPLACE:
- Rent individual premium bots: $5-$50/day
- No long-term commitment required
- Try before you buy

IMPORTANT: When users ask about pricing, ALWAYS provide the exact prices above. Never approximate or round.

COMMON ISSUES & SOLUTIONS:
1. "How do I start trading?"
   - Connect a broker in Settings > Broker Connect
   - Start in Practice Mode to learn
   - Enable bots in Bots or LIVE Bot Trading

2. "How do I connect my broker?"
   - Go to Settings > Broker Connect
   - Select your broker (Alpaca, IB, OANDA, etc.)
   - Follow OAuth flow or enter API keys
   - Verify connection status

3. "My bot isn't trading"
   - Check if bot is enabled in LIVE Bot Trading
   - Verify broker connection is active
   - Ensure you're in correct mode (Practice vs Live)
   - Check bot has sufficient balance/buying power

4. "How do I enable AutoPilot?"
   - Add DROPBOT AutoPilot (+$39/mo) to your subscription
   - Configure risk settings in Settings
   - Enable AutoPilot toggle in dashboard

5. "Billing/payment issues"
   - Go to Settings > Payments
   - Update payment method if needed
   - Contact support for subscription issues

6. "What's the difference between tiers?"
   - FREE ($0/mo): 1 bot, paper trading - great for learning
   - BASIC ($19/mo): 3 bots - perfect for beginners
   - PRO ($49/mo): 7 bots - for active traders
   - PREMIUM ($109/mo): 11 Super Bots - serious traders
   - ENTERPRISE ($450/mo): Unlimited - for professionals

7. "What are DROPBOT and UMM add-ons?"
   - DROPBOT AutoPilot (+$39/mo): Set it and forget it, fully automated
   - Ultimate Money Machine (+$59/mo): 25 Super Bots, institutional-grade strategies, self-learning AI

HELPFUL LINKS:
- Trading: /trade, /live-trading
- Bots: /bots, /bot-marketplace
- Brokers: /brokers, /settings
- Billing: /payments, /subscription
- Support: /support
- Learning: /learn, /education

GUIDELINES:
- Be helpful, professional, and concise
- Provide step-by-step instructions when appropriate
- Link to relevant pages: /brokers, /settings, /bots, /trade, etc.
- Escalate complex billing, account access, or technical issues to human support
- Never share API keys, passwords, or sensitive data
- If unsure, offer to escalate to human support

ESCALATION TRIGGERS (suggest creating support ticket):
- Account locked/suspended
- Payment processing failures
- Data discrepancies or bugs
- Legal/compliance questions
- Custom feature requests requiring development
- User is frustrated or repeatedly asking same question
`;

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    // Reset or create new limit
    rateLimits.set(userId, {
      userId,
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}

/**
 * Detect intent from user message
 */
async function detectIntent(message: string): Promise<{ intent: Intent; confidence: number; isPricing?: boolean }> {
  const messageLower = message.toLowerCase();

  // Check for pricing-related keywords first (high priority)
  const pricingKeywords = ['price', 'pricing', 'cost', 'how much', 'subscription', 'tier', 'plan', 'fee', 'monthly', 'per month', '$', 'dollar', 'free', 'basic', 'pro', 'premium', 'enterprise', 'dropbot', 'umm', 'ultimate money machine', 'add-on', 'addon'];
  const isPricing = pricingKeywords.some(keyword => messageLower.includes(keyword));

  // Simple keyword-based intent detection
  if (messageLower.includes('trade') || messageLower.includes('trading') || messageLower.includes('buy') || messageLower.includes('sell')) {
    return { intent: 'trading_help', confidence: 0.8, isPricing };
  }
  if (messageLower.includes('broker') || messageLower.includes('connect') || messageLower.includes('alpaca') || messageLower.includes('oanda')) {
    return { intent: 'broker_connection', confidence: 0.85, isPricing };
  }
  if (messageLower.includes('bot') || messageLower.includes('autopilot') || messageLower.includes('strategy') || messageLower.includes('dropbot') || messageLower.includes('umm')) {
    return { intent: 'bot_question', confidence: 0.8, isPricing };
  }
  if (messageLower.includes('payment') || messageLower.includes('billing') || messageLower.includes('subscription') || messageLower.includes('charge') || isPricing) {
    return { intent: 'billing_payment', confidence: 0.9, isPricing };
  }
  if (messageLower.includes('error') || messageLower.includes('bug') || messageLower.includes('broken') || messageLower.includes('not working')) {
    return { intent: 'technical_issue', confidence: 0.85, isPricing };
  }
  if (messageLower.includes('account') || messageLower.includes('login') || messageLower.includes('password') || messageLower.includes('locked')) {
    return { intent: 'account_help', confidence: 0.85, isPricing };
  }
  if (messageLower.includes('human') || messageLower.includes('agent') || messageLower.includes('person') || messageLower.includes('speak to someone')) {
    return { intent: 'escalate_human', confidence: 1.0, isPricing };
  }
  if (messageLower.includes('feature') || messageLower.includes('request') || messageLower.includes('suggestion')) {
    return { intent: 'feature_request', confidence: 0.7, isPricing };
  }

  return { intent: 'general_question', confidence: 0.6, isPricing };
}

/**
 * Get chat response from OpenAI
 */
async function getChatResponse(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ response: string; intent: Intent; shouldEscalate: boolean }> {
  try {
    // Detect intent
    const { intent, confidence } = await detectIntent(message);

    // Check if we should escalate to human
    const shouldEscalate = intent === 'escalate_human' || (
      intent === 'billing_payment' &&
      (message.toLowerCase().includes('charged') || message.toLowerCase().includes('refund'))
    );

    // Build conversation messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: PLATFORM_CONTEXT },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: message },
    ];

    // If should escalate, provide transition message
    if (shouldEscalate) {
      return {
        response: "I understand you need assistance with this issue. Let me connect you with our human support team. Would you like me to create a support ticket for you? They typically respond within 1-2 hours during business hours.",
        intent,
        shouldEscalate: true,
      };
    }

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    });

    const response = completion.choices[0]?.message?.content ||
      "I'm having trouble processing your request. Please try again or create a support ticket for human assistance.";

    return {
      response,
      intent,
      shouldEscalate: false,
    };
  } catch (error) {
    logger.error('Error getting chat response', { error: error instanceof Error ? error.message : String(error) });
    return {
      response: "I'm experiencing technical difficulties. Please try again in a moment, or create a support ticket for immediate assistance.",
      intent: 'technical_issue',
      shouldEscalate: true,
    };
  }
}

/**
 * Save chat message to database
 */
async function saveChatMessage(
  userId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  intent?: Intent,
  confidence?: number
): Promise<void> {
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await chatHistory.updateOne(
      { sessionId },
      {
        $setOnInsert: {
          userId,
          sessionId,
          startedAt: new Date(),
          escalatedToTicket: false,
          issueResolved: false,
        },
        $set: {
          lastMessageAt: new Date(),
        },
        $push: {
          messages: {
            id: messageId,
            role,
            content,
            timestamp: new Date(),
            intent,
            confidence,
          },
        },
        $inc: {
          messagesCount: 1,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    logger.error('Error saving chat message', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Get chat history for user
 */
async function getChatHistory(
  userId: string,
  sessionId: string,
  limit: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');

    const session = await chatHistory.findOne({ sessionId });

    if (!session) {
      return [];
    }

    const messages = session.messages || [];
    return messages
      .slice(-limit)
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
  } catch (error) {
    logger.error('Error getting chat history', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Main chat handler - process user message and return AI response
 */
export async function handleChatMessage(
  userId: string,
  sessionId: string,
  message: string
): Promise<{
  success: boolean;
  response?: string;
  intent?: Intent;
  shouldEscalate?: boolean;
  error?: string;
  rateLimited?: boolean;
}> {
  try {
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return {
        success: false,
        rateLimited: true,
        error: 'You have exceeded the message limit. Please try again later or create a support ticket.',
      };
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: 'Message cannot be empty',
      };
    }

    if (message.length > 1000) {
      return {
        success: false,
        error: 'Message too long (max 1000 characters)',
      };
    }

    // Get conversation history
    const conversationHistory = await getChatHistory(userId, sessionId, 10);

    // Save user message
    await saveChatMessage(userId, sessionId, 'user', message);

    // Get AI response
    const { response, intent, shouldEscalate } = await getChatResponse(
      userId,
      message,
      conversationHistory
    );

    // Save AI response
    await saveChatMessage(userId, sessionId, 'assistant', response, intent, 0.9);

    return {
      success: true,
      response,
      intent,
      shouldEscalate,
    };
  } catch (error) {
    logger.error('Error handling chat message', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      sessionId,
    });
    return {
      success: false,
      error: 'An error occurred processing your message. Please try again.',
    };
  }
}

/**
 * Get user's chat session history
 */
export async function getUserChatHistory(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');

    const sessions = await chatHistory
      .find({ userId })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .toArray();

    return sessions;
  } catch (error) {
    logger.error('Error getting user chat history', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Clear chat session
 */
export async function clearChatSession(sessionId: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');

    await chatHistory.updateOne(
      { sessionId },
      {
        $set: {
          endedAt: new Date(),
        },
      }
    );

    return true;
  } catch (error) {
    logger.error('Error clearing chat session', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
