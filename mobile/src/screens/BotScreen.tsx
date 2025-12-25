import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BotCard from '../components/BotCard';

type BotStatus = 'active' | 'inactive' | 'paused';

interface Bot {
  id: string;
  name: string;
  strategy: string;
  status: BotStatus;
  profitLoss: number;
  profitLossPercent: number;
  trades24h: number;
  winRate: number;
  activePairs: string[];
}

export default function BotScreen() {
  const [bots, setBots] = useState<Bot[]>([
    {
      id: '1',
      name: 'Grid Trading Bot',
      strategy: 'Grid',
      status: 'active',
      profitLoss: 1250.50,
      profitLossPercent: 12.5,
      trades24h: 45,
      winRate: 68.5,
      activePairs: ['BTC/USDT', 'ETH/USDT'],
    },
    {
      id: '2',
      name: 'DCA Bot',
      strategy: 'Dollar Cost Averaging',
      status: 'active',
      profitLoss: 850.25,
      profitLossPercent: 8.2,
      trades24h: 12,
      winRate: 75.0,
      activePairs: ['BTC/USDT'],
    },
    {
      id: '3',
      name: 'Scalping Bot',
      strategy: 'Scalping',
      status: 'paused',
      profitLoss: -125.00,
      profitLossPercent: -1.2,
      trades24h: 0,
      winRate: 55.5,
      activePairs: ['SOL/USDT', 'AVAX/USDT'],
    },
    {
      id: '4',
      name: 'Arbitrage Bot',
      strategy: 'Cross-Exchange Arbitrage',
      status: 'inactive',
      profitLoss: 0,
      profitLossPercent: 0,
      trades24h: 0,
      winRate: 0,
      activePairs: [],
    },
  ]);

  const [filter, setFilter] = useState<'all' | BotStatus>('all');

  const toggleBotStatus = (botId: string) => {
    setBots((prevBots) =>
      prevBots.map((bot) => {
        if (bot.id === botId) {
          const newStatus: BotStatus =
            bot.status === 'active' ? 'paused' : 'active';
          return { ...bot, status: newStatus };
        }
        return bot;
      })
    );
  };

  const filteredBots =
    filter === 'all' ? bots : bots.filter((bot) => bot.status === filter);

  const stats = {
    totalBots: bots.length,
    activeBots: bots.filter((bot) => bot.status === 'active').length,
    totalProfit: bots.reduce((sum, bot) => sum + bot.profitLoss, 0),
    totalTrades24h: bots.reduce((sum, bot) => sum + bot.trades24h, 0),
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Trading Bots</Text>
          <Text style={styles.subtitle}>133 strategies absorbed + 18 fused</Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="hardware-chip" size={24} color="#00ff88" />
            <Text style={styles.statValue}>{stats.activeBots}</Text>
            <Text style={styles.statLabel}>Active Bots</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#00ff88" />
            <Text
              style={[
                styles.statValue,
                stats.totalProfit >= 0 ? styles.profitPositive : styles.profitNegative,
              ]}
            >
              ${stats.totalProfit.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total P/L</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="swap-horizontal" size={24} color="#00ff88" />
            <Text style={styles.statValue}>{stats.totalTrades24h}</Text>
            <Text style={styles.statLabel}>Trades 24h</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {(['all', 'active', 'paused', 'inactive'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filter === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === status && styles.filterTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              {status !== 'all' && (
                <View
                  style={[
                    styles.filterBadge,
                    status === 'active' && styles.badgeActive,
                    status === 'paused' && styles.badgePaused,
                    status === 'inactive' && styles.badgeInactive,
                  ]}
                >
                  <Text style={styles.filterBadgeText}>
                    {bots.filter((bot) => bot.status === status).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bot List */}
        <View style={styles.botList}>
          {filteredBots.length > 0 ? (
            filteredBots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                onToggle={() => toggleBotStatus(bot.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#475569" />
              <Text style={styles.emptyStateText}>No bots found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try changing the filter or create a new bot
              </Text>
            </View>
          )}
        </View>

        {/* Add New Bot Button */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle" size={24} color="#00ff88" />
          <Text style={styles.addButtonText}>Create New Bot</Text>
        </TouchableOpacity>

        {/* Performance Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={20} color="#6366f1" />
          <Text style={styles.noticeText}>
            Bots use advanced AI to analyze markets 24/7. Performance may vary based
            on market conditions.
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  profitPositive: {
    color: '#00ff88',
  },
  profitNegative: {
    color: '#ef4444',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#1e293b',
    borderColor: '#00ff88',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTextActive: {
    color: '#00ff88',
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#00ff8833',
  },
  badgePaused: {
    backgroundColor: '#f59e0b33',
  },
  badgeInactive: {
    backgroundColor: '#64748b33',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  botList: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00ff88',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ff88',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
