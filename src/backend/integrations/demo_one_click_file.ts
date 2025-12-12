/**
 * ONE-CLICK FILE DEMO
 *
 * This demonstrates the complete flow:
 * iKickItz → TIME Pay → MGR Elite Hub → IRS
 *
 * Run with: npx ts-node src/backend/integrations/demo_one_click_file.ts
 */

import { unifiedTaxFlow, TaxFilingUser } from './unified_tax_flow';
import { ikickitzBridge } from './ikickitz_bridge';
import { mgrBridge } from './mgr_bridge';
import { platformBridge, Platform } from './platform_bridge';

async function runDemo() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║      TIME PLATFORM INTEGRATION - ONE-CLICK FILE DEMO            ║');
  console.log('║                                                                  ║');
  console.log('║      iKickItz → TIME Pay → MGR Elite Hub → IRS                  ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ============================================================================
  // STEP 1: Register platforms
  // ============================================================================
  console.log('🔌 STEP 1: Registering platforms...');
  console.log('');

  platformBridge.registerPlatform({
    platform: Platform.IKICKITZ,
    baseUrl: 'https://api.ikickitz.com',
    apiKey: 'demo_ikickitz_key',
    webhookSecret: 'demo_webhook_secret',
  });

  platformBridge.registerPlatform({
    platform: Platform.MGR_ELITE_HUB,
    baseUrl: 'https://api.mgrelitehub.com',
    apiKey: 'demo_mgr_key',
    webhookSecret: 'demo_webhook_secret',
  });

  console.log('✅ All platforms registered');
  console.log('');

  // ============================================================================
  // STEP 2: Create demo user
  // ============================================================================
  console.log('👤 STEP 2: Creating demo user...');
  console.log('');

  const demoUser: TaxFilingUser = {
    id: 'user_demo_001',
    email: 'creator@ikickitz.com',
    firstName: 'Demo',
    lastName: 'Creator',
    timePayUserId: 'tp_user_001',
    ikickitzCreatorId: 'ik_creator_001',
    ssn: '123-45-6789',
    dateOfBirth: '1990-01-15',
    filingStatus: 'single',
    address: {
      street: '123 Creator Lane',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
    },
    bankInfo: {
      routing: '121000248',
      account: '123456789',
      type: 'checking',
    },
  };

  unifiedTaxFlow.registerUser(demoUser);

  // Link iKickItz account to TIME Pay
  await ikickitzBridge.linkCreatorAccount({
    id: 'ik_creator_001',
    firebase_uid: 'firebase_001',
    username: 'DemoCreator',
    display_name: 'Demo Creator',
    email: 'creator@ikickitz.com',
    balance: 5000,
    ikoinz_balance: 10000,
    tax_reserve_balance: 13500,
    lifetime_earnings: 50000,
    tax_info_provided: true,
    ssn_last_four: '6789',
    is_mgr_creator: true,
    time_pay_linked: true,
    time_pay_account_id: 'tp_creator_ik_creator_001',
    stripe_onboarding_complete: true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log('✅ Demo user created and iKickItz account linked');
  console.log('');

  // ============================================================================
  // STEP 3: Start ONE-CLICK FILE
  // ============================================================================
  console.log('🚀 STEP 3: Starting ONE-CLICK FILE...');
  console.log('');

  const session = await unifiedTaxFlow.startOneClickFile(
    'user_demo_001',
    2024,
    {
      includeIKickItz: true,
      includeTimePayroll: true,
      includeTimeInvoice: true,
    }
  );

  // ============================================================================
  // STEP 4: Simulate user approval
  // ============================================================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📱 USER SEES APPROVAL DIALOG IN TIME PAY APP:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                                                             │');
  console.log('│   📋 Your 2024 Tax Return is Ready!                        │');
  console.log('│                                                             │');
  console.log('│   Income Sources:                                           │');
  console.log('│   • iKickItz Creator Earnings: $45,000.00                   │');
  console.log('│   • W-2 Wages: $65,000.00                                   │');
  console.log('│   • Freelance Income (1099): $15,000.00                     │');
  console.log('│   ────────────────────────────────────                      │');
  console.log('│   Total Income: $125,000.00                                 │');
  console.log('│                                                             │');
  console.log('│   Prep Fee: $' + session.prepFeeQuote?.totalFee.toFixed(2).padEnd(10) + '                            │');
  console.log('│                                                             │');
  console.log('│   Pay From:                                                 │');
  console.log('│   ○ TIME Pay Balance                                        │');
  console.log('│   ○ Credit/Debit Card                                       │');
  console.log('│   ● Tax Reserve ($13,500.00 available)  ← SELECTED         │');
  console.log('│   ○ Deduct from Refund                                      │');
  console.log('│                                                             │');
  console.log('│   ☑ I authorize MGR Elite Hub to e-file my return          │');
  console.log('│                                                             │');
  console.log('│   ┌─────────────────────────────────────────────────────┐   │');
  console.log('│   │            ✅ APPROVE & FILE                        │   │');
  console.log('│   └─────────────────────────────────────────────────────┘   │');
  console.log('│                                                             │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('👆 User taps "APPROVE & FILE"...');
  console.log('');

  // Wait a moment for dramatic effect
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Approve and file
  const result = await unifiedTaxFlow.approvePrepFeeAndFile(session.id, {
    approvedBy: 'user_demo_001',
    paymentMethod: 'tax_reserve',
    agreedToTerms: true,
  });

  // ============================================================================
  // STEP 5: Show final results
  // ============================================================================
  console.log('');
  console.log('📱 USER SEES CONFIRMATION:');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                                                             │');
  console.log('│                    🎉 SUCCESS!                              │');
  console.log('│                                                             │');
  console.log('│   Your 2024 tax return has been filed!                      │');
  console.log('│                                                             │');
  console.log('│   Confirmation: ' + result.confirmationNumber.padEnd(30) + '  │');
  console.log('│                                                             │');
  console.log('│   Prep Fee Paid: $' + session.prepFeeQuote?.totalFee.toFixed(2).padEnd(10) + '                       │');
  console.log('│   (Deducted from tax reserve)                               │');
  console.log('│                                                             │');
  console.log('│   Estimated Refund: $' + (session.estimatedRefund || 0).toFixed(2).padEnd(10) + '                  │');
  console.log('│                                                             │');
  console.log('│   The IRS typically responds within 24-48 hours.            │');
  console.log('│   We\'ll notify you when your return is accepted!            │');
  console.log('│                                                             │');
  console.log('│   ┌─────────────────────────────────────────────────────┐   │');
  console.log('│   │              View Return Details                    │   │');
  console.log('│   └─────────────────────────────────────────────────────┘   │');
  console.log('│                                                             │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');

  // ============================================================================
  // STEP 6: Simulate IRS acceptance (in real life this comes via webhook)
  // ============================================================================
  console.log('⏳ Simulating IRS processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get the MGR return and simulate acceptance
  const mgrReturn = mgrBridge.getReturnStatus(session.mgrReturnId!);
  if (mgrReturn) {
    await mgrBridge.handleIRSResponse(session.mgrReturnId!, {
      status: 'accepted',
      confirmationNumber: result.confirmationNumber,
    });
  }

  console.log('');
  console.log('📱 USER RECEIVES NOTIFICATION:');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                                                             │');
  console.log('│   🔔 TIME Pay                                               │');
  console.log('│                                                             │');
  console.log('│   ✅ IRS ACCEPTED YOUR RETURN!                              │');
  console.log('│                                                             │');
  console.log('│   Your 2024 tax return has been accepted by the IRS.       │');
  console.log('│                                                             │');
  console.log('│   Refund Amount: $9,750.00                                  │');
  console.log('│   Expected Deposit: 10-21 days                              │');
  console.log('│                                                             │');
  console.log('│   Your refund will be deposited directly to your            │');
  console.log('│   TIME Pay account!                                         │');
  console.log('│                                                             │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║                    DEMO COMPLETE!                                ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('What happened:');
  console.log('');
  console.log('1. ✅ iKickItz creator earnings ($45,000) synced to TIME Pay');
  console.log('2. ✅ TIME Payroll W-2 ($65,000) submitted to MGR Elite Hub');
  console.log('3. ✅ TIME Invoice 1099 ($15,000) submitted to MGR Elite Hub');
  console.log('4. ✅ MGR AI analyzed return and generated prep fee quote');
  console.log('5. ✅ User approved prep fee (paid from iKickItz tax reserve)');
  console.log('6. ✅ Bot filed return via MGR Elite Hub');
  console.log('7. ✅ IRS accepted return');
  console.log('8. ✅ Refund will deposit to TIME Pay account');
  console.log('');
  console.log('The entire process was ONE CLICK for the user!');
  console.log('Bot and MGR AI did ALL the work.');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
}

// Run the demo
runDemo().catch(console.error);
