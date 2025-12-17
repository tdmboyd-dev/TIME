/**
 * TIME — Meta-Intelligence Trading Governor
 * Bot Rental Marketplace
 *
 * Industry-standard bot rental system:
 * - Auto-rental with daily/weekly/monthly rates
 * - Manual rental with approval
 * - Revenue sharing with bot creators
 * - Performance-based pricing
 * - Rental history and reviews
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';

const log = loggers.api;

// ==========================================
// TYPES
// ==========================================

export interface RentalPlan {
  id: string;
  name: string;
  duration: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priceUsd: number;
  discount?: number; // Percentage discount for longer terms
  features: string[];
}

// Industry-standard hosting fees for bot creators
export interface HostingPlan {
  id: string;
  name: string;
  duration: 'monthly' | 'yearly';
  priceUsd: number;
  features: string[];
  limits: {
    maxBots: number;
    maxConcurrentRentals: number;
    apiCallsPerDay: number;
    storageGb: number;
  };
}

export const HOSTING_PLANS: HostingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    duration: 'monthly',
    priceUsd: 9.99,
    features: [
      'List up to 3 bots',
      '100 rentals/month',
      'Basic analytics',
      'Email support',
    ],
    limits: {
      maxBots: 3,
      maxConcurrentRentals: 10,
      apiCallsPerDay: 1000,
      storageGb: 1,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    duration: 'monthly',
    priceUsd: 29.99,
    features: [
      'List up to 10 bots',
      'Unlimited rentals',
      'Advanced analytics',
      'Priority support',
      'Custom pricing',
      'API access',
    ],
    limits: {
      maxBots: 10,
      maxConcurrentRentals: 100,
      apiCallsPerDay: 10000,
      storageGb: 5,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    duration: 'monthly',
    priceUsd: 99.99,
    features: [
      'Unlimited bots',
      'Unlimited rentals',
      'Real-time analytics',
      'Dedicated support',
      'White-label option',
      'Custom integrations',
      'Revenue boost program',
    ],
    limits: {
      maxBots: -1, // Unlimited
      maxConcurrentRentals: -1,
      apiCallsPerDay: 100000,
      storageGb: 50,
    },
  },
];

export interface BotListing {
  botId: string;
  botName: string;
  ownerId: string | null; // null for TIME-owned bots
  description: string;
  category: 'crypto' | 'forex' | 'stocks' | 'options' | 'multi-asset';
  strategy: string;

  // Performance Metrics (REAL)
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  avgMonthlyReturn: number;

  // Pricing
  rentalPlans: RentalPlan[];
  performanceFee: number; // % of profits

  // Metadata
  rating: number;
  totalRentals: number;
  reviews: BotReview[];
  isAutoRental: boolean; // Auto-approve rentals
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotRental {
  id: string;
  botId: string;
  renterId: string;
  planId: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended';

  // Dates
  startDate: Date;
  endDate: Date;
  createdAt: Date;

  // Payment
  amountPaid: number;
  paymentMethod: string;
  transactionId: string;

  // Performance during rental
  pnlDuringRental: number;
  tradesDuringRental: number;

  // Revenue split
  platformFee: number; // TIME takes 20%
  ownerShare: number; // Bot owner gets 80%
}

export interface BotReview {
  id: string;
  botId: string;
  reviewerId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  rentalId: string;
  helpful: number;
  createdAt: Date;
}

export interface RentalStats {
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  platformEarnings: number;
  ownerPayouts: number;
  avgRentalDuration: number;
  popularBots: { botId: string; rentals: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

// ==========================================
// RENTAL PLAN TEMPLATES
// ==========================================

export const STANDARD_RENTAL_PLANS: RentalPlan[] = [
  {
    id: 'daily',
    name: 'Daily Trial',
    duration: 'daily',
    priceUsd: 5,
    features: [
      'Full bot access for 24 hours',
      'Paper trading mode',
      'Basic support',
    ],
  },
  {
    id: 'weekly',
    name: 'Weekly Starter',
    duration: 'weekly',
    priceUsd: 25,
    discount: 10,
    features: [
      'Full bot access for 7 days',
      'Live trading enabled',
      'Email support',
      'Performance reports',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    duration: 'monthly',
    priceUsd: 79,
    discount: 20,
    features: [
      'Full bot access for 30 days',
      'Live trading enabled',
      'Priority support',
      'Custom parameters',
      'Real-time alerts',
      'Performance analytics',
    ],
  },
  {
    id: 'yearly',
    name: 'Annual Elite',
    duration: 'yearly',
    priceUsd: 599,
    discount: 40,
    features: [
      'Full bot access for 365 days',
      'Live trading enabled',
      'VIP support',
      'All customizations',
      'API access',
      'Strategy export',
      'Free upgrades',
    ],
  },
];

// ==========================================
// BOT MARKETPLACE SERVICE
// ==========================================

export class BotMarketplace extends EventEmitter {
  private listings: Map<string, BotListing> = new Map();
  private rentals: Map<string, BotRental> = new Map();
  private reviews: Map<string, BotReview[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultListings();
  }

  /**
   * Initialize default bot listings from absorbed bots
   */
  private initializeDefaultListings(): void {
    // These will be populated from BotManager
    log.info('Bot Marketplace initialized');
  }

  /**
   * List a bot for rental
   */
  public listBot(
    botId: string,
    botName: string,
    ownerId: string | null,
    config: {
      description: string;
      category: BotListing['category'];
      strategy: string;
      winRate: number;
      profitFactor: number;
      sharpeRatio: number;
      maxDrawdown: number;
      totalTrades: number;
      avgMonthlyReturn: number;
      performanceFee?: number;
      isAutoRental?: boolean;
      customPlans?: RentalPlan[];
    }
  ): BotListing {
    const listing: BotListing = {
      botId,
      botName,
      ownerId,
      description: config.description,
      category: config.category,
      strategy: config.strategy,
      winRate: config.winRate,
      profitFactor: config.profitFactor,
      sharpeRatio: config.sharpeRatio,
      maxDrawdown: config.maxDrawdown,
      totalTrades: config.totalTrades,
      avgMonthlyReturn: config.avgMonthlyReturn,
      rentalPlans: config.customPlans || STANDARD_RENTAL_PLANS,
      performanceFee: config.performanceFee || 20, // 20% of profits
      rating: 0,
      totalRentals: 0,
      reviews: [],
      isAutoRental: config.isAutoRental ?? true,
      isVerified: ownerId === null, // TIME-owned bots are auto-verified
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.listings.set(botId, listing);
    this.emit('bot-listed', listing);
    log.info(`Bot listed for rental: ${botName} (${botId})`);

    return listing;
  }

  /**
   * Rent a bot
   */
  public async rentBot(
    botId: string,
    renterId: string,
    planId: string,
    paymentDetails: {
      paymentMethod: string;
      transactionId: string;
    }
  ): Promise<BotRental> {
    const listing = this.listings.get(botId);
    if (!listing) {
      throw new Error(`Bot ${botId} not found in marketplace`);
    }

    const plan = listing.rentalPlans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found for bot ${botId}`);
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    switch (plan.duration) {
      case 'daily':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    // Calculate revenue split (TIME: 20%, Owner: 80%)
    const platformFee = plan.priceUsd * 0.20;
    const ownerShare = plan.priceUsd * 0.80;

    const rental: BotRental = {
      id: uuidv4(),
      botId,
      renterId,
      planId,
      status: listing.isAutoRental ? 'active' : 'pending',
      startDate,
      endDate,
      createdAt: new Date(),
      amountPaid: plan.priceUsd,
      paymentMethod: paymentDetails.paymentMethod,
      transactionId: paymentDetails.transactionId,
      pnlDuringRental: 0,
      tradesDuringRental: 0,
      platformFee,
      ownerShare,
    };

    this.rentals.set(rental.id, rental);

    // Update listing stats
    listing.totalRentals++;
    listing.updatedAt = new Date();
    this.listings.set(botId, listing);

    this.emit('bot-rented', rental);
    log.info(`Bot rented: ${listing.botName} by user ${renterId} (${plan.name})`);

    return rental;
  }

  /**
   * Get active rentals for a user
   */
  public getUserRentals(userId: string): BotRental[] {
    return Array.from(this.rentals.values())
      .filter(r => r.renterId === userId);
  }

  /**
   * Get active rentals for a bot
   */
  public getBotRentals(botId: string): BotRental[] {
    return Array.from(this.rentals.values())
      .filter(r => r.botId === botId && r.status === 'active');
  }

  /**
   * Check if user has active rental for bot
   */
  public hasActiveRental(userId: string, botId: string): boolean {
    const now = new Date();
    return Array.from(this.rentals.values()).some(
      r => r.renterId === userId &&
           r.botId === botId &&
           r.status === 'active' &&
           r.endDate > now
    );
  }

  /**
   * Get all marketplace listings
   */
  public getAllListings(filters?: {
    category?: BotListing['category'];
    minWinRate?: number;
    maxPrice?: number;
    verified?: boolean;
  }): BotListing[] {
    let listings = Array.from(this.listings.values());

    if (filters) {
      if (filters.category) {
        listings = listings.filter(l => l.category === filters.category);
      }
      if (filters.minWinRate) {
        listings = listings.filter(l => l.winRate >= filters.minWinRate!);
      }
      if (filters.maxPrice) {
        listings = listings.filter(l =>
          l.rentalPlans.some(p => p.priceUsd <= filters.maxPrice!)
        );
      }
      if (filters.verified !== undefined) {
        listings = listings.filter(l => l.isVerified === filters.verified);
      }
    }

    // Sort by rating and rentals
    return listings.sort((a, b) =>
      (b.rating * b.totalRentals) - (a.rating * a.totalRentals)
    );
  }

  /**
   * Add review to bot
   */
  public addReview(
    botId: string,
    reviewerId: string,
    rentalId: string,
    review: {
      rating: number;
      title: string;
      content: string;
    }
  ): BotReview {
    const listing = this.listings.get(botId);
    if (!listing) {
      throw new Error(`Bot ${botId} not found`);
    }

    const botReview: BotReview = {
      id: uuidv4(),
      botId,
      reviewerId,
      rating: Math.min(5, Math.max(1, review.rating)),
      title: review.title,
      content: review.content,
      rentalId,
      helpful: 0,
      createdAt: new Date(),
    };

    listing.reviews.push(botReview);

    // Recalculate average rating
    const totalRating = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
    listing.rating = totalRating / listing.reviews.length;
    listing.updatedAt = new Date();

    this.listings.set(botId, listing);
    this.emit('review-added', botReview);
    log.info(`Review added for bot ${botId}: ${review.rating}/5`);

    return botReview;
  }

  /**
   * Get marketplace statistics
   */
  public getStats(): RentalStats {
    const rentals = Array.from(this.rentals.values());
    const activeRentals = rentals.filter(r => r.status === 'active');

    // Revenue calculations
    const totalRevenue = rentals.reduce((sum, r) => sum + r.amountPaid, 0);
    const platformEarnings = rentals.reduce((sum, r) => sum + r.platformFee, 0);
    const ownerPayouts = rentals.reduce((sum, r) => sum + r.ownerShare, 0);

    // Average rental duration
    const completedRentals = rentals.filter(r => r.status !== 'pending');
    const avgDuration = completedRentals.length > 0
      ? completedRentals.reduce((sum, r) => {
          const duration = r.endDate.getTime() - r.startDate.getTime();
          return sum + duration / (1000 * 60 * 60 * 24);
        }, 0) / completedRentals.length
      : 0;

    // Popular bots
    const rentalCounts: Record<string, number> = {};
    for (const rental of rentals) {
      rentalCounts[rental.botId] = (rentalCounts[rental.botId] || 0) + 1;
    }
    const popularBots = Object.entries(rentalCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([botId, rentalsCount]) => ({ botId, rentals: rentalsCount }));

    // Revenue by month
    const revenueByMonth: Record<string, number> = {};
    for (const rental of rentals) {
      const month = rental.createdAt.toISOString().slice(0, 7); // YYYY-MM
      revenueByMonth[month] = (revenueByMonth[month] || 0) + rental.amountPaid;
    }
    const revenueArray = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));

    return {
      totalRentals: rentals.length,
      activeRentals: activeRentals.length,
      totalRevenue,
      platformEarnings,
      ownerPayouts,
      avgRentalDuration: avgDuration,
      popularBots,
      revenueByMonth: revenueArray,
    };
  }

  /**
   * Update rental performance during rental period
   */
  public updateRentalPerformance(rentalId: string, pnl: number, trades: number): void {
    const rental = this.rentals.get(rentalId);
    if (rental) {
      rental.pnlDuringRental += pnl;
      rental.tradesDuringRental += trades;
      this.rentals.set(rentalId, rental);
    }
  }

  /**
   * Expire old rentals
   */
  public expireOldRentals(): number {
    const now = new Date();
    let expiredCount = 0;

    for (const [id, rental] of this.rentals) {
      if (rental.status === 'active' && rental.endDate < now) {
        rental.status = 'expired';
        this.rentals.set(id, rental);
        this.emit('rental-expired', rental);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      log.info(`Expired ${expiredCount} rentals`);
    }

    return expiredCount;
  }

  /**
   * Calculate performance fee for rental
   */
  public calculatePerformanceFee(rentalId: string): number {
    const rental = this.rentals.get(rentalId);
    if (!rental || rental.pnlDuringRental <= 0) return 0;

    const listing = this.listings.get(rental.botId);
    if (!listing) return 0;

    return rental.pnlDuringRental * (listing.performanceFee / 100);
  }
}

// Singleton instance
export const botMarketplace = new BotMarketplace();
