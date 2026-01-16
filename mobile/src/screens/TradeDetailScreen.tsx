/**
 * Trade Detail Screen - Enhanced
 * TIME BEYOND US - Complete Trade Information
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../hooks/useApi';
import { logger } from '../utils/logger';

interface TradeDetail {
  id: string;
  symbol: string;
  name: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop-loss';
  quantity: number;
  price: number;
  value: number;
  fee: number;
  timestamp: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  bot?: {
    id: string;
    name: string;
    tier: string;
  };
  reasoning?: string;
  signals?: string[];
  pnl?: number;
  pnlPercent?: number;
  filledAt?: string;
  orderNumber?: string;
}

export default function TradeDetailScreen({ route, navigation }: any) {
  const { tradeId } = route.params || {};

  const { data: trade, isLoading, refetch } = useQuery<TradeDetail>({
    queryKey: ['trade', tradeId],
    queryFn: () => api.get(`/trades/${tradeId}`),
    enabled: !!tradeId,
  });

  // Fallback mock data for development
  const tradeData: TradeDetail = trade || {
    id: tradeId || '1',
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    side: 'buy',
    type: 'market',
    quantity: 0.5,
    price: 43250.00,
    value: 21625.00,
    fee: 21.63,
    timestamp: new Date().toISOString(),
    status: 'filled',
    bot: {
      id: 'phantom-king',
      name: 'Phantom King',
      tier: 'LEGENDARY',
    },
    reasoning: 'Strong bullish divergence detected on RSI with MACD golden cross confirmation. Volume spike indicates institutional accumulation.',
    signals: [
      'RSI Bullish Divergence',
      'MACD Golden Cross',
      'Volume Spike Detected',
      'Support Level Bounce',
    ],
    pnl: 1250.50,
    pnlPercent: 5.78,
    filledAt: new Date().toISOString(),
    orderNumber: 'ORD-2024-001234',
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatNumber = (value: number, decimals: number = 8) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return { name: 'checkmark-circle', color: '#00ff88' };
      case 'pending':
        return { name: 'time', color: '#f59e0b' };
      case 'cancelled':
        return { name: 'close-circle', color: '#64748b' };
      case 'rejected':
        return { name: 'alert-circle', color: '#ef4444' };
      default:
        return { name: 'help-circle', color: '#64748b' };
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'LEGENDARY':
        return '#f59e0b';
      case 'ELITE':
        return '#a855f7';
      case 'VETERAN':
        return '#3b82f6';
      case 'STANDARD':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `TIME BEYOND US Trade Alert!\n${tradeData.side.toUpperCase()} ${formatNumber(tradeData.quantity)} ${tradeData.symbol} @ ${formatCurrency(tradeData.price)}\nTotal: ${formatCurrency(tradeData.value)}`,
        title: 'Trade Details',
      });
    } catch (error) {
      logger.error('Error sharing trade', { tag: 'Trade', data: error });
    }
  };

  const handleCancelOrder = () => {
    if (tradeData.status !== 'pending') return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/trades/orders/${tradeData.id}`);
              Alert.alert('Success', 'Order cancelled successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const statusIcon = getStatusIcon(tradeData.status);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Trade Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.symbolContainer}>
            <Text style={styles.symbol}>{tradeData.symbol}</Text>
            <Text style={styles.name}>{tradeData.name}</Text>
          </View>
          <View
            style={[
              styles.sideBadge,
              { backgroundColor: tradeData.side === 'buy' ? '#00ff8820' : '#ef444420' },
            ]}
          >
            <Ionicons
              name={tradeData.side === 'buy' ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={tradeData.side === 'buy' ? '#00ff88' : '#ef4444'}
            />
            <Text
              style={[
                styles.sideText,
                { color: tradeData.side === 'buy' ? '#00ff88' : '#ef4444' },
              ]}
            >
              {tradeData.side.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Trade Value</Text>
          <Text style={styles.priceValue}>{formatCurrency(tradeData.value)}</Text>
          {tradeData.pnl !== undefined && (
            <View style={styles.pnlContainer}>
              <Ionicons
                name={tradeData.pnl >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={tradeData.pnl >= 0 ? '#00ff88' : '#ef4444'}
              />
              <Text
                style={[
                  styles.pnlText,
                  { color: tradeData.pnl >= 0 ? '#00ff88' : '#ef4444' },
                ]}
              >
                {tradeData.pnl >= 0 ? '+' : ''}
                {formatCurrency(tradeData.pnl)} ({tradeData.pnlPercent?.toFixed(2)}%)
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Details</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Type</Text>
            <Text style={styles.detailValue}>{tradeData.type.toUpperCase()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{formatNumber(tradeData.quantity)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>{formatCurrency(tradeData.price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fee</Text>
            <Text style={styles.detailValue}>{formatCurrency(tradeData.fee)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Ionicons name={statusIcon.name as any} size={16} color={statusIcon.color} />
              <Text style={[styles.statusText, { color: statusIcon.color }]}>
                {tradeData.status.charAt(0).toUpperCase() + tradeData.status.slice(1)}
              </Text>
            </View>
          </View>
          {tradeData.orderNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order #</Text>
              <Text style={styles.detailValueMono}>{tradeData.orderNumber}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bot Information */}
      {tradeData.bot && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Executed By</Text>
          <TouchableOpacity
            style={styles.botContainer}
            onPress={() => navigation.navigate('BotDetail', { botId: tradeData.bot?.id })}
          >
            <View
              style={[
                styles.botIcon,
                { backgroundColor: `${getTierColor(tradeData.bot.tier)}20` },
              ]}
            >
              <Ionicons
                name="hardware-chip"
                size={28}
                color={getTierColor(tradeData.bot.tier)}
              />
            </View>
            <View style={styles.botInfo}>
              <Text style={styles.botName}>{tradeData.bot.name}</Text>
              <Text style={[styles.botTier, { color: getTierColor(tradeData.bot.tier) }]}>
                {tradeData.bot.tier} BOT
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Trading Signals */}
      {tradeData.signals && tradeData.signals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trading Signals</Text>
          <View style={styles.signalsContainer}>
            {tradeData.signals.map((signal, index) => (
              <View key={index} style={styles.signalChip}>
                <Ionicons name="flash" size={14} color="#00ff88" />
                <Text style={styles.signalText}>{signal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Trade Reasoning */}
      {tradeData.reasoning && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trade Reasoning</Text>
          <Text style={styles.reasoning}>{tradeData.reasoning}</Text>
        </View>
      )}

      {/* Timestamps */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>
        <View style={styles.timelineContainer}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Order Placed</Text>
              <Text style={styles.timelineValue}>
                {new Date(tradeData.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.timelineAgo}>
                {formatDistanceToNow(new Date(tradeData.timestamp), { addSuffix: true })}
              </Text>
            </View>
          </View>
          {tradeData.filledAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotSuccess]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Order Filled</Text>
                <Text style={styles.timelineValue}>
                  {new Date(tradeData.filledAt).toLocaleString()}
                </Text>
                <Text style={styles.timelineAgo}>
                  {formatDistanceToNow(new Date(tradeData.filledAt), { addSuffix: true })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#f8fafc" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>

        {tradeData.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelOrder}
          >
            <Ionicons name="close-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
              Cancel Order
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.tradeAgainButton]}
          onPress={() => navigation.navigate('Trade', { symbol: tradeData.symbol })}
        >
          <Ionicons name="repeat" size={20} color="#020617" />
          <Text style={[styles.actionButtonText, styles.tradeAgainButtonText]}>
            Trade Again
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
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  symbolContainer: {},
  symbol: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: 'bold',
  },
  name: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  sideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sideText: {
    fontSize: 14,
    fontWeight: '700',
  },
  priceContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  priceLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  priceValue: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: 'bold',
  },
  pnlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  pnlText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  detailsGrid: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValueMono: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  botContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
  },
  botIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  botInfo: {
    flex: 1,
  },
  botName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  botTier: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  signalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff8815',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#00ff8830',
  },
  signalText: {
    color: '#00ff88',
    fontSize: 13,
    fontWeight: '600',
  },
  reasoning: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 24,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
    marginTop: 4,
    marginRight: 16,
  },
  timelineDotSuccess: {
    backgroundColor: '#00ff88',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineValue: {
    color: '#94a3b8',
    fontSize: 13,
  },
  timelineAgo: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
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
  cancelButton: {
    borderColor: '#ef4444',
    backgroundColor: '#ef444420',
  },
  cancelButtonText: {
    color: '#ef4444',
  },
  tradeAgainButton: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  tradeAgainButtonText: {
    color: '#020617',
  },
});
