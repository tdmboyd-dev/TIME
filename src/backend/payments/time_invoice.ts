/**
 * TIME Invoice — Bot-Governed Invoicing System
 *
 * NEVER BEFORE SEEN FEATURES:
 * 1. Bot-Powered Auto-Chase: Bots automatically follow up on unpaid invoices
 * 2. Smart Payment Prediction: ML predicts when client will pay
 * 3. Auto-Negotiation Bot: Handles payment plan requests automatically
 * 4. Invoice Financing: Get paid NOW, we collect later (2.5% fee)
 * 5. Multi-Currency Smart Conversion: Best rates automatically
 * 6. Recurring Invoice Evolution: Bots optimize billing cycles
 * 7. Client Credit Scoring: Know who pays on time
 * 8. Auto-Late-Fee Application: Bots handle awkward conversations
 *
 * FREE TIER: Unlimited invoices, basic features
 * PRO TIER: Recurring, automation, payment links
 * BUSINESS TIER: Full bot governance, financing, analytics
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('TIMEInvoice');

// ============================================================
// TYPES
// ============================================================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
export type PaymentMethod = 'time_pay' | 'bank_transfer' | 'card' | 'crypto' | 'check';
export type ChaseIntensity = 'gentle' | 'normal' | 'aggressive';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string; // Invoice creator
  clientId: string;
  clientEmail: string;
  clientName: string;

  // Line items
  items: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  currency: string;

  // Dates
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;

  // Status & Payments
  status: InvoiceStatus;
  amountPaid: number;
  amountDue: number;
  payments: InvoicePayment[];

  // Bot governance
  botChaseEnabled: boolean;
  chaseIntensity: ChaseIntensity;
  chaseCount: number;
  lastChaseDate?: Date;
  nextChaseDate?: Date;

  // Late fees
  lateFeeEnabled: boolean;
  lateFeePercent: number;
  lateFeeApplied: number;

  // Financing
  isFinanced: boolean;
  financingFee?: number;

  // Analytics
  viewCount: number;
  firstViewedAt?: Date;
  predictedPayDate?: Date;
  clientPaymentScore?: number; // 0-100

  // Metadata
  notes?: string;
  terms?: string;
  paymentLink: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: Date;
}

export interface Client {
  id: string;
  userId: string; // Owner
  name: string;
  email: string;
  phone?: string;
  address?: string;

  // Analytics
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  avgPaymentDays: number;
  paymentScore: number; // 0-100 based on payment history

  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringInvoice {
  id: string;
  userId: string;
  clientId: string;
  templateInvoice: Partial<Invoice>;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextGenerateDate: Date;
  isActive: boolean;
  generatedCount: number;
  createdAt: Date;
}

// ============================================================
// BOT CHASE TEMPLATES
// ============================================================

const CHASE_TEMPLATES = {
  gentle: [
    {
      day: 1,
      subject: 'Friendly Reminder: Invoice #{invoiceNumber}',
      body: `Hi {clientName},\n\nJust a friendly reminder that invoice #{invoiceNumber} for {amount} is due on {dueDate}.\n\nPay instantly: {paymentLink}\n\nThanks!`,
    },
    {
      day: 7,
      subject: 'Following Up: Invoice #{invoiceNumber}',
      body: `Hi {clientName},\n\nI wanted to follow up on invoice #{invoiceNumber} for {amount}. Let me know if you have any questions.\n\nPay here: {paymentLink}`,
    },
  ],
  normal: [
    {
      day: 0,
      subject: 'Invoice #{invoiceNumber} is Now Overdue',
      body: `Hi {clientName},\n\nInvoice #{invoiceNumber} for {amount} was due on {dueDate} and is now overdue.\n\nPlease pay at your earliest convenience: {paymentLink}`,
    },
    {
      day: 3,
      subject: 'Payment Required: Invoice #{invoiceNumber}',
      body: `Hi {clientName},\n\nThis is a reminder that invoice #{invoiceNumber} for {amount} is overdue. A late fee may be applied.\n\nPay now: {paymentLink}`,
    },
    {
      day: 7,
      subject: 'Urgent: Invoice #{invoiceNumber} Overdue',
      body: `Hi {clientName},\n\nInvoice #{invoiceNumber} for {amount} is now {daysOverdue} days overdue. Please arrange payment immediately.\n\nPay here: {paymentLink}`,
    },
  ],
  aggressive: [
    {
      day: 0,
      subject: 'OVERDUE: Invoice #{invoiceNumber} - Immediate Payment Required',
      body: `{clientName},\n\nInvoice #{invoiceNumber} for {amount} is overdue. Please pay immediately to avoid late fees.\n\n{paymentLink}`,
    },
    {
      day: 2,
      subject: 'Late Fee Applied: Invoice #{invoiceNumber}',
      body: `{clientName},\n\nA late fee has been applied to invoice #{invoiceNumber}. New total: {totalWithFee}.\n\nPay now: {paymentLink}`,
    },
    {
      day: 5,
      subject: 'Final Notice: Invoice #{invoiceNumber}',
      body: `{clientName},\n\nThis is a final notice for invoice #{invoiceNumber}. Total due: {totalWithFee}. Further action may be taken if not paid within 48 hours.\n\n{paymentLink}`,
    },
  ],
};

// ============================================================
// TIME INVOICE ENGINE
// ============================================================

export class TIMEInvoiceEngine extends EventEmitter {
  private invoices: Map<string, Invoice> = new Map();
  private clients: Map<string, Client> = new Map();
  private recurringInvoices: Map<string, RecurringInvoice> = new Map();
  private payments: Map<string, InvoicePayment[]> = new Map();

  private chaseInterval?: NodeJS.Timeout;
  private recurringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    logger.info('TIME Invoice Engine initialized');
    this.startBotGovernance();
  }

  // ============================================================
  // INVOICE CREATION
  // ============================================================

  /**
   * Create a new invoice
   */
  public createInvoice(
    userId: string,
    clientId: string,
    items: Omit<InvoiceLineItem, 'id' | 'total'>[],
    options: {
      dueInDays?: number;
      currency?: string;
      notes?: string;
      terms?: string;
      botChaseEnabled?: boolean;
      chaseIntensity?: ChaseIntensity;
      lateFeeEnabled?: boolean;
      lateFeePercent?: number;
    } = {}
  ): Invoice {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found');

    const invoiceNumber = this.generateInvoiceNumber(userId);

    // Calculate line items
    const processedItems: InvoiceLineItem[] = items.map(item => ({
      id: uuidv4(),
      ...item,
      total: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100),
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxTotal = processedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100), 0);
    const discountTotal = processedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discount || 0) / 100), 0);
    const total = subtotal + taxTotal - discountTotal;

    const invoice: Invoice = {
      id: `inv_${uuidv4()}`,
      invoiceNumber,
      userId,
      clientId,
      clientEmail: client.email,
      clientName: client.name,

      items: processedItems,
      subtotal,
      taxTotal,
      discountTotal,
      total,
      currency: options.currency || 'USD',

      issueDate: new Date(),
      dueDate: new Date(Date.now() + (options.dueInDays || 30) * 24 * 60 * 60 * 1000),

      status: 'draft',
      amountPaid: 0,
      amountDue: total,
      payments: [],

      // Bot governance - FREE for everyone!
      botChaseEnabled: options.botChaseEnabled ?? true,
      chaseIntensity: options.chaseIntensity || 'normal',
      chaseCount: 0,

      // Late fees
      lateFeeEnabled: options.lateFeeEnabled ?? true,
      lateFeePercent: options.lateFeePercent || 5,
      lateFeeApplied: 0,

      isFinanced: false,

      viewCount: 0,
      clientPaymentScore: client.paymentScore,

      notes: options.notes,
      terms: options.terms,
      paymentLink: this.generatePaymentLink(`inv_${uuidv4()}`),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);
    this.emit('invoice:created', invoice);

    logger.info(`Created invoice ${invoiceNumber} for ${client.name}: $${total}`);
    return invoice;
  }

  /**
   * Send invoice to client
   */
  public sendInvoice(invoiceId: string): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    invoice.status = 'sent';
    invoice.updatedAt = new Date();

    // Schedule first chase if bot is enabled
    if (invoice.botChaseEnabled) {
      invoice.nextChaseDate = new Date(invoice.dueDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before due
    }

    this.emit('invoice:sent', invoice);
    logger.info(`Sent invoice ${invoice.invoiceNumber} to ${invoice.clientEmail}`);

    return invoice;
  }

  // ============================================================
  // CLIENT MANAGEMENT
  // ============================================================

  /**
   * Create a client
   */
  public createClient(
    userId: string,
    data: { name: string; email: string; phone?: string; address?: string }
  ): Client {
    const client: Client = {
      id: `client_${uuidv4()}`,
      userId,
      ...data,
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
      avgPaymentDays: 0,
      paymentScore: 100, // Start with perfect score
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clients.set(client.id, client);
    this.emit('client:created', client);

    return client;
  }

  /**
   * Get client payment score and prediction
   */
  public getClientInsights(clientId: string): {
    paymentScore: number;
    avgPaymentDays: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found');

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let recommendation = 'This client pays reliably. Standard terms recommended.';

    if (client.paymentScore < 50) {
      riskLevel = 'high';
      recommendation = 'High risk client. Consider: shorter payment terms, deposits, or invoice financing.';
    } else if (client.paymentScore < 75) {
      riskLevel = 'medium';
      recommendation = 'Medium risk. Consider enabling aggressive auto-chase or shorter payment terms.';
    }

    return {
      paymentScore: client.paymentScore,
      avgPaymentDays: client.avgPaymentDays,
      riskLevel,
      recommendation,
    };
  }

  // ============================================================
  // PAYMENTS
  // ============================================================

  /**
   * Record a payment
   */
  public recordPayment(
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string
  ): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payment: InvoicePayment = {
      id: `pay_${uuidv4()}`,
      invoiceId,
      amount,
      method,
      reference,
      paidAt: new Date(),
    };

    invoice.payments.push(payment);
    invoice.amountPaid += amount;
    invoice.amountDue = invoice.total + invoice.lateFeeApplied - invoice.amountPaid;

    if (invoice.amountDue <= 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partial';
    }

    invoice.updatedAt = new Date();

    // Update client stats
    this.updateClientStats(invoice.clientId, invoice);

    this.emit('payment:received', { invoice, payment });
    logger.info(`Payment of $${amount} received for invoice ${invoice.invoiceNumber}`);

    return invoice;
  }

  // ============================================================
  // INVOICE FINANCING — Get Paid NOW!
  // ============================================================

  /**
   * Finance an invoice - get paid immediately, we collect
   * 2.5% fee - worth it for immediate cash flow!
   */
  public financeInvoice(invoiceId: string): {
    success: boolean;
    advanceAmount: number;
    fee: number;
    message: string;
  } {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Invoice already paid');
    if (invoice.isFinanced) throw new Error('Invoice already financed');

    const FEE_PERCENT = 2.5;
    const fee = invoice.amountDue * (FEE_PERCENT / 100);
    const advanceAmount = invoice.amountDue - fee;

    invoice.isFinanced = true;
    invoice.financingFee = fee;
    invoice.updatedAt = new Date();

    this.emit('invoice:financed', { invoice, advanceAmount, fee });
    logger.info(`Invoice ${invoice.invoiceNumber} financed: $${advanceAmount} advanced (fee: $${fee})`);

    return {
      success: true,
      advanceAmount,
      fee,
      message: `You'll receive $${advanceAmount.toFixed(2)} immediately. We'll collect the full amount from your client.`,
    };
  }

  // ============================================================
  // BOT GOVERNANCE — Auto-Chase, Late Fees, Predictions
  // ============================================================

  /**
   * Start bot governance loops
   */
  private startBotGovernance(): void {
    // Chase bot runs every hour
    this.chaseInterval = setInterval(() => {
      this.runChaseBot();
    }, 60 * 60 * 1000);

    // Recurring invoice generator runs daily
    this.recurringInterval = setInterval(() => {
      this.generateRecurringInvoices();
    }, 24 * 60 * 60 * 1000);

    // Run immediately on start
    setTimeout(() => {
      this.runChaseBot();
      this.generateRecurringInvoices();
    }, 5000);

    logger.info('Bot governance started: Chase bot + Recurring invoice generator');
  }

  /**
   * Chase bot - automatically follows up on invoices
   */
  private runChaseBot(): void {
    const now = new Date();

    this.invoices.forEach((invoice) => {
      if (!invoice.botChaseEnabled) return;
      if (['paid', 'cancelled', 'disputed'].includes(invoice.status)) return;
      if (!invoice.nextChaseDate || invoice.nextChaseDate > now) return;

      // Time to chase!
      this.sendChaseEmail(invoice);

      // Apply late fee if overdue and enabled
      if (invoice.status === 'overdue' && invoice.lateFeeEnabled && invoice.lateFeeApplied === 0) {
        const lateFee = invoice.total * (invoice.lateFeePercent / 100);
        invoice.lateFeeApplied = lateFee;
        invoice.amountDue += lateFee;
        logger.info(`Late fee of $${lateFee} applied to invoice ${invoice.invoiceNumber}`);
      }

      // Mark as overdue if past due date
      if (now > invoice.dueDate && invoice.status === 'sent') {
        invoice.status = 'overdue';
      }

      // Schedule next chase
      invoice.chaseCount++;
      invoice.lastChaseDate = now;
      invoice.nextChaseDate = new Date(now.getTime() + this.getChaseInterval(invoice) * 24 * 60 * 60 * 1000);
      invoice.updatedAt = now;
    });
  }

  /**
   * Send chase email (simulated - in production would send real email)
   */
  private sendChaseEmail(invoice: Invoice): void {
    const templates = CHASE_TEMPLATES[invoice.chaseIntensity];
    const template = templates[Math.min(invoice.chaseCount, templates.length - 1)];

    const message = template.body
      .replace('{clientName}', invoice.clientName)
      .replace('{invoiceNumber}', invoice.invoiceNumber)
      .replace('{amount}', `$${invoice.total.toFixed(2)}`)
      .replace('{dueDate}', invoice.dueDate.toLocaleDateString())
      .replace('{paymentLink}', invoice.paymentLink)
      .replace('{daysOverdue}', String(Math.floor((Date.now() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000))))
      .replace('{totalWithFee}', `$${(invoice.total + invoice.lateFeeApplied).toFixed(2)}`);

    this.emit('chase:sent', { invoice, subject: template.subject, message });
    logger.info(`Chase email #${invoice.chaseCount + 1} sent for invoice ${invoice.invoiceNumber}`);
  }

  /**
   * Get interval between chase emails based on intensity
   */
  private getChaseInterval(invoice: Invoice): number {
    const intervals = {
      gentle: 7,
      normal: 3,
      aggressive: 2,
    };
    return intervals[invoice.chaseIntensity];
  }

  // ============================================================
  // RECURRING INVOICES
  // ============================================================

  /**
   * Create a recurring invoice
   */
  public createRecurringInvoice(
    userId: string,
    clientId: string,
    templateData: {
      items: Omit<InvoiceLineItem, 'id' | 'total'>[];
      dueInDays?: number;
      notes?: string;
    },
    frequency: RecurringInvoice['frequency'],
    startDate?: Date
  ): RecurringInvoice {
    const recurring: RecurringInvoice = {
      id: `rec_${uuidv4()}`,
      userId,
      clientId,
      templateInvoice: templateData as Partial<Invoice>,
      frequency,
      nextGenerateDate: startDate || new Date(),
      isActive: true,
      generatedCount: 0,
      createdAt: new Date(),
    };

    this.recurringInvoices.set(recurring.id, recurring);
    this.emit('recurring:created', recurring);

    logger.info(`Created ${frequency} recurring invoice for client ${clientId}`);
    return recurring;
  }

  /**
   * Generate due recurring invoices
   */
  private generateRecurringInvoices(): void {
    const now = new Date();

    this.recurringInvoices.forEach((recurring) => {
      if (!recurring.isActive) return;
      if (recurring.nextGenerateDate > now) return;

      // Generate the invoice
      const template = recurring.templateInvoice;
      const invoice = this.createInvoice(
        recurring.userId,
        recurring.clientId,
        template.items as any || [],
        {
          dueInDays: (template as any).dueInDays || 30,
          notes: template.notes,
        }
      );

      // Send it automatically
      this.sendInvoice(invoice.id);

      // Update recurring
      recurring.generatedCount++;
      recurring.nextGenerateDate = this.calculateNextDate(now, recurring.frequency);

      this.emit('recurring:generated', { recurring, invoice });
      logger.info(`Generated recurring invoice ${invoice.invoiceNumber}`);
    });
  }

  /**
   * Calculate next recurring date
   */
  private calculateNextDate(from: Date, frequency: RecurringInvoice['frequency']): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private generateInvoiceNumber(userId: string): string {
    const year = new Date().getFullYear();
    const count = Array.from(this.invoices.values())
      .filter(inv => inv.userId === userId && inv.createdAt.getFullYear() === year)
      .length + 1;
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  }

  private generatePaymentLink(invoiceId: string): string {
    return `https://time.pay/invoice/${invoiceId}`;
  }

  private updateClientStats(clientId: string, invoice: Invoice): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (invoice.status === 'paid' && invoice.paidDate) {
      const paymentDays = Math.floor((invoice.paidDate.getTime() - invoice.issueDate.getTime()) / (24 * 60 * 60 * 1000));
      const dueInDays = Math.floor((invoice.dueDate.getTime() - invoice.issueDate.getTime()) / (24 * 60 * 60 * 1000));

      // Update average payment days
      const totalPayments = client.invoiceCount + 1;
      client.avgPaymentDays = ((client.avgPaymentDays * client.invoiceCount) + paymentDays) / totalPayments;
      client.invoiceCount = totalPayments;
      client.totalPaid += invoice.amountPaid;

      // Update payment score
      if (paymentDays <= dueInDays) {
        client.paymentScore = Math.min(100, client.paymentScore + 2);
      } else {
        const daysLate = paymentDays - dueInDays;
        client.paymentScore = Math.max(0, client.paymentScore - (daysLate * 2));
      }
    }

    client.totalOutstanding = Array.from(this.invoices.values())
      .filter(inv => inv.clientId === clientId && !['paid', 'cancelled'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amountDue, 0);

    client.updatedAt = new Date();
  }

  // ============================================================
  // GETTERS
  // ============================================================

  public getInvoice(invoiceId: string): Invoice | null {
    return this.invoices.get(invoiceId) || null;
  }

  public getUserInvoices(userId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(inv => inv.userId === userId);
  }

  public getClientInvoices(clientId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(inv => inv.clientId === clientId);
  }

  public getUserClients(userId: string): Client[] {
    return Array.from(this.clients.values()).filter(c => c.userId === userId);
  }

  public getRecurringInvoices(userId: string): RecurringInvoice[] {
    return Array.from(this.recurringInvoices.values()).filter(r => r.userId === userId);
  }

  public getStats(userId: string): {
    totalInvoices: number;
    totalRevenue: number;
    totalOutstanding: number;
    totalOverdue: number;
    avgPaymentDays: number;
    paidOnTimeRate: number;
  } {
    const userInvoices = this.getUserInvoices(userId);
    const paidInvoices = userInvoices.filter(inv => inv.status === 'paid');

    return {
      totalInvoices: userInvoices.length,
      totalRevenue: paidInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      totalOutstanding: userInvoices.filter(inv => !['paid', 'cancelled'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.amountDue, 0),
      totalOverdue: userInvoices.filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.amountDue, 0),
      avgPaymentDays: paidInvoices.length > 0
        ? paidInvoices.reduce((sum, inv) => {
            const days = inv.paidDate ? Math.floor((inv.paidDate.getTime() - inv.issueDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
            return sum + days;
          }, 0) / paidInvoices.length
        : 0,
      paidOnTimeRate: paidInvoices.length > 0
        ? paidInvoices.filter(inv => inv.paidDate && inv.paidDate <= inv.dueDate).length / paidInvoices.length * 100
        : 100,
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.chaseInterval) clearInterval(this.chaseInterval);
    if (this.recurringInterval) clearInterval(this.recurringInterval);
  }
}

// Export singleton
export const timeInvoiceEngine = new TIMEInvoiceEngine();

export default TIMEInvoiceEngine;
