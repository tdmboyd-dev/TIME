import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Position {
  symbol: string;
  name: string;
  amount: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  icon?: string;
}

interface PositionItemProps {
  position: Position;
  onPress?: () => void;
}

export default function PositionItem({ position, onPress }: PositionItemProps) {
  const isProfit = position.profitLoss >= 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {position.icon ? (
          <Image source={{ uri: position.icon }} style={styles.icon} />
        ) : (
          <View style={styles.iconPlaceholder}>
            <Text style={styles.iconText}>
              {position.symbol.substring(0, 2)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.symbol}>{position.symbol}</Text>
            <Text style={styles.name}>{position.name}</Text>
          </View>
          <View style={styles.rightAlign}>
            <Text style={styles.totalValue}>
              ${position.totalValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <View
              style={[
                styles.plBadge,
                isProfit ? styles.plBadgePositive : styles.plBadgeNegative,
              ]}
            >
              <Ionicons
                name={isProfit ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isProfit ? '#00ff88' : '#ef4444'}
              />
              <Text
                style={[
                  styles.plText,
                  isProfit ? styles.plTextPositive : styles.plTextNegative,
                ]}
              >
                {isProfit ? '+' : ''}
                {position.profitLossPercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.amount}>
            {position.amount.toLocaleString()} {position.symbol}
          </Text>
          <Text style={styles.price}>
            ${position.currentPrice.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  infoContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  name: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  plBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 2,
  },
  plBadgePositive: {
    backgroundColor: '#00ff8820',
  },
  plBadgeNegative: {
    backgroundColor: '#ef444420',
  },
  plText: {
    fontSize: 12,
    fontWeight: '600',
  },
  plTextPositive: {
    color: '#00ff88',
  },
  plTextNegative: {
    color: '#ef4444',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: 13,
    color: '#64748b',
  },
  price: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
