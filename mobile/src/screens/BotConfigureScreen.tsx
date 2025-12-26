/**
 * Bot Configuration Screen
 * TIME BEYOND US - Configure AI Trading Bot Parameters
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Slider from '@react-native-community/slider';
import { api } from '../hooks/useApi';

interface BotConfig {
  id: string;
  name: string;
  strategy: string;
  pairs: string[];
  baseAmount: number;
  stopLoss: number;
  takeProfit: number;
  maxPositions: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  autoRebalance: boolean;
  notifications: {
    trades: boolean;
    signals: boolean;
    errors: boolean;
  };
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    activeDays: number[];
  };
  advanced: {
    cooldownMinutes: number;
    maxDailyTrades: number;
    trailingStop: boolean;
    trailingPercent: number;
    martingale: boolean;
    martingaleMultiplier: number;
  };
}

const defaultConfig: BotConfig = {
  id: '',
  name: 'New Bot',
  strategy: 'grid',
  pairs: ['BTC/USDT'],
  baseAmount: 1000,
  stopLoss: 5,
  takeProfit: 10,
  maxPositions: 5,
  riskLevel: 'moderate',
  autoRebalance: true,
  notifications: {
    trades: true,
    signals: true,
    errors: true,
  },
  schedule: {
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    activeDays: [1, 2, 3, 4, 5],
  },
  advanced: {
    cooldownMinutes: 5,
    maxDailyTrades: 50,
    trailingStop: false,
    trailingPercent: 2,
    martingale: false,
    martingaleMultiplier: 2,
  },
};

const availablePairs = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'MATIC/USDT',
  'LINK/USDT', 'DOT/USDT', 'ADA/USDT', 'XRP/USDT', 'BNB/USDT',
];

const strategies = [
  { id: 'grid', name: 'Grid Trading', icon: 'grid-outline', description: 'Buy low, sell high in a price range' },
  { id: 'dca', name: 'DCA', icon: 'trending-up', description: 'Dollar cost averaging over time' },
  { id: 'momentum', name: 'Momentum', icon: 'flash-outline', description: 'Follow price trends' },
  { id: 'scalping', name: 'Scalping', icon: 'timer-outline', description: 'Quick trades on small price moves' },
  { id: 'arbitrage', name: 'Arbitrage', icon: 'swap-horizontal', description: 'Price differences across markets' },
  { id: 'mean-reversion', name: 'Mean Reversion', icon: 'analytics-outline', description: 'Bet on price returning to average' },
];

export default function BotConfigureScreen({ route, navigation }: any) {
  const { botId, mode = 'create' } = route.params || {};
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [loading, setLoading] = useState(mode === 'edit');
  const [activeSection, setActiveSection] = useState<string>('basic');

  // Fetch existing bot config if editing
  const { data: existingBot } = useQuery({
    queryKey: ['bot-config', botId],
    queryFn: () => api.get(`/bots/${botId}/config`),
    enabled: !!botId && mode === 'edit',
  });

  useEffect(() => {
    if (existingBot) {
      setConfig({ ...defaultConfig, ...existingBot });
      setLoading(false);
    }
  }, [existingBot]);

  const saveMutation = useMutation({
    mutationFn: (data: BotConfig) => {
      if (mode === 'edit' && botId) {
        return api.put(`/bots/${botId}/config`, data);
      }
      return api.post('/bots', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      Alert.alert(
        'Success',
        mode === 'edit' ? 'Bot configuration updated' : 'Bot created successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save configuration');
    },
  });

  const handleSave = () => {
    if (!config.name.trim()) {
      Alert.alert('Error', 'Please enter a bot name');
      return;
    }
    if (config.pairs.length === 0) {
      Alert.alert('Error', 'Please select at least one trading pair');
      return;
    }
    if (config.baseAmount < 10) {
      Alert.alert('Error', 'Base amount must be at least $10');
      return;
    }
    saveMutation.mutate(config);
  };

  const togglePair = (pair: string) => {
    setConfig((prev) => ({
      ...prev,
      pairs: prev.pairs.includes(pair)
        ? prev.pairs.filter((p) => p !== pair)
        : [...prev.pairs, pair],
    }));
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'conservative': return '#22c55e';
      case 'moderate': return '#f59e0b';
      case 'aggressive': return '#ef4444';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  const sections = [
    { id: 'basic', label: 'Basic', icon: 'settings-outline' },
    { id: 'risk', label: 'Risk', icon: 'shield-outline' },
    { id: 'pairs', label: 'Pairs', icon: 'git-network-outline' },
    { id: 'notifications', label: 'Alerts', icon: 'notifications-outline' },
    { id: 'advanced', label: 'Advanced', icon: 'options-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Configure Bot' : 'Create Bot'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Section Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.tab,
              activeSection === section.id && styles.tabActive,
            ]}
            onPress={() => setActiveSection(section.id)}
          >
            <Ionicons
              name={section.icon as any}
              size={18}
              color={activeSection === section.id ? '#00ff88' : '#94a3b8'}
            />
            <Text
              style={[
                styles.tabText,
                activeSection === section.id && styles.tabTextActive,
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Settings */}
        {activeSection === 'basic' && (
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bot Name</Text>
              <TextInput
                style={styles.input}
                value={config.name}
                onChangeText={(text) => setConfig({ ...config, name: text })}
                placeholder="Enter bot name"
                placeholderTextColor="#64748b"
              />
            </View>

            <Text style={styles.sectionTitle}>Trading Strategy</Text>
            <View style={styles.strategyGrid}>
              {strategies.map((strategy) => (
                <TouchableOpacity
                  key={strategy.id}
                  style={[
                    styles.strategyCard,
                    config.strategy === strategy.id && styles.strategyCardActive,
                  ]}
                  onPress={() => setConfig({ ...config, strategy: strategy.id })}
                >
                  <View style={styles.strategyIcon}>
                    <Ionicons
                      name={strategy.icon as any}
                      size={24}
                      color={config.strategy === strategy.id ? '#00ff88' : '#94a3b8'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strategyName,
                      config.strategy === strategy.id && styles.strategyNameActive,
                    ]}
                  >
                    {strategy.name}
                  </Text>
                  <Text style={styles.strategyDescription}>{strategy.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base Amount (USDT)</Text>
              <TextInput
                style={styles.input}
                value={config.baseAmount.toString()}
                onChangeText={(text) => setConfig({ ...config, baseAmount: parseFloat(text) || 0 })}
                placeholder="1000"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputHint}>Amount allocated per trade</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Concurrent Positions</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={20}
                  step={1}
                  value={config.maxPositions}
                  onValueChange={(value) => setConfig({ ...config, maxPositions: value })}
                  minimumTrackTintColor="#00ff88"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#00ff88"
                />
                <Text style={styles.sliderValue}>{config.maxPositions}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Risk Settings */}
        {activeSection === 'risk' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Level</Text>
            <View style={styles.riskLevelContainer}>
              {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.riskButton,
                    config.riskLevel === level && styles.riskButtonActive,
                    { borderColor: getRiskColor(level) },
                  ]}
                  onPress={() => setConfig({ ...config, riskLevel: level })}
                >
                  <View style={[styles.riskDot, { backgroundColor: getRiskColor(level) }]} />
                  <Text
                    style={[
                      styles.riskText,
                      config.riskLevel === level && { color: getRiskColor(level) },
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stop Loss (%)</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={25}
                  step={0.5}
                  value={config.stopLoss}
                  onValueChange={(value) => setConfig({ ...config, stopLoss: value })}
                  minimumTrackTintColor="#ef4444"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#ef4444"
                />
                <Text style={[styles.sliderValue, { color: '#ef4444' }]}>
                  {config.stopLoss.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.inputHint}>Close position if loss exceeds this percentage</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Take Profit (%)</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={50}
                  step={0.5}
                  value={config.takeProfit}
                  onValueChange={(value) => setConfig({ ...config, takeProfit: value })}
                  minimumTrackTintColor="#00ff88"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#00ff88"
                />
                <Text style={[styles.sliderValue, { color: '#00ff88' }]}>
                  {config.takeProfit.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.inputHint}>Close position if profit reaches this percentage</Text>
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Auto Rebalance</Text>
                <Text style={styles.optionDescription}>
                  Automatically rebalance positions to maintain risk limits
                </Text>
              </View>
              <Switch
                value={config.autoRebalance}
                onValueChange={(value) => setConfig({ ...config, autoRebalance: value })}
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={config.autoRebalance ? '#00ff88' : '#94a3b8'}
              />
            </View>
          </View>
        )}

        {/* Trading Pairs */}
        {activeSection === 'pairs' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Trading Pairs</Text>
            <Text style={styles.sectionDescription}>
              Choose which pairs this bot will trade. More pairs = more opportunities but also more complexity.
            </Text>

            <View style={styles.pairsGrid}>
              {availablePairs.map((pair) => (
                <TouchableOpacity
                  key={pair}
                  style={[
                    styles.pairButton,
                    config.pairs.includes(pair) && styles.pairButtonActive,
                  ]}
                  onPress={() => togglePair(pair)}
                >
                  <Text
                    style={[
                      styles.pairText,
                      config.pairs.includes(pair) && styles.pairTextActive,
                    ]}
                  >
                    {pair}
                  </Text>
                  {config.pairs.includes(pair) && (
                    <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.selectedPairsInfo}>
              <Text style={styles.selectedPairsText}>
                {config.pairs.length} pair{config.pairs.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          </View>
        )}

        {/* Notification Settings */}
        {activeSection === 'notifications' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Push Notifications</Text>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="swap-horizontal" size={22} color="#6366f1" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Trade Executions</Text>
                  <Text style={styles.optionDescription}>
                    Notify when trades are placed or filled
                  </Text>
                </View>
              </View>
              <Switch
                value={config.notifications.trades}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    notifications: { ...config.notifications, trades: value },
                  })
                }
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={config.notifications.trades ? '#00ff88' : '#94a3b8'}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="flash" size={22} color="#f59e0b" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Trading Signals</Text>
                  <Text style={styles.optionDescription}>
                    Notify when bot generates new signals
                  </Text>
                </View>
              </View>
              <Switch
                value={config.notifications.signals}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    notifications: { ...config.notifications, signals: value },
                  })
                }
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={config.notifications.signals ? '#00ff88' : '#94a3b8'}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="warning" size={22} color="#ef4444" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Errors & Warnings</Text>
                  <Text style={styles.optionDescription}>
                    Notify when errors or issues occur
                  </Text>
                </View>
              </View>
              <Switch
                value={config.notifications.errors}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    notifications: { ...config.notifications, errors: value },
                  })
                }
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={config.notifications.errors ? '#00ff88' : '#94a3b8'}
              />
            </View>
          </View>
        )}

        {/* Advanced Settings */}
        {activeSection === 'advanced' && (
          <View style={styles.section}>
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={20} color="#f59e0b" />
              <Text style={styles.warningBannerText}>
                Advanced settings are for experienced traders. Incorrect configuration may result in losses.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trade Cooldown (minutes)</Text>
              <TextInput
                style={styles.input}
                value={config.advanced.cooldownMinutes.toString()}
                onChangeText={(text) =>
                  setConfig({
                    ...config,
                    advanced: { ...config.advanced, cooldownMinutes: parseInt(text) || 0 },
                  })
                }
                placeholder="5"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
              />
              <Text style={styles.inputHint}>Minimum time between trades</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Daily Trades</Text>
              <TextInput
                style={styles.input}
                value={config.advanced.maxDailyTrades.toString()}
                onChangeText={(text) =>
                  setConfig({
                    ...config,
                    advanced: { ...config.advanced, maxDailyTrades: parseInt(text) || 0 },
                  })
                }
                placeholder="50"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Trailing Stop</Text>
                <Text style={styles.optionDescription}>
                  Move stop loss as price moves in your favor
                </Text>
              </View>
              <Switch
                value={config.advanced.trailingStop}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    advanced: { ...config.advanced, trailingStop: value },
                  })
                }
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor={config.advanced.trailingStop ? '#00ff88' : '#94a3b8'}
              />
            </View>

            {config.advanced.trailingStop && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Trailing Percentage (%)</Text>
                <TextInput
                  style={styles.input}
                  value={config.advanced.trailingPercent.toString()}
                  onChangeText={(text) =>
                    setConfig({
                      ...config,
                      advanced: { ...config.advanced, trailingPercent: parseFloat(text) || 0 },
                    })
                  }
                  placeholder="2"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>

              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, { color: '#ef4444' }]}>Martingale</Text>
                  <Text style={styles.optionDescription}>
                    Double down on losing trades (HIGH RISK)
                  </Text>
                </View>
                <Switch
                  value={config.advanced.martingale}
                  onValueChange={(value) =>
                    setConfig({
                      ...config,
                      advanced: { ...config.advanced, martingale: value },
                    })
                  }
                  trackColor={{ false: '#334155', true: '#ef444460' }}
                  thumbColor={config.advanced.martingale ? '#ef4444' : '#94a3b8'}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '700',
  },
  tabsContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00ff88',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00ff88',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'right',
  },
  strategyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  strategyCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyCardActive: {
    borderColor: '#00ff88',
  },
  strategyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  strategyName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  strategyNameActive: {
    color: '#00ff88',
  },
  strategyDescription: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  riskLevelContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  riskButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 2,
  },
  riskButtonActive: {
    backgroundColor: '#1e293b',
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  pairsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pairButtonActive: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8810',
  },
  pairText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  pairTextActive: {
    color: '#00ff88',
  },
  selectedPairsInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPairsText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  optionDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningBannerText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 13,
    lineHeight: 18,
  },
  dangerZone: {
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#ef444450',
  },
  dangerZoneTitle: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 40,
  },
});
