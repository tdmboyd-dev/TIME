import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

interface BotCardProps {
  bot: Bot;
  onToggle: () => void;
  onPress?: () => void;
}

export default function BotCard({ bot, onToggle, onPress }: BotCardProps) {
  const isProfit = bot.profitLoss >= 0;
  const isActive = bot.status === 'active';

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
      case 'active':
        return '#00ff88';
      case 'paused':
        return '#f59e0b';
      case 'inactive':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive && styles.containerActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(bot.status) },
            ]}
          />
          <View>
            <Text style={styles.name}>{bot.name}</Text>
            <Text style={styles.strategy}>{bot.strategy}</Text>
          </View>
        </View>
        <Switch
          value={isActive}
          onValueChange={onToggle}
          trackColor={{ false: '#334155', true: '#00ff8860' }}
          thumbColor={isActive ? '#00ff88' : '#94a3b8'}
          ios_backgroundColor="#334155"
        />
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>P/L</Text>
          <Text
            style={[
              styles.statValue,
              isProfit ? styles.statValuePositive : styles.statValueNegative,
            ]}
          >
            {isProfit ? '+' : ''}${bot.profitLoss.toFixed(2)}
          </Text>
          <Text
            style={[
              styles.statPercent,
              isProfit ? styles.statPercentPositive : styles.statPercentNegative,
            ]}
          >
            {isProfit ? '+' : ''}
            {bot.profitLossPercent.toFixed(2)}%
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Trades 24h</Text>
          <Text style={styles.statValue}>{bot.trades24h}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Win Rate</Text>
          <Text style={styles.statValue}>{bot.winRate.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Active Pairs */}
      {bot.activePairs.length > 0 && (
        <View style={styles.pairsContainer}>
          <Text style={styles.pairsLabel}>Active Pairs:</Text>
          <View style={styles.pairsList}>
            {bot.activePairs.map((pair, index) => (
              <View key={index} style={styles.pairChip}>
                <Text style={styles.pairText}>{pair}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  containerActive: {
    borderColor: '#00ff88',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  strategy: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statValuePositive: {
    color: '#00ff88',
  },
  statValueNegative: {
    color: '#ef4444',
  },
  statPercent: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statPercentPositive: {
    color: '#00ff88',
  },
  statPercentNegative: {
    color: '#ef4444',
  },
  pairsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  pairsLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  pairsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pairChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pairText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
