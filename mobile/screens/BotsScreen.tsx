/**
 * Bots Screen - Control and Monitor Trading Bots
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../hooks/useApi';

interface Bot {
  id: string;
  name: string;
  tier: 'LEGENDARY' | 'EPIC' | 'RARE';
  status: 'active' | 'paused' | 'stopped';
  todayPnL: number;
  totalTrades: number;
  winRate: number;
}

const tierColors = {
  LEGENDARY: '#f59e0b',
  EPIC: '#a855f7',
  RARE: '#3b82f6',
};

export default function BotsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const { data: bots, isLoading, refetch } = useQuery<Bot[]>({
    queryKey: ['bots'],
    queryFn: () => api.get('/bots'),
  });

  const toggleBotMutation = useMutation({
    mutationFn: (botId: string) => api.post(`/bots/${botId}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bots'] }),
  });

  const filteredBots = bots?.filter((bot) => {
    if (filter === 'all') return true;
    if (filter === 'active') return bot.status === 'active';
    if (filter === 'paused') return bot.status !== 'active';
    return true;
  });

  const formatPnL = (value: number) =>
    `${value >= 0 ? '+' : ''}$${Math.abs(value).toFixed(2)}`;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'paused'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bots List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
        }
      >
        {filteredBots?.map((bot) => (
          <View key={bot.id} style={styles.botCard}>
            <View style={styles.botHeader}>
              <View style={styles.botInfo}>
                <View style={[styles.tierBadge, { backgroundColor: tierColors[bot.tier] + '20' }]}>
                  <Text style={[styles.tierText, { color: tierColors[bot.tier] }]}>
                    {bot.tier}
                  </Text>
                </View>
                <Text style={styles.botName}>{bot.name}</Text>
              </View>
              <Switch
                value={bot.status === 'active'}
                onValueChange={() => toggleBotMutation.mutate(bot.id)}
                trackColor={{ false: '#334155', true: '#22c55e50' }}
                thumbColor={bot.status === 'active' ? '#22c55e' : '#64748b'}
              />
            </View>

            <View style={styles.botStats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Today P&L</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: bot.todayPnL >= 0 ? '#22c55e' : '#ef4444' },
                  ]}
                >
                  {formatPnL(bot.todayPnL)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Trades</Text>
                <Text style={styles.statValue}>{bot.totalTrades}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Win Rate</Text>
                <Text style={styles.statValue}>{bot.winRate.toFixed(1)}%</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>
        ))}

        {(!filteredBots || filteredBots.length === 0) && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="hardware-chip-outline" size={48} color="#64748b" />
            <Text style={styles.emptyText}>No bots found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  filterTabActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  botCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  botHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  botName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  botStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  viewButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
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
});
