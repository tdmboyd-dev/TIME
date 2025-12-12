/**
 * TIME Platform Integrations
 *
 * Unified export for all integration modules:
 * - Platform Bridge (central hub)
 * - iKickItz Bridge (creator economy → TIME Pay)
 * - MGR Bridge (TIME Pay → tax filing)
 * - Unified Tax Flow (one-click file orchestrator)
 */

// Platform Bridge - Central Integration Hub
export {
  PlatformBridgeEngine,
  platformBridge,
  platformBridgeRoutes,
  Platform,
  DataType,
  type PlatformConfig,
  type IKickItzConfig,
  type MGRHubConfig,
  type CreatorEarningsExport,
  type W2Export,
  type Form1099NECExport,
  type PrepFeeQuote,
  type TaxFilingRequest,
} from './platform_bridge';

// iKickItz Bridge - Creator Economy Integration
export {
  IKickItzBridge,
  ikickitzBridge,
  ikickitzBridgeRoutes,
  IKickItzTransactionType,
  type IKickItzCreator,
  type IKickItzTransaction,
  type IKickItzTaxAccount,
  type TimePayCreatorAccount,
} from './ikickitz_bridge';

// MGR Elite Hub Bridge - Tax Filing Integration
export {
  MGRBridge,
  mgrBridge,
  mgrBridgeRoutes,
  MGRReturnType,
  MGRReturnStatus,
  MGR_PREP_FEE_STRUCTURE,
  type MGRClient,
  type MGRTaxReturn,
  type MGRDocument,
} from './mgr_bridge';

// Unified Tax Flow - One-Click File Orchestrator
export {
  UnifiedTaxFlowEngine,
  unifiedTaxFlow,
  unifiedTaxFlowRoutes,
  TaxFilingSessionStatus,
  type TaxFilingUser,
  type TaxFilingSession,
} from './unified_tax_flow';

// Integration Summary
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('   TIME PLATFORM INTEGRATIONS LOADED');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('   Platforms Connected:');
console.log('   • iKickItz (Creator Economy)');
console.log('   • TIME Pay (Payments & Payroll)');
console.log('   • MGR Elite Hub (Tax Filing)');
console.log('');
console.log('   Features:');
console.log('   • One-Click Tax Filing');
console.log('   • Creator Earnings Sync');
console.log('   • Automated W-2/1099 Generation');
console.log('   • AI-Powered Tax Preparation');
console.log('   • Custom Prep Fee Quotes');
console.log('   • IRS E-File Integration');
console.log('   • Tax Reserve Management');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
