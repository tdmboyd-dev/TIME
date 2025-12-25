import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PortfolioCardProps {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  onPress?: () => void;
}

export default function PortfolioCard({
  totalValue,
  dayChange,
  dayChangePercent,
  onPress,
}: PortfolioCardProps) {
  const isPositive = dayChange >= 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.label}>Total Portfolio Value</Text>
        <Ionicons name="eye-outline" size={20} color="#94a3b8" />
      </View>

      <View style={styles.valueContainer}>
        <Text style={styles.value}>${totalValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</Text>
      </View>

      <View style={styles.changeContainer}>
        <View
          style={[
            styles.changeBadge,
            isPositive ? styles.changeBadgePositive : styles.changeBadgeNegative,
          ]}
        >
          <Ionicons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={16}
            color={isPositive ? '#00ff88' : '#ef4444'}
          />
          <Text
            style={[
              styles.changeText,
              isPositive ? styles.changeTextPositive : styles.changeTextNegative,
            ]}
          >
            {isPositive ? '+' : ''}${Math.abs(dayChange).toFixed(2)} (
            {isPositive ? '+' : ''}
            {dayChangePercent.toFixed(2)}%)
          </Text>
        </View>
        <Text style={styles.changeLabel}>24h Change</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  valueContainer: {
    marginBottom: 16,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f8fafc',
    letterSpacing: -1,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  changeBadgePositive: {
    backgroundColor: '#00ff8820',
  },
  changeBadgeNegative: {
    backgroundColor: '#ef444420',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeTextPositive: {
    color: '#00ff88',
  },
  changeTextNegative: {
    color: '#ef4444',
  },
  changeLabel: {
    fontSize: 12,
    color: '#64748b',
  },
});
