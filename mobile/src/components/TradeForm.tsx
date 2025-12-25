import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

interface TradeFormProps {
  symbol: string;
  currentPrice: number;
  balance: number;
  onSubmit: (data: TradeFormData) => Promise<void>;
}

export interface TradeFormData {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
}

export default function TradeForm({
  symbol,
  currentPrice,
  balance,
  onSubmit,
}: TradeFormProps) {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);

    if (!amount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (orderType === 'limit' && (!price || numPrice <= 0)) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const total = orderType === 'market'
      ? numAmount * currentPrice
      : numAmount * numPrice;

    if (orderSide === 'buy' && total > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        symbol,
        side: orderSide,
        type: orderType,
        amount: numAmount,
        price: orderType === 'limit' ? numPrice : undefined,
      });
      // Reset form
      setAmount('');
      setPrice(currentPrice.toString());
    } catch (error) {
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstimatedTotal = () => {
    const numAmount = parseFloat(amount) || 0;
    const numPrice = orderType === 'market' ? currentPrice : parseFloat(price) || 0;
    return numAmount * numPrice;
  };

  return (
    <View style={styles.container}>
      {/* Order Type Toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            orderType === 'market' && styles.typeButtonActive,
          ]}
          onPress={() => setOrderType('market')}
        >
          <Text
            style={[
              styles.typeText,
              orderType === 'market' && styles.typeTextActive,
            ]}
          >
            Market
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            orderType === 'limit' && styles.typeButtonActive,
          ]}
          onPress={() => setOrderType('limit')}
        >
          <Text
            style={[
              styles.typeText,
              orderType === 'limit' && styles.typeTextActive,
            ]}
          >
            Limit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Side Toggle */}
      <View style={styles.sideToggle}>
        <TouchableOpacity
          style={[
            styles.sideButton,
            styles.buyButton,
            orderSide === 'buy' && styles.sideButtonActive,
          ]}
          onPress={() => setOrderSide('buy')}
        >
          <Text style={styles.sideText}>BUY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sideButton,
            styles.sellButton,
            orderSide === 'sell' && styles.sideButtonActive,
          ]}
          onPress={() => setOrderSide('sell')}
        >
          <Text style={styles.sideText}>SELL</Text>
        </TouchableOpacity>
      </View>

      {/* Price Input (for limit orders) */}
      {orderType === 'limit' && (
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

      {/* Amount Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Amount ({symbol})</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
          placeholderTextColor="#64748b"
          keyboardType="decimal-pad"
        />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available</Text>
          <Text style={styles.summaryValue}>${balance.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated Total</Text>
          <Text style={styles.summaryValue}>
            ${getEstimatedTotal().toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          orderSide === 'buy' ? styles.submitBuy : styles.submitSell,
          isSubmitting && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting ? 'Processing...' : `${orderSide.toUpperCase()} ${symbol}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: '#00ff88',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  typeTextActive: {
    color: '#00ff88',
  },
  sideToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    opacity: 0.5,
  },
  sideButtonActive: {
    opacity: 1,
  },
  buyButton: {
    backgroundColor: '#00ff88',
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
  sideText: {
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
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  summary: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBuy: {
    backgroundColor: '#00ff88',
  },
  submitSell: {
    backgroundColor: '#ef4444',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#020617',
  },
});
