/**
 * Markets Screen - Market Overview and Watchlist
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../hooks/useApi';

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
}

export default function MarketsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'stocks' | 'crypto' | 'forex'>('stocks');

  const { data: markets, isLoading, refetch } = useQuery<MarketAsset[]>({
    queryKey: ['markets', activeTab],
    queryFn: () => api.get(`/markets/${activeTab}`),
  });

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(6);
  };

  const filteredMarkets = markets?.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search markets..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['stocks', 'crypto', 'forex'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Market List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
        }
      >
        {filteredMarkets?.map((asset) => (
          <TouchableOpacity key={asset.symbol} style={styles.assetCard}>
            <View style={styles.assetInfo}>
              <Text style={styles.symbol}>{asset.symbol}</Text>
              <Text style={styles.name}>{asset.name}</Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={styles.price}>${formatPrice(asset.price)}</Text>
              <View
                style={[
                  styles.changeBadge,
                  { backgroundColor: asset.change >= 0 ? '#22c55e20' : '#ef444420' },
                ]}
              >
                <Ionicons
                  name={asset.change >= 0 ? 'caret-up' : 'caret-down'}
                  size={12}
                  color={asset.change >= 0 ? '#22c55e' : '#ef4444'}
                />
                <Text
                  style={[styles.changeText, { color: asset.change >= 0 ? '#22c55e' : '#ef4444' }]}
                >
                  {Math.abs(asset.changePercent).toFixed(2)}%
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {(!filteredMarkets || filteredMarkets.length === 0) && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#64748b" />
            <Text style={styles.emptyText}>No results found</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  tabActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  assetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  assetInfo: {},
  symbol: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
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
