/**
 * Interactive Brokers (IBKR) Client
 *
 * Integration with Interactive Brokers TWS/Gateway API:
 * - Real-time market data streaming
 * - Trade execution across all asset classes
 * - Account management and portfolio tracking
 * - Historical data retrieval
 * - Options chain data
 *
 * Uses the IB TWS API (typically via socket connection to TWS or IB Gateway)
 */

import { EventEmitter } from 'events';
import * as net from 'net';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface IBConfig {
  host: string;
  port: number;
  clientId: number;
  readOnly: boolean;
}

export interface IBContract {
  conId?: number;
  symbol: string;
  secType: 'STK' | 'OPT' | 'FUT' | 'CASH' | 'CFD' | 'CRYPTO' | 'BOND' | 'CMDTY' | 'IND';
  lastTradeDateOrContractMonth?: string;
  strike?: number;
  right?: 'C' | 'P';
  multiplier?: string;
  exchange: string;
  primaryExchange?: string;
  currency: string;
  localSymbol?: string;
  tradingClass?: string;
}

export interface IBOrder {
  orderId: number;
  clientId: number;
  permId?: number;
  action: 'BUY' | 'SELL';
  totalQuantity: number;
  orderType: 'MKT' | 'LMT' | 'STP' | 'STP_LMT' | 'MOC' | 'LOC' | 'MIT' | 'LIT';
  lmtPrice?: number;
  auxPrice?: number;
  tif: 'DAY' | 'GTC' | 'IOC' | 'FOK' | 'OPG' | 'GTD' | 'DTC';
  goodTillDate?: string;
  account?: string;
  transmit?: boolean;
  parentId?: number;
  outsideRth?: boolean;
}

export interface IBOrderStatus {
  orderId: number;
  status: 'PendingSubmit' | 'PendingCancel' | 'PreSubmitted' | 'Submitted' | 'ApiCancelled' | 'Cancelled' | 'Filled' | 'Inactive';
  filled: number;
  remaining: number;
  avgFillPrice: number;
  permId: number;
  parentId: number;
  lastFillPrice: number;
  clientId: number;
  whyHeld: string;
}

export interface IBExecution {
  execId: string;
  time: Date;
  acctNumber: string;
  exchange: string;
  side: 'BOT' | 'SLD';
  shares: number;
  price: number;
  permId: number;
  clientId: number;
  orderId: number;
  liquidation: number;
  cumQty: number;
  avgPrice: number;
}

export interface IBPosition {
  account: string;
  contract: IBContract;
  position: number;
  avgCost: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
  marketValue?: number;
}

export interface IBAccountValue {
  key: string;
  value: string;
  currency: string;
  accountName: string;
}

export interface IBTickData {
  reqId: number;
  tickType: number;
  price?: number;
  size?: number;
  time?: number;
  exchange?: string;
}

export interface IBBarData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  wap: number;
  count: number;
}

// ============================================================
// IB CLIENT CLASS
// ============================================================

class IBClient extends EventEmitter {
  private config: IBConfig = {
    host: '127.0.0.1',
    port: 7497, // TWS paper trading default
    clientId: 1,
    readOnly: false,
  };

  private socket: net.Socket | null = null;
  private connected: boolean = false;
  private serverVersion: number = 0;
  private nextOrderId: number = 0;
  private nextReqId: number = 1;
  private buffer: string = '';

  // Request tracking
  private marketDataReqs: Map<number, { symbol: string; callback?: (data: IBTickData) => void }> = new Map();
  private historicalDataReqs: Map<number, { resolve: Function; data: IBBarData[] }> = new Map();
  private orderCallbacks: Map<number, Function> = new Map();

  // Account data
  private accountSummary: Map<string, IBAccountValue> = new Map();
  private positions: Map<string, IBPosition> = new Map();
  private orders: Map<number, { order: IBOrder; status?: IBOrderStatus }> = new Map();

  constructor(config?: Partial<IBConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // ============================================================
  // CONNECTION MANAGEMENT
  // ============================================================

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve(true);
        return;
      }

      this.socket = new net.Socket();

      this.socket.on('connect', () => {
        console.log('[IBClient] Socket connected');
        this.sendHandshake();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('close', () => {
        console.log('[IBClient] Connection closed');
        this.connected = false;
        this.emit('disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('[IBClient] Connection error:', error);
        this.emit('error', error);
        reject(error);
      });

      // Set up connection success handler
      const onConnected = () => {
        this.removeListener('connected', onConnected);
        resolve(true);
      };
      this.on('connected', onConnected);

      // Connect with timeout
      this.socket.connect(this.config.port, this.config.host);

      setTimeout(() => {
        if (!this.connected) {
          this.removeListener('connected', onConnected);
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.emit('disconnected');
  }

  private sendHandshake(): void {
    // IB API handshake: send API version
    const clientVersion = 'v100..179';
    this.sendRaw(`API\0${clientVersion}`);

    // Start API with client ID
    this.send([71, 2, this.config.clientId, '']);
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();

    // Parse messages (IB uses null-delimited messages)
    const messages = this.buffer.split('\0');
    this.buffer = messages.pop() || '';

    let i = 0;
    while (i < messages.length) {
      const msgCode = parseInt(messages[i], 10);

      if (isNaN(msgCode)) {
        i++;
        continue;
      }

      // Parse message based on code
      const result = this.parseMessage(msgCode, messages.slice(i + 1));
      i += 1 + result.consumed;
    }
  }

  private parseMessage(code: number, fields: string[]): { consumed: number } {
    // Simplified message parsing - actual IB API is more complex
    switch (code) {
      case 4: // Error message
        this.handleError(fields);
        return { consumed: 5 };

      case 9: // Next valid order ID
        this.nextOrderId = parseInt(fields[1], 10) || 1;
        if (!this.connected) {
          this.connected = true;
          console.log('[IBClient] Connected to TWS');
          this.emit('connected', { serverVersion: this.serverVersion, nextOrderId: this.nextOrderId });
        }
        return { consumed: 3 };

      case 1: // Tick price
        this.handleTickPrice(fields);
        return { consumed: 6 };

      case 2: // Tick size
        this.handleTickSize(fields);
        return { consumed: 5 };

      case 3: // Order status
        this.handleOrderStatus(fields);
        return { consumed: 15 };

      case 5: // Open order
        this.handleOpenOrder(fields);
        return { consumed: 50 };

      case 6: // Account value
        this.handleAccountValue(fields);
        return { consumed: 6 };

      case 7: // Portfolio value
        this.handlePortfolioValue(fields);
        return { consumed: 20 };

      case 11: // Execution data
        this.handleExecution(fields);
        return { consumed: 25 };

      case 17: // Historical data
        this.handleHistoricalData(fields);
        return { consumed: 10 };

      default:
        return { consumed: 1 };
    }
  }

  // ============================================================
  // MESSAGE HANDLERS
  // ============================================================

  private handleError(fields: string[]): void {
    const reqId = parseInt(fields[1], 10);
    const errorCode = parseInt(fields[2], 10);
    const errorMsg = fields[3];

    // Some errors are just informational (codes 2104, 2106, 2158)
    const infoOnlyCodes = [2104, 2106, 2107, 2108, 2158];

    if (infoOnlyCodes.includes(errorCode)) {
      console.log(`[IBClient] Info: ${errorMsg}`);
    } else {
      console.error(`[IBClient] Error ${errorCode}: ${errorMsg} (reqId: ${reqId})`);
      this.emit('error', { reqId, errorCode, errorMsg });
    }
  }

  private handleTickPrice(fields: string[]): void {
    const reqId = parseInt(fields[1], 10);
    const tickType = parseInt(fields[2], 10);
    const price = parseFloat(fields[3]);

    const req = this.marketDataReqs.get(reqId);
    if (req?.callback) {
      req.callback({ reqId, tickType, price });
    }

    this.emit('tick', { reqId, tickType, price, symbol: req?.symbol });
  }

  private handleTickSize(fields: string[]): void {
    const reqId = parseInt(fields[1], 10);
    const tickType = parseInt(fields[2], 10);
    const size = parseInt(fields[3], 10);

    this.emit('tick', { reqId, tickType, size });
  }

  private handleOrderStatus(fields: string[]): void {
    const status: IBOrderStatus = {
      orderId: parseInt(fields[1], 10),
      status: fields[2] as IBOrderStatus['status'],
      filled: parseFloat(fields[3]),
      remaining: parseFloat(fields[4]),
      avgFillPrice: parseFloat(fields[5]),
      permId: parseInt(fields[6], 10),
      parentId: parseInt(fields[7], 10),
      lastFillPrice: parseFloat(fields[8]),
      clientId: parseInt(fields[9], 10),
      whyHeld: fields[10] || '',
    };

    const orderEntry = this.orders.get(status.orderId);
    if (orderEntry) {
      orderEntry.status = status;
    }

    this.emit('orderStatus', status);

    const callback = this.orderCallbacks.get(status.orderId);
    if (callback && (status.status === 'Filled' || status.status === 'Cancelled' || status.status === 'ApiCancelled')) {
      callback(status);
      this.orderCallbacks.delete(status.orderId);
    }
  }

  private handleOpenOrder(fields: string[]): void {
    const orderId = parseInt(fields[1], 10);

    // Parse contract and order from fields
    // Simplified - actual implementation needs full parsing

    this.emit('openOrder', { orderId, fields });
  }

  private handleAccountValue(fields: string[]): void {
    const value: IBAccountValue = {
      key: fields[2],
      value: fields[3],
      currency: fields[4],
      accountName: fields[5],
    };

    this.accountSummary.set(`${value.accountName}-${value.key}-${value.currency}`, value);
    this.emit('accountValue', value);
  }

  private handlePortfolioValue(fields: string[]): void {
    const conId = parseInt(fields[1], 10);
    const symbol = fields[2];
    const position = parseFloat(fields[9]);
    const avgCost = parseFloat(fields[11]);
    const marketValue = parseFloat(fields[10]);
    const unrealizedPnL = parseFloat(fields[12]);
    const realizedPnL = parseFloat(fields[13]);
    const account = fields[14];

    const positionData: IBPosition = {
      account,
      contract: {
        conId,
        symbol,
        secType: fields[3] as IBContract['secType'],
        exchange: fields[7],
        currency: fields[8],
      },
      position,
      avgCost,
      marketValue,
      unrealizedPnL,
      realizedPnL,
    };

    this.positions.set(`${account}-${conId}`, positionData);
    this.emit('position', positionData);
  }

  private handleExecution(fields: string[]): void {
    const execution: IBExecution = {
      execId: fields[4],
      time: new Date(fields[5]),
      acctNumber: fields[6],
      exchange: fields[7],
      side: fields[8] as 'BOT' | 'SLD',
      shares: parseFloat(fields[9]),
      price: parseFloat(fields[10]),
      permId: parseInt(fields[11], 10),
      clientId: parseInt(fields[12], 10),
      orderId: parseInt(fields[13], 10),
      liquidation: parseInt(fields[14], 10),
      cumQty: parseFloat(fields[15]),
      avgPrice: parseFloat(fields[16]),
    };

    this.emit('execution', execution);
  }

  private handleHistoricalData(fields: string[]): void {
    const reqId = parseInt(fields[1], 10);
    const req = this.historicalDataReqs.get(reqId);
    if (!req) return;

    const date = fields[2];
    if (date === 'finished') {
      req.resolve(req.data);
      this.historicalDataReqs.delete(reqId);
      return;
    }

    const bar: IBBarData = {
      time: new Date(date),
      open: parseFloat(fields[3]),
      high: parseFloat(fields[4]),
      low: parseFloat(fields[5]),
      close: parseFloat(fields[6]),
      volume: parseInt(fields[7], 10),
      wap: parseFloat(fields[8]),
      count: parseInt(fields[9], 10),
    };

    req.data.push(bar);
  }

  // ============================================================
  // PUBLIC API - MARKET DATA
  // ============================================================

  async requestMarketData(contract: IBContract, callback?: (data: IBTickData) => void): Promise<number> {
    const reqId = this.nextReqId++;

    this.marketDataReqs.set(reqId, { symbol: contract.symbol, callback });

    // Simplified - actual message is more complex
    this.send([1, 11, reqId, contract.conId || 0, contract.symbol, contract.secType,
      contract.lastTradeDateOrContractMonth || '', contract.strike || 0, contract.right || '',
      contract.multiplier || '', contract.exchange, contract.primaryExchange || '',
      contract.currency, contract.localSymbol || '', contract.tradingClass || '',
      0, '', false, '', '']);

    return reqId;
  }

  cancelMarketData(reqId: number): void {
    this.marketDataReqs.delete(reqId);
    this.send([2, 2, reqId]);
  }

  async requestHistoricalData(
    contract: IBContract,
    endDateTime: string,
    duration: string,
    barSize: string,
    whatToShow: string
  ): Promise<IBBarData[]> {
    const reqId = this.nextReqId++;

    return new Promise((resolve, reject) => {
      this.historicalDataReqs.set(reqId, { resolve, data: [] });

      this.send([20, 6, reqId, contract.conId || 0, contract.symbol, contract.secType,
        contract.lastTradeDateOrContractMonth || '', contract.strike || 0, contract.right || '',
        contract.multiplier || '', contract.exchange, contract.primaryExchange || '',
        contract.currency, contract.localSymbol || '', contract.tradingClass || '',
        0, endDateTime, barSize, duration, 1, whatToShow, 1, '', '', '']);

      setTimeout(() => {
        if (this.historicalDataReqs.has(reqId)) {
          this.historicalDataReqs.delete(reqId);
          reject(new Error('Historical data request timeout'));
        }
      }, 60000);
    });
  }

  // ============================================================
  // PUBLIC API - ORDERS
  // ============================================================

  placeOrder(contract: IBContract, order: Partial<IBOrder>): number {
    const orderId = this.nextOrderId++;

    const fullOrder: IBOrder = {
      orderId,
      clientId: this.config.clientId,
      action: order.action || 'BUY',
      totalQuantity: order.totalQuantity || 1,
      orderType: order.orderType || 'MKT',
      lmtPrice: order.lmtPrice,
      auxPrice: order.auxPrice,
      tif: order.tif || 'DAY',
      transmit: order.transmit !== false,
      outsideRth: order.outsideRth || false,
      ...order,
    };

    this.orders.set(orderId, { order: fullOrder });

    // Simplified order message
    this.send([3, 45, orderId, contract.conId || 0, contract.symbol, contract.secType,
      contract.lastTradeDateOrContractMonth || '', contract.strike || 0, contract.right || '',
      contract.multiplier || '', contract.exchange, contract.primaryExchange || '',
      contract.currency, contract.localSymbol || '', contract.tradingClass || '',
      0, fullOrder.action, fullOrder.totalQuantity, fullOrder.orderType,
      fullOrder.lmtPrice || '', fullOrder.auxPrice || '', fullOrder.tif,
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      fullOrder.transmit ? 1 : 0, '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', fullOrder.outsideRth ? 1 : 0]);

    return orderId;
  }

  async placeOrderAsync(contract: IBContract, order: Partial<IBOrder>): Promise<IBOrderStatus> {
    return new Promise((resolve, reject) => {
      const orderId = this.placeOrder(contract, order);

      this.orderCallbacks.set(orderId, (status: IBOrderStatus) => {
        resolve(status);
      });

      setTimeout(() => {
        if (this.orderCallbacks.has(orderId)) {
          this.orderCallbacks.delete(orderId);
          reject(new Error('Order timeout'));
        }
      }, 120000);
    });
  }

  cancelOrder(orderId: number): void {
    this.send([4, 1, orderId, '']);
  }

  cancelAllOrders(): void {
    this.send([58, 1]);
  }

  // ============================================================
  // PUBLIC API - ACCOUNT
  // ============================================================

  requestAccountSummary(): number {
    const reqId = this.nextReqId++;
    this.send([62, 1, reqId, 'All', 'NetLiquidation,TotalCashValue,SettledCash,AccruedCash,BuyingPower,EquityWithLoanValue,PreviousDayEquityWithLoanValue,GrossPositionValue,RegTEquity,RegTMargin,SMA,InitMarginReq,MaintMarginReq,AvailableFunds,ExcessLiquidity,Cushion,FullInitMarginReq,FullMaintMarginReq,FullAvailableFunds,FullExcessLiquidity,LookAheadNextChange,LookAheadInitMarginReq,LookAheadMaintMarginReq,LookAheadAvailableFunds,LookAheadExcessLiquidity,HighestSeverity,DayTradesRemaining,Leverage']);
    return reqId;
  }

  requestPositions(): void {
    this.send([61, 1]);
  }

  requestAccountUpdates(subscribe: boolean, account: string): void {
    this.send([6, 2, subscribe ? 1 : 0, account]);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private send(fields: (string | number | boolean)[]): void {
    const msg = fields.map(f => f.toString()).join('\0') + '\0';
    this.sendRaw(msg);
  }

  private sendRaw(msg: string): void {
    if (this.socket && this.connected || msg.startsWith('API')) {
      // IB API requires length prefix (4 bytes big-endian)
      const buf = Buffer.alloc(4 + msg.length);
      buf.writeUInt32BE(msg.length, 0);
      buf.write(msg, 4);
      this.socket?.write(buf);
    }
  }

  getNextOrderId(): number {
    return this.nextOrderId++;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAccountSummary(): Map<string, IBAccountValue> {
    return this.accountSummary;
  }

  getPositions(): Map<string, IBPosition> {
    return this.positions;
  }

  getOrders(): Map<number, { order: IBOrder; status?: IBOrderStatus }> {
    return this.orders;
  }

  getState(): {
    connected: boolean;
    serverVersion: number;
    nextOrderId: number;
    accountCount: number;
    positionCount: number;
    openOrderCount: number;
  } {
    return {
      connected: this.connected,
      serverVersion: this.serverVersion,
      nextOrderId: this.nextOrderId,
      accountCount: this.accountSummary.size,
      positionCount: this.positions.size,
      openOrderCount: this.orders.size,
    };
  }
}

// Export singleton and class
export const ibClient = new IBClient();
export { IBClient };
export default ibClient;
