/**
 * Leaderboard Screen
 * TIME BEYOND US - Social Trading & Leaderboard Features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../hooks/useApi';

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
type LeaderboardCategory = 'profit' | 'winrate' | 'trades' | 'bots';

interface Trader {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  badge?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  profit: number;
  profitPercent: number;
  winRate: number;
  totalTrades: number;
  activeBots: number;
  followers: number;
  isFollowing: boolean;
}

const mockTraders: Trader[] = [
  {
    id: '1',
    rank: 1,
    name: 'CryptoMaster',
    badge: 'LEGENDARY',
    tier: 'diamond',
    profit: 1250000,
    profitPercent: 425.5,
    winRate: 89.2,
    totalTrades: 15420,
    activeBots: 12,
    followers: 24580,
    isFollowing: false,
  },
  {
    id: '2',
    rank: 2,
    name: 'AlgoTrader_Pro',
    badge: 'ELITE',
    tier: 'platinum',
    profit: 856000,
    profitPercent: 312.8,
    winRate: 84.5,
    totalTrades: 12350,
    activeBots: 8,
    followers: 18920,
    isFollowing: true,
  },
  {
    id: '3',
    rank: 3,
    name: 'TrendHunter',
    badge: 'VETERAN',
    tier: 'gold',
    profit: 654000,
    profitPercent: 278.4,
    winRate: 81.2,
    totalTrades: 9870,
    activeBots: 6,
    followers: 12450,
    isFollowing: false,
  },
  // More traders...
];

for (let i = 4; i <= 20; i++) {
  mockTraders.push({
    id: i.toString(),
    rank: i,
    name: `Trader${i}`,
    tier: i <= 5 ? 'gold' : i <= 10 ? 'silver' : 'bronze',
    profit: Math.floor(Math.random() * 500000) + 50000,
    profitPercent: Math.floor(Math.random() * 200) + 50,
    winRate: Math.floor(Math.random() * 30) + 55,
    totalTrades: Math.floor(Math.random() * 5000) + 1000,
    activeBots: Math.floor(Math.random() * 5) + 1,
    followers: Math.floor(Math.random() * 10000) + 100,
    isFollowing: Math.random() > 0.7,
  });
}

export default function LeaderboardScreen({ navigation }: any) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [category, setCategory] = useState<LeaderboardCategory>('profit');
  const [refreshing, setRefreshing] = useState(false);

  const { data: traders = mockTraders, refetch } = useQuery<Trader[]>({
    queryKey: ['leaderboard', period, category],
    queryFn: () => api.get(`/leaderboard?period=${period}&category=${category}`),
    initialData: mockTraders,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getTierColor = (tier: Trader['tier']) => {
    switch (tier) {
      case 'diamond': return '#22d3ee';
      case 'platinum': return '#e2e8f0';
      case 'gold': return '#f59e0b';
      case 'silver': return '#94a3b8';
      case 'bronze': return '#cd7f32';
      default: return '#64748b';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const renderPodium = () => {
    const top3 = traders.slice(0, 3);
    const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd

    return (
      <View style={styles.podiumContainer}>
        {podiumOrder.map((trader, index) => {
          if (!trader) return null;
          const isFirst = index === 1;
          const podiumHeight = isFirst ? 100 : index === 0 ? 80 : 60;

          return (
            <TouchableOpacity
              key={trader.id}
              style={[styles.podiumItem, isFirst && styles.podiumItemFirst]}
              onPress={() => navigation.navigate('TraderProfile', { traderId: trader.id })}
            >
              <View style={styles.podiumAvatarContainer}>
                {isFirst && (
                  <Ionicons name="trophy" size={24} color="#f59e0b" style={styles.crownIcon} />
                )}
                <View
                  style={[
                    styles.podiumAvatar,
                    { borderColor: getTierColor(trader.tier) },
                    isFirst && styles.podiumAvatarFirst,
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {trader.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.rankBadge, isFirst && styles.rankBadgeFirst]}>
                  <Text style={styles.rankBadgeText}>{trader.rank}</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{trader.name}</Text>
              <Text style={[styles.podiumProfit, { color: '#00ff88' }]}>
                +{trader.profitPercent.toFixed(1)}%
              </Text>
              <View style={[styles.podiumBase, { height: podiumHeight }]}>
                <Text style={styles.podiumRank}>{trader.rank}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTraderItem = ({ item, index }: { item: Trader; index: number }) => {
    if (index < 3) return null; // Top 3 shown in podium

    return (
      <TouchableOpacity
        style={styles.traderItem}
        onPress={() => navigation.navigate('TraderProfile', { traderId: item.id })}
      >
        <View style={styles.traderRank}>
          <Text style={styles.rankText}>{item.rank}</Text>
        </View>

        <View
          style={[
            styles.traderAvatar,
            { borderColor: getTierColor(item.tier) },
          ]}
        >
          <Text style={styles.traderAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.traderInfo}>
          <View style={styles.traderNameRow}>
            <Text style={styles.traderName}>{item.name}</Text>
            {item.badge && (
              <View style={[styles.badgeContainer, { backgroundColor: `${getTierColor(item.tier)}20` }]}>
                <Text style={[styles.badgeText, { color: getTierColor(item.tier) }]}>
                  {item.badge}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.traderStats}>
            <Text style={styles.traderStat}>
              <Ionicons name="trophy-outline" size={12} color="#64748b" /> {item.winRate.toFixed(1)}%
            </Text>
            <Text style={styles.traderStat}>
              <Ionicons name="swap-horizontal" size={12} color="#64748b" /> {formatNumber(item.totalTrades)}
            </Text>
            <Text style={styles.traderStat}>
              <Ionicons name="people-outline" size={12} color="#64748b" /> {formatNumber(item.followers)}
            </Text>
          </View>
        </View>

        <View style={styles.traderProfit}>
          <Text style={[styles.profitAmount, { color: item.profit >= 0 ? '#00ff88' : '#ef4444' }]}>
            {formatCurrency(item.profit)}
          </Text>
          <Text style={[styles.profitPercent, { color: item.profit >= 0 ? '#00ff88' : '#ef4444' }]}>
            +{item.profitPercent.toFixed(1)}%
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.followButton, item.isFollowing && styles.followButtonActive]}
        >
          <Ionicons
            name={item.isFollowing ? 'checkmark' : 'add'}
            size={18}
            color={item.isFollowing ? '#00ff88' : '#f8fafc'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#f8fafc" />
        </TouchableOpacity>
      </View>

      {/* Period Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodContainer}
        contentContainerStyle={styles.periodContent}
      >
        {(['daily', 'weekly', 'monthly', 'all-time'] as LeaderboardPeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, period === p && styles.periodTabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Tabs */}
      <View style={styles.categoryContainer}>
        {[
          { id: 'profit' as const, label: 'Profit', icon: 'trending-up' },
          { id: 'winrate' as const, label: 'Win Rate', icon: 'trophy' },
          { id: 'trades' as const, label: 'Trades', icon: 'swap-horizontal' },
          { id: 'bots' as const, label: 'Bots', icon: 'hardware-chip' },
        ].map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryTab, category === cat.id && styles.categoryTabActive]}
            onPress={() => setCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={category === cat.id ? '#00ff88' : '#94a3b8'}
            />
            <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={traders}
        keyExtractor={(item) => item.id}
        renderItem={renderTraderItem}
        ListHeaderComponent={renderPodium}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00ff88"
          />
        }
      />

      {/* Your Rank Card */}
      <View style={styles.yourRankCard}>
        <View style={styles.yourRankInfo}>
          <View style={styles.yourAvatar}>
            <Text style={styles.yourAvatarText}>Y</Text>
          </View>
          <View>
            <Text style={styles.yourRankLabel}>Your Rank</Text>
            <Text style={styles.yourRankValue}>#156</Text>
          </View>
        </View>
        <View style={styles.yourStats}>
          <View style={styles.yourStat}>
            <Text style={styles.yourStatValue}>+42.5%</Text>
            <Text style={styles.yourStatLabel}>Profit</Text>
          </View>
          <View style={styles.yourStat}>
            <Text style={styles.yourStatValue}>68.2%</Text>
            <Text style={styles.yourStatLabel}>Win Rate</Text>
          </View>
        </View>
      </View>
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
  headerTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodContainer: {
    maxHeight: 44,
    marginBottom: 12,
  },
  periodContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  periodTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  periodTabActive: {
    borderColor: '#00ff88',
  },
  periodText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#00ff88',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryTabActive: {
    borderColor: '#00ff88',
  },
  categoryText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#00ff88',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: 32,
  },
  podiumItem: {
    alignItems: 'center',
    width: 100,
  },
  podiumItemFirst: {
    width: 120,
  },
  podiumAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  crownIcon: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  podiumAvatarFirst: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
  },
  avatarText: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeFirst: {
    backgroundColor: '#f59e0b',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  podiumName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  podiumProfit: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  podiumBase: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
  },
  podiumRank: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  traderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  traderRank: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  traderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  traderAvatarText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  traderInfo: {
    flex: 1,
  },
  traderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  traderName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  traderStats: {
    flexDirection: 'row',
    gap: 12,
  },
  traderStat: {
    color: '#64748b',
    fontSize: 11,
  },
  traderProfit: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  profitAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  profitPercent: {
    fontSize: 12,
  },
  followButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  yourRankCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  yourRankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yourAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourAvatarText: {
    color: '#020617',
    fontSize: 20,
    fontWeight: 'bold',
  },
  yourRankLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  yourRankValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  yourStats: {
    flexDirection: 'row',
    gap: 24,
  },
  yourStat: {
    alignItems: 'center',
  },
  yourStatValue: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
  },
  yourStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
