/**
 * Advanced Trade Screen
 * TIME BEYOND US - Advanced Order Types (Limit, Stop-Loss, OCO, Trailing Stop)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../hooks/useApi';
import websocketService, { PriceUpdate } from '../services/websocket';

type OrderType = 'limit' | 'stop-limit' | 'oco' | 'trailing-stop';
type OrderSide = 'buy' | 'sell';
type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY';

interface MarketData {
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
}

export default function AdvancedTradeScreen({ route, navigation }: any) {
  const { symbol: initialSymbol = 'BTC/USDT' } = route.params || {};

  const [symbol, setSymbol] = useState(initialSymbol);
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [trailingPercent, setTrailingPercent] = useState('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('GTC');
  const [reduceOnly, setReduceOnly] = useState(false);
  const [postOnly, setPostOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Fetch market data
  const { data: marketData } = useQuery<MarketData>({
    queryKey: ['market', symbol],
    queryFn: () => api.get(`/market/${symbol.replace('/', '')}`),
    refetchInterval: 10000,
  });

  // Subscribe to real-time price updates
  useEffect(() => {
    const unsubscribe = websocketService.subscribeToPrice(symbol, (data: PriceUpdate) => {
      setCurrentPrice(data.price);
    });

    return () => unsubscribe();
  }, [symbol]);

  useEffect(() => {
    if (marketData?.price) {
      setCurrentPrice(marketData.price);
    }
  }, [marketData]);

  const orderTypes: { type: OrderType; label: string; icon: string }[] = [
    { type: 'limit', label: 'Limit', icon: 'swap-horizontal' },
    { type: 'stop-limit', label: 'Stop-Limit', icon: 'stop-circle' },
    { type: 'oco', label: 'OCO', icon: 'git-branch' },
    { type: 'trailing-stop', label: 'Trailing', icon: 'trending-up' },
  ];

  const timeInForceOptions: { value: TimeInForce; label: string; description: string }[] = [
    { value: 'GTC', label: 'GTC', description: 'Good Till Cancelled' },
    { value: 'IOC', label: 'IOC', description: 'Immediate or Cancel' },
    { value: 'FOK', label: 'FOK', description: 'Fill or Kill' },
    { value: 'DAY', label: 'DAY', description: 'Day Order' },
  ];

  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const calculateTotal = (): number => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = parseFloat(price) || currentPrice;
    return amountNum * priceNum;
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (orderType !== 'trailing-stop' && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if ((orderType === 'stop-limit' || orderType === 'oco') && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      Alert.alert('Error', 'Please enter a valid stop price');
      return;
    }

    if (orderType === 'oco' && (!takeProfitPrice || parseFloat(takeProfitPrice) <= 0)) {
      Alert.alert('Error', 'Please enter a valid take profit price');
      return;
    }

    if (orderType === 'trailing-stop' && (!trailingPercent || parseFloat(trailingPercent) <= 0)) {
      Alert.alert('Error', 'Please enter a valid trailing percentage');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData: any = {
        symbol,
        side: orderSide,
        type: orderType,
        amount: parseFloat(amount),
        timeInForce,
        reduceOnly,
        postOnly,
      };

      if (orderType === 'limit') {
        orderData.price = parseFloat(price);
      } else if (orderType === 'stop-limit') {
        orderData.price = parseFloat(price);
        orderData.stopPrice = parseFloat(stopPrice);
      } else if (orderType === 'oco') {
        orderData.price = parseFloat(price);
        orderData.stopPrice = parseFloat(stopPrice);
        orderData.takeProfitPrice = parseFloat(takeProfitPrice);
      } else if (orderType === 'trailing-stop') {
        orderData.trailingPercent = parseFloat(trailingPercent);
      }

      await api.post('/orders', orderData);
      Alert.alert(
        'Order Placed',
        `${orderSide.toUpperCase()} ${orderType.toUpperCase()} order placed successfully`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPercentagePrice = (percent: number) => {
    if (currentPrice > 0) {
      const multiplier = orderSide === 'buy' ? (100 - percent) / 100 : (100 + percent) / 100;
      setPrice((currentPrice * multiplier).toFixed(2));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Advanced Trade</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Symbol & Price */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <Text style={styles.symbolText}>{symbol}</Text>
            <TouchableOpacity style={styles.changeSymbolButton}>
              <Ionicons name="swap-horizontal" size={20} color="#00ff88" />
            </TouchableOpacity>
          </View>
          <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
          <View style={styles.priceStats}>
            <View style={styles.priceStat}>
              <Text style={styles.priceStatLabel}>24h High</Text>
              <Text style={styles.priceStatValue}>
                {marketData ? formatPrice(marketData.high24h) : '--'}
              </Text>
            </View>
            <View style={styles.priceStat}>
              <Text style={styles.priceStatLabel}>24h Low</Text>
              <Text style={styles.priceStatValue}>
                {marketData ? formatPrice(marketData.low24h) : '--'}
              </Text>
            </View>
            <View style={styles.priceStat}>
              <Text style={styles.priceStatLabel}>24h Vol</Text>
              <Text style={styles.priceStatValue}>
                {marketData ? `${(marketData.volume24h / 1000000).toFixed(2)}M` : '--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.orderTypeContainer}>
            {orderTypes.map((type) => (
              <TouchableOpacity
                key={type.type}
                style={[
                  styles.orderTypeButton,
                  orderType === type.type && styles.orderTypeButtonActive,
                ]}
                onPress={() => setOrderType(type.type)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={18}
                  color={orderType === type.type ? '#00ff88' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.orderTypeText,
                    orderType === type.type && styles.orderTypeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Buy/Sell Toggle */}
        <View style={styles.section}>
          <View style={styles.sideContainer}>
            <TouchableOpacity
              style={[
                styles.sideButton,
                styles.buyButton,
                orderSide === 'buy' && styles.buyButtonActive,
              ]}
              onPress={() => setOrderSide('buy')}
            >
              <Ionicons name="arrow-up" size={20} color={orderSide === 'buy' ? '#020617' : '#00ff88'} />
              <Text style={[styles.sideButtonText, orderSide === 'buy' && styles.sideButtonTextActive]}>
                BUY / LONG
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sideButton,
                styles.sellButton,
                orderSide === 'sell' && styles.sellButtonActive,
              ]}
              onPress={() => setOrderSide('sell')}
            >
              <Ionicons name="arrow-down" size={20} color={orderSide === 'sell' ? '#fff' : '#ef4444'} />
              <Text style={[styles.sideButtonText, orderSide === 'sell' && styles.sideButtonTextActiveSell]}>
                SELL / SHORT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Input */}
        {orderType !== 'trailing-stop' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>
              {orderType === 'oco' ? 'Limit Price' : 'Price'} (USDT)
            </Text>
            <View style={styles.inputWithButtons}>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder={currentPrice.toFixed(2)}
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.inputButton}
                onPress={() => setPrice(currentPrice.toFixed(2))}
              >
                <Text style={styles.inputButtonText}>Market</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickPriceButtons}>
              {[-5, -2, -1, 1, 2, 5].map((percent) => (
                <TouchableOpacity
                  key={percent}
                  style={styles.quickPriceButton}
                  onPress={() => setPercentagePrice(percent)}
                >
                  <Text style={styles.quickPriceText}>
                    {percent > 0 ? '+' : ''}{percent}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Stop Price (for Stop-Limit and OCO) */}
        {(orderType === 'stop-limit' || orderType === 'oco') && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Stop Price (USDT)</Text>
            <TextInput
              style={styles.input}
              value={stopPrice}
              onChangeText={setStopPrice}
              placeholder="Enter stop price"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputHint}>
              Order triggers when price reaches this level
            </Text>
          </View>
        )}

        {/* Take Profit Price (for OCO) */}
        {orderType === 'oco' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Take Profit Price (USDT)</Text>
            <TextInput
              style={styles.input}
              value={takeProfitPrice}
              onChangeText={setTakeProfitPrice}
              placeholder="Enter take profit price"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
          </View>
        )}

        {/* Trailing Percent (for Trailing Stop) */}
        {orderType === 'trailing-stop' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Trailing Percentage (%)</Text>
            <TextInput
              style={styles.input}
              value={trailingPercent}
              onChangeText={setTrailingPercent}
              placeholder="e.g., 2.5"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputHint}>
              Stop price trails market by this percentage
            </Text>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Amount ({symbol.split('/')[0]})</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
          />
          <View style={styles.quickAmountButtons}>
            {[25, 50, 75, 100].map((percent) => (
              <TouchableOpacity
                key={percent}
                style={styles.quickAmountButton}
                onPress={() => setAmount((10000 * percent / 100 / (currentPrice || 1)).toFixed(4))}
              >
                <Text style={styles.quickAmountText}>{percent}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time in Force */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time in Force</Text>
          <View style={styles.tifContainer}>
            {timeInForceOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.tifButton,
                  timeInForce === option.value && styles.tifButtonActive,
                ]}
                onPress={() => setTimeInForce(option.value)}
              >
                <Text
                  style={[
                    styles.tifText,
                    timeInForce === option.value && styles.tifTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.tifDescription}>
            {timeInForceOptions.find((o) => o.value === timeInForce)?.description}
          </Text>
        </View>

        {/* Advanced Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Options</Text>
          <View style={styles.advancedOptions}>
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Reduce Only</Text>
                <Text style={styles.optionDescription}>Only reduce position size</Text>
              </View>
              <Switch
                value={reduceOnly}
                onValueChange={setReduceOnly}
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={reduceOnly ? '#00ff88' : '#94a3b8'}
              />
            </View>
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Post Only</Text>
                <Text style={styles.optionDescription}>Only add liquidity, never take</Text>
              </View>
              <Switch
                value={postOnly}
                onValueChange={setPostOnly}
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={postOnly ? '#00ff88' : '#94a3b8'}
              />
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Type</Text>
            <Text style={styles.summaryValue}>{orderType.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Side</Text>
            <Text style={[styles.summaryValue, { color: orderSide === 'buy' ? '#00ff88' : '#ef4444' }]}>
              {orderSide.toUpperCase()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{amount || '0'} {symbol.split('/')[0]}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Total</Text>
            <Text style={styles.summaryValueLarge}>{formatPrice(calculateTotal())}</Text>
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
          {isSubmitting ? (
            <ActivityIndicator color={orderSide === 'buy' ? '#020617' : '#fff'} />
          ) : (
            <Text
              style={[
                styles.submitButtonText,
                orderSide === 'sell' && styles.submitButtonTextSell,
              ]}
            >
              {orderSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Risk Warning */}
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Advanced orders involve additional complexity. Ensure you understand how each order type works before trading.
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  priceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symbolText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  changeSymbolButton: {
    padding: 8,
  },
  currentPrice: {
    color: '#00ff88',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  priceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceStat: {
    alignItems: 'center',
  },
  priceStatLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  priceStatValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  orderTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orderTypeButtonActive: {
    borderColor: '#00ff88',
  },
  orderTypeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  orderTypeTextActive: {
    color: '#00ff88',
  },
  sideContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  buyButton: {
    backgroundColor: 'transparent',
    borderColor: '#00ff88',
  },
  buyButtonActive: {
    backgroundColor: '#00ff88',
  },
  sellButton: {
    backgroundColor: 'transparent',
    borderColor: '#ef4444',
  },
  sellButtonActive: {
    backgroundColor: '#ef4444',
  },
  sideButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sideButtonTextActive: {
    color: '#020617',
  },
  sideButtonTextActiveSell: {
    color: '#fff',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWithButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  inputButtonText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
  },
  inputHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
  quickPriceButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  quickPriceButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPriceText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickAmountText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tifContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tifButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tifButtonActive: {
    borderColor: '#00ff88',
  },
  tifText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  tifTextActive: {
    color: '#00ff88',
  },
  tifDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  advancedOptions: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  optionDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValueLarge: {
    color: '#00ff88',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    marginHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonBuy: {
    backgroundColor: '#00ff88',
  },
  submitButtonSell: {
    backgroundColor: '#ef4444',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonTextSell: {
    color: '#fff',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 12,
    lineHeight: 18,
  },
});
