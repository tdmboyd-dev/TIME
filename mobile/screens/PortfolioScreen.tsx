/**
 * Portfolio Screen - Holdings and Performance
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../hooks/useApi';

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

interface PortfolioData {
  totalValue: number;
  cash: number;
  invested: number;
  holdings: Holding[];
  dayPnL: number;
  totalPnL: number;
}

export default function PortfolioScreen() {
  const { data, isLoading, refetch } = useQuery<PortfolioData>({
    queryKey: ['portfolio'],
    queryFn: () => api.get('/portfolio'),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
      }
    >
      {/* Total Value */}
      <View style={styles.summaryCard}>
        <Text style={styles.label}>Total Portfolio Value</Text>
        <Text style={styles.totalValue}>
          {data ? formatCurrency(data.totalValue) : '$---.--'}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cash</Text>
            <Text style={styles.summaryValue}>{data ? formatCurrency(data.cash) : '--'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Invested</Text>
            <Text style={styles.summaryValue}>{data ? formatCurrency(data.invested) : '--'}</Text>
          </View>
        </View>
      </View>

      {/* Performance */}
      <View style={styles.performanceRow}>
        <View style={[styles.perfCard, { borderColor: data?.dayPnL && data.dayPnL >= 0 ? '#22c55e50' : '#ef444450' }]}>
          <Text style={styles.perfLabel}>Today</Text>
          <Text style={[styles.perfValue, { color: data?.dayPnL && data.dayPnL >= 0 ? '#22c55e' : '#ef4444' }]}>
            {data ? `${data.dayPnL >= 0 ? '+' : ''}${formatCurrency(data.dayPnL)}` : '--'}
          </Text>
        </View>
        <View style={[styles.perfCard, { borderColor: data?.totalPnL && data.totalPnL >= 0 ? '#22c55e50' : '#ef444450' }]}>
          <Text style={styles.perfLabel}>All Time</Text>
          <Text style={[styles.perfValue, { color: data?.totalPnL && data.totalPnL >= 0 ? '#22c55e' : '#ef4444' }]}>
            {data ? `${data.totalPnL >= 0 ? '+' : ''}${formatCurrency(data.totalPnL)}` : '--'}
          </Text>
        </View>
      </View>

      {/* Holdings */}
      <Text style={styles.sectionTitle}>Holdings</Text>
      {data?.holdings?.map((holding) => (
        <View key={holding.symbol} style={styles.holdingCard}>
          <View style={styles.holdingHeader}>
            <View>
              <Text style={styles.symbol}>{holding.symbol}</Text>
              <Text style={styles.name}>{holding.name}</Text>
            </View>
            <View style={styles.holdingValue}>
              <Text style={styles.valueText}>{formatCurrency(holding.value)}</Text>
              <Text style={[styles.pnlText, { color: holding.pnl >= 0 ? '#22c55e' : '#ef4444' }]}>
                {holding.pnl >= 0 ? '+' : ''}{formatCurrency(holding.pnl)} ({holding.pnlPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>
          <View style={styles.holdingDetails}>
            <Text style={styles.detailText}>{holding.quantity} shares @ {formatCurrency(holding.avgPrice)}</Text>
            <Text style={styles.detailText}>Current: {formatCurrency(holding.currentPrice)}</Text>
          </View>
        </View>
      ))}

      {(!data?.holdings || data.holdings.length === 0) && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>No holdings yet</Text>
          <Text style={styles.emptySubtext}>Your positions will appear here</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  totalValue: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {},
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  perfCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  perfLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  perfValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  holdingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  symbol: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  name: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  valueText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  pnlText: {
    fontSize: 12,
    marginTop: 2,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  detailText: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
});
