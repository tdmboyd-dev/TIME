/**
 * TIME Memory Graph
 *
 * THE CROSS-SYSTEM KNOWLEDGE GRAPH - TIME'S LONG-TERM INTELLIGENCE
 *
 * A graph-based memory system that stores relationships between:
 * - Bots ↔ Signals ↔ Trades ↔ Regimes ↔ Outcomes
 * - Users ↔ Behavior ↔ Risk Profiles ↔ Performance
 * - Assets ↔ Factors ↔ Volatility ↔ Sentiment
 * - DeFi positions ↔ Yields ↔ Risks ↔ Lockups
 * - Life events ↔ Financial decisions ↔ Portfolio changes
 *
 * This becomes TIME's permanent memory, enabling:
 * - Pattern recognition across time
 * - Relationship discovery
 * - Predictive insights
 * - Learning from history
 *
 * Architecture based on Neo4j/MongoDB graph patterns for financial data:
 * - Nodes represent entities (bots, signals, trades, assets, users)
 * - Edges represent relationships with properties
 * - Supports traversal queries for insight discovery
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MemoryGraph');

// =============================================================================
// TYPES
// =============================================================================

export type NodeType =
  | 'bot'
  | 'signal'
  | 'trade'
  | 'asset'
  | 'regime'
  | 'user'
  | 'strategy'
  | 'yield_source'
  | 'life_event'
  | 'decision'
  | 'outcome'
  | 'pattern'
  | 'insight';

export type EdgeType =
  // Bot relationships
  | 'generated'          // bot -> signal
  | 'executed'           // signal -> trade
  | 'performed_in'       // trade -> regime
  | 'resulted_in'        // trade -> outcome

  // Asset relationships
  | 'traded'             // trade -> asset
  | 'exposed_to'         // strategy -> asset
  | 'correlated_with'    // asset -> asset
  | 'in_sector'          // asset -> sector

  // User relationships
  | 'owns'               // user -> strategy/bot
  | 'experienced'        // user -> life_event
  | 'made_decision'      // user -> decision
  | 'has_profile'        // user -> risk_profile

  // Strategy relationships
  | 'uses'               // strategy -> bot
  | 'optimized_for'      // strategy -> regime
  | 'derived_from'       // strategy -> strategy

  // Yield relationships
  | 'yields_from'        // position -> yield_source
  | 'has_lockup'         // yield_source -> lockup
  | 'risk_adjusted'      // yield -> risk_factor

  // Life relationships
  | 'triggered'          // life_event -> decision
  | 'affected'           // life_event -> portfolio

  // Pattern relationships
  | 'matches'            // signal/trade -> pattern
  | 'similar_to'         // pattern -> pattern
  | 'led_to'             // pattern -> outcome

  // Temporal relationships
  | 'followed_by'        // event -> event
  | 'occurred_during'    // event -> regime
  | 'preceded';          // event -> event

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source: string;
    version: number;
    confidence?: number;
  };
}

export interface GraphEdge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  properties: Record<string, any>;
  weight: number;           // Relationship strength 0-1
  createdAt: Date;
  metadata?: {
    source: string;
    bidirectional: boolean;
  };
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
  pathLength: number;
}

export interface GraphQuery {
  // Starting point
  startNodeId?: string;
  startNodeType?: NodeType;
  startNodeFilter?: Record<string, any>;

  // Traversal
  edgeTypes?: EdgeType[];
  direction?: 'outgoing' | 'incoming' | 'both';
  maxDepth?: number;

  // End condition
  endNodeType?: NodeType;
  endNodeFilter?: Record<string, any>;

  // Result options
  limit?: number;
  includeProperties?: boolean;
  sortBy?: string;
}

export interface GraphInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'correlation' | 'prediction' | 'recommendation';
  confidence: number;
  description: string;
  involvedNodes: string[];
  involvedEdges: string[];
  discoveredAt: Date;
  validUntil?: Date;
  actionable: boolean;
  suggestedAction?: string;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<NodeType, number>;
  edgesByType: Record<EdgeType, number>;
  avgEdgesPerNode: number;
  graphDensity: number;
  lastUpdated: Date;
}

// =============================================================================
// MEMORY GRAPH ENGINE
// =============================================================================

export class MemoryGraphEngine extends EventEmitter {
  private static instance: MemoryGraphEngine;

  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private nodesByType: Map<NodeType, Set<string>> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();  // nodeId -> edgeIds
  private reverseAdjacency: Map<string, Set<string>> = new Map(); // For incoming edges
  private insights: Map<string, GraphInsight> = new Map();

  private constructor() {
    super();

    // Initialize type indexes
    const nodeTypes: NodeType[] = ['bot', 'signal', 'trade', 'asset', 'regime', 'user', 'strategy', 'yield_source', 'life_event', 'decision', 'outcome', 'pattern', 'insight'];
    for (const type of nodeTypes) {
      this.nodesByType.set(type, new Set());
    }

    logger.info('MemoryGraph initialized');
  }

  public static getInstance(): MemoryGraphEngine {
    if (!MemoryGraphEngine.instance) {
      MemoryGraphEngine.instance = new MemoryGraphEngine();
    }
    return MemoryGraphEngine.instance;
  }

  // ===========================================================================
  // NODE OPERATIONS
  // ===========================================================================

  public addNode(node: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>): GraphNode {
    const id = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newNode: GraphNode = {
      ...node,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.nodes.set(id, newNode);
    this.nodesByType.get(node.type)?.add(id);
    this.adjacencyList.set(id, new Set());
    this.reverseAdjacency.set(id, new Set());

    this.emit('node_added', newNode);
    logger.debug('Node added', { id, type: node.type });

    return newNode;
  }

  public updateNode(id: string, updates: Partial<GraphNode['properties']>): GraphNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    node.properties = { ...node.properties, ...updates };
    node.updatedAt = new Date();
    if (node.metadata) {
      node.metadata.version = (node.metadata.version || 0) + 1;
    }

    this.emit('node_updated', node);
    return node;
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public getNodesByType(type: NodeType): GraphNode[] {
    const ids = this.nodesByType.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  public findNodes(filter: { type?: NodeType; properties?: Record<string, any> }): GraphNode[] {
    let nodes = Array.from(this.nodes.values());

    if (filter.type) {
      const typeIds = this.nodesByType.get(filter.type);
      if (!typeIds) return [];
      nodes = nodes.filter(n => typeIds.has(n.id));
    }

    if (filter.properties) {
      nodes = nodes.filter(n => {
        for (const [key, value] of Object.entries(filter.properties!)) {
          if (n.properties[key] !== value) return false;
        }
        return true;
      });
    }

    return nodes;
  }

  public deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove all connected edges
    const outgoingEdges = this.adjacencyList.get(id) || new Set();
    const incomingEdges = this.reverseAdjacency.get(id) || new Set();

    for (const edgeId of [...outgoingEdges, ...incomingEdges]) {
      this.deleteEdge(edgeId);
    }

    this.nodes.delete(id);
    this.nodesByType.get(node.type)?.delete(id);
    this.adjacencyList.delete(id);
    this.reverseAdjacency.delete(id);

    this.emit('node_deleted', { id, type: node.type });
    return true;
  }

  // ===========================================================================
  // EDGE OPERATIONS
  // ===========================================================================

  public addEdge(edge: Omit<GraphEdge, 'id' | 'createdAt'>): GraphEdge | null {
    // Verify nodes exist
    if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) {
      logger.warn('Cannot add edge - source or target node not found', {
        sourceId: edge.sourceId,
        targetId: edge.targetId
      });
      return null;
    }

    const id = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newEdge: GraphEdge = {
      ...edge,
      id,
      createdAt: new Date()
    };

    this.edges.set(id, newEdge);
    this.adjacencyList.get(edge.sourceId)?.add(id);
    this.reverseAdjacency.get(edge.targetId)?.add(id);

    // If bidirectional, also add reverse adjacency
    if (edge.metadata?.bidirectional) {
      this.adjacencyList.get(edge.targetId)?.add(id);
      this.reverseAdjacency.get(edge.sourceId)?.add(id);
    }

    this.emit('edge_added', newEdge);
    logger.debug('Edge added', { id, type: edge.type, source: edge.sourceId, target: edge.targetId });

    return newEdge;
  }

  public getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  public getEdgesBetween(sourceId: string, targetId: string): GraphEdge[] {
    const outgoing = this.adjacencyList.get(sourceId) || new Set();
    const edges: GraphEdge[] = [];

    for (const edgeId of outgoing) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.targetId === targetId) {
        edges.push(edge);
      }
    }

    return edges;
  }

  public getConnectedEdges(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): GraphEdge[] {
    const edges: GraphEdge[] = [];

    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = this.adjacencyList.get(nodeId) || new Set();
      for (const edgeId of outgoing) {
        const edge = this.edges.get(edgeId);
        if (edge && edge.sourceId === nodeId) edges.push(edge);
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      const incoming = this.reverseAdjacency.get(nodeId) || new Set();
      for (const edgeId of incoming) {
        const edge = this.edges.get(edgeId);
        if (edge && edge.targetId === nodeId) edges.push(edge);
      }
    }

    return edges;
  }

  public deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.adjacencyList.get(edge.sourceId)?.delete(id);
    this.reverseAdjacency.get(edge.targetId)?.delete(id);

    if (edge.metadata?.bidirectional) {
      this.adjacencyList.get(edge.targetId)?.delete(id);
      this.reverseAdjacency.get(edge.sourceId)?.delete(id);
    }

    this.edges.delete(id);
    this.emit('edge_deleted', { id, type: edge.type });
    return true;
  }

  // ===========================================================================
  // GRAPH TRAVERSAL
  // ===========================================================================

  public traverse(query: GraphQuery): GraphPath[] {
    const paths: GraphPath[] = [];
    const maxDepth = query.maxDepth || 5;
    const limit = query.limit || 100;

    // Find starting nodes
    let startNodes: GraphNode[] = [];
    if (query.startNodeId) {
      const node = this.nodes.get(query.startNodeId);
      if (node) startNodes = [node];
    } else if (query.startNodeType) {
      startNodes = this.getNodesByType(query.startNodeType);
      if (query.startNodeFilter) {
        startNodes = startNodes.filter(n => this.matchesFilter(n, query.startNodeFilter!));
      }
    }

    // BFS traversal
    for (const startNode of startNodes) {
      if (paths.length >= limit) break;

      const visited = new Set<string>();
      const queue: { node: GraphNode; path: GraphPath }[] = [{
        node: startNode,
        path: { nodes: [startNode], edges: [], totalWeight: 0, pathLength: 0 }
      }];

      while (queue.length > 0 && paths.length < limit) {
        const current = queue.shift()!;

        if (current.path.pathLength >= maxDepth) continue;
        if (visited.has(current.node.id)) continue;
        visited.add(current.node.id);

        // Check if this is an end node
        if (query.endNodeType && current.node.type === query.endNodeType) {
          if (!query.endNodeFilter || this.matchesFilter(current.node, query.endNodeFilter)) {
            if (current.path.pathLength > 0) { // Don't include start node only
              paths.push(current.path);
            }
          }
        }

        // Get connected edges
        const edges = this.getConnectedEdges(current.node.id, query.direction || 'both');

        for (const edge of edges) {
          // Filter by edge type
          if (query.edgeTypes && !query.edgeTypes.includes(edge.type)) continue;

          const nextNodeId = edge.sourceId === current.node.id ? edge.targetId : edge.sourceId;
          const nextNode = this.nodes.get(nextNodeId);
          if (!nextNode || visited.has(nextNodeId)) continue;

          const newPath: GraphPath = {
            nodes: [...current.path.nodes, nextNode],
            edges: [...current.path.edges, edge],
            totalWeight: current.path.totalWeight + edge.weight,
            pathLength: current.path.pathLength + 1
          };

          queue.push({ node: nextNode, path: newPath });
        }
      }
    }

    return paths.sort((a, b) => b.totalWeight - a.totalWeight);
  }

  private matchesFilter(node: GraphNode, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (node.properties[key] !== value) return false;
    }
    return true;
  }

  public findShortestPath(sourceId: string, targetId: string, edgeTypes?: EdgeType[]): GraphPath | null {
    const query: GraphQuery = {
      startNodeId: sourceId,
      endNodeFilter: {},
      edgeTypes,
      direction: 'both',
      maxDepth: 10,
      limit: 1
    };

    // Find target node type
    const targetNode = this.nodes.get(targetId);
    if (!targetNode) return null;

    query.endNodeType = targetNode.type;
    query.endNodeFilter = { id: targetId };

    const paths = this.traverse(query);
    return paths.length > 0 ? paths[0] : null;
  }

  public getNeighbors(nodeId: string, depth: number = 1): GraphNode[] {
    const neighbors = new Set<string>();
    const visited = new Set<string>();
    let currentLevel = new Set([nodeId]);

    for (let d = 0; d < depth; d++) {
      const nextLevel = new Set<string>();

      for (const id of currentLevel) {
        if (visited.has(id)) continue;
        visited.add(id);

        const edges = this.getConnectedEdges(id, 'both');
        for (const edge of edges) {
          const neighborId = edge.sourceId === id ? edge.targetId : edge.sourceId;
          if (!visited.has(neighborId)) {
            neighbors.add(neighborId);
            nextLevel.add(neighborId);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return Array.from(neighbors).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  // ===========================================================================
  // PATTERN & INSIGHT DISCOVERY
  // ===========================================================================

  public async discoverPatterns(): Promise<GraphInsight[]> {
    const insights: GraphInsight[] = [];

    // Find recurring signal -> outcome patterns
    const signalOutcomePatterns = await this.findSignalOutcomePatterns();
    insights.push(...signalOutcomePatterns);

    // Find regime -> bot performance patterns
    const regimeBotPatterns = await this.findRegimeBotPatterns();
    insights.push(...regimeBotPatterns);

    // Find asset correlation changes
    const correlationInsights = await this.findCorrelationChanges();
    insights.push(...correlationInsights);

    // Store insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    this.emit('patterns_discovered', insights);
    return insights;
  }

  private async findSignalOutcomePatterns(): Promise<GraphInsight[]> {
    const insights: GraphInsight[] = [];

    // Group signals by properties and analyze outcomes
    const signals = this.getNodesByType('signal');
    const signalGroups = new Map<string, GraphNode[]>();

    for (const signal of signals) {
      const key = `${signal.properties.botId}_${signal.properties.signalType}`;
      if (!signalGroups.has(key)) {
        signalGroups.set(key, []);
      }
      signalGroups.get(key)!.push(signal);
    }

    for (const [key, groupSignals] of signalGroups) {
      if (groupSignals.length < 5) continue; // Need enough samples

      // Find outcomes for these signals
      let winCount = 0;
      let totalOutcomes = 0;

      for (const signal of groupSignals) {
        const edges = this.getConnectedEdges(signal.id, 'outgoing');
        for (const edge of edges) {
          if (edge.type === 'resulted_in') {
            const outcome = this.nodes.get(edge.targetId);
            if (outcome?.properties.profitable) winCount++;
            totalOutcomes++;
          }
        }
      }

      if (totalOutcomes >= 5) {
        const winRate = winCount / totalOutcomes;
        if (winRate > 0.65 || winRate < 0.35) {
          insights.push({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'pattern',
            confidence: Math.min(0.5 + (totalOutcomes / 100), 0.95),
            description: winRate > 0.65
              ? `Signal pattern ${key} has ${(winRate * 100).toFixed(0)}% win rate over ${totalOutcomes} trades`
              : `Signal pattern ${key} has low ${(winRate * 100).toFixed(0)}% win rate - consider reviewing`,
            involvedNodes: groupSignals.map(s => s.id),
            involvedEdges: [],
            discoveredAt: new Date(),
            actionable: true,
            suggestedAction: winRate > 0.65
              ? 'Consider increasing allocation to this signal type'
              : 'Consider reducing or disabling this signal type'
          });
        }
      }
    }

    return insights;
  }

  private async findRegimeBotPatterns(): Promise<GraphInsight[]> {
    const insights: GraphInsight[] = [];

    const bots = this.getNodesByType('bot');
    const regimes = this.getNodesByType('regime');

    for (const bot of bots) {
      const botPerformanceByRegime = new Map<string, { wins: number; total: number }>();

      // Find trades made by this bot
      const botEdges = this.getConnectedEdges(bot.id, 'outgoing');
      for (const edge of botEdges) {
        if (edge.type !== 'generated') continue;

        const signal = this.nodes.get(edge.targetId);
        if (!signal) continue;

        // Find trades from this signal
        const signalEdges = this.getConnectedEdges(signal.id, 'outgoing');
        for (const sEdge of signalEdges) {
          if (sEdge.type !== 'executed') continue;

          const trade = this.nodes.get(sEdge.targetId);
          if (!trade) continue;

          // Find regime during trade
          const tradeEdges = this.getConnectedEdges(trade.id, 'outgoing');
          for (const tEdge of tradeEdges) {
            if (tEdge.type !== 'performed_in') continue;

            const regime = this.nodes.get(tEdge.targetId);
            if (!regime) continue;

            const regimeKey = regime.properties.type || 'unknown';
            if (!botPerformanceByRegime.has(regimeKey)) {
              botPerformanceByRegime.set(regimeKey, { wins: 0, total: 0 });
            }

            const perf = botPerformanceByRegime.get(regimeKey)!;
            perf.total++;
            if (trade.properties.profitable) perf.wins++;
          }
        }
      }

      // Generate insights for significant patterns
      for (const [regimeType, perf] of botPerformanceByRegime) {
        if (perf.total < 10) continue;

        const winRate = perf.wins / perf.total;
        if (winRate > 0.7 || winRate < 0.3) {
          insights.push({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'correlation',
            confidence: Math.min(0.5 + (perf.total / 50), 0.9),
            description: winRate > 0.7
              ? `Bot ${bot.label} excels in ${regimeType} regime (${(winRate * 100).toFixed(0)}% win rate)`
              : `Bot ${bot.label} struggles in ${regimeType} regime (${(winRate * 100).toFixed(0)}% win rate)`,
            involvedNodes: [bot.id],
            involvedEdges: [],
            discoveredAt: new Date(),
            actionable: true,
            suggestedAction: winRate > 0.7
              ? `Increase allocation to ${bot.label} during ${regimeType} regimes`
              : `Reduce or pause ${bot.label} during ${regimeType} regimes`
          });
        }
      }
    }

    return insights;
  }

  private async findCorrelationChanges(): Promise<GraphInsight[]> {
    const insights: GraphInsight[] = [];

    // Find correlated_with edges and check for changes
    const correlationEdges = Array.from(this.edges.values())
      .filter(e => e.type === 'correlated_with');

    // Group by asset pair and check recent vs historical
    // This is a simplified version - a real implementation would use time-series data

    return insights;
  }

  public getInsights(filter?: { type?: string; actionable?: boolean }): GraphInsight[] {
    let filtered = Array.from(this.insights.values());

    if (filter?.type) {
      filtered = filtered.filter(i => i.type === filter.type);
    }
    if (filter?.actionable !== undefined) {
      filtered = filtered.filter(i => i.actionable === filter.actionable);
    }

    return filtered.sort((a, b) => b.confidence - a.confidence);
  }

  // ===========================================================================
  // STATISTICS & HEALTH
  // ===========================================================================

  public getStats(): GraphStats {
    const nodesByType: Record<string, number> = {};
    const edgesByType: Record<string, number> = {};

    for (const [type, ids] of this.nodesByType) {
      nodesByType[type] = ids.size;
    }

    for (const edge of this.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const maxPossibleEdges = totalNodes * (totalNodes - 1);
    const graphDensity = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;

    return {
      totalNodes,
      totalEdges,
      nodesByType: nodesByType as Record<NodeType, number>,
      edgesByType: edgesByType as Record<EdgeType, number>,
      avgEdgesPerNode: totalNodes > 0 ? totalEdges / totalNodes : 0,
      graphDensity,
      lastUpdated: new Date()
    };
  }

  public getHealth(): { status: string; health: number; details: Record<string, any> } {
    const stats = this.getStats();

    return {
      status: 'online',
      health: 100,
      details: {
        totalNodes: stats.totalNodes,
        totalEdges: stats.totalEdges,
        insights: this.insights.size,
        graphDensity: stats.graphDensity
      }
    };
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  public export(): { nodes: GraphNode[]; edges: GraphEdge[]; insights: GraphInsight[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      insights: Array.from(this.insights.values())
    };
  }

  public import(data: { nodes: GraphNode[]; edges: GraphEdge[]; insights?: GraphInsight[] }): void {
    // Clear existing data
    this.nodes.clear();
    this.edges.clear();
    this.insights.clear();

    for (const type of this.nodesByType.keys()) {
      this.nodesByType.get(type)?.clear();
    }
    this.adjacencyList.clear();
    this.reverseAdjacency.clear();

    // Import nodes
    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
      this.nodesByType.get(node.type)?.add(node.id);
      this.adjacencyList.set(node.id, new Set());
      this.reverseAdjacency.set(node.id, new Set());
    }

    // Import edges
    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
      this.adjacencyList.get(edge.sourceId)?.add(edge.id);
      this.reverseAdjacency.get(edge.targetId)?.add(edge.id);
    }

    // Import insights
    if (data.insights) {
      for (const insight of data.insights) {
        this.insights.set(insight.id, insight);
      }
    }

    logger.info('Graph imported', { nodes: data.nodes.length, edges: data.edges.length });
    this.emit('imported', this.getStats());
  }
}

// Export singleton
export const memoryGraph = MemoryGraphEngine.getInstance();
