/**
 * TIME Tokenized Assets Engine
 *
 * Fractional ownership of real-world and digital assets through tokenization.
 * Democratizes access to expensive assets - own $10 of Tesla stock, real estate, or art.
 *
 * Features:
 * - Fractional shares of stocks, ETFs, commodities
 * - Real estate tokenization (REITs on-chain)
 * - Art and collectibles fractional ownership
 * - Commodities (gold, silver, oil) tokenized
 * - Automatic dividend/yield distribution
 * - Secondary market for trading fractions
 * - Regulatory compliance (SEC, MAS, FCA)
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AssetClass =
  | 'stocks'
  | 'etfs'
  | 'real_estate'
  | 'commodities'
  | 'art'
  | 'collectibles'
  | 'private_equity'
  | 'bonds'
  | 'crypto_index';

export type TokenStandard = 'ERC-20' | 'ERC-1400' | 'ERC-3643' | 'ST-20';

export type ComplianceFramework = 'SEC' | 'MAS' | 'FCA' | 'MiCA' | 'VARA';

export interface TokenizedAsset {
  id: string;
  symbol: string;
  name: string;
  description: string;
  assetClass: AssetClass;

  // Underlying asset details
  underlying: {
    type: string;
    identifier: string; // CUSIP, ISIN, address, etc.
    custodian: string;
    verificationUrl?: string;
  };

  // Token details
  token: {
    standard: TokenStandard;
    contractAddress: string;
    chain: string;
    totalSupply: number;
    decimals: number;
  };

  // Pricing
  pricing: {
    pricePerToken: number;
    currency: string;
    lastUpdated: Date;
    nav: number; // Net Asset Value
    premium: number; // % above/below NAV
  };

  // Fractional details
  fractional: {
    minimumInvestment: number;
    minimumTrade: number;
    maxOwnershipPercent: number;
  };

  // Yield/dividend info
  yield: {
    annualYield: number;
    distributionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    lastDistribution?: Date;
    nextDistribution?: Date;
  };

  // Compliance
  compliance: {
    frameworks: ComplianceFramework[];
    accreditedOnly: boolean;
    jurisdictions: string[];
    kycRequired: boolean;
    transferRestrictions: string[];
  };

  // Stats
  stats: {
    holders: number;
    marketCap: number;
    volume24h: number;
    allTimeHigh: number;
    allTimeLow: number;
  };

  status: 'active' | 'paused' | 'delisted';
  createdAt: Date;
}

export interface FractionalPosition {
  id: string;
  userId: string;
  assetId: string;

  // Holdings
  tokenAmount: number;
  ownershipPercent: number;
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;

  // Yield tracking
  totalYieldReceived: number;
  pendingYield: number;
  yieldReinvested: boolean;

  // Transactions
  transactions: FractionalTransaction[];

  acquiredAt: Date;
  lastUpdated: Date;
}

export interface FractionalTransaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'reinvest' | 'transfer_in' | 'transfer_out';
  assetId: string;
  tokenAmount: number;
  pricePerToken: number;
  totalValue: number;
  fees: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

export interface MarketOrder {
  id: string;
  userId: string;
  assetId: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop_loss';

  // Order details
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;

  // Execution
  filledQuantity: number;
  avgFillPrice: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired';

  // Timing
  createdAt: Date;
  expiresAt?: Date;
  filledAt?: Date;
}

export interface RealEstateToken extends TokenizedAsset {
  property: {
    address: string;
    type: 'residential' | 'commercial' | 'industrial' | 'mixed_use' | 'land';
    sqft: number;
    units?: number;
    yearBuilt: number;
    occupancyRate: number;
    appraisalValue: number;
    appraisalDate: Date;
  };
  rental: {
    monthlyRent: number;
    annualNOI: number; // Net Operating Income
    capRate: number;
    managementFee: number;
  };
}

export interface ArtToken extends TokenizedAsset {
  artwork: {
    artist: string;
    title: string;
    year: number;
    medium: string;
    dimensions: string;
    provenance: string;
    condition: string;
    appraisalValue: number;
    insuredValue: number;
    location: string; // Storage facility
  };
}

export interface CommodityToken extends TokenizedAsset {
  commodity: {
    type: 'gold' | 'silver' | 'platinum' | 'palladium' | 'oil' | 'natural_gas';
    purity?: string; // For metals
    weight?: number; // In troy ounces or barrels
    custodian: string;
    auditCertificate: string;
    deliverable: boolean;
  };
}

export interface Portfolio {
  userId: string;
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;

  allocation: {
    assetClass: AssetClass;
    value: number;
    percent: number;
  }[];

  positions: FractionalPosition[];
  pendingOrders: MarketOrder[];

  // Yield summary
  yieldSummary: {
    totalReceived: number;
    pending: number;
    projectedAnnual: number;
  };

  lastUpdated: Date;
}

export interface AssetListing {
  asset: TokenizedAsset;
  orderBook: {
    bids: { price: number; quantity: number }[];
    asks: { price: number; quantity: number }[];
    spread: number;
    spreadPercent: number;
  };
  recentTrades: {
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    timestamp: Date;
  }[];
}

// ============================================================================
// Tokenized Assets Manager
// ============================================================================

export class TokenizedAssetsManager extends EventEmitter {
  private assets: Map<string, TokenizedAsset> = new Map();
  private positions: Map<string, FractionalPosition[]> = new Map();
  private orders: Map<string, MarketOrder[]> = new Map();
  private orderBook: Map<string, { bids: MarketOrder[]; asks: MarketOrder[] }> = new Map();

  // Asset custodians/issuers we integrate with
  private readonly ISSUERS = {
    stocks: ['Securitize', 'tZERO', 'INX', 'Polymath'],
    realEstate: ['RealT', 'Lofty', 'Fundrise', 'Republic'],
    art: ['Masterworks', 'Maecenas', 'Artory'],
    commodities: ['Paxos Gold', 'Tether Gold', 'Perth Mint Gold'],
    privateEquity: ['Republic', 'AngelList', 'EquityZen'],
  };

  // Compliance requirements by jurisdiction
  private readonly COMPLIANCE_REQUIREMENTS: Record<ComplianceFramework, {
    kycLevel: 'basic' | 'enhanced' | 'accredited';
    maxInvestment?: number;
    holdingPeriod?: number;
    transferRestrictions: string[];
  }> = {
    SEC: {
      kycLevel: 'enhanced',
      holdingPeriod: 365, // Reg D 1-year holding
      transferRestrictions: ['US persons', 'Accredited investors for certain assets'],
    },
    MAS: {
      kycLevel: 'enhanced',
      maxInvestment: 200000, // SGD for retail
      transferRestrictions: ['Singapore residents'],
    },
    FCA: {
      kycLevel: 'basic',
      transferRestrictions: ['UK residents', 'Professional investors for certain assets'],
    },
    MiCA: {
      kycLevel: 'basic',
      transferRestrictions: ['EU residents'],
    },
    VARA: {
      kycLevel: 'enhanced',
      transferRestrictions: ['UAE residents', 'Licensed entities'],
    },
  };

  constructor() {
    super();
    this.initializeSampleAssets();
    this.startPriceUpdates();
    this.startYieldDistribution();
  }

  // ============================================================================
  // Asset Management
  // ============================================================================

  /**
   * List a new tokenized asset
   */
  async listAsset(asset: Omit<TokenizedAsset, 'id' | 'createdAt' | 'stats'>): Promise<TokenizedAsset> {
    const id = `ASSET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newAsset: TokenizedAsset = {
      ...asset,
      id,
      stats: {
        holders: 0,
        marketCap: asset.pricing.pricePerToken * asset.token.totalSupply,
        volume24h: 0,
        allTimeHigh: asset.pricing.pricePerToken,
        allTimeLow: asset.pricing.pricePerToken,
      },
      createdAt: new Date(),
    };

    this.assets.set(id, newAsset);
    this.orderBook.set(id, { bids: [], asks: [] });

    this.emit('assetListed', newAsset);
    console.log(`[TokenizedAssets] Listed: ${newAsset.name} (${newAsset.symbol})`);

    return newAsset;
  }

  /**
   * Get all available assets with optional filtering
   */
  getAssets(filters?: {
    assetClass?: AssetClass;
    minYield?: number;
    maxPrice?: number;
    jurisdiction?: string;
  }): TokenizedAsset[] {
    let assets = Array.from(this.assets.values()).filter(a => a.status === 'active');

    if (filters?.assetClass) {
      assets = assets.filter(a => a.assetClass === filters.assetClass);
    }

    if (filters?.minYield !== undefined) {
      assets = assets.filter(a => a.yield.annualYield >= (filters.minYield as number));
    }

    if (filters?.maxPrice !== undefined) {
      assets = assets.filter(a => a.fractional.minimumInvestment <= (filters.maxPrice as number));
    }

    if (filters?.jurisdiction) {
      assets = assets.filter(a =>
        a.compliance.jurisdictions.includes(filters.jurisdiction as string)
      );
    }

    return assets;
  }

  /**
   * Get asset details with order book
   */
  getAssetListing(assetId: string): AssetListing | null {
    const asset = this.assets.get(assetId);
    if (!asset) return null;

    const book = this.orderBook.get(assetId);
    const bids = book?.bids.map(o => ({ price: o.limitPrice!, quantity: o.quantity - o.filledQuantity })) || [];
    const asks = book?.asks.map(o => ({ price: o.limitPrice!, quantity: o.quantity - o.filledQuantity })) || [];

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || asset.pricing.pricePerToken;

    return {
      asset,
      orderBook: {
        bids: bids.slice(0, 10),
        asks: asks.slice(0, 10),
        spread: bestAsk - bestBid,
        spreadPercent: bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0,
      },
      recentTrades: [], // Would come from transaction history
    };
  }

  // ============================================================================
  // Trading Operations
  // ============================================================================

  /**
   * Place a buy order for fractional tokens
   */
  async placeBuyOrder(
    userId: string,
    assetId: string,
    amount: number, // USD amount to invest
    orderType: 'market' | 'limit' = 'market',
    limitPrice?: number
  ): Promise<MarketOrder> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    if (amount < asset.fractional.minimumInvestment) {
      throw new Error(`Minimum investment is $${asset.fractional.minimumInvestment}`);
    }

    // Check compliance
    await this.checkCompliance(userId, asset);

    const price = orderType === 'market' ? asset.pricing.pricePerToken : limitPrice!;
    const quantity = amount / price;

    const order: MarketOrder = {
      id: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      assetId,
      side: 'buy',
      orderType,
      quantity,
      limitPrice: orderType === 'limit' ? limitPrice : undefined,
      filledQuantity: 0,
      avgFillPrice: 0,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: orderType === 'limit' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
    };

    // For market orders, execute immediately
    if (orderType === 'market') {
      await this.executeOrder(order, asset);
    } else {
      // Add to order book
      const book = this.orderBook.get(assetId)!;
      book.bids.push(order);
      book.bids.sort((a, b) => (b.limitPrice || 0) - (a.limitPrice || 0)); // Highest bid first
    }

    // Track order
    const userOrders = this.orders.get(userId) || [];
    userOrders.push(order);
    this.orders.set(userId, userOrders);

    this.emit('orderPlaced', order);
    return order;
  }

  /**
   * Place a sell order
   */
  async placeSellOrder(
    userId: string,
    assetId: string,
    quantity: number,
    orderType: 'market' | 'limit' = 'market',
    limitPrice?: number
  ): Promise<MarketOrder> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    // Check user has enough tokens
    const positions = this.positions.get(userId) || [];
    const position = positions.find(p => p.assetId === assetId);

    if (!position || position.tokenAmount < quantity) {
      throw new Error('Insufficient token balance');
    }

    const order: MarketOrder = {
      id: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      assetId,
      side: 'sell',
      orderType,
      quantity,
      limitPrice: orderType === 'limit' ? limitPrice : undefined,
      filledQuantity: 0,
      avgFillPrice: 0,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: orderType === 'limit' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
    };

    if (orderType === 'market') {
      await this.executeOrder(order, asset);
    } else {
      const book = this.orderBook.get(assetId)!;
      book.asks.push(order);
      book.asks.sort((a, b) => (a.limitPrice || 0) - (b.limitPrice || 0)); // Lowest ask first
    }

    const userOrders = this.orders.get(userId) || [];
    userOrders.push(order);
    this.orders.set(userId, userOrders);

    this.emit('orderPlaced', order);
    return order;
  }

  /**
   * Execute an order (market or matched limit)
   */
  private async executeOrder(order: MarketOrder, asset: TokenizedAsset): Promise<void> {
    const executionPrice = order.limitPrice || asset.pricing.pricePerToken;
    const fees = order.quantity * executionPrice * 0.001; // 0.1% fee

    // Create transaction
    const transaction: FractionalTransaction = {
      id: `TXN_${Date.now()}`,
      type: order.side,
      assetId: order.assetId,
      tokenAmount: order.quantity,
      pricePerToken: executionPrice,
      totalValue: order.quantity * executionPrice,
      fees,
      timestamp: new Date(),
      status: 'completed',
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    };

    // Update position
    await this.updatePosition(order.userId, order.assetId, order.side, order.quantity, executionPrice, transaction);

    // Update order
    order.filledQuantity = order.quantity;
    order.avgFillPrice = executionPrice;
    order.status = 'filled';
    order.filledAt = new Date();

    // Update asset stats
    asset.stats.volume24h += transaction.totalValue;
    if (executionPrice > asset.stats.allTimeHigh) {
      asset.stats.allTimeHigh = executionPrice;
    }
    if (executionPrice < asset.stats.allTimeLow) {
      asset.stats.allTimeLow = executionPrice;
    }

    this.emit('orderFilled', order, transaction);
    console.log(`[TokenizedAssets] Order filled: ${order.side} ${order.quantity} ${asset.symbol} @ $${executionPrice}`);
  }

  /**
   * Update user position after trade
   */
  private async updatePosition(
    userId: string,
    assetId: string,
    side: 'buy' | 'sell',
    quantity: number,
    price: number,
    transaction: FractionalTransaction
  ): Promise<void> {
    const userPositions = this.positions.get(userId) || [];
    let position = userPositions.find(p => p.assetId === assetId);
    const asset = this.assets.get(assetId)!;

    if (side === 'buy') {
      if (position) {
        // Update existing position (average cost basis)
        const totalCost = position.costBasis + (quantity * price);
        const totalTokens = position.tokenAmount + quantity;
        position.tokenAmount = totalTokens;
        position.costBasis = totalCost;
        position.ownershipPercent = (totalTokens / asset.token.totalSupply) * 100;
        position.transactions.push(transaction);
      } else {
        // Create new position
        position = {
          id: `POS_${Date.now()}`,
          userId,
          assetId,
          tokenAmount: quantity,
          ownershipPercent: (quantity / asset.token.totalSupply) * 100,
          costBasis: quantity * price,
          currentValue: quantity * asset.pricing.pricePerToken,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          totalYieldReceived: 0,
          pendingYield: 0,
          yieldReinvested: false,
          transactions: [transaction],
          acquiredAt: new Date(),
          lastUpdated: new Date(),
        };
        userPositions.push(position);
        asset.stats.holders++;
      }
    } else {
      // Sell
      if (position) {
        position.tokenAmount -= quantity;
        position.ownershipPercent = (position.tokenAmount / asset.token.totalSupply) * 100;
        // Reduce cost basis proportionally
        const sellRatio = quantity / (position.tokenAmount + quantity);
        position.costBasis *= (1 - sellRatio);
        position.transactions.push(transaction);

        if (position.tokenAmount <= 0) {
          // Remove position
          const index = userPositions.indexOf(position);
          userPositions.splice(index, 1);
          asset.stats.holders--;
        }
      }
    }

    this.positions.set(userId, userPositions);
    this.updatePositionValues(userId);
  }

  /**
   * Update current values and P&L for all positions
   */
  private updatePositionValues(userId: string): void {
    const positions = this.positions.get(userId) || [];

    for (const position of positions) {
      const asset = this.assets.get(position.assetId);
      if (!asset) continue;

      position.currentValue = position.tokenAmount * asset.pricing.pricePerToken;
      position.unrealizedPnL = position.currentValue - position.costBasis;
      position.unrealizedPnLPercent = position.costBasis > 0
        ? (position.unrealizedPnL / position.costBasis) * 100
        : 0;
      position.lastUpdated = new Date();
    }
  }

  // ============================================================================
  // Portfolio Management
  // ============================================================================

  /**
   * Get user's full portfolio
   */
  getPortfolio(userId: string): Portfolio {
    const positions = this.positions.get(userId) || [];
    this.updatePositionValues(userId);

    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCost = positions.reduce((sum, p) => sum + p.costBasis, 0);
    const totalPnL = totalValue - totalCost;

    // Calculate allocation by asset class
    const allocationMap: Map<AssetClass, number> = new Map();
    for (const position of positions) {
      const asset = this.assets.get(position.assetId);
      if (!asset) continue;

      const current = allocationMap.get(asset.assetClass) || 0;
      allocationMap.set(asset.assetClass, current + position.currentValue);
    }

    const allocation = Array.from(allocationMap.entries()).map(([assetClass, value]) => ({
      assetClass,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    // Yield summary
    const totalYieldReceived = positions.reduce((sum, p) => sum + p.totalYieldReceived, 0);
    const pendingYield = positions.reduce((sum, p) => sum + p.pendingYield, 0);
    const projectedAnnual = positions.reduce((sum, p) => {
      const asset = this.assets.get(p.assetId);
      return sum + (p.currentValue * (asset?.yield.annualYield || 0) / 100);
    }, 0);

    return {
      userId,
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent: totalCost > 0 ? (totalPnL / totalCost) * 100 : 0,
      allocation,
      positions,
      pendingOrders: (this.orders.get(userId) || []).filter(o => o.status === 'pending'),
      yieldSummary: {
        totalReceived: totalYieldReceived,
        pending: pendingYield,
        projectedAnnual,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Enable automatic yield reinvestment
   */
  enableYieldReinvestment(userId: string, assetId: string, enabled: boolean): void {
    const positions = this.positions.get(userId) || [];
    const position = positions.find(p => p.assetId === assetId);

    if (position) {
      position.yieldReinvested = enabled;
      console.log(`[TokenizedAssets] Yield reinvestment ${enabled ? 'enabled' : 'disabled'} for ${assetId}`);
    }
  }

  // ============================================================================
  // Compliance & KYC
  // ============================================================================

  /**
   * Check if user meets compliance requirements for an asset
   */
  private async checkCompliance(userId: string, asset: TokenizedAsset): Promise<void> {
    // In production, this would check:
    // 1. KYC verification level
    // 2. Accreditation status
    // 3. Jurisdiction restrictions
    // 4. Investment limits
    // 5. Transfer restrictions/holding periods

    // For now, we'll simulate basic checks
    if (asset.compliance.accreditedOnly) {
      // Check if user is accredited
      const isAccredited = await this.checkAccreditedStatus(userId);
      if (!isAccredited) {
        throw new Error('This asset is only available to accredited investors');
      }
    }

    console.log(`[TokenizedAssets] Compliance check passed for user ${userId}`);
  }

  private async checkAccreditedStatus(userId: string): Promise<boolean> {
    // In production: Check against KYC provider (Jumio, Onfido, etc.)
    return true; // Simulated
  }

  // ============================================================================
  // Yield Distribution
  // ============================================================================

  /**
   * Distribute yield/dividends to token holders
   */
  async distributeYield(assetId: string, totalYield: number): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    console.log(`[TokenizedAssets] Distributing $${totalYield} yield for ${asset.symbol}`);

    // Find all holders and their ownership percentages
    for (const [userId, positions] of this.positions.entries()) {
      const position = positions.find(p => p.assetId === assetId);
      if (!position) continue;

      const userYield = totalYield * (position.ownershipPercent / 100);

      if (position.yieldReinvested) {
        // Auto-reinvest: Buy more tokens
        const newTokens = userYield / asset.pricing.pricePerToken;
        position.tokenAmount += newTokens;
        position.ownershipPercent = (position.tokenAmount / asset.token.totalSupply) * 100;

        const transaction: FractionalTransaction = {
          id: `TXN_${Date.now()}`,
          type: 'reinvest',
          assetId,
          tokenAmount: newTokens,
          pricePerToken: asset.pricing.pricePerToken,
          totalValue: userYield,
          fees: 0,
          timestamp: new Date(),
          status: 'completed',
        };
        position.transactions.push(transaction);

        console.log(`[TokenizedAssets] Reinvested $${userYield.toFixed(2)} for user ${userId}`);
      } else {
        // Add to pending yield (user can claim)
        position.pendingYield += userYield;
      }

      position.totalYieldReceived += userYield;
    }

    asset.yield.lastDistribution = new Date();
    this.emit('yieldDistributed', { assetId, totalYield });
  }

  /**
   * Claim pending yield
   */
  async claimYield(userId: string, assetId: string): Promise<number> {
    const positions = this.positions.get(userId) || [];
    const position = positions.find(p => p.assetId === assetId);

    if (!position || position.pendingYield <= 0) {
      throw new Error('No yield to claim');
    }

    const claimed = position.pendingYield;
    position.pendingYield = 0;

    const transaction: FractionalTransaction = {
      id: `TXN_${Date.now()}`,
      type: 'dividend',
      assetId,
      tokenAmount: 0,
      pricePerToken: 0,
      totalValue: claimed,
      fees: 0,
      timestamp: new Date(),
      status: 'completed',
    };
    position.transactions.push(transaction);

    this.emit('yieldClaimed', { userId, assetId, amount: claimed });
    console.log(`[TokenizedAssets] User ${userId} claimed $${claimed.toFixed(2)} yield`);

    return claimed;
  }

  // ============================================================================
  // Sample Assets & Background Tasks
  // ============================================================================

  private initializeSampleAssets(): void {
    // Sample tokenized stocks
    const teslaToken: Omit<TokenizedAsset, 'id' | 'createdAt' | 'stats'> = {
      symbol: 'tTSLA',
      name: 'Tokenized Tesla',
      description: 'Fractional ownership of Tesla Inc. common stock',
      assetClass: 'stocks',
      underlying: {
        type: 'Common Stock',
        identifier: 'US88160R1014', // ISIN
        custodian: 'Alpaca Securities',
        verificationUrl: 'https://alpaca.markets',
      },
      token: {
        standard: 'ERC-1400',
        contractAddress: '0x1234...tTSLA',
        chain: 'ethereum',
        totalSupply: 1000000,
        decimals: 18,
      },
      pricing: {
        pricePerToken: 248.50,
        currency: 'USD',
        lastUpdated: new Date(),
        nav: 248.50,
        premium: 0,
      },
      fractional: {
        minimumInvestment: 1,
        minimumTrade: 0.001,
        maxOwnershipPercent: 10,
      },
      yield: {
        annualYield: 0,
        distributionFrequency: 'quarterly',
      },
      compliance: {
        frameworks: ['SEC'],
        accreditedOnly: false,
        jurisdictions: ['US', 'EU', 'UK', 'SG'],
        kycRequired: true,
        transferRestrictions: [],
      },
      status: 'active',
    };

    const realEstateToken: Omit<TokenizedAsset, 'id' | 'createdAt' | 'stats'> = {
      symbol: 'MIAMI-APT',
      name: 'Miami Luxury Apartments',
      description: 'Fractional ownership of 24-unit luxury apartment complex in Miami Beach',
      assetClass: 'real_estate',
      underlying: {
        type: 'Multi-family Residential',
        identifier: 'FL-MB-2024-001',
        custodian: 'RealT',
        verificationUrl: 'https://realt.co/property/miami-apt',
      },
      token: {
        standard: 'ERC-20',
        contractAddress: '0x5678...MIAMI',
        chain: 'polygon',
        totalSupply: 10000,
        decimals: 18,
      },
      pricing: {
        pricePerToken: 52.30,
        currency: 'USD',
        lastUpdated: new Date(),
        nav: 52.00,
        premium: 0.58,
      },
      fractional: {
        minimumInvestment: 50,
        minimumTrade: 1,
        maxOwnershipPercent: 25,
      },
      yield: {
        annualYield: 8.5,
        distributionFrequency: 'weekly',
        nextDistribution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      compliance: {
        frameworks: ['SEC'],
        accreditedOnly: false,
        jurisdictions: ['US'],
        kycRequired: true,
        transferRestrictions: ['1-year holding for US persons'],
      },
      status: 'active',
    };

    const goldToken: Omit<TokenizedAsset, 'id' | 'createdAt' | 'stats'> = {
      symbol: 'PAXG',
      name: 'PAX Gold',
      description: '1:1 backed by one fine troy ounce of London Good Delivery gold',
      assetClass: 'commodities',
      underlying: {
        type: 'Gold Bullion',
        identifier: 'LBMA-PAXOS-001',
        custodian: 'Brink\'s London Vaults',
        verificationUrl: 'https://paxos.com/paxgold',
      },
      token: {
        standard: 'ERC-20',
        contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
        chain: 'ethereum',
        totalSupply: 500000,
        decimals: 18,
      },
      pricing: {
        pricePerToken: 2650.00,
        currency: 'USD',
        lastUpdated: new Date(),
        nav: 2645.00,
        premium: 0.19,
      },
      fractional: {
        minimumInvestment: 20,
        minimumTrade: 0.01,
        maxOwnershipPercent: 100,
      },
      yield: {
        annualYield: 0,
        distributionFrequency: 'annually',
      },
      compliance: {
        frameworks: ['SEC', 'MAS', 'FCA'],
        accreditedOnly: false,
        jurisdictions: ['US', 'EU', 'UK', 'SG', 'HK'],
        kycRequired: true,
        transferRestrictions: [],
      },
      status: 'active',
    };

    const artToken: Omit<TokenizedAsset, 'id' | 'createdAt' | 'stats'> = {
      symbol: 'BANKSY-01',
      name: 'Banksy - Girl with Balloon',
      description: 'Fractional ownership of authenticated Banksy artwork',
      assetClass: 'art',
      underlying: {
        type: 'Fine Art',
        identifier: 'MSTRWRKS-BNKSY-001',
        custodian: 'Masterworks',
        verificationUrl: 'https://masterworks.io/artworks/banksy',
      },
      token: {
        standard: 'ERC-1400',
        contractAddress: '0x9ABC...BNKSY',
        chain: 'ethereum',
        totalSupply: 250000,
        decimals: 0,
      },
      pricing: {
        pricePerToken: 28.50,
        currency: 'USD',
        lastUpdated: new Date(),
        nav: 28.00,
        premium: 1.79,
      },
      fractional: {
        minimumInvestment: 500,
        minimumTrade: 20,
        maxOwnershipPercent: 10,
      },
      yield: {
        annualYield: 0,
        distributionFrequency: 'annually',
      },
      compliance: {
        frameworks: ['SEC'],
        accreditedOnly: true,
        jurisdictions: ['US'],
        kycRequired: true,
        transferRestrictions: ['Accredited investors only', '1-year holding period'],
      },
      status: 'active',
    };

    const spyToken: Omit<TokenizedAsset, 'id' | 'createdAt' | 'stats'> = {
      symbol: 'tSPY',
      name: 'Tokenized S&P 500 ETF',
      description: 'Fractional ownership of SPDR S&P 500 ETF Trust',
      assetClass: 'etfs',
      underlying: {
        type: 'ETF',
        identifier: 'US78462F1030',
        custodian: 'Securitize',
        verificationUrl: 'https://securitize.io',
      },
      token: {
        standard: 'ERC-20',
        contractAddress: '0xDEF0...tSPY',
        chain: 'polygon',
        totalSupply: 5000000,
        decimals: 18,
      },
      pricing: {
        pricePerToken: 594.75,
        currency: 'USD',
        lastUpdated: new Date(),
        nav: 594.50,
        premium: 0.04,
      },
      fractional: {
        minimumInvestment: 1,
        minimumTrade: 0.001,
        maxOwnershipPercent: 5,
      },
      yield: {
        annualYield: 1.3,
        distributionFrequency: 'quarterly',
      },
      compliance: {
        frameworks: ['SEC', 'MiCA'],
        accreditedOnly: false,
        jurisdictions: ['US', 'EU', 'UK'],
        kycRequired: true,
        transferRestrictions: [],
      },
      status: 'active',
    };

    // List all sample assets
    this.listAsset(teslaToken);
    this.listAsset(realEstateToken);
    this.listAsset(goldToken);
    this.listAsset(artToken);
    this.listAsset(spyToken);
  }

  private startPriceUpdates(): void {
    // Simulate price updates every 30 seconds
    setInterval(() => {
      for (const [id, asset] of this.assets.entries()) {
        if (asset.status !== 'active') continue;

        // Random price movement (-2% to +2%)
        const change = (Math.random() - 0.5) * 0.04;
        asset.pricing.pricePerToken *= (1 + change);
        asset.pricing.lastUpdated = new Date();

        // Update market cap
        asset.stats.marketCap = asset.pricing.pricePerToken * asset.token.totalSupply;
      }
    }, 30000);
  }

  private startYieldDistribution(): void {
    // Check for yield distributions every hour
    setInterval(async () => {
      for (const [id, asset] of this.assets.entries()) {
        if (asset.yield.annualYield <= 0) continue;
        if (!asset.yield.nextDistribution) continue;

        if (new Date() >= asset.yield.nextDistribution) {
          // Calculate yield for this period
          const periodsPerYear = {
            daily: 365,
            weekly: 52,
            monthly: 12,
            quarterly: 4,
            annually: 1,
          };

          const periods = periodsPerYear[asset.yield.distributionFrequency];
          const periodYield = (asset.yield.annualYield / 100 / periods) * asset.stats.marketCap;

          await this.distributeYield(id, periodYield);

          // Set next distribution
          const msPerPeriod = (365 * 24 * 60 * 60 * 1000) / periods;
          asset.yield.nextDistribution = new Date(Date.now() + msPerPeriod);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const tokenizedAssets = new TokenizedAssetsManager();
export default tokenizedAssets;
