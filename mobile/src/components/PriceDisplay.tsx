/**
 * Price Display Component with Real-time Updates
 * TIME BEYOND US - Live Price Ticker
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import websocketService, { PriceUpdate } from '../services/websocket';

interface PriceDisplayProps {
  symbol: string;
  initialPrice?: number;
  initialChange?: number;
  size?: 'small' | 'medium' | 'large';
  showChange?: boolean;
  showSymbol?: boolean;
}

export default function PriceDisplay({
  symbol,
  initialPrice = 0,
  initialChange = 0,
  size = 'medium',
  showChange = true,
  showSymbol = true,
}: PriceDisplayProps) {
  const [price, setPrice] = useState(initialPrice);
  const [change, setChange] = useState(initialChange);
  const [isUp, setIsUp] = useState(true);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const previousPrice = useRef(price);

  useEffect(() => {
    // Subscribe to price updates
    const unsubscribe = websocketService.subscribeToPrice(symbol, (data: PriceUpdate) => {
      const newIsUp = data.price >= previousPrice.current;
      setIsUp(newIsUp);
      previousPrice.current = data.price;
      setPrice(data.price);
      setChange(data.changePercent24h);

      // Flash animation on price change
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();
    });

    return unsubscribe;
  }, [symbol, flashAnim]);

  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatChange = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  };

  const flashColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', isUp ? '#00ff8830' : '#ef444430'],
  });

  const sizeStyles = {
    small: {
      price: styles.priceSmall,
      change: styles.changeSmall,
      symbol: styles.symbolSmall,
    },
    medium: {
      price: styles.priceMedium,
      change: styles.changeMedium,
      symbol: styles.symbolMedium,
    },
    large: {
      price: styles.priceLarge,
      change: styles.changeLarge,
      symbol: styles.symbolLarge,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Animated.View style={[styles.container, { backgroundColor: flashColor }]}>
      {showSymbol && <Text style={[styles.symbol, currentSize.symbol]}>{symbol}</Text>}
      <Text style={[styles.price, currentSize.price]}>{formatPrice(price)}</Text>
      {showChange && (
        <View
          style={[
            styles.changeContainer,
            { backgroundColor: change >= 0 ? '#00ff8820' : '#ef444420' },
          ]}
        >
          <Ionicons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={size === 'small' ? 12 : size === 'large' ? 18 : 14}
            color={change >= 0 ? '#00ff88' : '#ef4444'}
          />
          <Text
            style={[
              styles.change,
              currentSize.change,
              { color: change >= 0 ? '#00ff88' : '#ef4444' },
            ]}
          >
            {formatChange(change)}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  symbol: {
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  symbolSmall: {
    fontSize: 10,
  },
  symbolMedium: {
    fontSize: 12,
  },
  symbolLarge: {
    fontSize: 14,
  },
  price: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  priceSmall: {
    fontSize: 14,
  },
  priceMedium: {
    fontSize: 20,
  },
  priceLarge: {
    fontSize: 32,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  change: {
    fontWeight: '600',
  },
  changeSmall: {
    fontSize: 11,
  },
  changeMedium: {
    fontSize: 13,
  },
  changeLarge: {
    fontSize: 16,
  },
});
