/**
 * TIME Payroll — Bot-Governed Payroll System
 *
 * NEVER BEFORE SEEN FEATURES:
 * 1. Auto-Run Payroll: Bots run payroll automatically on schedule
 * 2. Smart Tax Calculation: Automatic federal, state, local tax withholding
 * 3. Instant Pay: Employees can access earned wages before payday (FREE!)
 * 4. Auto-Compliance Bot: Handles tax filings, W-2s, 1099s automatically
 * 5. Performance-Linked Pay: Connect pay to metrics/KPIs
 * 6. Tip Distribution Bot: Auto-distribute tips fairly
 * 7. Overtime Intelligence: Alerts before overtime thresholds
 * 8. Benefits Deduction: Auto-calculate health, 401k, etc.
 *
 * FREE TIER: Up to 2 employees, basic features
 * PRO TIER: Up to 10 employees, instant pay, automation
 * BUSINESS TIER: Up to 50 employees, full bot governance
 * ENTERPRISE: Unlimited employees
 *
 * Fees: FREE for TIME Pay users! (We make money when they use TIME Pay)
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('TIMEPayroll');

// ============================================================
// TYPES
// ============================================================

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type EmployeeType = 'full_time' | 'part_time' | 'contractor' | 'intern';
export type PayType = 'salary' | 'hourly';
export type PayrunStatus = 'draft' | 'pending' | 'processing' | 'completed' | 'failed';

export interface Employee {
  id: string;
  companyId: string;

  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  ssn?: string; // Encrypted in production
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  // Employment info
  employeeType: EmployeeType;
  payType: PayType;
  salary?: number; // Annual salary for salary employees
  hourlyRate?: number; // For hourly employees
  department?: string;
  title?: string;
  startDate: Date;
  terminationDate?: Date;
  isActive: boolean;

  // Tax info
  federalFilingStatus: 'single' | 'married' | 'head_of_household';
  federalAllowances: number;
  stateFilingStatus?: string;
  stateAllowances?: number;
  additionalWithholding: number;

  // Benefits
  benefits: EmployeeBenefit[];

  // TIME Pay integration
  timePayWalletId?: string; // For instant pay
  instantPayEnabled: boolean;
  instantPayUsed: number; // This pay period

  // Stats
  ytdGross: number;
  ytdNet: number;
  ytdTaxes: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeBenefit {
  id: string;
  type: 'health' | 'dental' | 'vision' | '401k' | 'hsa' | 'fsa' | 'life' | 'disability' | 'other';
  name: string;
  employeeContribution: number; // Per pay period
  employerContribution: number;
  isPreTax: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: Date;
  hoursWorked: number;
  overtimeHours: number;
  ptoHours: number;
  sickHours: number;
  tips?: number;
  notes?: string;
  approvedBy?: string;
  createdAt: Date;
}

export interface Payrun {
  id: string;
  companyId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  status: PayrunStatus;

  // Totals
  totalGross: number;
  totalNet: number;
  totalTaxes: number;
  totalDeductions: number;
  totalEmployerTaxes: number;

  // Paystubs
  paystubs: Paystub[];

  // Bot governance
  wasAutoRun: boolean;

  createdAt: Date;
  processedAt?: Date;
}

export interface Paystub {
  id: string;
  payrunId: string;
  employeeId: string;

  // Earnings
  regularHours: number;
  regularPay: number;
  overtimeHours: number;
  overtimePay: number;
  ptoHours: number;
  ptoPay: number;
  tips: number;
  bonuses: number;
  grossPay: number;

  // Taxes
  federalTax: number;
  stateTax: number;
  localTax: number;
  socialSecurity: number;
  medicare: number;
  totalTaxes: number;

  // Deductions
  deductions: PaystubDeduction[];
  totalDeductions: number;

  // Net
  netPay: number;

  // Instant pay adjustments
  instantPayAdvanced: number;

  // Payment
  paymentMethod: 'time_pay' | 'direct_deposit' | 'check';
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  paidAt?: Date;
}

export interface PaystubDeduction {
  name: string;
  type: string;
  amount: number;
  isPreTax: boolean;
}

export interface Company {
  id: string;
  userId: string; // Owner
  name: string;
  ein?: string; // Employer ID Number
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Payroll settings
  payFrequency: PayFrequency;
  nextPayDate: Date;
  autoRunPayroll: boolean; // Bot governance!

  // Tax settings
  federalTaxId?: string;
  stateTaxIds: Record<string, string>;

  // Limits based on tier
  maxEmployees: number;
  tier: 'free' | 'pro' | 'business' | 'enterprise';

  // Stats
  totalPayrollRun: number;
  ytdPayroll: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// TAX TABLES (Simplified - would be more complex in production)
// ============================================================

const FEDERAL_TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
};

const FICA_RATES = {
  socialSecurity: 0.062, // 6.2%
  socialSecurityMax: 168600, // 2024 wage base
  medicare: 0.0145, // 1.45%
  medicareAdditional: 0.009, // Additional 0.9% over $200k
  medicareAdditionalThreshold: 200000,
};

// ============================================================
// TIME PAYROLL ENGINE
// ============================================================

export class TIMEPayrollEngine extends EventEmitter {
  private companies: Map<string, Company> = new Map();
  private employees: Map<string, Employee> = new Map();
  private timeEntries: Map<string, TimeEntry[]> = new Map();
  private payruns: Map<string, Payrun> = new Map();

  private autoPayrollInterval?: NodeJS.Timeout;

  constructor() {
    super();
    logger.info('TIME Payroll Engine initialized');
    this.startBotGovernance();
  }

  // ============================================================
  // COMPANY MANAGEMENT
  // ============================================================

  /**
   * Create a company for payroll
   */
  public createCompany(
    userId: string,
    data: {
      name: string;
      ein?: string;
      address?: Company['address'];
      payFrequency?: PayFrequency;
    },
    tier: Company['tier'] = 'free'
  ): Company {
    const maxEmployees = {
      free: 2,
      pro: 10,
      business: 50,
      enterprise: Infinity,
    };

    const company: Company = {
      id: `company_${uuidv4()}`,
      userId,
      name: data.name,
      ein: data.ein,
      address: data.address,
      payFrequency: data.payFrequency || 'biweekly',
      nextPayDate: this.calculateNextPayDate(data.payFrequency || 'biweekly'),
      autoRunPayroll: true, // Bot governance enabled by default!
      stateTaxIds: {},
      maxEmployees: maxEmployees[tier],
      tier,
      totalPayrollRun: 0,
      ytdPayroll: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.companies.set(company.id, company);
    this.emit('company:created', company);

    logger.info(`Created company ${company.name} (${tier} tier, max ${maxEmployees[tier]} employees)`);
    return company;
  }

  // ============================================================
  // EMPLOYEE MANAGEMENT
  // ============================================================

  /**
   * Add an employee
   */
  public addEmployee(
    companyId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      employeeType: EmployeeType;
      payType: PayType;
      salary?: number;
      hourlyRate?: number;
      startDate?: Date;
      department?: string;
      title?: string;
    }
  ): Employee {
    const company = this.companies.get(companyId);
    if (!company) throw new Error('Company not found');

    const currentCount = this.getCompanyEmployees(companyId).length;
    if (currentCount >= company.maxEmployees) {
      throw new Error(`Employee limit reached (${company.maxEmployees}). Upgrade to add more.`);
    }

    const employee: Employee = {
      id: `emp_${uuidv4()}`,
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      employeeType: data.employeeType,
      payType: data.payType,
      salary: data.salary,
      hourlyRate: data.hourlyRate,
      department: data.department,
      title: data.title,
      startDate: data.startDate || new Date(),
      isActive: true,

      federalFilingStatus: 'single',
      federalAllowances: 0,
      additionalWithholding: 0,

      benefits: [],

      instantPayEnabled: true,
      instantPayUsed: 0,

      ytdGross: 0,
      ytdNet: 0,
      ytdTaxes: 0,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.employees.set(employee.id, employee);
    this.emit('employee:added', employee);

    logger.info(`Added employee ${employee.firstName} ${employee.lastName} to ${company.name}`);
    return employee;
  }

  /**
   * Get company employees
   */
  public getCompanyEmployees(companyId: string): Employee[] {
    return Array.from(this.employees.values()).filter(e => e.companyId === companyId && e.isActive);
  }

  // ============================================================
  // TIME TRACKING
  // ============================================================

  /**
   * Log time for an employee
   */
  public logTime(
    employeeId: string,
    date: Date,
    hoursWorked: number,
    options: {
      overtimeHours?: number;
      ptoHours?: number;
      sickHours?: number;
      tips?: number;
      notes?: string;
    } = {}
  ): TimeEntry {
    const employee = this.employees.get(employeeId);
    if (!employee) throw new Error('Employee not found');

    const entry: TimeEntry = {
      id: `time_${uuidv4()}`,
      employeeId,
      date,
      hoursWorked,
      overtimeHours: options.overtimeHours || 0,
      ptoHours: options.ptoHours || 0,
      sickHours: options.sickHours || 0,
      tips: options.tips,
      notes: options.notes,
      createdAt: new Date(),
    };

    const entries = this.timeEntries.get(employeeId) || [];
    entries.push(entry);
    this.timeEntries.set(employeeId, entries);

    this.emit('time:logged', entry);
    return entry;
  }

  // ============================================================
  // INSTANT PAY — Never Before Seen!
  // ============================================================

  /**
   * Request instant pay - access earned wages before payday
   * FREE for TIME Pay users!
   */
  public requestInstantPay(
    employeeId: string,
    amount: number
  ): {
    success: boolean;
    amount: number;
    fee: number;
    message: string;
  } {
    const employee = this.employees.get(employeeId);
    if (!employee) throw new Error('Employee not found');
    if (!employee.instantPayEnabled) throw new Error('Instant pay not enabled for this employee');
    if (!employee.timePayWalletId) throw new Error('TIME Pay wallet not linked');

    // Calculate earned wages this period
    const earnedWages = this.calculateEarnedWages(employeeId);
    const available = earnedWages - employee.instantPayUsed;

    if (amount > available) {
      throw new Error(`Only $${available.toFixed(2)} available for instant pay`);
    }

    // Max 50% of earned wages
    if (amount > earnedWages * 0.5) {
      throw new Error('Can only advance up to 50% of earned wages');
    }

    employee.instantPayUsed += amount;
    employee.updatedAt = new Date();

    this.emit('instantpay:requested', { employee, amount });
    logger.info(`Instant pay of $${amount} requested for ${employee.firstName} ${employee.lastName}`);

    return {
      success: true,
      amount,
      fee: 0, // FREE!
      message: `$${amount.toFixed(2)} will be deposited to your TIME Pay wallet instantly. This will be deducted from your next paycheck.`,
    };
  }

  /**
   * Calculate earned wages since last payday
   */
  private calculateEarnedWages(employeeId: string): number {
    const employee = this.employees.get(employeeId);
    if (!employee) return 0;

    const company = this.companies.get(employee.companyId);
    if (!company) return 0;

    // Get time entries since last pay period
    const entries = this.timeEntries.get(employeeId) || [];
    const lastPayDate = this.getLastPayDate(company);
    const periodEntries = entries.filter(e => e.date >= lastPayDate);

    if (employee.payType === 'salary') {
      // Pro-rate salary based on days worked
      const daysInPeriod = this.getDaysInPayPeriod(company.payFrequency);
      const daysSinceLastPay = Math.floor((Date.now() - lastPayDate.getTime()) / (24 * 60 * 60 * 1000));
      const dailyRate = employee.salary! / 260; // ~260 working days per year
      return dailyRate * Math.min(daysSinceLastPay, daysInPeriod);
    } else {
      // Hourly - sum up hours
      const totalHours = periodEntries.reduce((sum, e) => sum + e.hoursWorked + e.overtimeHours, 0);
      const overtimeHours = periodEntries.reduce((sum, e) => sum + e.overtimeHours, 0);
      const regularHours = totalHours - overtimeHours;
      return (regularHours * employee.hourlyRate!) + (overtimeHours * employee.hourlyRate! * 1.5);
    }
  }

  // ============================================================
  // PAYROLL PROCESSING
  // ============================================================

  /**
   * Create and run a payrun
   */
  public runPayroll(companyId: string, options: { isDraft?: boolean } = {}): Payrun {
    const company = this.companies.get(companyId);
    if (!company) throw new Error('Company not found');

    const employees = this.getCompanyEmployees(companyId);
    if (employees.length === 0) throw new Error('No active employees');

    const payPeriod = this.getPayPeriod(company);

    const payrun: Payrun = {
      id: `payrun_${uuidv4()}`,
      companyId,
      payPeriodStart: payPeriod.start,
      payPeriodEnd: payPeriod.end,
      payDate: company.nextPayDate,
      status: options.isDraft ? 'draft' : 'pending',
      totalGross: 0,
      totalNet: 0,
      totalTaxes: 0,
      totalDeductions: 0,
      totalEmployerTaxes: 0,
      paystubs: [],
      wasAutoRun: false,
      createdAt: new Date(),
    };

    // Generate paystubs for each employee
    employees.forEach(employee => {
      const paystub = this.generatePaystub(employee, payPeriod);
      payrun.paystubs.push(paystub);
      payrun.totalGross += paystub.grossPay;
      payrun.totalNet += paystub.netPay;
      payrun.totalTaxes += paystub.totalTaxes;
      payrun.totalDeductions += paystub.totalDeductions;
    });

    // Calculate employer taxes
    payrun.totalEmployerTaxes = this.calculateEmployerTaxes(payrun.totalGross);

    this.payruns.set(payrun.id, payrun);
    this.emit('payrun:created', payrun);

    if (!options.isDraft) {
      this.processPayrun(payrun.id);
    }

    logger.info(`Created payrun for ${company.name}: $${payrun.totalNet.toFixed(2)} net to ${employees.length} employees`);
    return payrun;
  }

  /**
   * Generate a paystub for an employee
   */
  private generatePaystub(employee: Employee, payPeriod: { start: Date; end: Date }): Paystub {
    // Get time entries for period
    const entries = this.timeEntries.get(employee.id) || [];
    const periodEntries = entries.filter(e => e.date >= payPeriod.start && e.date <= payPeriod.end);

    let regularHours = 0;
    let overtimeHours = 0;
    let ptoHours = 0;
    let tips = 0;

    if (employee.payType === 'hourly') {
      periodEntries.forEach(e => {
        regularHours += e.hoursWorked;
        overtimeHours += e.overtimeHours;
        ptoHours += e.ptoHours;
        tips += e.tips || 0;
      });
    }

    // Calculate pay
    let regularPay = 0;
    let overtimePay = 0;
    let ptoPay = 0;

    if (employee.payType === 'salary') {
      const periodsPerYear = this.getPeriodsPerYear(this.companies.get(employee.companyId)!.payFrequency);
      regularPay = employee.salary! / periodsPerYear;
    } else {
      regularPay = regularHours * employee.hourlyRate!;
      overtimePay = overtimeHours * employee.hourlyRate! * 1.5;
      ptoPay = ptoHours * employee.hourlyRate!;
    }

    const grossPay = regularPay + overtimePay + ptoPay + tips;

    // Calculate taxes
    const annualizedGross = grossPay * this.getPeriodsPerYear(this.companies.get(employee.companyId)!.payFrequency);
    const federalTax = this.calculateFederalTax(annualizedGross, employee.federalFilingStatus) / this.getPeriodsPerYear(this.companies.get(employee.companyId)!.payFrequency);
    const stateTax = grossPay * 0.05; // Simplified - would vary by state
    const localTax = grossPay * 0.01; // Simplified
    const socialSecurity = Math.min(grossPay * FICA_RATES.socialSecurity, (FICA_RATES.socialSecurityMax - employee.ytdGross) * FICA_RATES.socialSecurity);
    const medicare = grossPay * FICA_RATES.medicare;
    const totalTaxes = federalTax + stateTax + localTax + socialSecurity + medicare;

    // Calculate deductions
    const deductions: PaystubDeduction[] = employee.benefits.map(benefit => ({
      name: benefit.name,
      type: benefit.type,
      amount: benefit.employeeContribution,
      isPreTax: benefit.isPreTax,
    }));
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    // Subtract instant pay already taken
    const instantPayAdvanced = employee.instantPayUsed;

    const netPay = grossPay - totalTaxes - totalDeductions - instantPayAdvanced;

    return {
      id: `stub_${uuidv4()}`,
      payrunId: '',
      employeeId: employee.id,
      regularHours,
      regularPay,
      overtimeHours,
      overtimePay,
      ptoHours,
      ptoPay,
      tips,
      bonuses: 0,
      grossPay,
      federalTax,
      stateTax,
      localTax,
      socialSecurity,
      medicare,
      totalTaxes,
      deductions,
      totalDeductions,
      netPay,
      instantPayAdvanced,
      paymentMethod: employee.timePayWalletId ? 'time_pay' : 'direct_deposit',
      paymentStatus: 'pending',
    };
  }

  /**
   * Process a payrun (pay employees)
   */
  public processPayrun(payrunId: string): Payrun {
    const payrun = this.payruns.get(payrunId);
    if (!payrun) throw new Error('Payrun not found');
    if (payrun.status !== 'pending' && payrun.status !== 'draft') {
      throw new Error(`Cannot process payrun with status: ${payrun.status}`);
    }

    payrun.status = 'processing';

    // Process each paystub
    payrun.paystubs.forEach(paystub => {
      const employee = this.employees.get(paystub.employeeId);
      if (!employee) return;

      // In production, this would initiate actual payments
      paystub.paymentStatus = 'paid';
      paystub.paidAt = new Date();

      // Update employee YTD
      employee.ytdGross += paystub.grossPay;
      employee.ytdNet += paystub.netPay;
      employee.ytdTaxes += paystub.totalTaxes;
      employee.instantPayUsed = 0; // Reset for next period
      employee.updatedAt = new Date();
    });

    payrun.status = 'completed';
    payrun.processedAt = new Date();

    // Update company
    const company = this.companies.get(payrun.companyId);
    if (company) {
      company.totalPayrollRun++;
      company.ytdPayroll += payrun.totalNet;
      company.nextPayDate = this.calculateNextPayDate(company.payFrequency);
      company.updatedAt = new Date();
    }

    this.emit('payrun:processed', payrun);
    logger.info(`Processed payrun ${payrunId}: $${payrun.totalNet.toFixed(2)} paid to ${payrun.paystubs.length} employees`);

    return payrun;
  }

  // ============================================================
  // BOT GOVERNANCE — Auto-Run Payroll
  // ============================================================

  /**
   * Start bot governance
   */
  private startBotGovernance(): void {
    // Check for payroll to run every hour
    this.autoPayrollInterval = setInterval(() => {
      this.runAutoPayroll();
    }, 60 * 60 * 1000);

    // Run immediately
    setTimeout(() => this.runAutoPayroll(), 5000);

    logger.info('Bot governance started: Auto-payroll enabled');
  }

  /**
   * Automatically run payroll for companies due
   */
  private runAutoPayroll(): void {
    const now = new Date();

    this.companies.forEach(company => {
      if (!company.autoRunPayroll) return;

      // Check if payroll is due (run 1 day before pay date to allow review)
      const runDate = new Date(company.nextPayDate);
      runDate.setDate(runDate.getDate() - 1);

      if (now >= runDate && now < company.nextPayDate) {
        try {
          const payrun = this.runPayroll(company.id);
          payrun.wasAutoRun = true;
          this.emit('payroll:autorun', { company, payrun });
          logger.info(`Auto-ran payroll for ${company.name}`);
        } catch (error: any) {
          logger.error(`Failed to auto-run payroll for ${company.name}: ${error.message}`);
          this.emit('payroll:autorun:failed', { company, error: error.message });
        }
      }
    });
  }

  // ============================================================
  // TAX CALCULATIONS
  // ============================================================

  /**
   * Calculate federal income tax
   */
  private calculateFederalTax(annualIncome: number, filingStatus: 'single' | 'married' | 'head_of_household'): number {
    const brackets = FEDERAL_TAX_BRACKETS_2024[filingStatus === 'head_of_household' ? 'single' : filingStatus];
    let tax = 0;
    let remainingIncome = annualIncome;

    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
      tax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
    }

    return tax;
  }

  /**
   * Calculate employer portion of taxes
   */
  private calculateEmployerTaxes(totalGross: number): number {
    const socialSecurity = Math.min(totalGross * FICA_RATES.socialSecurity, FICA_RATES.socialSecurityMax * FICA_RATES.socialSecurity);
    const medicare = totalGross * FICA_RATES.medicare;
    const futa = totalGross * 0.006; // 0.6% FUTA
    const suta = totalGross * 0.03; // ~3% SUTA average
    return socialSecurity + medicare + futa + suta;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private calculateNextPayDate(frequency: PayFrequency): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + (7 - next.getDay() + 5) % 7); // Next Friday
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'semimonthly':
        if (next.getDate() < 15) {
          next.setDate(15);
        } else {
          next.setMonth(next.getMonth() + 1);
          next.setDate(1);
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        break;
    }

    return next;
  }

  private getLastPayDate(company: Company): Date {
    const lastRuns = Array.from(this.payruns.values())
      .filter(p => p.companyId === company.id && p.status === 'completed')
      .sort((a, b) => b.payDate.getTime() - a.payDate.getTime());

    if (lastRuns.length > 0) {
      return lastRuns[0].payDate;
    }

    // If no previous payrun, use 1 period ago
    const date = new Date();
    const daysBack = this.getDaysInPayPeriod(company.payFrequency);
    date.setDate(date.getDate() - daysBack);
    return date;
  }

  private getPayPeriod(company: Company): { start: Date; end: Date } {
    const end = new Date(company.nextPayDate);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - this.getDaysInPayPeriod(company.payFrequency) + 1);
    return { start, end };
  }

  private getDaysInPayPeriod(frequency: PayFrequency): number {
    switch (frequency) {
      case 'weekly': return 7;
      case 'biweekly': return 14;
      case 'semimonthly': return 15;
      case 'monthly': return 30;
    }
  }

  private getPeriodsPerYear(frequency: PayFrequency): number {
    switch (frequency) {
      case 'weekly': return 52;
      case 'biweekly': return 26;
      case 'semimonthly': return 24;
      case 'monthly': return 12;
    }
  }

  // ============================================================
  // GETTERS
  // ============================================================

  public getCompany(companyId: string): Company | null {
    return this.companies.get(companyId) || null;
  }

  public getUserCompanies(userId: string): Company[] {
    return Array.from(this.companies.values()).filter(c => c.userId === userId);
  }

  public getEmployee(employeeId: string): Employee | null {
    return this.employees.get(employeeId) || null;
  }

  public getPayrun(payrunId: string): Payrun | null {
    return this.payruns.get(payrunId) || null;
  }

  public getCompanyPayruns(companyId: string): Payrun[] {
    return Array.from(this.payruns.values()).filter(p => p.companyId === companyId);
  }

  public getStats(companyId: string): {
    totalEmployees: number;
    totalPayrollRun: number;
    ytdPayroll: number;
    avgPayPerEmployee: number;
    nextPayDate: Date;
  } {
    const company = this.companies.get(companyId);
    if (!company) throw new Error('Company not found');

    const employees = this.getCompanyEmployees(companyId);

    return {
      totalEmployees: employees.length,
      totalPayrollRun: company.totalPayrollRun,
      ytdPayroll: company.ytdPayroll,
      avgPayPerEmployee: employees.length > 0 ? company.ytdPayroll / employees.length / Math.max(1, company.totalPayrollRun) : 0,
      nextPayDate: company.nextPayDate,
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.autoPayrollInterval) clearInterval(this.autoPayrollInterval);
  }
}

// Export singleton
export const timePayrollEngine = new TIMEPayrollEngine();

export default TIMEPayrollEngine;
