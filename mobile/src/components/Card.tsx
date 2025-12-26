/**
 * Reusable Card Component
 * TIME BEYOND US - Consistent Card Styles
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'highlighted' | 'success' | 'warning' | 'danger';
  showArrow?: boolean;
}

export default function Card({
  children,
  title,
  subtitle,
  icon,
  iconColor = '#6366f1',
  onPress,
  style,
  variant = 'default',
  showArrow = false,
}: CardProps) {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'highlighted':
        return {
          borderColor: '#00ff88',
          borderWidth: 2,
        };
      case 'success':
        return {
          borderColor: '#22c55e',
          backgroundColor: '#22c55e10',
        };
      case 'warning':
        return {
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b10',
        };
      case 'danger':
        return {
          borderColor: '#ef4444',
          backgroundColor: '#ef444410',
        };
      default:
        return {};
    }
  };

  const containerStyle = [styles.container, getVariantStyles(), style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
      {(title || icon) && (
        <View style={styles.header}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
              <Ionicons name={icon} size={24} color={iconColor} />
            </View>
          )}
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {showArrow && (
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          )}
        </View>
      )}
      <View style={title || icon ? styles.contentWithHeader : undefined}>
        {children}
      </View>
    </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      {(title || icon) && (
        <View style={styles.header}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
              <Ionicons name={icon} size={24} color={iconColor} />
            </View>
          )}
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {showArrow && (
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          )}
        </View>
      )}
      <View style={title || icon ? styles.contentWithHeader : undefined}>
        {children}
      </View>
    </View>
  );
}

// Stat Card variant
interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  iconColor = '#6366f1',
  onPress,
}: StatCardProps) {
  const content = (
    <>
      {icon && (
        <Ionicons name={icon} size={24} color={iconColor} style={styles.statIcon} />
      )}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {change !== undefined && (
        <View
          style={[
            styles.changeContainer,
            { backgroundColor: change >= 0 ? '#00ff8820' : '#ef444420' },
          ]}
        >
          <Ionicons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={change >= 0 ? '#00ff88' : '#ef4444'}
          />
          <Text
            style={[
              styles.changeText,
              { color: change >= 0 ? '#00ff88' : '#ef4444' },
            ]}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.statCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.statCard}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  contentWithHeader: {
    marginTop: 4,
  },
  // Stat Card styles
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    flex: 1,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
