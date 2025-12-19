/**
 * Trade Detail Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TradeDetailScreen({ route }: any) {
  const { trade } = route.params || {};

  // Mock trade for now
  const tradeData = trade || {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    side: 'BUY',
    quantity: 10,
    price: 198.50,
    value: 1985.00,
    timestamp: new Date().toISOString(),
    status: 'executed',
    bot: 'Phantom King',
    reasoning: 'RSI divergence detected with MACD cross',
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <ScrollView style={styles.container}>
      {/* Trade Summary */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.symbol}>{tradeData.symbol}</Text>
            <Text style={styles.name}>{tradeData.name}</Text>
          </View>
          <View style={[styles.sideBadge, { backgroundColor: tradeData.side === 'BUY' ? '#22c55e20' : '#ef444420' }]}>
            <Text style={[styles.sideText, { color: tradeData.side === 'BUY' ? '#22c55e' : '#ef4444' }]}>
              {tradeData.side}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{tradeData.quantity} shares</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>{formatCurrency(tradeData.price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Value</Text>
            <Text style={styles.detailValue}>{formatCurrency(tradeData.value)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.statusText}>Executed</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bot Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Executed By</Text>
        <View style={styles.botInfo}>
          <View style={styles.botIcon}>
            <Ionicons name="hardware-chip" size={24} color="#f59e0b" />
          </View>
          <View>
            <Text style={styles.botName}>{tradeData.bot}</Text>
            <Text style={styles.botLabel}>LEGENDARY Bot</Text>
          </View>
        </View>
      </View>

      {/* Reasoning */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trade Reasoning</Text>
        <Text style={styles.reasoning}>{tradeData.reasoning}</Text>
      </View>

      {/* Timestamp */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Execution Time</Text>
        <Text style={styles.timestamp}>
          {new Date(tradeData.timestamp).toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  symbol: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  sideBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sideText: {
    fontSize: 14,
    fontWeight: '600',
  },
  details: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  cardTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f59e0b20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  botLabel: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
  },
  reasoning: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    color: '#f8fafc',
    fontSize: 14,
  },
});
