/**
 * Market Detail Screen
 * TIME BEYOND US - Trading Pair Details with Charts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query';
import { api } from '../hooks/useApi';
import websocketService, { PriceUpdate } from '../services/websocket';
import { useMarketStore } from '../store/marketStore';

const { width: screenWidth } = Dimensions.get('window');

type Timeframe = '1h' | '4h' | '1d' | '1w' | '1m';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  circulatingSupply: number;
}

export default function MarketDetailScreen({ route, navigation }: any) {
  const { symbol } = route.params || { symbol: 'BTC/USDT' };
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1d');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);

  const { addToWatchlist, removeFromWatchlist, watchlist } = useMarketStore();
  const isInWatchlist = watchlist.includes(symbol);

  // Fetch market data
  const { data: marketData } = useQuery<MarketData>({
    queryKey: ['market', symbol],
    queryFn: () => api.get(`/markets/${symbol}`),
  });

  // Mock data for development
  const data: MarketData = marketData || {
    symbol,
    name: symbol.split('/')[0],
    price: 43250.00,
    change24h: 1250.50,
    changePercent24h: 2.98,
    high24h: 44100.00,
    low24h: 41800.00,
    volume24h: 28500000000,
    marketCap: 847000000000,
    circulatingSupply: 19580000,
  };

  // Subscribe to real-time price updates
  useEffect(() => {
    setCurrentPrice(data.price);
    setPriceChange(data.changePercent24h);

    const unsubscribe = websocketService.subscribeToPrice(symbol, (update: PriceUpdate) => {
      setCurrentPrice(update.price);
      setPriceChange(update.changePercent24h);
    });

    return unsubscribe;
  }, [symbol, data.price, data.changePercent24h]);

  // Mock chart data
  const chartData = {
    labels: ['', '', '', '', '', ''],
    datasets: [
      {
        data: [42800, 43100, 42500, 43400, 43000, currentPrice || 43250],
        strokeWidth: 2,
      },
    ],
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatLargeNumber = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return formatCurrency(value);
  };

  const timeframes: Timeframe[] = ['1h', '4h', '1d', '1w', '1m'];

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Price Header */}
      <View style={styles.priceHeader}>
        <View style={styles.priceTop}>
          <View>
            <Text style={styles.symbol}>{data.symbol}</Text>
            <Text style={styles.name}>{data.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.watchlistButton, isInWatchlist && styles.watchlistButtonActive]}
            onPress={toggleWatchlist}
          >
            <Ionicons
              name={isInWatchlist ? 'star' : 'star-outline'}
              size={24}
              color={isInWatchlist ? '#f59e0b' : '#64748b'}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.currentPrice}>{formatCurrency(currentPrice)}</Text>

        <View
          style={[
            styles.changeContainer,
            { backgroundColor: priceChange >= 0 ? '#00ff8820' : '#ef444420' },
          ]}
        >
          <Ionicons
            name={priceChange >= 0 ? 'trending-up' : 'trending-down'}
            size={18}
            color={priceChange >= 0 ? '#00ff88' : '#ef4444'}
          />
          <Text
            style={[
              styles.changeText,
              { color: priceChange >= 0 ? '#00ff88' : '#ef4444' },
            ]}
          >
            {priceChange >= 0 ? '+' : ''}
            {formatCurrency(data.change24h)} ({priceChange >= 0 ? '+' : ''}
            {priceChange.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.timeframeSelector}>
          {timeframes.map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.timeframeButton,
                selectedTimeframe === tf && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe(tf)}
            >
              <Text
                style={[
                  styles.timeframeText,
                  selectedTimeframe === tf && styles.timeframeTextActive,
                ]}
              >
                {tf.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#1e293b',
            backgroundGradientFrom: '#1e293b',
            backgroundGradientTo: '#1e293b',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 255, 136, ${opacity})`,
            labelColor: () => '#64748b',
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#00ff88',
            },
            propsForBackgroundLines: {
              stroke: '#334155',
              strokeDasharray: '',
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLabels={true}
          withVerticalLabels={false}
        />
      </View>

      {/* 24h Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>24h Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={[styles.statValue, styles.highValue]}>
              {formatCurrency(data.high24h)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={[styles.statValue, styles.lowValue]}>
              {formatCurrency(data.low24h)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Volume</Text>
            <Text style={styles.statValue}>{formatLargeNumber(data.volume24h)}</Text>
          </View>
        </View>
      </View>

      {/* Market Info */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Market Info</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Market Cap</Text>
            <Text style={styles.infoValue}>{formatLargeNumber(data.marketCap)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Circulating Supply</Text>
            <Text style={styles.infoValue}>
              {data.circulatingSupply.toLocaleString()} {symbol.split('/')[0]}
            </Text>
          </View>
        </View>
      </View>

      {/* Trade Buttons */}
      <View style={styles.tradeButtons}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.buyButton]}
          onPress={() => navigation.navigate('Trade', { symbol, side: 'buy' })}
        >
          <Ionicons name="arrow-up" size={20} color="#020617" />
          <Text style={styles.buyButtonText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tradeButton, styles.sellButton]}
          onPress={() => navigation.navigate('Trade', { symbol, side: 'sell' })}
        >
          <Ionicons name="arrow-down" size={20} color="#fff" />
          <Text style={styles.sellButtonText}>Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="notifications-outline" size={24} color="#6366f1" />
            </View>
            <Text style={styles.actionLabel}>Set Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="hardware-chip-outline" size={24} color="#00ff88" />
            </View>
            <Text style={styles.actionLabel}>Auto Trade</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="analytics-outline" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionLabel}>Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="share-social-outline" size={24} color="#22d3ee" />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>
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
  priceHeader: {
    marginBottom: 24,
  },
  priceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
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
  watchlistButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  watchlistButtonActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b20',
  },
  currentPrice: {
    color: '#f8fafc',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeframeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#00ff8820',
  },
  timeframeText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#00ff88',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsCard: {
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
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
  highValue: {
    color: '#00ff88',
  },
  lowValue: {
    color: '#ef4444',
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoGrid: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  tradeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tradeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buyButton: {
    backgroundColor: '#00ff88',
  },
  buyButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '700',
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
  sellButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  actionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
