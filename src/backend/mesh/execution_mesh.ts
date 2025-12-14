/**
 * TIME Execution Mesh
 *
 * THE GLOBAL EXECUTION MANAGEMENT SYSTEM (EMS)
 *
 * Based on institutional trading research:
 * - Smart Order Routing (SOR) across multiple venues
 * - Best execution analysis and routing
 * - Multi-broker coordination
 * - Dark pool flow integration
 * - Real-time execution quality monitoring
 * - Slippage analysis and optimization
 *
 * Architecture:
 * - Orders come from Agent Swarm, Meta-Brain, or direct user
 * - Mesh analyzes best execution path across ALL connected brokers
 * - Routes to optimal venue based on liquidity, cost, speed
 * - Monitors execution quality and learns from outcomes
 *
 * Integrates with existing brokers: Alpaca, OANDA, Binance, Kraken, SnapTrade, MT4/5
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('ExecutionMesh');

// =============================================================================
// TYPES
// =============================================================================

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | 'iceberg' | 'twap' | 'vwap';

export type OrderSide = 'buy' | 'sell';

export type OrderStatus =
  | 'pending'        // Not yet submitted
  | 'routing'        // Being routed to venue
  | 'submitted'      // Sent to venue
  | 'partial'        // Partially filled
  | 'filled'         // Fully filled
  | 'cancelled'      // Cancelled
  | 'rejected'       // Rejected by venue
  | 'expired';       // Order expired

export type ExecutionStrategy =
  | 'best_price'      // Get best price regardless of time
  | 'fast_fill'       // Fill as fast as possible
  | 'minimize_impact' // Minimize market impact (for large orders)
  | 'twap'            // Time-weighted average price
  | 'vwap'            // Volume-weighted average price
  | 'iceberg'         // Hide order size
  | 'dark_pool_first' // Try dark pools before lit markets
  | 'smart'           // AI-optimized routing
  | 'custom';

export type VenueType =
  | 'exchange'        // Public exchange (NYSE, NASDAQ, etc.)
  | 'dark_pool'       // Private dark pool
  | 'broker_internal' // Broker's internal matching
  | 'otc'             // Over-the-counter
  | 'defi'            // DeFi DEX
  | 'cex';            // Centralized crypto exchange

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  brokerId: string;
  supportedAssets: string[];
  supportedOrderTypes: OrderType[];

  // Performance metrics
  avgLatencyMs: number;
  fillRate: number;
  avgSlippage: number;
  uptime: number;

  // Cost structure
  makerFee: number;
  takerFee: number;
  minimumOrderSize: number;

  // Status
  status: 'online' | 'degraded' | 'offline';
  lastUpdate: Date;
}

export interface Order {
  id: string;
  clientOrderId: string;
  userId: string;

  // Order details
  asset: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;           // For limit orders
  stopPrice?: number;       // For stop orders

  // Execution configuration
  strategy: ExecutionStrategy;
  urgency: 'immediate' | 'normal' | 'patient';
  allowPartialFill: boolean;
  maxSlippage: number;      // Maximum acceptable slippage %
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  expiresAt?: Date;

  // Routing
  preferredVenues?: string[];
  excludedVenues?: string[];
  allowDarkPools: boolean;

  // Source tracking
  source: 'user' | 'agent_swarm' | 'meta_brain' | 'capital_agent' | 'bot' | 'api';
  sourceId?: string;

  // Status
  status: OrderStatus;
  routedVenue?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Execution {
  id: string;
  orderId: string;

  // Fill details
  venue: string;
  venueType: VenueType;
  quantity: number;
  price: number;
  side: OrderSide;

  // Costs
  fees: number;
  commission: number;
  rebate: number;

  // Quality metrics
  expectedPrice: number;
  slippage: number;
  slippageBps: number;      // Basis points

  // Timing
  latencyMs: number;
  timestamp: Date;
}

export interface ExecutionQuality {
  orderId: string;
  totalQuantity: number;
  avgPrice: number;
  expectedPrice: number;
  slippageBps: number;
  totalFees: number;
  venuesUsed: string[];
  executionTimeMs: number;

  // Benchmarks
  vsBestBid: number;
  vsBestAsk: number;
  vsVwap: number;
  vsTwap: number;

  // Rating
  qualityScore: number;     // 0-100
  improvement: number;      // vs baseline
}

export interface RoutingDecision {
  orderId: string;
  timestamp: Date;

  // Analysis
  venuesAnalyzed: {
    venue: string;
    estimatedPrice: number;
    estimatedFees: number;
    estimatedLatency: number;
    liquidity: number;
    score: number;
  }[];

  // Decision
  selectedVenue: string;
  reason: string;
  expectedSlippage: number;
  confidence: number;
}

export interface MeshConfig {
  // Default execution preferences
  defaultStrategy: ExecutionStrategy;
  defaultUrgency: 'immediate' | 'normal' | 'patient';
  maxSlippageDefault: number;
  allowDarkPoolsDefault: boolean;

  // Smart routing
  enableSmartRouting: boolean;
  routingAlgorithm: 'best_price' | 'cost_optimal' | 'ai_optimized';
  learningEnabled: boolean;

  // Safety
  maxOrderSize: number;
  maxDailyVolume: number;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;

  // Monitoring
  executionQualityThreshold: number;
  alertOnPoorExecution: boolean;
}

// =============================================================================
// EXECUTION MESH ENGINE
// =============================================================================

export class ExecutionMeshEngine extends EventEmitter {
  private static instance: ExecutionMeshEngine;

  private venues: Map<string, Venue> = new Map();
  private orders: Map<string, Order> = new Map();
  private executions: Map<string, Execution[]> = new Map();
  private routingHistory: Map<string, RoutingDecision> = new Map();
  private qualityReports: Map<string, ExecutionQuality> = new Map();

  private config: MeshConfig = {
    defaultStrategy: 'smart',
    defaultUrgency: 'normal',
    maxSlippageDefault: 0.5,
    allowDarkPoolsDefault: true,
    enableSmartRouting: true,
    routingAlgorithm: 'ai_optimized',
    learningEnabled: true,
    maxOrderSize: 100000,
    maxDailyVolume: 1000000,
    circuitBreakerEnabled: true,
    circuitBreakerThreshold: 5,
    executionQualityThreshold: 70,
    alertOnPoorExecution: true
  };

  // Performance tracking
  private dailyVolume: number = 0;
  private dailyOrderCount: number = 0;
  private avgExecutionQuality: number = 85;
  private circuitBreakerTriggered: boolean = false;

  // Learning data
  private venuePerformance: Map<string, {
    fills: number;
    avgSlippage: number;
    avgLatency: number;
    successRate: number;
    byAsset: Map<string, { fills: number; avgSlippage: number }>
  }> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): ExecutionMeshEngine {
    if (!ExecutionMeshEngine.instance) {
      ExecutionMeshEngine.instance = new ExecutionMeshEngine();
    }
    return ExecutionMeshEngine.instance;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  public async initialize(): Promise<void> {
    logger.info('Initializing Execution Mesh...');

    // Register all connected venues (from existing broker configs)
    await this.registerConfiguredVenues();

    // Start background processes
    this.startVenueMonitor();
    this.startQualityAnalyzer();
    this.startLearningLoop();

    logger.info('Execution Mesh initialized with', this.venues.size, 'venues');
    this.emit('initialized');
  }

  private async registerConfiguredVenues(): Promise<void> {
    // Register Alpaca (Paper Trading)
    this.registerVenue({
      id: 'alpaca_paper',
      name: 'Alpaca Paper',
      type: 'broker_internal',
      brokerId: 'alpaca',
      supportedAssets: ['stocks', 'etf'],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
      avgLatencyMs: 50,
      fillRate: 0.98,
      avgSlippage: 0.02,
      uptime: 0.999,
      makerFee: 0,
      takerFee: 0,
      minimumOrderSize: 1,
      status: 'online',
      lastUpdate: new Date()
    });

    // Register OANDA (Live Forex)
    this.registerVenue({
      id: 'oanda_live',
      name: 'OANDA Live',
      type: 'broker_internal',
      brokerId: 'oanda',
      supportedAssets: ['forex', 'cfd'],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
      avgLatencyMs: 30,
      fillRate: 0.995,
      avgSlippage: 0.01,
      uptime: 0.9995,
      makerFee: 0,
      takerFee: 0.00005,  // Spread-based
      minimumOrderSize: 1,
      status: 'online',
      lastUpdate: new Date()
    });

    // Register Binance (Crypto)
    this.registerVenue({
      id: 'binance_spot',
      name: 'Binance Spot',
      type: 'cex',
      brokerId: 'binance',
      supportedAssets: ['crypto'],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit', 'iceberg'],
      avgLatencyMs: 10,
      fillRate: 0.99,
      avgSlippage: 0.05,
      uptime: 0.998,
      makerFee: 0.001,
      takerFee: 0.001,
      minimumOrderSize: 10,
      status: 'online',
      lastUpdate: new Date()
    });

    // Register Kraken (Crypto)
    this.registerVenue({
      id: 'kraken_spot',
      name: 'Kraken Spot',
      type: 'cex',
      brokerId: 'kraken',
      supportedAssets: ['crypto'],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      avgLatencyMs: 20,
      fillRate: 0.98,
      avgSlippage: 0.04,
      uptime: 0.995,
      makerFee: 0.0016,
      takerFee: 0.0026,
      minimumOrderSize: 5,
      status: 'online',
      lastUpdate: new Date()
    });

    // Register MT4/5 Bridge
    this.registerVenue({
      id: 'mt5_bridge',
      name: 'MetaTrader 5 Bridge',
      type: 'broker_internal',
      brokerId: 'mt5',
      supportedAssets: ['forex', 'cfd', 'stocks'],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      avgLatencyMs: 100,
      fillRate: 0.95,
      avgSlippage: 0.03,
      uptime: 0.99,
      makerFee: 0,
      takerFee: 0.0001,
      minimumOrderSize: 0.01,
      status: 'online',
      lastUpdate: new Date()
    });

    logger.info('Registered 5 execution venues');
  }

  // ==========================================================================
  // VENUE MANAGEMENT
  // ==========================================================================

  public registerVenue(venue: Venue): void {
    this.venues.set(venue.id, venue);
    this.venuePerformance.set(venue.id, {
      fills: 0,
      avgSlippage: venue.avgSlippage,
      avgLatency: venue.avgLatencyMs,
      successRate: venue.fillRate,
      byAsset: new Map()
    });

    logger.info(`Venue registered: ${venue.name} (${venue.id})`);
    this.emit('venue_registered', venue);
  }

  public updateVenueStatus(venueId: string, status: 'online' | 'degraded' | 'offline'): void {
    const venue = this.venues.get(venueId);
    if (venue) {
      venue.status = status;
      venue.lastUpdate = new Date();

      if (status !== 'online') {
        logger.warn(`Venue ${venue.name} status changed to ${status}`);
        this.emit('venue_status_changed', { venue, status });
      }
    }
  }

  public getAvailableVenues(asset: string): Venue[] {
    return Array.from(this.venues.values()).filter(v =>
      v.status === 'online' &&
      v.supportedAssets.some(a => asset.toLowerCase().includes(a) || a === 'all')
    );
  }

  // ==========================================================================
  // ORDER SUBMISSION
  // ==========================================================================

  public async submitOrder(orderInput: Partial<Order>): Promise<Order> {
    // Validate and create order
    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientOrderId: orderInput.clientOrderId || `client_${Date.now()}`,
      userId: orderInput.userId || 'system',
      asset: orderInput.asset!,
      side: orderInput.side!,
      type: orderInput.type || 'market',
      quantity: orderInput.quantity!,
      price: orderInput.price,
      stopPrice: orderInput.stopPrice,
      strategy: orderInput.strategy || this.config.defaultStrategy,
      urgency: orderInput.urgency || this.config.defaultUrgency,
      allowPartialFill: orderInput.allowPartialFill !== false,
      maxSlippage: orderInput.maxSlippage || this.config.maxSlippageDefault,
      timeInForce: orderInput.timeInForce || 'day',
      preferredVenues: orderInput.preferredVenues,
      excludedVenues: orderInput.excludedVenues,
      allowDarkPools: orderInput.allowDarkPools !== false,
      source: orderInput.source || 'api',
      sourceId: orderInput.sourceId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Safety checks
    if (!this.validateOrder(order)) {
      order.status = 'rejected';
      this.orders.set(order.id, order);
      throw new Error('Order validation failed');
    }

    // Check circuit breaker
    if (this.circuitBreakerTriggered) {
      order.status = 'rejected';
      this.orders.set(order.id, order);
      throw new Error('Circuit breaker active - order rejected');
    }

    this.orders.set(order.id, order);
    logger.info(`Order submitted: ${order.id} - ${order.side} ${order.quantity} ${order.asset}`);

    // Route and execute
    const routingDecision = await this.routeOrder(order);
    await this.executeOrder(order, routingDecision);

    return order;
  }

  private validateOrder(order: Order): boolean {
    // Check order size
    if (order.quantity * (order.price || 100) > this.config.maxOrderSize) {
      logger.warn(`Order exceeds max size: ${order.id}`);
      return false;
    }

    // Check daily volume
    if (this.dailyVolume + (order.quantity * (order.price || 100)) > this.config.maxDailyVolume) {
      logger.warn(`Order would exceed daily volume limit: ${order.id}`);
      return false;
    }

    // Check if asset has available venues
    const venues = this.getAvailableVenues(order.asset);
    if (venues.length === 0) {
      logger.warn(`No available venues for asset: ${order.asset}`);
      return false;
    }

    return true;
  }

  // ==========================================================================
  // SMART ORDER ROUTING
  // ==========================================================================

  private async routeOrder(order: Order): Promise<RoutingDecision> {
    order.status = 'routing';
    order.updatedAt = new Date();

    const startTime = Date.now();
    const venues = this.getAvailableVenues(order.asset);

    // Filter by preferences
    let filteredVenues = venues;
    if (order.preferredVenues?.length) {
      filteredVenues = venues.filter(v => order.preferredVenues!.includes(v.id));
    }
    if (order.excludedVenues?.length) {
      filteredVenues = filteredVenues.filter(v => !order.excludedVenues!.includes(v.id));
    }
    if (!order.allowDarkPools) {
      filteredVenues = filteredVenues.filter(v => v.type !== 'dark_pool');
    }

    // Analyze each venue
    const venueAnalysis = await Promise.all(
      filteredVenues.map(async venue => this.analyzeVenue(venue, order))
    );

    // Score and rank venues based on strategy
    const scoredVenues = venueAnalysis.map(analysis => ({
      ...analysis,
      score: this.calculateVenueScore(analysis, order)
    })).sort((a, b) => b.score - a.score);

    const selectedVenue = scoredVenues[0];

    const decision: RoutingDecision = {
      orderId: order.id,
      timestamp: new Date(),
      venuesAnalyzed: scoredVenues,
      selectedVenue: selectedVenue.venue,
      reason: this.explainRoutingDecision(selectedVenue, order),
      expectedSlippage: selectedVenue.estimatedPrice - (order.price || selectedVenue.estimatedPrice),
      confidence: selectedVenue.score
    };

    this.routingHistory.set(order.id, decision);
    logger.info(`Order ${order.id} routed to ${selectedVenue.venue} (score: ${selectedVenue.score.toFixed(1)})`);

    this.emit('order_routed', { order, decision });
    return decision;
  }

  private async analyzeVenue(venue: Venue, order: Order): Promise<{
    venue: string;
    estimatedPrice: number;
    estimatedFees: number;
    estimatedLatency: number;
    liquidity: number;
    score: number;
  }> {
    const perf = this.venuePerformance.get(venue.id);
    const referencePrice = order.price || 100;  // Use order price or estimate

    // Get asset-specific performance if available
    const assetPerf = perf?.byAsset.get(order.asset);

    // Estimate execution price including slippage
    const expectedSlippage = assetPerf?.avgSlippage || perf?.avgSlippage || venue.avgSlippage;
    const slippageAmount = order.side === 'buy' ? expectedSlippage : -expectedSlippage;
    const estimatedPrice = referencePrice * (1 + slippageAmount / 100);

    // Calculate fees
    const isTaker = order.type === 'market' || order.urgency === 'immediate';
    const feeRate = isTaker ? venue.takerFee : venue.makerFee;
    const estimatedFees = referencePrice * order.quantity * feeRate;

    return {
      venue: venue.id,
      estimatedPrice,
      estimatedFees,
      estimatedLatency: perf?.avgLatency || venue.avgLatencyMs,
      liquidity: venue.fillRate,
      score: 0  // Will be calculated
    };
  }

  private calculateVenueScore(
    analysis: {
      venue: string;
      estimatedPrice: number;
      estimatedFees: number;
      estimatedLatency: number;
      liquidity: number;
    },
    order: Order
  ): number {
    let score = 100;

    // Price component (40% weight)
    const referencePrice = order.price || 100;
    const priceDeviation = Math.abs(analysis.estimatedPrice - referencePrice) / referencePrice;
    score -= priceDeviation * 100 * 40;

    // Fees component (20% weight)
    const feePercent = analysis.estimatedFees / (referencePrice * order.quantity);
    score -= feePercent * 100 * 20;

    // Latency component (20% weight for urgent, 5% for patient)
    const latencyWeight = order.urgency === 'immediate' ? 20 : order.urgency === 'patient' ? 5 : 10;
    const latencyPenalty = Math.min(analysis.estimatedLatency / 1000, 1);
    score -= latencyPenalty * latencyWeight;

    // Liquidity component (20% weight)
    score += analysis.liquidity * 20;

    // Strategy adjustments
    switch (order.strategy) {
      case 'fast_fill':
        score += (1 - analysis.estimatedLatency / 1000) * 20;
        break;
      case 'best_price':
        score += (1 - priceDeviation * 10) * 20;
        break;
      case 'minimize_impact':
        // Prefer dark pools and large venues
        const venue = this.venues.get(analysis.venue);
        if (venue?.type === 'dark_pool') score += 15;
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  private explainRoutingDecision(
    selected: { venue: string; estimatedPrice: number; estimatedFees: number; score: number },
    order: Order
  ): string {
    const venue = this.venues.get(selected.venue);
    return `Selected ${venue?.name || selected.venue} for ${order.strategy} strategy. ` +
           `Expected fill at ${selected.estimatedPrice.toFixed(4)} with ${selected.estimatedFees.toFixed(2)} fees. ` +
           `Score: ${selected.score.toFixed(1)}/100.`;
  }

  // ==========================================================================
  // ORDER EXECUTION
  // ==========================================================================

  private async executeOrder(order: Order, routing: RoutingDecision): Promise<void> {
    order.status = 'submitted';
    order.routedVenue = routing.selectedVenue;
    order.updatedAt = new Date();

    const venue = this.venues.get(routing.selectedVenue);
    if (!venue) {
      order.status = 'rejected';
      throw new Error(`Venue not found: ${routing.selectedVenue}`);
    }

    logger.info(`Executing order ${order.id} on ${venue.name}`);

    try {
      // In production, this would call the actual broker API
      // For now, simulate execution
      const execution = await this.simulateExecution(order, venue, routing);

      // Record execution
      const executions = this.executions.get(order.id) || [];
      executions.push(execution);
      this.executions.set(order.id, executions);

      // Update order status
      const totalFilled = executions.reduce((sum, e) => sum + e.quantity, 0);
      if (totalFilled >= order.quantity) {
        order.status = 'filled';
      } else if (totalFilled > 0) {
        order.status = 'partial';
      }
      order.updatedAt = new Date();

      // Update daily tracking
      this.dailyVolume += execution.quantity * execution.price;
      this.dailyOrderCount++;

      // Generate quality report
      await this.generateQualityReport(order);

      // Update venue performance
      this.updateVenuePerformance(venue.id, order.asset, execution);

      logger.info(`Order ${order.id} executed: ${execution.quantity} @ ${execution.price}`);
      this.emit('order_executed', { order, execution });

    } catch (error) {
      order.status = 'rejected';
      order.updatedAt = new Date();
      logger.error(`Order ${order.id} failed:`, error);
      this.emit('order_failed', { order, error });

      // Check for circuit breaker
      this.checkCircuitBreaker();
    }
  }

  private async simulateExecution(order: Order, venue: Venue, routing: RoutingDecision): Promise<Execution> {
    const latencyMs = venue.avgLatencyMs * (0.8 + Math.random() * 0.4);
    await new Promise(resolve => setTimeout(resolve, latencyMs));

    const referencePrice = order.price || 100;
    const slippagePct = venue.avgSlippage * (0.5 + Math.random());
    const slippageDir = order.side === 'buy' ? 1 : -1;
    const executedPrice = referencePrice * (1 + slippageDir * slippagePct / 100);

    const feeRate = order.type === 'market' ? venue.takerFee : venue.makerFee;

    return {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      venue: venue.id,
      venueType: venue.type,
      quantity: order.quantity,
      price: executedPrice,
      side: order.side,
      fees: executedPrice * order.quantity * feeRate,
      commission: 0,
      rebate: 0,
      expectedPrice: referencePrice,
      slippage: executedPrice - referencePrice,
      slippageBps: Math.abs(executedPrice - referencePrice) / referencePrice * 10000,
      latencyMs,
      timestamp: new Date()
    };
  }

  // ==========================================================================
  // EXECUTION QUALITY ANALYSIS
  // ==========================================================================

  private async generateQualityReport(order: Order): Promise<ExecutionQuality> {
    const executions = this.executions.get(order.id) || [];
    if (executions.length === 0) {
      throw new Error('No executions found');
    }

    const totalQuantity = executions.reduce((sum, e) => sum + e.quantity, 0);
    const avgPrice = executions.reduce((sum, e) => sum + e.price * e.quantity, 0) / totalQuantity;
    const expectedPrice = order.price || executions[0].expectedPrice;
    const totalFees = executions.reduce((sum, e) => sum + e.fees, 0);
    const venuesUsed = [...new Set(executions.map(e => e.venue))];
    const executionTimeMs = executions.reduce((sum, e) => sum + e.latencyMs, 0);

    const slippageBps = Math.abs(avgPrice - expectedPrice) / expectedPrice * 10000;

    // Calculate quality score
    let qualityScore = 100;
    qualityScore -= slippageBps / 10;  // -1 point per 10 bps slippage
    qualityScore -= totalFees / (avgPrice * totalQuantity) * 1000;  // Fee impact
    qualityScore -= executionTimeMs / 1000;  // Latency impact

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    const report: ExecutionQuality = {
      orderId: order.id,
      totalQuantity,
      avgPrice,
      expectedPrice,
      slippageBps,
      totalFees,
      venuesUsed,
      executionTimeMs,
      vsBestBid: 0,  // Would need real market data
      vsBestAsk: 0,
      vsVwap: 0,
      vsTwap: 0,
      qualityScore,
      improvement: qualityScore - this.avgExecutionQuality
    };

    this.qualityReports.set(order.id, report);

    // Update average
    this.avgExecutionQuality = (this.avgExecutionQuality * 0.95) + (qualityScore * 0.05);

    // Alert on poor execution
    if (qualityScore < this.config.executionQualityThreshold && this.config.alertOnPoorExecution) {
      logger.warn(`Poor execution quality for order ${order.id}: ${qualityScore.toFixed(1)}`);
      this.emit('poor_execution', { order, report });
    }

    this.emit('quality_report', report);
    return report;
  }

  private updateVenuePerformance(venueId: string, asset: string, execution: Execution): void {
    const perf = this.venuePerformance.get(venueId);
    if (!perf) return;

    // Update overall metrics
    perf.fills++;
    perf.avgSlippage = (perf.avgSlippage * 0.9) + (execution.slippageBps / 100 * 0.1);
    perf.avgLatency = (perf.avgLatency * 0.9) + (execution.latencyMs * 0.1);

    // Update asset-specific metrics
    let assetPerf = perf.byAsset.get(asset);
    if (!assetPerf) {
      assetPerf = { fills: 0, avgSlippage: 0 };
      perf.byAsset.set(asset, assetPerf);
    }
    assetPerf.fills++;
    assetPerf.avgSlippage = (assetPerf.avgSlippage * 0.9) + (execution.slippageBps / 100 * 0.1);
  }

  private checkCircuitBreaker(): void {
    // Check recent failures
    const recentOrders = Array.from(this.orders.values())
      .filter(o => o.updatedAt.getTime() > Date.now() - 60000);  // Last minute

    const failures = recentOrders.filter(o => o.status === 'rejected' || o.status === 'cancelled');

    if (failures.length >= this.config.circuitBreakerThreshold && this.config.circuitBreakerEnabled) {
      this.circuitBreakerTriggered = true;
      logger.error('CIRCUIT BREAKER TRIGGERED - Too many failures');
      this.emit('circuit_breaker', { failures: failures.length });

      // Auto-reset after 5 minutes
      setTimeout(() => {
        this.circuitBreakerTriggered = false;
        logger.info('Circuit breaker reset');
      }, 300000);
    }
  }

  // ==========================================================================
  // BACKGROUND PROCESSES
  // ==========================================================================

  private startVenueMonitor(): void {
    setInterval(() => {
      for (const venue of this.venues.values()) {
        // Check venue health
        if (venue.lastUpdate.getTime() < Date.now() - 60000) {
          this.updateVenueStatus(venue.id, 'degraded');
        }
      }
    }, 30000);
  }

  private startQualityAnalyzer(): void {
    setInterval(() => {
      // Analyze execution quality trends
      const recentReports = Array.from(this.qualityReports.values())
        .filter(r => true);  // Would filter by time

      if (recentReports.length > 0) {
        const avgQuality = recentReports.reduce((sum, r) => sum + r.qualityScore, 0) / recentReports.length;
        this.emit('quality_trend', { avgQuality, reports: recentReports.length });
      }
    }, 300000);  // Every 5 minutes
  }

  private startLearningLoop(): void {
    if (!this.config.learningEnabled) return;

    setInterval(() => {
      // Analyze venue performance and adjust routing
      for (const [venueId, perf] of this.venuePerformance) {
        if (perf.fills >= 10) {
          const venue = this.venues.get(venueId);
          if (venue) {
            // Update venue metrics based on actual performance
            venue.avgSlippage = perf.avgSlippage;
            venue.avgLatencyMs = perf.avgLatency;
          }
        }
      }

      logger.debug('Learning loop completed');
    }, 3600000);  // Every hour
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  public getOrderExecutions(orderId: string): Execution[] {
    return this.executions.get(orderId) || [];
  }

  public getQualityReport(orderId: string): ExecutionQuality | undefined {
    return this.qualityReports.get(orderId);
  }

  public getVenues(): Venue[] {
    return Array.from(this.venues.values());
  }

  public getRoutingDecision(orderId: string): RoutingDecision | undefined {
    return this.routingHistory.get(orderId);
  }

  public getStats(): {
    venues: number;
    ordersToday: number;
    volumeToday: number;
    avgQuality: number;
    circuitBreaker: boolean;
  } {
    return {
      venues: this.venues.size,
      ordersToday: this.dailyOrderCount,
      volumeToday: this.dailyVolume,
      avgQuality: this.avgExecutionQuality,
      circuitBreaker: this.circuitBreakerTriggered
    };
  }

  public updateConfig(updates: Partial<MeshConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Mesh config updated');
    this.emit('config_updated', this.config);
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status === 'pending' || order.status === 'routing' || order.status === 'partial') {
      order.status = 'cancelled';
      order.updatedAt = new Date();
      logger.info(`Order ${orderId} cancelled`);
      this.emit('order_cancelled', order);
      return true;
    }

    return false;
  }

  // Reset daily counters (call at market close)
  public resetDailyCounters(): void {
    this.dailyVolume = 0;
    this.dailyOrderCount = 0;
    logger.info('Daily counters reset');
  }
}

// Export singleton
export const executionMesh = ExecutionMeshEngine.getInstance();

export default ExecutionMeshEngine;
