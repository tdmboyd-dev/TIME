/**
 * Bot Detail Screen
 * TIME BEYOND US - AI Trading Bot Management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../hooks/useApi';

interface BotDetail {
  id: string;
  name: string;
  strategy: string;
  strategyType: string;
  tier: string;
  status: 'active' | 'paused' | 'inactive';
  profitLoss: number;
  profitLossPercent: number;
  trades24h: number;
  totalTrades: number;
  winRate: number;
  activePairs: string[];
  config: {
    baseAmount: number;
    stopLoss: number;
    takeProfit: number;
    maxPositions: number;
  };
  performance: {
    day: number;
    week: number;
    month: number;
    allTime: number;
  };
  recentTrades: Array<{
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    pnl: number;
    timestamp: string;
  }>;
  createdAt: string;
  lastActive: string;
}

export default function BotDetailScreen({ route, navigation }: any) {
  const { botId } = route.params || {};
  const queryClient = useQueryClient();

  const { data: bot, isLoading } = useQuery<BotDetail>({
    queryKey: ['bot', botId],
    queryFn: () => api.get(`/bots/${botId}`),
    enabled: !!botId,
  });

  // Fallback mock data
  const botData: BotDetail = bot || {
    id: botId || '1',
    name: 'Phantom King',
    strategy: 'Multi-indicator Momentum',
    strategyType: 'momentum',
    tier: 'LEGENDARY',
    status: 'active',
    profitLoss: 15420.50,
    profitLossPercent: 28.5,
    trades24h: 45,
    totalTrades: 1250,
    winRate: 72.5,
    activePairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    config: {
      baseAmount: 1000,
      stopLoss: 5,
      takeProfit: 10,
      maxPositions: 5,
    },
    performance: {
      day: 2.5,
      week: 8.2,
      month: 28.5,
      allTime: 156.8,
    },
    recentTrades: [
      { id: '1', symbol: 'BTC/USDT', side: 'buy', amount: 0.05, price: 43250, pnl: 125.50, timestamp: new Date().toISOString() },
      { id: '2', symbol: 'ETH/USDT', side: 'sell', amount: 2.5, price: 2280, pnl: -45.20, timestamp: new Date().toISOString() },
      { id: '3', symbol: 'SOL/USDT', side: 'buy', amount: 10, price: 98.50, pnl: 85.00, timestamp: new Date().toISOString() },
    ],
    createdAt: '2024-01-15T10:00:00Z',
    lastActive: new Date().toISOString(),
  };

  const toggleMutation = useMutation({
    mutationFn: () =>
      botData.status === 'active'
        ? api.post(`/bots/${botId}/pause`)
        : api.post(`/bots/${botId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot', botId] });
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
  });

  const handleToggle = () => {
    const action = botData.status === 'active' ? 'pause' : 'start';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Bot`,
      `Are you sure you want to ${action} ${botData.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: () => toggleMutation.mutate(),
        },
      ]
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'LEGENDARY': return '#f59e0b';
      case 'ELITE': return '#a855f7';
      case 'VETERAN': return '#3b82f6';
      case 'STANDARD': return '#22c55e';
      default: return '#64748b';
    }
  };

  const tierColor = getTierColor(botData.tier);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bot Header */}
      <View style={[styles.headerCard, { borderColor: tierColor }]}>
        <View style={styles.headerTop}>
          <View style={[styles.botIcon, { backgroundColor: `${tierColor}20` }]}>
            <Ionicons name="hardware-chip" size={40} color={tierColor} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.botName}>{botData.name}</Text>
            <Text style={[styles.botTier, { color: tierColor }]}>{botData.tier}</Text>
            <Text style={styles.strategy}>{botData.strategy}</Text>
          </View>
          <Switch
            value={botData.status === 'active'}
            onValueChange={handleToggle}
            trackColor={{ false: '#334155', true: '#00ff8860' }}
            thumbColor={botData.status === 'active' ? '#00ff88' : '#94a3b8'}
          />
        </View>

        <View style={styles.profitContainer}>
          <Text style={styles.profitLabel}>Total Profit/Loss</Text>
          <Text
            style={[
              styles.profitValue,
              { color: botData.profitLoss >= 0 ? '#00ff88' : '#ef4444' },
            ]}
          >
            {botData.profitLoss >= 0 ? '+' : ''}
            {formatCurrency(botData.profitLoss)}
          </Text>
          <Text
            style={[
              styles.profitPercent,
              { color: botData.profitLoss >= 0 ? '#00ff88' : '#ef4444' },
            ]}
          >
            ({botData.profitLoss >= 0 ? '+' : ''}{botData.profitLossPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Performance Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Performance</Text>
        <View style={styles.performanceGrid}>
          {[
            { label: '24h', value: botData.performance.day },
            { label: '7d', value: botData.performance.week },
            { label: '30d', value: botData.performance.month },
            { label: 'All Time', value: botData.performance.allTime },
          ].map((period) => (
            <View key={period.label} style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>{period.label}</Text>
              <Text
                style={[
                  styles.performanceValue,
                  { color: period.value >= 0 ? '#00ff88' : '#ef4444' },
                ]}
              >
                {period.value >= 0 ? '+' : ''}{period.value.toFixed(2)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trading Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trading Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="swap-horizontal" size={24} color="#6366f1" />
            <Text style={styles.statValue}>{botData.totalTrades}</Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{botData.trades24h}</Text>
            <Text style={styles.statLabel}>Trades 24h</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color="#00ff88" />
            <Text style={styles.statValue}>{botData.winRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>
      </View>

      {/* Active Pairs */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Trading Pairs</Text>
        <View style={styles.pairsContainer}>
          {botData.activePairs.map((pair) => (
            <TouchableOpacity
              key={pair}
              style={styles.pairChip}
              onPress={() => navigation.navigate('Trade', { symbol: pair })}
            >
              <Text style={styles.pairText}>{pair}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Configuration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configuration</Text>
        <View style={styles.configGrid}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Base Amount</Text>
            <Text style={styles.configValue}>{formatCurrency(botData.config.baseAmount)}</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Stop Loss</Text>
            <Text style={styles.configValue}>{botData.config.stopLoss}%</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Take Profit</Text>
            <Text style={styles.configValue}>{botData.config.takeProfit}%</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Max Positions</Text>
            <Text style={styles.configValue}>{botData.config.maxPositions}</Text>
          </View>
        </View>
      </View>

      {/* Recent Trades */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Trades</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {botData.recentTrades.map((trade) => (
          <TouchableOpacity
            key={trade.id}
            style={styles.tradeItem}
            onPress={() => navigation.navigate('TradeDetail', { tradeId: trade.id })}
          >
            <View style={styles.tradeLeft}>
              <View
                style={[
                  styles.tradeSide,
                  { backgroundColor: trade.side === 'buy' ? '#00ff8820' : '#ef444420' },
                ]}
              >
                <Ionicons
                  name={trade.side === 'buy' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={trade.side === 'buy' ? '#00ff88' : '#ef4444'}
                />
              </View>
              <View>
                <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                <Text style={styles.tradeAmount}>
                  {trade.amount} @ {formatCurrency(trade.price)}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.tradePnl,
                { color: trade.pnl >= 0 ? '#00ff88' : '#ef4444' },
              ]}
            >
              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="settings-outline" size={20} color="#f8fafc" />
          <Text style={styles.actionButtonText}>Configure</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, botData.status === 'active' ? styles.pauseButton : styles.startButton]}
          onPress={handleToggle}
        >
          <Ionicons
            name={botData.status === 'active' ? 'pause' : 'play'}
            size={20}
            color={botData.status === 'active' ? '#f59e0b' : '#020617'}
          />
          <Text
            style={[
              styles.actionButtonText,
              botData.status === 'active' ? styles.pauseButtonText : styles.startButtonText,
            ]}
          >
            {botData.status === 'active' ? 'Pause Bot' : 'Start Bot'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  botIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  botName: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  botTier: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  strategy: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  profitContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  profitLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  profitPercent: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  viewAllText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  pairsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pairChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pairText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  configGrid: {},
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  configLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  configValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeSide: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tradeSymbol: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  tradeAmount: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  tradePnl: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b',
  },
  pauseButtonText: {
    color: '#f59e0b',
  },
  startButton: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  startButtonText: {
    color: '#020617',
  },
});
