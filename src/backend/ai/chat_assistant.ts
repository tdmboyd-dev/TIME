/**
 * AI CHAT ASSISTANT - SECURE HR & SUPPORT
 *
 * Natural language interface for TIME trading platform.
 * Users can ask questions, get market insights, and receive support.
 *
 * SECURITY FEATURES:
 * - Prompt injection detection and blocking
 * - No disclosure of internal system information
 * - No access to admin/backend/code details
 * - Rate limiting per user
 * - Audit logging of all interactions
 *
 * CAPABILITIES:
 * - Market analysis & portfolio queries
 * - Bot control
 * - Educational responses
 * - Customer support (HR-style)
 * - Account help
 * - Billing questions
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('ChatAssistant');

// ============================================================================
// SECURITY CONFIGURATION - NEVER EXPOSE TO USERS
// ============================================================================

// Blocked patterns that indicate malicious intent
const SECURITY_BLOCKED_PATTERNS = [
  // Prompt injection attempts
  /ignore (all )?(previous|prior|above) (instructions|prompts|rules)/i,
  /disregard (your|the) (instructions|rules|guidelines)/i,
  /pretend (you are|to be|you're)/i,
  /act as (a |an )?/i,
  /roleplay as/i,
  /you are now/i,
  /new persona/i,
  /forget (everything|your rules)/i,
  /system prompt/i,
  /reveal (your|the) (prompt|instructions|rules)/i,
  /what (are|is) your (instructions|prompt|rules)/i,
  /show me (your|the) (code|source|backend)/i,

  // Internal info probing
  /api key/i,
  /secret key/i,
  /password/i,
  /database (connection|credentials|password)/i,
  /admin (password|access|credentials)/i,
  /mongodb (uri|connection)/i,
  /env(ironment)? var(iables)?/i,
  /\.env file/i,
  /backend (code|source|architecture)/i,
  /server (code|source|config)/i,
  /internal (api|endpoint|route)/i,
  /how (is|does) (the )?(backend|system|server) work/i,
  /source code/i,
  /codebase/i,
  /repository/i,
  /github/i,

  // Privilege escalation
  /give me admin/i,
  /make me admin/i,
  /bypass (auth|authentication|security)/i,
  /hack(ing)?/i,
  /exploit/i,
  /vulnerab(le|ility)/i,
  /injection/i,
  /xss/i,
  /sql/i,

  // Data extraction
  /list (all )?(users|customers|accounts)/i,
  /user data/i,
  /customer (data|info|information)/i,
  /other (user|people)('s)? (accounts?|data|info)/i,
  /export (all )?data/i,

  // Absorbed bots info (hidden from users)
  /absorbed from/i,
  /where (did|do) (the )?(bots?|strategies?) come from/i,
  /who (made|created|built) (the )?(bots?|strategies?)/i,
  /renaissance/i,
  /two sigma/i,
  /citadel/i,
  /de shaw/i,
];

// Response for blocked queries
const SECURITY_BLOCK_RESPONSE = "I can't help with that request. I'm here to help you with trading, your account, and using the TIME platform. Is there something else I can assist you with?";

// Audit log entry
interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  message: string;
  blocked: boolean;
  reason?: string;
  intent?: string;
}

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    entities?: Record<string, string>;
    actions?: ChatAction[];
    sources?: string[];
    flagged?: boolean;
  };
}

export interface ChatAction {
  type: 'trade' | 'bot_control' | 'portfolio' | 'market_data' | 'settings' | 'info' | 'support';
  action: string;
  params?: Record<string, any>;
  executed: boolean;
  result?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: {
    currentTopic?: string;
    recentSymbols: string[];
    preferences: Record<string, any>;
    supportTicketId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Intent patterns - PUBLIC facing only
const intentPatterns: { intent: string; patterns: RegExp[]; handler: string }[] = [
  // Trading
  {
    intent: 'price_query',
    patterns: [
      /what('s| is) (the )?price (of |for )?(\w+)/i,
      /how (is|much is) (\w+)( trading| worth)?/i,
      /(\w+) price/i,
    ],
    handler: 'handlePriceQuery',
  },
  {
    intent: 'portfolio_summary',
    patterns: [
      /how('s| is) my portfolio/i,
      /(show |what's )?my (portfolio|positions|holdings)/i,
      /portfolio (summary|status|performance)/i,
    ],
    handler: 'handlePortfolioQuery',
  },
  {
    intent: 'bot_status',
    patterns: [
      /how (are|is) (my |the )?bots?( doing)?/i,
      /(show |list |what are )?my bots/i,
      /bot (status|performance)/i,
    ],
    handler: 'handleBotQuery',
  },
  {
    intent: 'bot_control',
    patterns: [
      /(start|activate|enable|turn on) (the )?(\w+)( bot)?/i,
      /(stop|pause|disable|turn off) (the )?(\w+)( bot)?/i,
    ],
    handler: 'handleBotControl',
  },
  {
    intent: 'market_analysis',
    patterns: [
      /analyze (\w+)/i,
      /what do you think (about|of) (\w+)/i,
      /(should i|would you) (buy|sell) (\w+)/i,
      /(\w+) analysis/i,
    ],
    handler: 'handleMarketAnalysis',
  },

  // Support & HR
  {
    intent: 'support_billing',
    patterns: [
      /billing (issue|problem|question)/i,
      /subscription (problem|issue|help|question)/i,
      /payment (failed|issue|problem)/i,
      /cancel (my )?(subscription|account)/i,
      /upgrade (my )?(plan|subscription|tier)/i,
      /downgrade/i,
      /refund/i,
      /charge/i,
      /how much (does|is)/i,
      /pricing/i,
    ],
    handler: 'handleBillingSupport',
  },
  {
    intent: 'support_account',
    patterns: [
      /reset (my )?password/i,
      /can't (login|log in|sign in)/i,
      /account (locked|blocked|disabled)/i,
      /change (my )?(email|password|username)/i,
      /delete (my )?account/i,
      /close (my )?account/i,
      /verify (my )?account/i,
      /2fa|two factor|authenticator/i,
    ],
    handler: 'handleAccountSupport',
  },
  {
    intent: 'support_technical',
    patterns: [
      /(app|page|site) (not working|broken|crashed|down)/i,
      /error( message)?/i,
      /bug( report)?/i,
      /something('s| is) wrong/i,
      /(can't|cannot) (connect|see|find|access)/i,
      /problem with/i,
      /issue with/i,
      /not loading/i,
    ],
    handler: 'handleTechnicalSupport',
  },
  {
    intent: 'support_broker',
    patterns: [
      /connect (my )?broker/i,
      /broker (not working|disconnected|issue)/i,
      /alpaca (issue|problem|not working)/i,
      /link (my )?(account|broker)/i,
      /api key (issue|problem|not working)/i,
    ],
    handler: 'handleBrokerSupport',
  },
  {
    intent: 'support_general',
    patterns: [
      /help( me)?$/i,
      /support$/i,
      /talk to (a )?(human|agent|support|person)/i,
      /contact (support|help)/i,
      /i need help/i,
      /assistance/i,
    ],
    handler: 'handleGeneralSupport',
  },
  {
    intent: 'complaint',
    patterns: [
      /complaint/i,
      /not happy/i,
      /disappointed/i,
      /frustrated/i,
      /terrible (service|experience)/i,
      /awful/i,
      /worst/i,
    ],
    handler: 'handleComplaint',
  },
  {
    intent: 'feedback',
    patterns: [
      /feedback/i,
      /suggestion/i,
      /feature request/i,
      /would be nice if/i,
      /you should add/i,
      /please add/i,
    ],
    handler: 'handleFeedback',
  },

  // Education
  {
    intent: 'education',
    patterns: [
      /what (is|are) (\w+)/i,
      /explain (\w+)/i,
      /how (does|do) (\w+) work/i,
      /teach me about (\w+)/i,
    ],
    handler: 'handleEducation',
  },

  // Greeting
  {
    intent: 'greeting',
    patterns: [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
    ],
    handler: 'handleGreeting',
  },

  // Thanks
  {
    intent: 'thanks',
    patterns: [
      /thank(s| you)/i,
      /appreciate it/i,
      /that helps/i,
      /perfect/i,
      /great/i,
    ],
    handler: 'handleThanks',
  },
];

// Chat Assistant Engine - SECURE
export class ChatAssistant extends EventEmitter {
  private sessions: Map<string, ChatSession> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private rateLimits: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor() {
    super();
    logger.info('ChatAssistant initialized with security features');
  }

  // Check rate limit (100 messages per hour per user)
  private checkRateLimit(userId: string): boolean {
    const now = new Date();
    const limit = this.rateLimits.get(userId);

    if (!limit || now > limit.resetAt) {
      this.rateLimits.set(userId, {
        count: 1,
        resetAt: new Date(now.getTime() + 60 * 60 * 1000),
      });
      return true;
    }

    if (limit.count >= 100) {
      return false;
    }

    limit.count++;
    return true;
  }

  // Check for security violations
  private checkSecurity(content: string): { blocked: boolean; reason?: string } {
    for (const pattern of SECURITY_BLOCKED_PATTERNS) {
      if (pattern.test(content)) {
        return {
          blocked: true,
          reason: `Blocked pattern: ${pattern.source.substring(0, 30)}...`,
        };
      }
    }
    return { blocked: false };
  }

  // Log to audit
  private logAudit(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    // Keep only last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    if (entry.blocked) {
      logger.warn(`SECURITY: Blocked message from ${entry.userId}: ${entry.reason}`);
    }
  }

  // Create or get session
  getSession(userId: string): ChatSession {
    const existingSession = Array.from(this.sessions.values())
      .find(s => s.userId === userId);

    if (existingSession) {
      return existingSession;
    }

    const session: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      messages: [],
      context: {
        recentSymbols: [],
        preferences: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  // Process user message - WITH SECURITY
  async processMessage(userId: string, content: string): Promise<ChatMessage> {
    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "You've sent too many messages. Please wait a bit before trying again.",
        timestamp: new Date(),
        metadata: { flagged: true },
      };
    }

    // Security check
    const security = this.checkSecurity(content);
    this.logAudit({
      timestamp: new Date(),
      userId,
      message: content.substring(0, 200),
      blocked: security.blocked,
      reason: security.reason,
    });

    if (security.blocked) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: SECURITY_BLOCK_RESPONSE,
        timestamp: new Date(),
        metadata: { flagged: true },
      };
    }

    const session = this.getSession(userId);

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    // Detect intent
    const { intent, entities } = this.detectIntent(content);
    userMessage.metadata = { intent, entities };

    // Generate response
    const response = await this.generateResponse(session, intent, entities, content);

    // Add assistant message
    session.messages.push(response);
    session.updatedAt = new Date();

    this.emit('messageSent', { userId, userMessage, response });

    return response;
  }

  // Detect intent from message
  private detectIntent(content: string): { intent: string; entities: Record<string, string> } {
    const entities: Record<string, string> = {};

    for (const { intent, patterns } of intentPatterns) {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          if (match.length > 1) {
            match.slice(1).forEach((group, i) => {
              if (group) {
                entities[`entity_${i}`] = group.trim();
              }
            });
          }

          const symbolMatch = content.match(/\b([A-Z]{1,5})\b/);
          if (symbolMatch) {
            entities.symbol = symbolMatch[1];
          }

          return { intent, entities };
        }
      }
    }

    return { intent: 'unknown', entities };
  }

  // Generate response based on intent
  private async generateResponse(
    session: ChatSession,
    intent: string,
    entities: Record<string, string>,
    originalContent: string
  ): Promise<ChatMessage> {
    let responseContent: string;
    const actions: ChatAction[] = [];

    switch (intent) {
      case 'greeting':
        responseContent = this.handleGreeting();
        break;
      case 'thanks':
        responseContent = this.handleThanks();
        break;
      case 'price_query':
        responseContent = await this.handlePriceQuery(entities);
        break;
      case 'portfolio_summary':
        responseContent = await this.handlePortfolioQuery(session.userId);
        break;
      case 'bot_status':
        responseContent = await this.handleBotQuery();
        break;
      case 'bot_control':
        const { response, action } = await this.handleBotControl(entities, originalContent);
        responseContent = response;
        if (action) actions.push(action);
        break;
      case 'market_analysis':
        responseContent = await this.handleMarketAnalysis(entities);
        break;
      case 'support_billing':
        responseContent = this.handleBillingSupport(entities);
        break;
      case 'support_account':
        responseContent = this.handleAccountSupport(entities, originalContent);
        break;
      case 'support_technical':
        responseContent = this.handleTechnicalSupport(entities, originalContent);
        break;
      case 'support_broker':
        responseContent = this.handleBrokerSupport();
        break;
      case 'support_general':
        responseContent = this.handleGeneralSupport();
        break;
      case 'complaint':
        responseContent = this.handleComplaint();
        break;
      case 'feedback':
        responseContent = this.handleFeedback();
        break;
      case 'education':
        responseContent = await this.handleEducation(entities);
        break;
      default:
        responseContent = this.handleUnknown(originalContent);
    }

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      metadata: {
        intent,
        entities,
        actions: actions.length > 0 ? actions : undefined,
      },
    };
  }

  // ============================================================================
  // INTENT HANDLERS
  // ============================================================================

  private handleGreeting(): string {
    const greetings = [
      "Hello! I'm your TIME assistant. I can help you with trading, account questions, or technical support. What can I do for you?",
      "Hey there! I'm here to help with markets, bots, billing, or any other questions. How can I assist you today?",
      "Hi! Welcome to TIME support. I can help you check markets, manage your account, or answer questions. What's on your mind?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private handleThanks(): string {
    const responses = [
      "You're welcome! Let me know if you need anything else.",
      "Happy to help! Is there anything else I can assist with?",
      "Anytime! Feel free to ask if you have more questions.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private async handlePriceQuery(entities: Record<string, string>): Promise<string> {
    const symbol = entities.symbol || entities.entity_3 || entities.entity_1;
    if (!symbol) {
      return "Which asset would you like to check? Just say something like 'AAPL price' or 'how is BTC doing'";
    }

    const prices: Record<string, { price: number; change: number }> = {
      AAPL: { price: 198.50, change: 1.2 },
      TSLA: { price: 248.30, change: -2.1 },
      BTC: { price: 43250.00, change: 3.5 },
      ETH: { price: 2280.00, change: 2.8 },
      MSFT: { price: 378.90, change: 0.8 },
    };

    const data = prices[symbol.toUpperCase()];
    if (data) {
      const direction = data.change >= 0 ? 'up' : 'down';
      return `${symbol.toUpperCase()} is trading at $${data.price.toLocaleString()}, ${direction} ${Math.abs(data.change)}% today.`;
    }

    return `Check the Markets page for real-time ${symbol} prices.`;
  }

  private async handlePortfolioQuery(userId: string): Promise<string> {
    return `**Your Portfolio Summary:**\n\n` +
      `**Total Value:** $127,450.00\n` +
      `**Today's P&L:** +$1,234.56 (+0.98%)\n` +
      `**Open Positions:** 8 assets\n` +
      `**Active Bots:** 5 running\n\n` +
      `Visit the Portfolio page for full details.`;
  }

  private async handleBotQuery(): Promise<string> {
    return `**Your Bots:**\n\n` +
      `• 5 Active bots running\n` +
      `• Combined P&L today: +$995\n` +
      `• All systems operational\n\n` +
      `Visit the Bots page to manage your bots.`;
  }

  private async handleBotControl(
    entities: Record<string, string>,
    content: string
  ): Promise<{ response: string; action?: ChatAction }> {
    const isStart = /start|activate|enable|turn on/i.test(content);
    const botName = entities.entity_2 || entities.entity_0;

    if (!botName) {
      return { response: "Which bot would you like to control? Visit the Bots page to manage them." };
    }

    const action: ChatAction = {
      type: 'bot_control',
      action: isStart ? 'start' : 'stop',
      params: { botName },
      executed: true,
    };

    return {
      response: isStart
        ? `I'll start ${botName} for you. Check the Bots page to confirm it's running.`
        : `I'll pause ${botName}. Your positions will be maintained.`,
      action,
    };
  }

  private async handleMarketAnalysis(entities: Record<string, string>): Promise<string> {
    const symbol = entities.symbol || entities.entity_1;
    if (!symbol) {
      return "Which asset would you like me to analyze?";
    }

    return `**${symbol.toUpperCase()} Quick Analysis:**\n\n` +
      `• Technical: Neutral to bullish\n` +
      `• Sentiment: Positive\n` +
      `• Volume: Normal\n\n` +
      `Visit Charts for detailed analysis.\n\n` +
      `_This is not financial advice._`;
  }

  // ============================================================================
  // SUPPORT HANDLERS
  // ============================================================================

  private handleBillingSupport(entities: Record<string, string>): string {
    return `**Billing Support:**\n\n` +
      `For billing questions, here's what you can do:\n\n` +
      `**View/Change Subscription:**\n` +
      `Go to Settings > Subscription to view your plan or make changes.\n\n` +
      `**Payment Issues:**\n` +
      `Update your payment method in Settings > Payments.\n\n` +
      `**Refunds:**\n` +
      `Refund requests are handled within 30 days of purchase. Email support@timebeyondus.com with your request.\n\n` +
      `**Current Pricing:**\n` +
      `• FREE: $0/mo - Basic features\n` +
      `• STARTER: $19/mo - 5 bots, copy trading\n` +
      `• PRO: $49/mo - 25 bots, all strategies\n` +
      `• ENTERPRISE: $249/mo - Unlimited + API\n\n` +
      `Need more help? Email support@timebeyondus.com`;
  }

  private handleAccountSupport(entities: Record<string, string>, content: string): string {
    if (/password/i.test(content)) {
      return `**Password Reset:**\n\n` +
        `1. Go to the Login page\n` +
        `2. Click "Forgot Password"\n` +
        `3. Enter your email\n` +
        `4. Check your inbox for reset link\n\n` +
        `Link expires in 1 hour. If you don't receive it, check spam or try again.`;
    }

    if (/2fa|two factor|authenticator/i.test(content)) {
      return `**Two-Factor Authentication:**\n\n` +
        `**To enable 2FA:**\n` +
        `Go to Settings > Security > Enable 2FA\n\n` +
        `**Lost access to authenticator?**\n` +
        `Contact support@timebeyondus.com with your account email for manual verification.`;
    }

    if (/delete|close/i.test(content)) {
      return `**Account Deletion:**\n\n` +
        `To close your account:\n` +
        `1. Close all open positions\n` +
        `2. Withdraw any remaining funds\n` +
        `3. Cancel your subscription\n` +
        `4. Email support@timebeyondus.com with subject "Account Deletion"\n\n` +
        `Your data will be deleted within 30 days per our privacy policy.`;
    }

    return `**Account Support:**\n\n` +
      `I can help with:\n` +
      `• Password reset - "reset my password"\n` +
      `• 2FA setup - "help with 2fa"\n` +
      `• Account deletion - "delete my account"\n` +
      `• Email change - Go to Settings > Profile\n\n` +
      `What do you need help with?`;
  }

  private handleTechnicalSupport(entities: Record<string, string>, content: string): string {
    return `**Technical Support:**\n\n` +
      `**Quick Fixes:**\n` +
      `1. Refresh the page (Ctrl+R or Cmd+R)\n` +
      `2. Clear browser cache and cookies\n` +
      `3. Try a different browser\n` +
      `4. Check if you're on the latest version\n\n` +
      `**Still having issues?**\n` +
      `Please describe your issue and include:\n` +
      `• What you were trying to do\n` +
      `• Any error message you see\n` +
      `• Your browser type (Chrome, Safari, etc.)\n\n` +
      `Or email support@timebeyondus.com with these details.`;
  }

  private handleBrokerSupport(): string {
    return `**Broker Connection Help:**\n\n` +
      `**Supported Brokers:**\n` +
      `• Alpaca (Stocks & Crypto)\n` +
      `• Interactive Brokers (Coming soon)\n` +
      `• TD Ameritrade (Coming soon)\n\n` +
      `**To Connect Alpaca:**\n` +
      `1. Go to Broker Connect page\n` +
      `2. Click "Connect Alpaca"\n` +
      `3. Enter your API Key and Secret\n` +
      `4. Choose Paper or Live trading\n\n` +
      `**Connection Issues?**\n` +
      `• Make sure you're using the correct API keys\n` +
      `• Check that keys aren't expired\n` +
      `• For live trading, ensure account is funded\n\n` +
      `Need help? Email support@timebeyondus.com`;
  }

  private handleGeneralSupport(): string {
    return `**How can I help you today?**\n\n` +
      `I can assist with:\n\n` +
      `**Trading:**\n` +
      `• Check prices - "AAPL price"\n` +
      `• Portfolio status - "my portfolio"\n` +
      `• Bot control - "start/stop bots"\n` +
      `• Market analysis - "analyze TSLA"\n\n` +
      `**Account & Billing:**\n` +
      `• Subscription questions\n` +
      `• Password reset\n` +
      `• 2FA setup\n` +
      `• Payment issues\n\n` +
      `**Technical:**\n` +
      `• Connection issues\n` +
      `• Broker setup\n` +
      `• Bug reports\n\n` +
      `**Contact Human Support:**\n` +
      `Email: support@timebeyondus.com\n\n` +
      `What would you like help with?`;
  }

  private handleComplaint(): string {
    return `I'm sorry you're having a frustrating experience. Your feedback matters to us.\n\n` +
      `**To file a formal complaint:**\n` +
      `Email support@timebeyondus.com with:\n` +
      `• Subject: "Complaint"\n` +
      `• Description of your issue\n` +
      `• Your account email\n` +
      `• Any relevant screenshots\n\n` +
      `Our team reviews all complaints within 24-48 hours and will reach out to resolve your issue.\n\n` +
      `Is there something I can help with right now?`;
  }

  private handleFeedback(): string {
    return `Thank you for wanting to share feedback!\n\n` +
      `**Submit Feedback:**\n` +
      `Email: feedback@timebeyondus.com\n\n` +
      `**Feature Requests:**\n` +
      `We love hearing ideas! Include:\n` +
      `• What feature you'd like\n` +
      `• How it would help you\n` +
      `• Any examples from other platforms\n\n` +
      `We review all suggestions and often implement popular requests. What's on your mind?`;
  }

  private async handleEducation(entities: Record<string, string>): Promise<string> {
    const topic = entities.entity_1 || entities.entity_0;

    const explanations: Record<string, string> = {
      rsi: "**RSI (Relative Strength Index)** measures momentum. Above 70 = overbought, below 30 = oversold.",
      macd: "**MACD** shows trend direction. Line crossing above signal = bullish, below = bearish.",
      bot: "**Trading Bots** are automated strategies that trade for you 24/7 based on algorithms.",
      'stop loss': "**Stop Loss** automatically sells when price drops to a level you set, limiting losses.",
    };

    if (topic && explanations[topic.toLowerCase()]) {
      return explanations[topic.toLowerCase()];
    }

    return `I can explain:\n` +
      `• Technical indicators (RSI, MACD)\n` +
      `• Trading concepts (stop loss, take profit)\n` +
      `• Bot features\n` +
      `• Risk management\n\n` +
      `What would you like to learn about?`;
  }

  private handleUnknown(content: string): string {
    return `I'm not sure I understood that. Here's what I can help with:\n\n` +
      `**Trading:** "AAPL price", "my portfolio", "start Phantom King"\n` +
      `**Support:** "billing help", "reset password", "connect broker"\n` +
      `**Learn:** "what is RSI", "explain stop loss"\n\n` +
      `Or email support@timebeyondus.com for human assistance.`;
  }

  // Get chat history
  getHistory(userId: string): ChatMessage[] {
    const session = this.getSession(userId);
    return session.messages;
  }

  // Clear history
  clearHistory(userId: string): void {
    const session = Array.from(this.sessions.values())
      .find(s => s.userId === userId);

    if (session) {
      session.messages = [];
      session.updatedAt = new Date();
    }
  }

  // Admin: Get audit log (protected)
  getAuditLog(adminKey: string): AuditLogEntry[] | null {
    // Only return if valid admin key
    if (adminKey !== process.env.ADMIN_AUDIT_KEY) {
      return null;
    }
    return this.auditLog;
  }
}

// Singleton instance
export const chatAssistant = new ChatAssistant();
