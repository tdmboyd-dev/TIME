/**
 * TIME ACATS Transfer System
 *
 * Automated Customer Account Transfer Service - enables stock transfers
 * between brokerages, just like Vanguard, Fidelity, and Schwab.
 *
 * PLAIN ENGLISH:
 * - ACATS lets you move your investments from one broker to another
 * - You keep your stocks/ETFs (called "in-kind" transfer)
 * - Or you can convert to cash and transfer dollars
 * - Takes 5-7 business days typically
 * - The receiving broker (TIME) initiates the transfer
 *
 * HOW IT WORKS:
 * 1. User fills out transfer request form
 * 2. TIME sends request to NSCC (National Securities Clearing Corporation)
 * 3. NSCC routes to delivering broker (your old broker)
 * 4. Delivering broker validates and sends assets
 * 5. DTCC (Depository Trust) moves the securities
 * 6. Assets appear in your TIME account
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

// Transfer types
export type TransferType = 'full' | 'partial';
export type AssetTransferType = 'in_kind' | 'cash';

// Transfer status lifecycle
export type TransferStatus =
  | 'draft' // User started but not submitted
  | 'pending_validation' // Validating user info
  | 'submitted' // Sent to NSCC
  | 'received_by_delivering' // Delivering broker received request
  | 'in_review' // Under review (may need signature)
  | 'approved' // Approved, assets being moved
  | 'in_progress' // Assets actively being transferred
  | 'partial_complete' // Some assets transferred
  | 'completed' // All done
  | 'rejected' // Delivering broker rejected
  | 'cancelled' // User cancelled
  | 'failed'; // Technical failure

// Common rejection reasons
export const REJECTION_REASONS = {
  INVALID_ACCOUNT: 'Account number does not match records',
  NAME_MISMATCH: 'Account holder name does not match',
  SSN_MISMATCH: 'SSN/TIN does not match records',
  INSUFFICIENT_ASSETS: 'Requested assets not available in account',
  MARGIN_BALANCE: 'Outstanding margin balance must be settled',
  PENDING_ORDERS: 'Account has pending orders that must be cancelled',
  RESTRICTED_ASSETS: 'Some assets are restricted from transfer',
  SIGNATURE_REQUIRED: 'Medallion signature guarantee required',
  ACCOUNT_FROZEN: 'Account is frozen or restricted',
};

// Supported delivering brokers
export const SUPPORTED_BROKERS = [
  { id: 'fidelity', name: 'Fidelity Investments', dtcNumber: '0226' },
  { id: 'schwab', name: 'Charles Schwab', dtcNumber: '0164' },
  { id: 'vanguard', name: 'Vanguard', dtcNumber: '0062' },
  { id: 'td_ameritrade', name: 'TD Ameritrade', dtcNumber: '0188' },
  { id: 'etrade', name: 'E*TRADE', dtcNumber: '0385' },
  { id: 'robinhood', name: 'Robinhood', dtcNumber: '6769' },
  { id: 'webull', name: 'Webull', dtcNumber: '8884' },
  { id: 'interactive_brokers', name: 'Interactive Brokers', dtcNumber: '0534' },
  { id: 'merrill', name: 'Merrill Edge', dtcNumber: '8862' },
  { id: 'morgan_stanley', name: 'Morgan Stanley', dtcNumber: '0015' },
  { id: 'jpmorgan', name: 'J.P. Morgan', dtcNumber: '0352' },
  { id: 'other', name: 'Other Broker', dtcNumber: '' },
];

// Asset being transferred
export interface TransferAsset {
  symbol: string;
  cusip?: string; // Committee on Uniform Securities Identification Procedures
  description: string;
  quantity: number;
  estimatedValue: number;
  transferType: AssetTransferType;
  status: 'pending' | 'transferred' | 'failed' | 'partial';
  notes?: string;
}

// Main transfer request
export interface ACATSTransfer {
  // Identifiers
  id: string;
  userId: string;
  requestNumber: string; // ACATS control number

  // Transfer details
  transferType: TransferType;
  assetTransferType: AssetTransferType;

  // Delivering broker (where assets are coming from)
  deliveringBroker: {
    brokerId: string;
    brokerName: string;
    dtcNumber: string;
    accountNumber: string;
    accountTitle: string; // Name on account
  };

  // Receiving account (TIME account)
  receivingAccount: {
    accountId: string;
    accountNumber: string;
    accountTitle: string;
  };

  // Identity verification
  identity: {
    fullName: string;
    ssnLast4: string;
    dateOfBirth: string; // YYYY-MM-DD format
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  // Assets to transfer
  assets: TransferAsset[];
  totalEstimatedValue: number;

  // Status tracking
  status: TransferStatus;
  statusHistory: {
    status: TransferStatus;
    timestamp: Date;
    message: string;
    details?: any;
  }[];

  // Dates
  createdAt: Date;
  submittedAt: Date | null;
  expectedCompletionDate: Date | null;
  completedAt: Date | null;

  // Issues
  rejectionReason: string | null;
  issues: {
    type: 'warning' | 'error';
    message: string;
    resolvedAt: Date | null;
  }[];

  // Documents
  documents: {
    type: 'transfer_form' | 'account_statement' | 'signature';
    fileName: string;
    uploadedAt: Date;
    verified: boolean;
  }[];

  // Fees (typically $0 for receiving broker)
  fees: {
    type: string;
    amount: number;
    waived: boolean;
  }[];

  // Notes
  userNotes: string | null;
  internalNotes: string | null;
}

// Transfer initiation request
export interface TransferRequest {
  userId: string;
  receivingAccountId: string;
  transferType: TransferType;
  deliveringBrokerId: string;
  deliveringAccountNumber: string;
  deliveringAccountTitle: string;
  ssnLast4: string;
  assets?: {
    symbol: string;
    quantity?: number; // For partial transfers
  }[];
}

/**
 * Generate transfer request ID
 */
function generateTransferId(): string {
  return `xfer_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Generate ACATS control number (simulated)
 */
function generateControlNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ACATS${date}${random}`;
}

/**
 * Calculate expected completion date (5-7 business days)
 */
function calculateExpectedCompletion(): Date {
  const date = new Date();
  let businessDays = 0;
  const targetDays = 7;

  while (businessDays < targetDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return date;
}

export class ACATSTransferManager {
  private transfers: Map<string, ACATSTransfer> = new Map();
  private userTransfers: Map<string, string[]> = new Map();

  /**
   * Initiate a new ACATS transfer
   *
   * PLAIN ENGLISH:
   * - Starts the process of moving your investments to TIME
   * - Validates your information matches what's on file
   * - Creates a transfer request that will be sent to your old broker
   */
  async initiateTransfer(
    request: TransferRequest,
    userInfo: {
      fullName: string;
      dateOfBirth: string;
      address: ACATSTransfer['identity']['address'];
    }
  ): Promise<ACATSTransfer> {
    // Find broker info
    const broker = SUPPORTED_BROKERS.find((b) => b.id === request.deliveringBrokerId);
    if (!broker) {
      throw new Error('Unsupported delivering broker');
    }

    // Validate SSN format (last 4 digits)
    if (!/^\d{4}$/.test(request.ssnLast4)) {
      throw new Error('Invalid SSN format - provide last 4 digits only');
    }

    // Create transfer record
    const transfer: ACATSTransfer = {
      id: generateTransferId(),
      userId: request.userId,
      requestNumber: generateControlNumber(),

      transferType: request.transferType,
      assetTransferType: 'in_kind', // Default to keeping assets

      deliveringBroker: {
        brokerId: broker.id,
        brokerName: broker.name,
        dtcNumber: broker.dtcNumber,
        accountNumber: request.deliveringAccountNumber,
        accountTitle: request.deliveringAccountTitle,
      },

      receivingAccount: {
        accountId: request.receivingAccountId,
        accountNumber: `TIME${request.receivingAccountId.slice(-8)}`,
        accountTitle: userInfo.fullName,
      },

      identity: {
        fullName: userInfo.fullName,
        ssnLast4: request.ssnLast4,
        dateOfBirth: userInfo.dateOfBirth,
        address: userInfo.address,
      },

      assets: [],
      totalEstimatedValue: 0,

      status: 'draft',
      statusHistory: [
        {
          status: 'draft',
          timestamp: new Date(),
          message: 'Transfer request created',
        },
      ],

      createdAt: new Date(),
      submittedAt: null,
      expectedCompletionDate: null,
      completedAt: null,

      rejectionReason: null,
      issues: [],
      documents: [],
      fees: [],

      userNotes: null,
      internalNotes: null,
    };

    // Add specific assets for partial transfer
    if (request.transferType === 'partial' && request.assets) {
      for (const asset of request.assets) {
        transfer.assets.push({
          symbol: asset.symbol,
          description: asset.symbol, // Will be enriched later
          quantity: asset.quantity || 0,
          estimatedValue: 0, // Will be calculated
          transferType: 'in_kind',
          status: 'pending',
        });
      }
    }

    // Store transfer
    this.transfers.set(transfer.id, transfer);

    // Index by user
    const userXfers = this.userTransfers.get(request.userId) || [];
    userXfers.push(transfer.id);
    this.userTransfers.set(request.userId, userXfers);

    logger.info('ACATS transfer initiated', {
      transferId: transfer.id,
      userId: request.userId,
      deliveringBroker: broker.name,
      type: request.transferType,
    });

    return transfer;
  }

  /**
   * Submit transfer request (sends to clearing)
   */
  async submitTransfer(transferId: string): Promise<ACATSTransfer> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'draft') {
      throw new Error(`Cannot submit transfer in ${transfer.status} status`);
    }

    // Validate required documents
    const hasTransferForm = transfer.documents.some((d) => d.type === 'transfer_form');
    if (!hasTransferForm) {
      transfer.issues.push({
        type: 'warning',
        message: 'Transfer authorization form not uploaded',
        resolvedAt: null,
      });
    }

    // Update status
    transfer.status = 'pending_validation';
    transfer.submittedAt = new Date();
    transfer.expectedCompletionDate = calculateExpectedCompletion();

    transfer.statusHistory.push({
      status: 'pending_validation',
      timestamp: new Date(),
      message: 'Transfer submitted for validation',
    });

    // Simulate async validation
    setTimeout(() => this.processValidation(transferId), 2000);

    logger.info('ACATS transfer submitted', {
      transferId,
      controlNumber: transfer.requestNumber,
    });

    return transfer;
  }

  /**
   * Process validation (simulated NSCC response)
   */
  private async processValidation(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    // Simulate validation passing
    transfer.status = 'submitted';
    transfer.statusHistory.push({
      status: 'submitted',
      timestamp: new Date(),
      message: 'Validation passed. Request sent to delivering broker.',
    });

    // Simulate delivering broker receiving
    setTimeout(() => this.processDeliveringBrokerResponse(transferId), 5000);
  }

  /**
   * Process delivering broker response (simulated)
   */
  private async processDeliveringBrokerResponse(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    // Simulate successful receipt
    transfer.status = 'received_by_delivering';
    transfer.statusHistory.push({
      status: 'received_by_delivering',
      timestamp: new Date(),
      message: `${transfer.deliveringBroker.brokerName} received transfer request`,
    });

    // Continue simulation...
    setTimeout(() => this.processApproval(transferId), 10000);
  }

  /**
   * Process approval (simulated)
   */
  private async processApproval(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    transfer.status = 'approved';
    transfer.statusHistory.push({
      status: 'approved',
      timestamp: new Date(),
      message: 'Transfer approved. Assets being prepared for transfer.',
    });

    setTimeout(() => this.processInProgress(transferId), 5000);
  }

  /**
   * Process in progress (simulated)
   */
  private async processInProgress(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    transfer.status = 'in_progress';
    transfer.statusHistory.push({
      status: 'in_progress',
      timestamp: new Date(),
      message: 'Assets are being transferred via DTCC.',
    });

    // Complete after delay
    setTimeout(() => this.processCompletion(transferId), 15000);
  }

  /**
   * Process completion (simulated)
   */
  private async processCompletion(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    // Mark all assets as transferred
    for (const asset of transfer.assets) {
      asset.status = 'transferred';
    }

    transfer.status = 'completed';
    transfer.completedAt = new Date();
    transfer.statusHistory.push({
      status: 'completed',
      timestamp: new Date(),
      message: 'Transfer completed. All assets are now in your TIME account.',
    });

    logger.info('ACATS transfer completed', {
      transferId,
      userId: transfer.userId,
      assetCount: transfer.assets.length,
    });
  }

  /**
   * Get transfer by ID
   */
  getTransfer(transferId: string): ACATSTransfer | null {
    return this.transfers.get(transferId) || null;
  }

  /**
   * Get all transfers for a user
   */
  getUserTransfers(userId: string): ACATSTransfer[] {
    const transferIds = this.userTransfers.get(userId) || [];
    return transferIds
      .map((id) => this.transfers.get(id))
      .filter((t): t is ACATSTransfer => t !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancel a transfer (only if not yet approved)
   */
  async cancelTransfer(transferId: string, userId: string): Promise<ACATSTransfer> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const cancellableStatuses: TransferStatus[] = [
      'draft',
      'pending_validation',
      'submitted',
    ];

    if (!cancellableStatuses.includes(transfer.status)) {
      throw new Error(`Cannot cancel transfer in ${transfer.status} status`);
    }

    transfer.status = 'cancelled';
    transfer.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      message: 'Transfer cancelled by user',
    });

    logger.info('ACATS transfer cancelled', { transferId, userId });

    return transfer;
  }

  /**
   * Add document to transfer
   */
  addDocument(
    transferId: string,
    document: ACATSTransfer['documents'][0]
  ): ACATSTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    transfer.documents.push(document);

    logger.info('Document added to transfer', {
      transferId,
      documentType: document.type,
    });

    return transfer;
  }

  /**
   * Add/update assets for partial transfer
   */
  updateAssets(
    transferId: string,
    assets: Omit<TransferAsset, 'status'>[]
  ): ACATSTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'draft') {
      throw new Error('Can only update assets in draft status');
    }

    transfer.assets = assets.map((a) => ({
      ...a,
      status: 'pending' as const,
    }));

    transfer.totalEstimatedValue = assets.reduce((sum, a) => sum + a.estimatedValue, 0);

    return transfer;
  }

  /**
   * Get transfer statistics
   */
  getStatistics(): {
    totalTransfers: number;
    byStatus: Record<TransferStatus, number>;
    averageCompletionDays: number;
    byBroker: { broker: string; count: number }[];
  } {
    const transfers = Array.from(this.transfers.values());

    const byStatus: Record<string, number> = {};
    const byBroker: Record<string, number> = {};
    let totalDays = 0;
    let completedCount = 0;

    for (const transfer of transfers) {
      byStatus[transfer.status] = (byStatus[transfer.status] || 0) + 1;
      byBroker[transfer.deliveringBroker.brokerName] =
        (byBroker[transfer.deliveringBroker.brokerName] || 0) + 1;

      if (transfer.status === 'completed' && transfer.completedAt && transfer.submittedAt) {
        const days =
          (transfer.completedAt.getTime() - transfer.submittedAt.getTime()) /
          (24 * 60 * 60 * 1000);
        totalDays += days;
        completedCount++;
      }
    }

    return {
      totalTransfers: transfers.length,
      byStatus: byStatus as Record<TransferStatus, number>,
      averageCompletionDays: completedCount > 0 ? totalDays / completedCount : 0,
      byBroker: Object.entries(byBroker)
        .map(([broker, count]) => ({ broker, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Get list of supported brokers
   */
  getSupportedBrokers(): typeof SUPPORTED_BROKERS {
    return SUPPORTED_BROKERS;
  }
}

// Export singleton instance
export const acatsManager = new ACATSTransferManager();

logger.info('ACATS Transfer Manager initialized - Stock transfers enabled');
