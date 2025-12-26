/**
 * Home Screen - Dashboard View
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../hooks/useApi';

interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  activeBots: number;
  openTrades: number;
}

export default function HomeScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio-summary'],
    queryFn: () => api.get('/portfolio/summary'),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
      }
    >
      {/* Portfolio Value Card */}
      <View style={styles.portfolioCard}>
        <Text style={styles.label}>Portfolio Value</Text>
        <Text style={styles.portfolioValue}>
          {data ? formatCurrency(data.totalValue) : '$---.--'}
        </Text>
        <View style={styles.changeRow}>
          <Ionicons
            name={data?.dayChange && data.dayChange >= 0 ? 'trending-up' : 'trending-down'}
            size={20}
            color={data?.dayChange && data.dayChange >= 0 ? '#22c55e' : '#ef4444'}
          />
          <Text
            style={[
              styles.changeText,
              { color: data?.dayChange && data.dayChange >= 0 ? '#22c55e' : '#ef4444' },
            ]}
          >
            {data ? `${formatCurrency(data.dayChange)} (${formatPercent(data.dayChangePercent)})` : '-- --'}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="hardware-chip" size={24} color="#6366f1" />
          <Text style={styles.statValue}>{data?.activeBots ?? 0}</Text>
          <Text style={styles.statLabel}>Active Bots</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="swap-horizontal" size={24} color="#22c55e" />
          <Text style={styles.statValue}>{data?.openTrades ?? 0}</Text>
          <Text style={styles.statLabel}>Open Trades</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Trade')}
        >
          <Ionicons name="swap-horizontal" size={32} color="#00ff88" />
          <Text style={styles.actionText}>Quick Trade</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdvancedTrade')}
        >
          <Ionicons name="options" size={32} color="#6366f1" />
          <Text style={styles.actionText}>Advanced</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Bots')}
        >
          <Ionicons name="hardware-chip" size={32} color="#22c55e" />
          <Text style={styles.actionText}>AI Bots</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('PriceAlerts')}
        >
          <Ionicons name="notifications" size={32} color="#f59e0b" />
          <Text style={styles.actionText}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="trophy" size={32} color="#a855f7" />
          <Text style={styles.actionText}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={32} color="#64748b" />
          <Text style={styles.actionText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        <View style={styles.activityItem}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.activityText}>BUY AAPL @ $198.50</Text>
          <Text style={styles.activityTime}>2m ago</Text>
        </View>
        <View style={styles.activityItem}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.activityText}>SELL TSLA @ $248.20</Text>
          <Text style={styles.activityTime}>15m ago</Text>
        </View>
        <View style={styles.activityItem}>
          <Ionicons name="flash" size={20} color="#6366f1" />
          <Text style={styles.activityText}>Phantom King generated signal</Text>
          <Text style={styles.activityTime}>1h ago</Text>
        </View>
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
  portfolioCard: {
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
  portfolioValue: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionText: {
    color: '#f8fafc',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  activityText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  activityTime: {
    color: '#64748b',
    fontSize: 12,
  },
});
