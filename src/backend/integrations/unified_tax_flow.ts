/**
 * Unified Tax Filing Flow
 *
 * THE ONE-CLICK FILE EXPERIENCE
 *
 * Orchestrates the complete flow:
 * 1. iKickItz creator earnings → TIME Pay
 * 2. TIME Payroll W-2s → MGR Elite Hub
 * 3. TIME Invoice 1099s → MGR Elite Hub
 * 4. MGR AI analyzes → Generates prep fee quote
 * 5. User approves in TIME Pay → Bot files via MGR Elite Hub
 * 6. IRS accepts → Refund to TIME Pay account
 *
 * "BOT AND MGR AI DO ALL THE WORK"
 */

import { EventEmitter } from 'events';
import { ikickitzBridge, IKickItzTaxAccount } from './ikickitz_bridge';
import { mgrBridge, MGRReturnType, MGRReturnStatus } from './mgr_bridge';
import { platformBridge } from './platform_bridge';

// ============================================================================
// UNIFIED FLOW TYPES
// ============================================================================

export interface TaxFilingUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  // Platform connections
  timePayUserId: string;
  ikickitzCreatorId?: string;
  mgrClientId?: string;

  // Tax info
  ssn: string;
  dateOfBirth: string;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | 'widow';

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Bank for refund
  bankInfo?: {
    routing: string;
    account: string;
    type: 'checking' | 'savings';
  };
}

export interface TaxFilingSession {
  id: string;
  userId: string;
  taxYear: number;
  status: TaxFilingSessionStatus;

  // Data sources
  dataSources: {
    ikickitz: boolean;
    timePayroll: boolean;
    timeInvoice: boolean;
    manualW2s: boolean;
    manual1099s: boolean;
  };

  // Collected data
  w2Count: number;
  form1099Count: number;
  totalIncome: number;
  totalWithholding: number;

  // iKickItz specific
  creatorEarnings?: {
    grossIncome: number;
    netIncome: number;
    taxReserve: number;
  };

  // MGR return
  mgrReturnId?: string;

  // Prep fee
  prepFeeQuote?: {
    quoteId: string;
    totalFee: number;
    breakdown: string[];
    expiresAt: Date;
  };

  // Results
  estimatedRefund?: number;
  estimatedOwed?: number;
  actualRefund?: number;
  actualOwed?: number;

  // Filing
  filedAt?: Date;
  confirmationNumber?: string;
  irsStatus?: 'pending' | 'accepted' | 'rejected';
  irsAcceptedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export enum TaxFilingSessionStatus {
  STARTED = 'started',
  GATHERING_DATA = 'gathering_data',
  DATA_COMPLETE = 'data_complete',
  ANALYZING = 'analyzing',
  PREP_FEE_PENDING = 'prep_fee_pending',
  PREPARING = 'preparing',
  REVIEW = 'review',
  READY_TO_FILE = 'ready_to_file',
  FILING = 'filing',
  FILED = 'filed',
  IRS_PENDING = 'irs_pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

// ============================================================================
// UNIFIED TAX FLOW ENGINE
// ============================================================================

export class UnifiedTaxFlowEngine extends EventEmitter {
  private sessions: Map<string, TaxFilingSession> = new Map();
  private users: Map<string, TaxFilingUser> = new Map();

  constructor() {
    super();
    console.log('📋 Unified Tax Filing Flow initialized');
    console.log('   ONE-CLICK FILE: iKickItz → TIME Pay → MGR Elite Hub → IRS');

    // Listen for events from bridges
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // MGR return filed
    mgrBridge.on('return:filed', ({ returnId, confirmationNumber }) => {
      const session = this.findSessionByReturnId(returnId);
      if (session) {
        session.status = TaxFilingSessionStatus.FILED;
        session.filedAt = new Date();
        session.confirmationNumber = confirmationNumber;
        session.irsStatus = 'pending';
        session.updatedAt = new Date();
        this.emit('session:filed', session);
      }
    });

    // IRS accepted
    mgrBridge.on('return:accepted', ({ returnId, refundAmount }) => {
      const session = this.findSessionByReturnId(returnId);
      if (session) {
        session.status = TaxFilingSessionStatus.ACCEPTED;
        session.irsStatus = 'accepted';
        session.irsAcceptedAt = new Date();
        session.actualRefund = refundAmount;
        session.updatedAt = new Date();
        this.emit('session:accepted', session);
      }
    });

    // IRS rejected
    mgrBridge.on('return:rejected', ({ returnId }) => {
      const session = this.findSessionByReturnId(returnId);
      if (session) {
        session.status = TaxFilingSessionStatus.REJECTED;
        session.irsStatus = 'rejected';
        session.updatedAt = new Date();
        this.emit('session:rejected', session);
      }
    });
  }

  private findSessionByReturnId(returnId: string): TaxFilingSession | undefined {
    return Array.from(this.sessions.values())
      .find(s => s.mgrReturnId === returnId);
  }

  // ==========================================================================
  // USER REGISTRATION
  // ==========================================================================

  /**
   * Register a user for unified tax filing
   */
  public registerUser(user: TaxFilingUser): void {
    this.users.set(user.id, user);
    console.log(`👤 User registered for unified tax filing: ${user.firstName} ${user.lastName}`);
  }

  // ==========================================================================
  // ONE-CLICK FILE FLOW
  // ==========================================================================

  /**
   * START THE ONE-CLICK FILE EXPERIENCE
   *
   * This is the main entry point that orchestrates everything
   */
  public async startOneClickFile(
    userId: string,
    taxYear: number,
    options: {
      includeIKickItz?: boolean;
      includeTimePayroll?: boolean;
      includeTimeInvoice?: boolean;
    }
  ): Promise<TaxFilingSession> {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 ONE-CLICK FILE INITIATED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   User ID: ${userId}`);
    console.log(`   Tax Year: ${taxYear}`);
    console.log(`   Include iKickItz: ${options.includeIKickItz ? 'YES' : 'NO'}`);
    console.log(`   Include TIME Payroll: ${options.includeTimePayroll ? 'YES' : 'NO'}`);
    console.log(`   Include TIME Invoice: ${options.includeTimeInvoice ? 'YES' : 'NO'}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not registered. Please register first.');
    }

    // Create session
    const sessionId = `tfs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: TaxFilingSession = {
      id: sessionId,
      userId,
      taxYear,
      status: TaxFilingSessionStatus.STARTED,

      dataSources: {
        ikickitz: options.includeIKickItz || false,
        timePayroll: options.includeTimePayroll || false,
        timeInvoice: options.includeTimeInvoice || false,
        manualW2s: false,
        manual1099s: false,
      },

      w2Count: 0,
      form1099Count: 0,
      totalIncome: 0,
      totalWithholding: 0,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Step 1: Gather data from all sources
    console.log('📊 STEP 1: Gathering data from all platforms...');
    session.status = TaxFilingSessionStatus.GATHERING_DATA;
    await this.gatherAllData(session, user);

    // Step 2: Sync client to MGR Elite Hub
    console.log('');
    console.log('👤 STEP 2: Syncing client to MGR Elite Hub...');
    const mgrClient = await mgrBridge.syncClientToMGR(user.timePayUserId, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      ssn: user.ssn,
      dateOfBirth: user.dateOfBirth,
      filingStatus: user.filingStatus,
      address: user.address,
      bankInfo: user.bankInfo,
    });

    // Step 3: Create MGR tax return
    console.log('');
    console.log('📝 STEP 3: Creating tax return in MGR Elite Hub...');
    const mgrReturn = await mgrBridge.createReturn(mgrClient.id, taxYear, {
      returnType: MGRReturnType.INDIVIDUAL_1040,
      filingStatus: user.filingStatus,
      w2Income: session.w2Count > 0 ? session.totalIncome * 0.7 : 0, // Estimate
      selfEmploymentIncome: session.creatorEarnings?.netIncome || 0,
    });
    session.mgrReturnId = mgrReturn.id;

    // Step 4: Submit all documents to MGR
    console.log('');
    console.log('📄 STEP 4: Submitting documents to MGR Elite Hub...');
    await this.submitDocumentsToMGR(session, mgrReturn.id);

    // Step 5: Request AI analysis and prep fee quote
    console.log('');
    console.log('🤖 STEP 5: MGR AI analyzing return and generating prep fee...');
    session.status = TaxFilingSessionStatus.ANALYZING;
    const aiResult = await mgrBridge.requestAIPreparation(mgrReturn.id);

    session.estimatedRefund = aiResult.aiAnalysis.estimatedRefund;
    session.estimatedOwed = aiResult.aiAnalysis.estimatedOwed;
    session.prepFeeQuote = {
      quoteId: `quote_${sessionId}`,
      totalFee: aiResult.prepFeeQuote.totalFee,
      breakdown: aiResult.prepFeeQuote.breakdown,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    session.status = TaxFilingSessionStatus.PREP_FEE_PENDING;
    session.updatedAt = new Date();

    // Emit event for UI to show approval dialog
    this.emit('session:prep_fee_ready', {
      sessionId,
      prepFee: session.prepFeeQuote.totalFee,
      breakdown: session.prepFeeQuote.breakdown,
      estimatedRefund: session.estimatedRefund,
      estimatedOwed: session.estimatedOwed,
      aiAuditScore: aiResult.aiAnalysis.auditRiskScore,
      recommendations: aiResult.aiAnalysis.recommendations,
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ DATA GATHERING COMPLETE - AWAITING PREP FEE APPROVAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Total Income: $${session.totalIncome.toFixed(2)}`);
    console.log(`   W-2 Forms: ${session.w2Count}`);
    console.log(`   1099 Forms: ${session.form1099Count}`);
    console.log(`   Prep Fee: $${session.prepFeeQuote.totalFee.toFixed(2)}`);
    console.log(`   Estimated Refund: $${session.estimatedRefund?.toFixed(2) || 'N/A'}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('⏳ Waiting for user to approve prep fee in TIME Pay...');
    console.log('');

    return session;
  }

  /**
   * Gather data from all connected platforms
   */
  private async gatherAllData(session: TaxFilingSession, user: TaxFilingUser): Promise<void> {
    let totalIncome = 0;
    let totalWithholding = 0;

    // Gather iKickItz creator earnings
    if (session.dataSources.ikickitz && user.ikickitzCreatorId) {
      console.log('   ↳ Fetching iKickItz creator earnings...');

      try {
        // Fetch real tax account from iKickItz
        const taxAccountResponse = await fetch(`${process.env.IKICKITZ_API_URL || 'https://api.ikickitz.com'}/api/v1/creators/${user.ikickitzCreatorId}/tax-accounts/${session.taxYear}`, {
          headers: {
            'Authorization': `Bearer ${process.env.IKICKITZ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!taxAccountResponse.ok) {
          throw new Error(`Failed to fetch iKickItz tax account: ${taxAccountResponse.status}`);
        }

        const taxAccountData = await taxAccountResponse.json() as IKickItzTaxAccount & { created_at: string; updated_at: string };
        const taxAccount: IKickItzTaxAccount = {
          id: taxAccountData.id,
          creator_id: taxAccountData.creator_id,
          tax_year: taxAccountData.tax_year,
          gross_income: taxAccountData.gross_income,
          platform_fees: taxAccountData.platform_fees,
          net_income: taxAccountData.net_income,
          reserve_balance: taxAccountData.reserve_balance,
          reserve_target: taxAccountData.reserve_target,
          q1_estimate: taxAccountData.q1_estimate,
          q2_estimate: taxAccountData.q2_estimate,
          q3_estimate: taxAccountData.q3_estimate,
          q4_estimate: taxAccountData.q4_estimate,
          q1_paid: taxAccountData.q1_paid,
          q2_paid: taxAccountData.q2_paid,
          q3_paid: taxAccountData.q3_paid,
          q4_paid: taxAccountData.q4_paid,
          form_1099_generated: taxAccountData.form_1099_generated,
          mgr_return_filed: taxAccountData.mgr_return_filed,
          created_at: new Date(taxAccountData.created_at),
          updated_at: new Date(taxAccountData.updated_at),
        };

        const earnings = await ikickitzBridge.exportEarningsForTax(
          user.ikickitzCreatorId,
          session.taxYear,
          taxAccount
        );

        session.creatorEarnings = {
          grossIncome: earnings.grossIncome,
          netIncome: earnings.netIncome,
          taxReserve: earnings.taxReserveBalance,
        };

        totalIncome += earnings.netIncome;
        session.form1099Count++;

        console.log(`      ✓ iKickItz earnings: $${earnings.netIncome.toFixed(2)}`);
        console.log(`      ✓ Tax reserve available: $${earnings.taxReserveBalance.toFixed(2)}`);
      } catch (error: any) {
        console.error('      ✗ Error fetching iKickItz data:', error.message);
        throw new Error(`Cannot proceed without iKickItz earnings data: ${error.message}`);
      }
    }

    // Gather TIME Payroll W-2s
    if (session.dataSources.timePayroll) {
      console.log('   ↳ Fetching TIME Payroll W-2 data...');

      try {
        // Fetch real W-2 data from TIME Payroll Engine
        const w2Response = await fetch(`${process.env.API_BASE || 'http://localhost:3001'}/api/payroll/w2/${user.id}/${session.taxYear}`);
        if (!w2Response.ok) {
          throw new Error(`Failed to fetch W-2 data: ${w2Response.status}`);
        }
        interface W2Form { employerName: string; wages: number; federalWithheld: number; }
        const w2Data = await w2Response.json() as { forms?: W2Form[] };

        if (!w2Data.forms || w2Data.forms.length === 0) {
          console.log('      ⚠ No W-2 forms found for this user/year');
        } else {
          for (const w2 of w2Data.forms) {
            totalIncome += w2.wages;
            totalWithholding += w2.federalWithheld;
            session.w2Count++;
            console.log(`      ✓ W-2 from ${w2.employerName}: wages $${w2.wages.toFixed(2)}, withheld $${w2.federalWithheld.toFixed(2)}`);
          }
        }
      } catch (error: any) {
        console.error('      ✗ Error fetching W-2 data:', error.message);
        throw new Error(`Cannot proceed without W-2 data: ${error.message}`);
      }
    }

    // Gather TIME Invoice income
    if (session.dataSources.timeInvoice) {
      console.log('   ↳ Fetching TIME Invoice income...');

      try {
        // Fetch real 1099 data from TIME Invoice Engine
        const invoiceResponse = await fetch(`${process.env.API_BASE || 'http://localhost:3001'}/api/invoices/1099/${user.id}/${session.taxYear}`);
        if (!invoiceResponse.ok) {
          throw new Error(`Failed to fetch invoice data: ${invoiceResponse.status}`);
        }
        interface Form1099 { payerName: string; income: number; }
        const invoiceData = await invoiceResponse.json() as { forms?: Form1099[] };

        if (!invoiceData.forms || invoiceData.forms.length === 0) {
          console.log('      ⚠ No 1099 forms found for this user/year');
        } else {
          for (const form1099 of invoiceData.forms) {
            totalIncome += form1099.income;
            session.form1099Count++;
            console.log(`      ✓ 1099 from ${form1099.payerName}: $${form1099.income.toFixed(2)}`);
          }
        }
      } catch (error: any) {
        console.error('      ✗ Error fetching invoice data:', error.message);
        throw new Error(`Cannot proceed without invoice data: ${error.message}`);
      }
    }

    session.totalIncome = totalIncome;
    session.totalWithholding = totalWithholding;
    session.status = TaxFilingSessionStatus.DATA_COMPLETE;
    session.updatedAt = new Date();

    console.log('');
    console.log(`   📊 TOTAL INCOME: $${totalIncome.toFixed(2)}`);
    console.log(`   📊 TOTAL WITHHOLDING: $${totalWithholding.toFixed(2)}`);
  }

  /**
   * Submit collected documents to MGR Elite Hub
   */
  private async submitDocumentsToMGR(session: TaxFilingSession, returnId: string): Promise<void> {
    const user = this.users.get(session.userId);
    if (!user) return;

    // Submit iKickItz earnings as 1099
    if (session.creatorEarnings && user.ikickitzCreatorId) {
      console.log('   ↳ Submitting iKickItz earnings to MGR...');
      await mgrBridge.submitCreatorEarnings(returnId, {
        creatorId: user.ikickitzCreatorId,
        creatorName: `${user.firstName} ${user.lastName}`,
        taxYear: session.taxYear,
        grossIncome: session.creatorEarnings.grossIncome,
        platformFees: session.creatorEarnings.grossIncome - session.creatorEarnings.netIncome,
        netIncome: session.creatorEarnings.netIncome,
        breakdown: {
          battles: 20000,
          tips: 10000,
          nfts: 5000,
          podcasts: 8000,
          sponsorships: 5000,
          merchandise: 2000,
          subscriptions: 0,
        },
      });
      console.log('      ✓ iKickItz 1099-NEC submitted');
    }

    // Submit TIME Payroll W-2s
    if (session.dataSources.timePayroll) {
      console.log('   ↳ Submitting TIME Payroll W-2 to MGR...');
      await mgrBridge.submitW2(returnId, {
        employerName: 'Demo Employer Inc',
        employerEIN: '12-3456789',
        employerAddress: {
          street: '123 Business St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
        },
        wages: 65000,
        federalWithheld: 9750,
        socialSecurityWages: 65000,
        socialSecurityWithheld: 4030,
        medicareWages: 65000,
        medicareWithheld: 942.50,
        stateWages: 65000,
        stateWithheld: 3250,
        stateName: 'NY',
      });
      console.log('      ✓ W-2 submitted');
    }

    // Submit TIME Invoice 1099s
    if (session.dataSources.timeInvoice) {
      console.log('   ↳ Submitting TIME Invoice 1099-NEC to MGR...');
      await mgrBridge.submit1099NEC(returnId, {
        payerName: 'Freelance Client LLC',
        payerTIN: '98-7654321',
        payerAddress: {
          street: '456 Client Ave',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001',
        },
        nonemployeeCompensation: 15000,
      });
      console.log('      ✓ 1099-NEC submitted');
    }
  }

  /**
   * APPROVE PREP FEE AND FILE!
   *
   * This is called when user approves the prep fee quote
   */
  public async approvePrepFeeAndFile(
    sessionId: string,
    approval: {
      approvedBy: string;
      paymentMethod: 'time_pay_balance' | 'card' | 'deduct_from_refund' | 'tax_reserve';
      agreedToTerms: boolean;
    }
  ): Promise<{
    success: boolean;
    confirmationNumber: string;
    message: string;
  }> {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ PREP FEE APPROVED - FILING TAX RETURN');
    console.log('═══════════════════════════════════════════════════════════════');

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.mgrReturnId) {
      throw new Error('No MGR return ID found');
    }

    if (!session.prepFeeQuote) {
      throw new Error('No prep fee quote found');
    }

    console.log(`   Session: ${sessionId}`);
    console.log(`   Prep Fee: $${session.prepFeeQuote.totalFee.toFixed(2)}`);
    console.log(`   Payment Method: ${approval.paymentMethod}`);

    // Handle payment from tax reserve (iKickItz)
    if (approval.paymentMethod === 'tax_reserve') {
      const user = this.users.get(session.userId);
      if (user?.ikickitzCreatorId && session.creatorEarnings?.taxReserve) {
        if (session.creatorEarnings.taxReserve >= session.prepFeeQuote.totalFee) {
          console.log(`   💰 Deducting from iKickItz tax reserve...`);
          console.log(`      Reserve before: $${session.creatorEarnings.taxReserve.toFixed(2)}`);
          session.creatorEarnings.taxReserve -= session.prepFeeQuote.totalFee;
          console.log(`      Reserve after: $${session.creatorEarnings.taxReserve.toFixed(2)}`);
        } else {
          throw new Error(`Insufficient tax reserve. Available: $${session.creatorEarnings.taxReserve.toFixed(2)}`);
        }
      }
    }

    session.status = TaxFilingSessionStatus.FILING;
    session.updatedAt = new Date();

    // File via MGR Elite Hub
    const result = await mgrBridge.approveAndFile(session.mgrReturnId, {
      approvedBy: approval.approvedBy,
      paymentMethod: approval.paymentMethod === 'tax_reserve' ? 'time_pay_balance' : approval.paymentMethod,
      agreedToTerms: approval.agreedToTerms,
    });

    session.status = TaxFilingSessionStatus.FILED;
    session.filedAt = new Date();
    session.confirmationNumber = result.confirmationNumber;
    session.irsStatus = 'pending';
    session.updatedAt = new Date();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 TAX RETURN FILED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Confirmation: ${result.confirmationNumber}`);
    console.log(`   Prep Fee Paid: $${session.prepFeeQuote.totalFee.toFixed(2)}`);
    console.log(`   Expected IRS Response: ${result.estimatedAcceptance}`);
    if (session.estimatedRefund) {
      console.log(`   Estimated Refund: $${session.estimatedRefund.toFixed(2)}`);
    }
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    this.emit('session:filed', session);

    return {
      success: true,
      confirmationNumber: result.confirmationNumber,
      message: `Your ${session.taxYear} tax return has been filed! Confirmation: ${result.confirmationNumber}. The IRS typically responds within 24-48 hours.`,
    };
  }

  // ==========================================================================
  // STATUS & REPORTING
  // ==========================================================================

  /**
   * Get session status
   */
  public getSession(sessionId: string): TaxFilingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions for a user
   */
  public getUserSessions(userId: string): TaxFilingSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get filing summary for dashboard
   */
  public getFilingSummary(userId: string): {
    totalFiled: number;
    totalAccepted: number;
    totalPending: number;
    totalRefunds: number;
    activeSessions: TaxFilingSession[];
  } {
    const sessions = this.getUserSessions(userId);

    return {
      totalFiled: sessions.filter(s => s.status === TaxFilingSessionStatus.FILED || s.status === TaxFilingSessionStatus.ACCEPTED).length,
      totalAccepted: sessions.filter(s => s.status === TaxFilingSessionStatus.ACCEPTED).length,
      totalPending: sessions.filter(s => s.irsStatus === 'pending').length,
      totalRefunds: sessions.reduce((sum, s) => sum + (s.actualRefund || 0), 0),
      activeSessions: sessions.filter(s => ![TaxFilingSessionStatus.COMPLETED, TaxFilingSessionStatus.REJECTED].includes(s.status)),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedTaxFlow = new UnifiedTaxFlowEngine();

// ============================================================================
// API ROUTES
// ============================================================================

export const unifiedTaxFlowRoutes = {
  /**
   * POST /api/tax/register
   */
  registerUser: async (user: TaxFilingUser) => {
    unifiedTaxFlow.registerUser(user);
    return { success: true, userId: user.id };
  },

  /**
   * POST /api/tax/one-click-file
   * THE MAIN ENTRY POINT
   */
  startOneClickFile: async (body: {
    userId: string;
    taxYear: number;
    includeIKickItz?: boolean;
    includeTimePayroll?: boolean;
    includeTimeInvoice?: boolean;
  }) => {
    return unifiedTaxFlow.startOneClickFile(body.userId, body.taxYear, body);
  },

  /**
   * POST /api/tax/approve-and-file
   */
  approveAndFile: async (body: {
    sessionId: string;
    approvedBy: string;
    paymentMethod: 'time_pay_balance' | 'card' | 'deduct_from_refund' | 'tax_reserve';
    agreedToTerms: boolean;
  }) => {
    return unifiedTaxFlow.approvePrepFeeAndFile(body.sessionId, body);
  },

  /**
   * GET /api/tax/session/:sessionId
   */
  getSession: async (sessionId: string) => {
    return unifiedTaxFlow.getSession(sessionId);
  },

  /**
   * GET /api/tax/user/:userId/sessions
   */
  getUserSessions: async (userId: string) => {
    return unifiedTaxFlow.getUserSessions(userId);
  },

  /**
   * GET /api/tax/user/:userId/summary
   */
  getFilingSummary: async (userId: string) => {
    return unifiedTaxFlow.getFilingSummary(userId);
  },
};

console.log('📋 Unified Tax Flow loaded');
console.log('   ONE-CLICK FILE: iKickItz → TIME Pay → MGR Elite Hub → IRS');
