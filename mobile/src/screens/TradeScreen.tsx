import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TradeForm from '../components/TradeForm';

type OrderType = 'market' | 'limit' | 'stop-loss';
type OrderSide = 'buy' | 'sell';

export default function TradeScreen() {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickAmounts = ['25%', '50%', '75', '100%'];
  const popularPairs = [
    { symbol: 'BTC/USDT', price: 43250.00, change: '+2.45%' },
    { symbol: 'ETH/USDT', price: 2280.50, change: '+1.82%' },
    { symbol: 'SOL/USDT', price: 98.75, change: '+5.23%' },
    { symbol: 'AVAX/USDT', price: 36.20, change: '-0.95%' },
  ];

  const handleSubmit = async () => {
    if (!amount || (orderType !== 'market' && !price)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit trade via API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      Alert.alert('Success', `${orderSide.toUpperCase()} order placed successfully`);
      setAmount('');
      setPrice('');
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (percentage: string) => {
    // Calculate amount based on available balance
    const balance = 10000; // Mock balance
    const percent = parseInt(percentage) / 100;
    setAmount((balance * percent).toFixed(2));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Quick Trade</Text>
          <Text style={styles.subtitle}>Execute trades instantly</Text>
        </View>

        {/* Trading Pairs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Pair</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {popularPairs.map((pair) => (
              <TouchableOpacity
                key={pair.symbol}
                style={[
                  styles.pairCard,
                  selectedPair === pair.symbol && styles.pairCardActive,
                ]}
                onPress={() => setSelectedPair(pair.symbol)}
              >
                <Text style={styles.pairSymbol}>{pair.symbol}</Text>
                <Text style={styles.pairPrice}>${pair.price.toLocaleString()}</Text>
                <Text
                  style={[
                    styles.pairChange,
                    pair.change.startsWith('+')
                      ? styles.changePositive
                      : styles.changeNegative,
                  ]}
                >
                  {pair.change}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Order Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.orderTypeContainer}>
            {(['market', 'limit', 'stop-loss'] as OrderType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.orderTypeButton,
                  orderType === type && styles.orderTypeButtonActive,
                ]}
                onPress={() => setOrderType(type)}
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    orderType === type && styles.orderTypeTextActive,
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Buy/Sell Toggle */}
        <View style={styles.section}>
          <View style={styles.orderSideContainer}>
            <TouchableOpacity
              style={[
                styles.orderSideButton,
                styles.buyButton,
                orderSide === 'buy' && styles.buyButtonActive,
              ]}
              onPress={() => setOrderSide('buy')}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.orderSideText}>BUY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.orderSideButton,
                styles.sellButton,
                orderSide === 'sell' && styles.sellButtonActive,
              ]}
              onPress={() => setOrderSide('sell')}
            >
              <Ionicons name="arrow-down" size={20} color="#fff" />
              <Text style={styles.orderSideText}>SELL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trade Form */}
        <View style={styles.section}>
          {orderType !== 'market' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price (USDT)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="Enter price"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountContainer}>
            {quickAmounts.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={styles.quickAmountButton}
                onPress={() => handleQuickAmount(percentage)}
              >
                <Text style={styles.quickAmountText}>{percentage}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Available Balance</Text>
              <Text style={styles.summaryValue}>10,000.00 USDT</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Fee</Text>
              <Text style={styles.summaryValue}>0.1%</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>
                {amount ? `${parseFloat(amount).toFixed(2)} USDT` : '-'}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              orderSide === 'buy' ? styles.submitButtonBuy : styles.submitButtonSell,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? 'Processing...'
                : `${orderSide.toUpperCase()} ${selectedPair.split('/')[0]}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Risk Warning */}
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Trading carries risk. Only invest what you can afford to lose.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  pairCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pairCardActive: {
    borderColor: '#00ff88',
    backgroundColor: '#1e293b',
  },
  pairSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  pairPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  pairChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  changePositive: {
    color: '#00ff88',
  },
  changeNegative: {
    color: '#ef4444',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orderTypeButtonActive: {
    backgroundColor: '#1e293b',
    borderColor: '#00ff88',
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  orderTypeTextActive: {
    color: '#00ff88',
  },
  orderSideContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  orderSideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    opacity: 0.5,
  },
  buyButton: {
    backgroundColor: '#00ff88',
  },
  buyButtonActive: {
    opacity: 1,
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
  sellButtonActive: {
    opacity: 1,
  },
  orderSideText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickAmountContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  orderSummary: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  totalValue: {
    fontSize: 16,
    color: '#00ff88',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonBuy: {
    backgroundColor: '#00ff88',
  },
  submitButtonSell: {
    backgroundColor: '#ef4444',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#020617',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#f59e0b',
  },
});
