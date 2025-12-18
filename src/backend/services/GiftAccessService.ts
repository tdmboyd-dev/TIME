/**
 * TIME Gift Access Service
 *
 * Admin system for gifting premium access to users.
 * Includes AI recommendations for optimal gift timing.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// Subscription tiers
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'UNLIMITED' | 'ENTERPRISE';

// Gift duration options
export type GiftDuration = '1week' | '1month' | '3months' | '6months' | '1year' | 'lifetime';

// Feature flags that can be gifted individually
export type GiftableFeature =
  | 'autopilot'
  | 'tax_harvesting'
  | 'dynasty_trust'
  | 'family_legacy'
  | 'robo_advisor'
  | 'advanced_charts'
  | 'live_trading'
  | 'bot_marketplace'
  | 'premium_data'
  | 'all';

// Gift record
export interface GiftRecord {
  id: string;
  userId: string;
  userEmail?: string;
  tier: SubscriptionTier;
  features: GiftableFeature[];
  duration: GiftDuration;
  startDate: Date;
  endDate: Date | null; // null = lifetime
  giftedBy: string;
  reason: string;
  status: 'active' | 'expired' | 'revoked';
  createdAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

// Gift request (pending approval)
export interface GiftRequest {
  id: string;
  userId: string;
  userEmail?: string;
  requestedTier: SubscriptionTier;
  requestedFeatures: GiftableFeature[];
  requestedDuration: GiftDuration;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  aiRecommendation?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

// Promotional event
export interface PromoEvent {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  discountPercent: number;
  applicableTiers: SubscriptionTier[];
  giftRecommendation: string;
  isActive: boolean;
}

// Pricing configuration
export interface PricingConfig {
  tiers: Record<SubscriptionTier, {
    monthlyPrice: number;
    annualPrice: number; // 20% discount
    features: string[];
    limits: {
      maxBots: number;
      maxCapital: number;
      maxTrades: number;
    };
  }>;
  perTradeFee: number; // $0.99
  perTradePercent: number; // 0.2% (use whichever is greater)
  cryptoSpread: number; // 0.5%
  performanceFee: number; // 15%
  aumFee: number; // 0.5%
  marketplaceCut: number; // 25%
}

// Chat message for admin bot
export interface ChatMessage {
  id: string;
  role: 'admin' | 'bot';
  content: string;
  timestamp: Date;
  action?: {
    type: 'gift' | 'revoke' | 'approve' | 'deny' | 'list' | 'recommend';
    data?: any;
  };
}

class GiftAccessService extends EventEmitter {
  private gifts: Map<string, GiftRecord> = new Map();
  private requests: Map<string, GiftRequest> = new Map();
  private userGifts: Map<string, string[]> = new Map(); // userId -> giftIds
  private chatHistory: ChatMessage[] = [];

  // Promotional calendar
  private promoEvents: PromoEvent[] = [
    {
      id: 'blackfriday2025',
      name: 'Black Friday 2025',
      description: 'Biggest sale of the year - 50% off all tiers',
      startDate: new Date('2025-11-28'),
      endDate: new Date('2025-12-02'),
      discountPercent: 50,
      applicableTiers: ['STARTER', 'PRO', 'UNLIMITED'],
      giftRecommendation: 'Gift PRO tier to engaged free users - they\'ll likely convert after trial',
      isActive: false,
    },
    {
      id: 'cybermonday2025',
      name: 'Cyber Monday 2025',
      description: 'Extended deals - 40% off annual plans',
      startDate: new Date('2025-12-01'),
      endDate: new Date('2025-12-02'),
      discountPercent: 40,
      applicableTiers: ['STARTER', 'PRO', 'UNLIMITED'],
      giftRecommendation: 'Gift 1-month trials to newsletter subscribers',
      isActive: false,
    },
    {
      id: 'newyear2026',
      name: 'New Year 2026',
      description: 'New Year, New Portfolio - 30% off',
      startDate: new Date('2025-12-26'),
      endDate: new Date('2026-01-07'),
      discountPercent: 30,
      applicableTiers: ['STARTER', 'PRO', 'UNLIMITED'],
      giftRecommendation: 'Gift tax_harvesting feature - tax season prep',
      isActive: false,
    },
    {
      id: 'taxseason2026',
      name: 'Tax Season 2026',
      description: 'Tax-Loss Harvesting special',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-04-15'),
      discountPercent: 25,
      applicableTiers: ['PRO', 'UNLIMITED'],
      giftRecommendation: 'Gift tax_harvesting + dynasty_trust to high-value users',
      isActive: false,
    },
    {
      id: 'summer2026',
      name: 'Summer Trading 2026',
      description: 'Summer sale - 20% off',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      discountPercent: 20,
      applicableTiers: ['STARTER', 'PRO'],
      giftRecommendation: 'Gift paper trading upgrades to students',
      isActive: false,
    },
  ];

  // Current pricing (REVISED - MORE PROFITABLE)
  public pricing: PricingConfig = {
    tiers: {
      FREE: {
        monthlyPrice: 0,
        annualPrice: 0,
        features: ['Paper trading', 'Basic charts', 'Community bots', '5 alerts'],
        limits: { maxBots: 3, maxCapital: 0, maxTrades: 0 },
      },
      STARTER: {
        monthlyPrice: 24.99,
        annualPrice: 239.88, // $19.99/mo billed annually (20% off)
        features: ['Live trading', '1 bot', '$10K capital', 'Basic alerts', 'Email support'],
        limits: { maxBots: 1, maxCapital: 10000, maxTrades: 50 },
      },
      PRO: {
        monthlyPrice: 79,
        annualPrice: 758.40, // $63.20/mo billed annually (20% off)
        features: ['5 bots', '$100K capital', 'Tax harvesting', 'Advanced charts', 'Priority support'],
        limits: { maxBots: 5, maxCapital: 100000, maxTrades: 500 },
      },
      UNLIMITED: {
        monthlyPrice: 149,
        annualPrice: 1430.40, // $119.20/mo billed annually (20% off)
        features: ['Unlimited bots', 'Unlimited capital', 'Dynasty Trust', 'Family Legacy AI', 'AutoPilot', 'Dedicated support'],
        limits: { maxBots: -1, maxCapital: -1, maxTrades: -1 },
      },
      ENTERPRISE: {
        monthlyPrice: 499,
        annualPrice: 4790.40, // $399.20/mo billed annually (20% off)
        features: ['White-label', 'API access', 'Custom strategies', 'Account manager', 'SLA guarantee'],
        limits: { maxBots: -1, maxCapital: -1, maxTrades: -1 },
      },
    },
    perTradeFee: 0.99,
    perTradePercent: 0.002, // 0.2%
    cryptoSpread: 0.005, // 0.5%
    performanceFee: 0.15, // 15%
    aumFee: 0.005, // 0.5%
    marketplaceCut: 0.25, // 25%
  };

  constructor() {
    super();
    this.updatePromoStatus();
    // Check promo status daily
    setInterval(() => this.updatePromoStatus(), 24 * 60 * 60 * 1000);
  }

  // Update which promos are currently active
  private updatePromoStatus(): void {
    const now = new Date();
    for (const promo of this.promoEvents) {
      promo.isActive = now >= promo.startDate && now <= promo.endDate;
    }
  }

  // ============================================================
  // GIFT MANAGEMENT
  // ============================================================

  /**
   * Gift access to a user
   */
  giftAccess(params: {
    userId: string;
    userEmail?: string;
    tier: SubscriptionTier;
    features?: GiftableFeature[];
    duration: GiftDuration;
    giftedBy: string;
    reason: string;
  }): GiftRecord {
    const { userId, userEmail, tier, features = ['all'], duration, giftedBy, reason } = params;

    const now = new Date();
    const endDate = this.calculateEndDate(now, duration);

    const gift: GiftRecord = {
      id: uuidv4(),
      userId,
      userEmail,
      tier,
      features,
      duration,
      startDate: now,
      endDate,
      giftedBy,
      reason,
      status: 'active',
      createdAt: now,
    };

    this.gifts.set(gift.id, gift);

    // Track by user
    const userGiftIds = this.userGifts.get(userId) || [];
    userGiftIds.push(gift.id);
    this.userGifts.set(userId, userGiftIds);

    this.emit('gift:created', gift);
    console.log(`[GiftAccess] Gifted ${tier} to user ${userId} for ${duration}`);

    return gift;
  }

  /**
   * Revoke a gift
   */
  revokeGift(giftId: string, reason: string, revokedBy: string): GiftRecord | null {
    const gift = this.gifts.get(giftId);
    if (!gift) return null;

    gift.status = 'revoked';
    gift.revokedAt = new Date();
    gift.revokedReason = reason;

    this.emit('gift:revoked', gift);
    console.log(`[GiftAccess] Revoked gift ${giftId}: ${reason}`);

    return gift;
  }

  /**
   * Check if user has active gift
   */
  getUserActiveGift(userId: string): GiftRecord | null {
    const giftIds = this.userGifts.get(userId) || [];
    const now = new Date();

    for (const giftId of giftIds) {
      const gift = this.gifts.get(giftId);
      if (gift && gift.status === 'active') {
        // Check if expired
        if (gift.endDate && gift.endDate < now) {
          gift.status = 'expired';
          continue;
        }
        return gift;
      }
    }
    return null;
  }

  /**
   * Get user's effective tier (considering gifts)
   */
  getUserEffectiveTier(userId: string, baseTier: SubscriptionTier = 'FREE'): SubscriptionTier {
    const gift = this.getUserActiveGift(userId);
    if (gift) {
      // Return higher tier
      const tierOrder: SubscriptionTier[] = ['FREE', 'STARTER', 'PRO', 'UNLIMITED', 'ENTERPRISE'];
      const baseIndex = tierOrder.indexOf(baseTier);
      const giftIndex = tierOrder.indexOf(gift.tier);
      return giftIndex > baseIndex ? gift.tier : baseTier;
    }
    return baseTier;
  }

  /**
   * Check if user has specific feature access
   */
  userHasFeature(userId: string, feature: GiftableFeature): boolean {
    const gift = this.getUserActiveGift(userId);
    if (!gift) return false;
    return gift.features.includes('all') || gift.features.includes(feature);
  }

  // ============================================================
  // GIFT REQUESTS (Pending Admin Approval)
  // ============================================================

  /**
   * Create a gift request
   */
  createGiftRequest(params: {
    userId: string;
    userEmail?: string;
    requestedTier: SubscriptionTier;
    requestedFeatures?: GiftableFeature[];
    requestedDuration: GiftDuration;
    reason: string;
  }): GiftRequest {
    const request: GiftRequest = {
      id: uuidv4(),
      userId: params.userId,
      userEmail: params.userEmail,
      requestedTier: params.requestedTier,
      requestedFeatures: params.requestedFeatures || ['all'],
      requestedDuration: params.requestedDuration,
      reason: params.reason,
      status: 'pending',
      aiRecommendation: this.generateAIRecommendation(params),
      createdAt: new Date(),
    };

    this.requests.set(request.id, request);
    this.emit('request:created', request);

    return request;
  }

  /**
   * Approve a gift request
   */
  approveRequest(requestId: string, reviewedBy: string, notes?: string): GiftRecord | null {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = reviewedBy;
    request.reviewNotes = notes;

    // Create the gift
    const gift = this.giftAccess({
      userId: request.userId,
      userEmail: request.userEmail,
      tier: request.requestedTier,
      features: request.requestedFeatures,
      duration: request.requestedDuration,
      giftedBy: reviewedBy,
      reason: request.reason,
    });

    this.emit('request:approved', { request, gift });
    return gift;
  }

  /**
   * Deny a gift request
   */
  denyRequest(requestId: string, reviewedBy: string, notes: string): GiftRequest | null {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'denied';
    request.reviewedAt = new Date();
    request.reviewedBy = reviewedBy;
    request.reviewNotes = notes;

    this.emit('request:denied', request);
    return request;
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): GiftRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'pending');
  }

  // ============================================================
  // AI RECOMMENDATIONS
  // ============================================================

  /**
   * Generate AI recommendation for a gift request
   */
  private generateAIRecommendation(params: {
    userId: string;
    requestedTier: SubscriptionTier;
    requestedDuration: GiftDuration;
    reason: string;
  }): string {
    const { requestedTier, requestedDuration, reason } = params;

    // Simple rule-based recommendations (can be enhanced with real AI)
    const recommendations: string[] = [];

    // Check if there's an active promo
    const activePromo = this.getActivePromos()[0];
    if (activePromo) {
      recommendations.push(`Active promo: ${activePromo.name} - ${activePromo.giftRecommendation}`);
    }

    // Duration recommendations
    if (requestedDuration === 'lifetime') {
      recommendations.push('CAUTION: Lifetime gifts should be rare. Consider 1year instead for high-value users.');
    } else if (requestedDuration === '1week') {
      recommendations.push('1 week trials have 15% conversion rate - good for testing engagement.');
    } else if (requestedDuration === '1month') {
      recommendations.push('1 month trials have 25% conversion rate - recommended for promising users.');
    }

    // Tier recommendations
    if (requestedTier === 'ENTERPRISE') {
      recommendations.push('ENTERPRISE gifts should only go to B2B prospects or major influencers.');
    } else if (requestedTier === 'UNLIMITED') {
      recommendations.push('UNLIMITED tier includes Dynasty Trust ($200+ value) - verify user has substantial assets.');
    }

    // Reason analysis
    if (reason.toLowerCase().includes('influencer')) {
      recommendations.push('APPROVE: Influencer gifts typically return 10x in referrals.');
    } else if (reason.toLowerCase().includes('bug') || reason.toLowerCase().includes('issue')) {
      recommendations.push('APPROVE: Compensation for issues builds loyalty.');
    } else if (reason.toLowerCase().includes('review')) {
      recommendations.push('APPROVE: Reviews are valuable - consider requiring honest review in exchange.');
    }

    return recommendations.join('\n') || 'No specific recommendations. Review manually.';
  }

  /**
   * Get TIME's recommendation for when to gift
   */
  getGiftingRecommendations(): {
    immediate: string[];
    upcoming: PromoEvent[];
    strategic: string[];
  } {
    const now = new Date();
    const activePromos = this.getActivePromos();
    const upcomingPromos = this.promoEvents
      .filter(p => p.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 3);

    return {
      immediate: activePromos.length > 0
        ? [`NOW: ${activePromos[0].name} is active! ${activePromos[0].giftRecommendation}`]
        : ['No active promos. Consider gifting to: engaged free users, recent signups who hit limits, users who reported bugs.'],
      upcoming: upcomingPromos,
      strategic: [
        'Gift PRO trials 1 week before Black Friday - they\'ll be hooked and convert at discount',
        'Gift tax_harvesting in January - tax season creates urgency',
        'Gift dynasty_trust to users with >$100K in assets - huge perceived value',
        'Gift 1-week UNLIMITED to users who hit STARTER limits - shows them what they\'re missing',
        'Gift to social media mentions of TIME - reward organic advocacy',
      ],
    };
  }

  // ============================================================
  // ADMIN CHATBOT
  // ============================================================

  /**
   * Process admin chat message and return bot response
   */
  async processAdminChat(message: string, adminId: string): Promise<ChatMessage> {
    const adminMsg: ChatMessage = {
      id: uuidv4(),
      role: 'admin',
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(adminMsg);

    // Parse intent
    const lowerMsg = message.toLowerCase();
    let response: ChatMessage;

    if (lowerMsg.includes('gift') && (lowerMsg.includes('user') || lowerMsg.includes('@'))) {
      response = await this.handleGiftCommand(message, adminId);
    } else if (lowerMsg.includes('revoke')) {
      response = await this.handleRevokeCommand(message, adminId);
    } else if (lowerMsg.includes('list') || lowerMsg.includes('show')) {
      response = await this.handleListCommand(message);
    } else if (lowerMsg.includes('pending') || lowerMsg.includes('approve') || lowerMsg.includes('deny')) {
      response = await this.handleRequestCommand(message, adminId);
    } else if (lowerMsg.includes('recommend') || lowerMsg.includes('when') || lowerMsg.includes('promo')) {
      response = await this.handleRecommendCommand();
    } else if (lowerMsg.includes('pricing') || lowerMsg.includes('price') || lowerMsg.includes('tier')) {
      response = await this.handlePricingCommand();
    } else if (lowerMsg.includes('help')) {
      response = this.getHelpResponse();
    } else {
      response = this.getDefaultResponse(message);
    }

    this.chatHistory.push(response);
    return response;
  }

  private async handleGiftCommand(message: string, adminId: string): Promise<ChatMessage> {
    // Parse: "gift PRO to user123 for 1month because early supporter"
    const tierMatch = message.match(/gift\s+(FREE|STARTER|PRO|UNLIMITED|ENTERPRISE)/i);
    const userMatch = message.match(/(?:to|user)\s+([a-zA-Z0-9@._-]+)/i);
    const durationMatch = message.match(/for\s+(1week|1month|3months|6months|1year|lifetime)/i);
    const reasonMatch = message.match(/(?:because|reason:|for:)\s+(.+)/i);

    if (!tierMatch || !userMatch) {
      return {
        id: uuidv4(),
        role: 'bot',
        content: `I couldn't parse that gift command. Try: "gift PRO to user@email.com for 1month because early supporter"

Available tiers: FREE, STARTER, PRO, UNLIMITED, ENTERPRISE
Available durations: 1week, 1month, 3months, 6months, 1year, lifetime`,
        timestamp: new Date(),
      };
    }

    const tier = tierMatch[1].toUpperCase() as SubscriptionTier;
    const userId = userMatch[1];
    const duration = (durationMatch?.[1] || '1month') as GiftDuration;
    const reason = reasonMatch?.[1] || 'Admin gift';

    const gift = this.giftAccess({
      userId,
      tier,
      duration,
      giftedBy: adminId,
      reason,
    });

    return {
      id: uuidv4(),
      role: 'bot',
      content: `✅ Gift created successfully!

**Gift ID:** ${gift.id}
**User:** ${userId}
**Tier:** ${tier}
**Duration:** ${duration}
**Expires:** ${gift.endDate ? gift.endDate.toLocaleDateString() : 'Never (Lifetime)'}
**Reason:** ${reason}

The user now has ${tier} access. They'll see this immediately on their next page load.`,
      timestamp: new Date(),
      action: { type: 'gift', data: gift },
    };
  }

  private async handleRevokeCommand(message: string, adminId: string): Promise<ChatMessage> {
    // Parse: "revoke gift123 because abuse"
    const giftMatch = message.match(/revoke\s+([a-zA-Z0-9-]+)/i);
    const reasonMatch = message.match(/(?:because|reason:)\s+(.+)/i);

    if (!giftMatch) {
      return {
        id: uuidv4(),
        role: 'bot',
        content: 'Please specify a gift ID to revoke. Example: "revoke abc123 because terms violation"',
        timestamp: new Date(),
      };
    }

    const giftId = giftMatch[1];
    const reason = reasonMatch?.[1] || 'Admin revoked';

    const gift = this.revokeGift(giftId, reason, adminId);

    if (!gift) {
      return {
        id: uuidv4(),
        role: 'bot',
        content: `Gift ID "${giftId}" not found. Use "list gifts" to see all active gifts.`,
        timestamp: new Date(),
      };
    }

    return {
      id: uuidv4(),
      role: 'bot',
      content: `✅ Gift revoked!

**Gift ID:** ${gift.id}
**User:** ${gift.userId}
**Was:** ${gift.tier} until ${gift.endDate?.toLocaleDateString() || 'lifetime'}
**Revoked because:** ${reason}

User access has been downgraded immediately.`,
      timestamp: new Date(),
      action: { type: 'revoke', data: gift },
    };
  }

  private async handleListCommand(message: string): Promise<ChatMessage> {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('gift')) {
      const activeGifts = Array.from(this.gifts.values()).filter(g => g.status === 'active');

      if (activeGifts.length === 0) {
        return {
          id: uuidv4(),
          role: 'bot',
          content: 'No active gifts found. Use "gift [tier] to [user] for [duration]" to create one.',
          timestamp: new Date(),
        };
      }

      const giftList = activeGifts.map(g =>
        `• **${g.userId}** - ${g.tier} (${g.duration}) - expires ${g.endDate?.toLocaleDateString() || 'never'}`
      ).join('\n');

      return {
        id: uuidv4(),
        role: 'bot',
        content: `**Active Gifts (${activeGifts.length}):**\n\n${giftList}`,
        timestamp: new Date(),
        action: { type: 'list', data: activeGifts },
      };
    }

    if (lowerMsg.includes('request') || lowerMsg.includes('pending')) {
      const pending = this.getPendingRequests();

      if (pending.length === 0) {
        return {
          id: uuidv4(),
          role: 'bot',
          content: 'No pending gift requests. All caught up! 🎉',
          timestamp: new Date(),
        };
      }

      const requestList = pending.map(r =>
        `• **${r.id.slice(0, 8)}** - ${r.userId} wants ${r.requestedTier} for ${r.requestedDuration}\n  Reason: ${r.reason}\n  AI says: ${r.aiRecommendation?.split('\n')[0] || 'Review manually'}`
      ).join('\n\n');

      return {
        id: uuidv4(),
        role: 'bot',
        content: `**Pending Requests (${pending.length}):**\n\n${requestList}\n\nUse "approve [id]" or "deny [id] because [reason]" to process.`,
        timestamp: new Date(),
        action: { type: 'list', data: pending },
      };
    }

    return {
      id: uuidv4(),
      role: 'bot',
      content: 'What would you like to list? Try "list gifts" or "list pending requests".',
      timestamp: new Date(),
    };
  }

  private async handleRequestCommand(message: string, adminId: string): Promise<ChatMessage> {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('approve')) {
      const idMatch = message.match(/approve\s+([a-zA-Z0-9-]+)/i);
      if (!idMatch) {
        return {
          id: uuidv4(),
          role: 'bot',
          content: 'Please specify a request ID. Example: "approve abc123"',
          timestamp: new Date(),
        };
      }

      // Find request by partial ID
      const requestId = idMatch[1];
      const request = Array.from(this.requests.values()).find(r =>
        r.id.startsWith(requestId) && r.status === 'pending'
      );

      if (!request) {
        return {
          id: uuidv4(),
          role: 'bot',
          content: `No pending request found starting with "${requestId}". Use "list pending" to see all.`,
          timestamp: new Date(),
        };
      }

      const gift = this.approveRequest(request.id, adminId);

      return {
        id: uuidv4(),
        role: 'bot',
        content: `✅ Request approved!

**User:** ${request.userId}
**Granted:** ${request.requestedTier} for ${request.requestedDuration}
**Reason:** ${request.reason}

Gift is now active.`,
        timestamp: new Date(),
        action: { type: 'approve', data: { request, gift } },
      };
    }

    if (lowerMsg.includes('deny')) {
      const idMatch = message.match(/deny\s+([a-zA-Z0-9-]+)/i);
      const reasonMatch = message.match(/(?:because|reason:)\s+(.+)/i);

      if (!idMatch) {
        return {
          id: uuidv4(),
          role: 'bot',
          content: 'Please specify a request ID. Example: "deny abc123 because not eligible"',
          timestamp: new Date(),
        };
      }

      const requestId = idMatch[1];
      const reason = reasonMatch?.[1] || 'Request denied by admin';

      const request = Array.from(this.requests.values()).find(r =>
        r.id.startsWith(requestId) && r.status === 'pending'
      );

      if (!request) {
        return {
          id: uuidv4(),
          role: 'bot',
          content: `No pending request found starting with "${requestId}".`,
          timestamp: new Date(),
        };
      }

      this.denyRequest(request.id, adminId, reason);

      return {
        id: uuidv4(),
        role: 'bot',
        content: `❌ Request denied.

**User:** ${request.userId}
**Requested:** ${request.requestedTier}
**Denied because:** ${reason}`,
        timestamp: new Date(),
        action: { type: 'deny', data: request },
      };
    }

    return {
      id: uuidv4(),
      role: 'bot',
      content: 'Use "approve [id]" or "deny [id] because [reason]" to process requests.',
      timestamp: new Date(),
    };
  }

  private async handleRecommendCommand(): Promise<ChatMessage> {
    const recs = this.getGiftingRecommendations();

    let content = '**🎁 TIME Gift Recommendations**\n\n';

    content += '**Right Now:**\n';
    content += recs.immediate.map(r => `• ${r}`).join('\n');

    content += '\n\n**Upcoming Promos:**\n';
    if (recs.upcoming.length > 0) {
      content += recs.upcoming.map(p =>
        `• **${p.name}** (${p.startDate.toLocaleDateString()} - ${p.endDate.toLocaleDateString()})\n  ${p.discountPercent}% off - ${p.giftRecommendation}`
      ).join('\n\n');
    } else {
      content += '• No upcoming promos scheduled';
    }

    content += '\n\n**Strategic Tips:**\n';
    content += recs.strategic.map(s => `• ${s}`).join('\n');

    return {
      id: uuidv4(),
      role: 'bot',
      content,
      timestamp: new Date(),
      action: { type: 'recommend', data: recs },
    };
  }

  private async handlePricingCommand(): Promise<ChatMessage> {
    const p = this.pricing;

    let content = '**💰 TIME Pricing (Revised for Profit)**\n\n';

    content += '**Subscription Tiers:**\n';
    for (const [tier, config] of Object.entries(p.tiers)) {
      content += `• **${tier}:** $${config.monthlyPrice}/mo ($${(config.annualPrice / 12).toFixed(2)}/mo annual)\n`;
      content += `  Limits: ${config.limits.maxBots === -1 ? 'Unlimited' : config.limits.maxBots} bots, $${config.limits.maxCapital === -1 ? 'Unlimited' : config.limits.maxCapital.toLocaleString()} capital\n`;
    }

    content += '\n**Transaction Fees:**\n';
    content += `• Per-trade: $${p.perTradeFee} or ${(p.perTradePercent * 100).toFixed(1)}% (whichever is greater)\n`;
    content += `• Crypto spread: ${(p.cryptoSpread * 100).toFixed(1)}%\n`;
    content += `• Performance fee: ${(p.performanceFee * 100)}% of profits\n`;
    content += `• AUM fee: ${(p.aumFee * 100).toFixed(1)}% annually\n`;
    content += `• Marketplace cut: ${(p.marketplaceCut * 100)}%\n`;

    content += '\n**vs Competition:**\n';
    content += '• 3Commas: $29-99/mo (we have more features)\n';
    content += '• Cryptohopper: $19-99/mo (we trade all markets)\n';
    content += '• Wealthfront: 0.25% AUM (we have Dynasty Trust)\n';

    return {
      id: uuidv4(),
      role: 'bot',
      content,
      timestamp: new Date(),
    };
  }

  private getHelpResponse(): ChatMessage {
    return {
      id: uuidv4(),
      role: 'bot',
      content: `**🤖 Gift Access Bot Commands**

**Gifting:**
• \`gift PRO to user@email.com for 1month because early supporter\`
• \`gift UNLIMITED to user123 for lifetime because investor\`

**Managing:**
• \`list gifts\` - Show all active gifts
• \`list pending\` - Show pending requests
• \`revoke [giftId] because [reason]\`

**Requests:**
• \`approve [requestId]\`
• \`deny [requestId] because [reason]\`

**Info:**
• \`recommend\` - Get gift timing recommendations
• \`pricing\` - Show current pricing structure
• \`help\` - This message

**Tiers:** FREE, STARTER, PRO, UNLIMITED, ENTERPRISE
**Durations:** 1week, 1month, 3months, 6months, 1year, lifetime`,
      timestamp: new Date(),
    };
  }

  private getDefaultResponse(message: string): ChatMessage {
    return {
      id: uuidv4(),
      role: 'bot',
      content: `I'm not sure what you mean by "${message}".

Try:
• "gift PRO to user@email.com for 1month"
• "list gifts"
• "recommend"
• "help" for all commands`,
      timestamp: new Date(),
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private calculateEndDate(startDate: Date, duration: GiftDuration): Date | null {
    if (duration === 'lifetime') return null;

    const endDate = new Date(startDate);
    switch (duration) {
      case '1week': endDate.setDate(endDate.getDate() + 7); break;
      case '1month': endDate.setMonth(endDate.getMonth() + 1); break;
      case '3months': endDate.setMonth(endDate.getMonth() + 3); break;
      case '6months': endDate.setMonth(endDate.getMonth() + 6); break;
      case '1year': endDate.setFullYear(endDate.getFullYear() + 1); break;
    }
    return endDate;
  }

  getActivePromos(): PromoEvent[] {
    return this.promoEvents.filter(p => p.isActive);
  }

  getUpcomingPromos(): PromoEvent[] {
    const now = new Date();
    return this.promoEvents.filter(p => p.startDate > now);
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  clearChatHistory(): void {
    this.chatHistory = [];
  }

  getAllGifts(): GiftRecord[] {
    return Array.from(this.gifts.values());
  }

  getStats(): {
    totalGifts: number;
    activeGifts: number;
    expiredGifts: number;
    revokedGifts: number;
    pendingRequests: number;
    tierBreakdown: Record<SubscriptionTier, number>;
  } {
    const gifts = Array.from(this.gifts.values());
    const tierBreakdown: Record<SubscriptionTier, number> = {
      FREE: 0, STARTER: 0, PRO: 0, UNLIMITED: 0, ENTERPRISE: 0
    };

    for (const gift of gifts) {
      if (gift.status === 'active') {
        tierBreakdown[gift.tier]++;
      }
    }

    return {
      totalGifts: gifts.length,
      activeGifts: gifts.filter(g => g.status === 'active').length,
      expiredGifts: gifts.filter(g => g.status === 'expired').length,
      revokedGifts: gifts.filter(g => g.status === 'revoked').length,
      pendingRequests: this.getPendingRequests().length,
      tierBreakdown,
    };
  }
}

// Export singleton
export const giftAccessService = new GiftAccessService();
export default GiftAccessService;
