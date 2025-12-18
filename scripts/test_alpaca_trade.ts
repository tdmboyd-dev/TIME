/**
 * Test Alpaca Trade Script
 * Tests placing a sample trade through the Alpaca broker
 */

import dotenv from 'dotenv';
dotenv.config();

import { BrokerManager } from '../src/backend/brokers/broker_manager';

async function testAlpacaTrade() {
  console.log('=== ALPACA TRADE TEST ===\n');

  // Check environment variables
  console.log('Environment check:');
  console.log('  ALPACA_API_KEY:', process.env.ALPACA_API_KEY ? '✓ Set' : '✗ Not set');
  console.log('  ALPACA_SECRET_KEY:', process.env.ALPACA_SECRET_KEY ? '✓ Set' : '✗ Not set');
  console.log('  ALPACA_PAPER:', process.env.ALPACA_PAPER || 'not set (defaults to true)');
  console.log('');

  try {
    // Initialize broker manager
    console.log('1. Initializing BrokerManager...');
    const brokerManager = BrokerManager.getInstance();
    await brokerManager.initialize();

    // Add Alpaca broker (same as index.ts)
    const alpacaKey = process.env.ALPACA_API_KEY;
    const alpacaSecret = process.env.ALPACA_SECRET_KEY;
    const alpacaPaper = process.env.ALPACA_PAPER !== 'false';

    if (!alpacaKey || !alpacaSecret) {
      throw new Error('ALPACA_API_KEY and ALPACA_SECRET_KEY must be set in .env');
    }

    console.log('   Adding Alpaca broker...');
    await brokerManager.addBroker('alpaca', 'alpaca', {
      apiKey: alpacaKey,
      apiSecret: alpacaSecret,
      isPaper: alpacaPaper,
    }, { isPrimary: true, name: 'Alpaca (US Stocks & Crypto)' });

    // Connect the broker
    console.log('   Connecting to Alpaca...');
    await brokerManager.connectAll();

    // Check broker status
    console.log('\n2. Checking broker status...');
    const status = brokerManager.getStatus();
    console.log('Broker status:', JSON.stringify(status, null, 2));

    // Get Alpaca account info
    console.log('\n3. Getting Alpaca account info...');
    const alpaca = brokerManager.getBroker('alpaca');
    if (!alpaca) {
      throw new Error('Alpaca broker not found');
    }

    const account = await alpaca.getAccount();
    console.log('Account:', {
      id: account.id,
      equity: account.equity,
      buyingPower: account.buyingPower,
      cash: account.cash,
      currency: account.currency,
    });

    // Get current positions
    console.log('\n4. Getting current positions...');
    const positions = await alpaca.getPositions();
    console.log(`Current positions: ${positions.length}`);
    positions.forEach((pos) => {
      console.log(`  - ${pos.symbol}: ${pos.quantity} shares @ $${pos.averagePrice}`);
    });

    // Place a test order (1 share of AAPL)
    console.log('\n5. Placing TEST ORDER: Buy 1 share of AAPL...');
    const orderResult = await brokerManager.submitOrder(
      {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 1,
      },
      'alpaca'
    );

    console.log('\n=== ORDER RESULT ===');
    console.log('Success:', orderResult.success);
    if (orderResult.order) {
      console.log('Order ID:', orderResult.order.id);
      console.log('Status:', orderResult.order.status);
      console.log('Symbol:', orderResult.order.symbol);
      console.log('Side:', orderResult.order.side);
      console.log('Quantity:', orderResult.order.quantity);
      console.log('Type:', orderResult.order.type);
    }
    if (orderResult.error) {
      console.log('Error:', orderResult.error);
    }

    // Wait a moment for order to process
    console.log('\n6. Waiting 3 seconds for order to process...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check order status
    if (orderResult.order?.id) {
      console.log('\n7. Checking order status...');
      const orderStatus = await alpaca.getOrder(orderResult.order.id);
      console.log('Updated order status:', orderStatus.status);
      console.log('Filled quantity:', orderStatus.filledQuantity);
      console.log('Filled price:', orderStatus.averagePrice);
    }

    // Get updated positions
    console.log('\n8. Getting updated positions...');
    const updatedPositions = await alpaca.getPositions();
    console.log(`Updated positions: ${updatedPositions.length}`);
    updatedPositions.forEach((pos) => {
      console.log(`  - ${pos.symbol}: ${pos.quantity} shares @ $${pos.averagePrice} (P&L: $${pos.unrealizedPL})`);
    });

    console.log('\n=== TEST COMPLETE ===');
    console.log('Trade test successful!');
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Trade test failed:', error);
  }

  process.exit(0);
}

testAlpacaTrade();
