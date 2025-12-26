/**
 * Price Alerts Screen
 * TIME BEYOND US - Manage Price Alerts and Notifications
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../hooks/useApi';

type AlertCondition = 'above' | 'below' | 'crosses';
type AlertStatus = 'active' | 'triggered' | 'expired' | 'paused';

interface PriceAlert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  currentPrice: number;
  createdAt: string;
  triggeredAt?: string;
  status: AlertStatus;
  repeat: boolean;
  notification: {
    push: boolean;
    email: boolean;
    sound: boolean;
  };
  note?: string;
}

const mockAlerts: PriceAlert[] = [
  {
    id: '1',
    symbol: 'BTC/USDT',
    condition: 'above',
    targetPrice: 50000,
    currentPrice: 43250,
    createdAt: new Date().toISOString(),
    status: 'active',
    repeat: false,
    notification: { push: true, email: true, sound: true },
    note: 'Time to sell',
  },
  {
    id: '2',
    symbol: 'ETH/USDT',
    condition: 'below',
    targetPrice: 2000,
    currentPrice: 2280,
    createdAt: new Date().toISOString(),
    status: 'active',
    repeat: true,
    notification: { push: true, email: false, sound: true },
    note: 'Buy the dip',
  },
  {
    id: '3',
    symbol: 'SOL/USDT',
    condition: 'crosses',
    targetPrice: 100,
    currentPrice: 98.5,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    triggeredAt: new Date().toISOString(),
    status: 'triggered',
    repeat: false,
    notification: { push: true, email: true, sound: false },
  },
  {
    id: '4',
    symbol: 'AVAX/USDT',
    condition: 'above',
    targetPrice: 45,
    currentPrice: 36.2,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'paused',
    repeat: false,
    notification: { push: true, email: false, sound: true },
  },
];

const popularSymbols = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'MATIC/USDT',
  'LINK/USDT', 'DOT/USDT', 'ADA/USDT', 'XRP/USDT', 'BNB/USDT',
];

export default function PriceAlertsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | AlertStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  // New alert form state
  const [newAlert, setNewAlert] = useState({
    symbol: 'BTC/USDT',
    condition: 'above' as AlertCondition,
    targetPrice: '',
    repeat: false,
    note: '',
    notification: { push: true, email: false, sound: true },
  });

  const { data: alerts = mockAlerts } = useQuery<PriceAlert[]>({
    queryKey: ['price-alerts'],
    queryFn: () => api.get('/alerts/price'),
    initialData: mockAlerts,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/alerts/price', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      setShowCreateModal(false);
      resetNewAlert();
      Alert.alert('Success', 'Price alert created');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create alert');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) => api.delete(`/alerts/price/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ alertId, paused }: { alertId: string; paused: boolean }) =>
      api.patch(`/alerts/price/${alertId}`, { status: paused ? 'paused' : 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });

  const resetNewAlert = () => {
    setNewAlert({
      symbol: 'BTC/USDT',
      condition: 'above',
      targetPrice: '',
      repeat: false,
      note: '',
      notification: { push: true, email: false, sound: true },
    });
  };

  const handleCreateAlert = () => {
    if (!newAlert.targetPrice || parseFloat(newAlert.targetPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid target price');
      return;
    }
    createMutation.mutate({
      ...newAlert,
      targetPrice: parseFloat(newAlert.targetPrice),
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(alertId),
        },
      ]
    );
  };

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter((a) => a.status === filter);

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case 'active': return '#00ff88';
      case 'triggered': return '#6366f1';
      case 'expired': return '#64748b';
      case 'paused': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getConditionIcon = (condition: AlertCondition) => {
    switch (condition) {
      case 'above': return 'arrow-up';
      case 'below': return 'arrow-down';
      case 'crosses': return 'swap-vertical';
      default: return 'alert';
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const getDistancePercent = (current: number, target: number): string => {
    const diff = ((target - current) / current) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
  };

  const renderAlertItem = ({ item }: { item: PriceAlert }) => {
    const distance = getDistancePercent(item.currentPrice, item.targetPrice);
    const isNearTarget = Math.abs(parseFloat(distance)) < 5;

    return (
      <TouchableOpacity
        style={[
          styles.alertCard,
          item.status === 'triggered' && styles.alertCardTriggered,
        ]}
        onPress={() => {}}
      >
        <View style={styles.alertHeader}>
          <View style={styles.alertSymbol}>
            <View style={[styles.conditionIcon, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Ionicons
                name={getConditionIcon(item.condition) as any}
                size={16}
                color={getStatusColor(item.status)}
              />
            </View>
            <View>
              <Text style={styles.symbolText}>{item.symbol}</Text>
              <Text style={styles.conditionText}>
                Price {item.condition} {formatPrice(item.targetPrice)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.alertDetails}>
          <View style={styles.priceInfo}>
            <View style={styles.priceColumn}>
              <Text style={styles.priceLabel}>Current</Text>
              <Text style={styles.priceValue}>{formatPrice(item.currentPrice)}</Text>
            </View>
            <View style={styles.priceArrow}>
              <Ionicons
                name={item.condition === 'below' ? 'arrow-down' : 'arrow-up'}
                size={20}
                color={isNearTarget ? '#f59e0b' : '#64748b'}
              />
              <Text style={[styles.distanceText, isNearTarget && styles.distanceNear]}>
                {distance}
              </Text>
            </View>
            <View style={styles.priceColumn}>
              <Text style={styles.priceLabel}>Target</Text>
              <Text style={[styles.priceValue, { color: '#00ff88' }]}>
                {formatPrice(item.targetPrice)}
              </Text>
            </View>
          </View>

          {item.note && (
            <View style={styles.noteContainer}>
              <Ionicons name="document-text-outline" size={14} color="#64748b" />
              <Text style={styles.noteText}>{item.note}</Text>
            </View>
          )}

          <View style={styles.alertFooter}>
            <View style={styles.notificationIcons}>
              {item.notification.push && (
                <Ionicons name="notifications" size={16} color="#6366f1" />
              )}
              {item.notification.email && (
                <Ionicons name="mail" size={16} color="#6366f1" />
              )}
              {item.notification.sound && (
                <Ionicons name="volume-high" size={16} color="#6366f1" />
              )}
              {item.repeat && (
                <Ionicons name="repeat" size={16} color="#6366f1" />
              )}
            </View>

            <View style={styles.alertActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  toggleMutation.mutate({
                    alertId: item.id,
                    paused: item.status !== 'paused',
                  })
                }
              >
                <Ionicons
                  name={item.status === 'paused' ? 'play' : 'pause'}
                  size={18}
                  color="#f8fafc"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteAlert(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Alerts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#020617" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'active', 'triggered', 'paused'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, filter === status && styles.filterTabActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {status === 'all'
                  ? alerts.length
                  : alerts.filter((a) => a.status === status).length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#475569" />
            <Text style={styles.emptyStateText}>No alerts found</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first price alert to get notified
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#020617" />
              <Text style={styles.emptyStateButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create Alert Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Price Alert</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
              >
                <Ionicons name="close" size={24} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Symbol Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Trading Pair</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.symbolsScroll}
                >
                  {popularSymbols.map((symbol) => (
                    <TouchableOpacity
                      key={symbol}
                      style={[
                        styles.symbolButton,
                        newAlert.symbol === symbol && styles.symbolButtonActive,
                      ]}
                      onPress={() => setNewAlert({ ...newAlert, symbol })}
                    >
                      <Text
                        style={[
                          styles.symbolButtonText,
                          newAlert.symbol === symbol && styles.symbolButtonTextActive,
                        ]}
                      >
                        {symbol}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Condition Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Condition</Text>
                <View style={styles.conditionButtons}>
                  {([
                    { id: 'above', label: 'Price Above', icon: 'arrow-up' },
                    { id: 'below', label: 'Price Below', icon: 'arrow-down' },
                    { id: 'crosses', label: 'Price Crosses', icon: 'swap-vertical' },
                  ] as const).map((condition) => (
                    <TouchableOpacity
                      key={condition.id}
                      style={[
                        styles.conditionButton,
                        newAlert.condition === condition.id && styles.conditionButtonActive,
                      ]}
                      onPress={() => setNewAlert({ ...newAlert, condition: condition.id })}
                    >
                      <Ionicons
                        name={condition.icon as any}
                        size={20}
                        color={newAlert.condition === condition.id ? '#00ff88' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.conditionButtonText,
                          newAlert.condition === condition.id && styles.conditionButtonTextActive,
                        ]}
                      >
                        {condition.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Target Price */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Target Price (USDT)</Text>
                <TextInput
                  style={styles.priceInput}
                  value={newAlert.targetPrice}
                  onChangeText={(text) => setNewAlert({ ...newAlert, targetPrice: text })}
                  placeholder="Enter target price"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Note */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Note (optional)</Text>
                <TextInput
                  style={[styles.priceInput, styles.noteInput]}
                  value={newAlert.note}
                  onChangeText={(text) => setNewAlert({ ...newAlert, note: text })}
                  placeholder="Add a note..."
                  placeholderTextColor="#64748b"
                  multiline
                />
              </View>

              {/* Notification Options */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notifications</Text>
                <View style={styles.notificationOptions}>
                  <View style={styles.notificationOption}>
                    <Ionicons name="notifications" size={20} color="#6366f1" />
                    <Text style={styles.notificationLabel}>Push</Text>
                    <Switch
                      value={newAlert.notification.push}
                      onValueChange={(value) =>
                        setNewAlert({
                          ...newAlert,
                          notification: { ...newAlert.notification, push: value },
                        })
                      }
                      trackColor={{ false: '#334155', true: '#00ff8860' }}
                      thumbColor={newAlert.notification.push ? '#00ff88' : '#94a3b8'}
                    />
                  </View>
                  <View style={styles.notificationOption}>
                    <Ionicons name="mail" size={20} color="#6366f1" />
                    <Text style={styles.notificationLabel}>Email</Text>
                    <Switch
                      value={newAlert.notification.email}
                      onValueChange={(value) =>
                        setNewAlert({
                          ...newAlert,
                          notification: { ...newAlert.notification, email: value },
                        })
                      }
                      trackColor={{ false: '#334155', true: '#00ff8860' }}
                      thumbColor={newAlert.notification.email ? '#00ff88' : '#94a3b8'}
                    />
                  </View>
                  <View style={styles.notificationOption}>
                    <Ionicons name="volume-high" size={20} color="#6366f1" />
                    <Text style={styles.notificationLabel}>Sound</Text>
                    <Switch
                      value={newAlert.notification.sound}
                      onValueChange={(value) =>
                        setNewAlert({
                          ...newAlert,
                          notification: { ...newAlert.notification, sound: value },
                        })
                      }
                      trackColor={{ false: '#334155', true: '#00ff8860' }}
                      thumbColor={newAlert.notification.sound ? '#00ff88' : '#94a3b8'}
                    />
                  </View>
                </View>
              </View>

              {/* Repeat Option */}
              <View style={styles.repeatOption}>
                <View style={styles.repeatInfo}>
                  <Ionicons name="repeat" size={20} color="#6366f1" />
                  <View>
                    <Text style={styles.repeatLabel}>Repeat Alert</Text>
                    <Text style={styles.repeatDescription}>
                      Alert again if price returns to target
                    </Text>
                  </View>
                </View>
                <Switch
                  value={newAlert.repeat}
                  onValueChange={(value) => setNewAlert({ ...newAlert, repeat: value })}
                  trackColor={{ false: '#334155', true: '#00ff8860' }}
                  thumbColor={newAlert.repeat ? '#00ff88' : '#94a3b8'}
                />
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
                onPress={handleCreateAlert}
                disabled={createMutation.isPending}
              >
                <Text style={styles.createButtonText}>
                  {createMutation.isPending ? 'Creating...' : 'Create Alert'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    maxHeight: 44,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    borderColor: '#00ff88',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#00ff88',
  },
  filterBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  alertCardTriggered: {
    borderColor: '#6366f1',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  alertSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conditionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  conditionText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  alertDetails: {},
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  priceColumn: {
    alignItems: 'center',
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
  },
  priceValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceArrow: {
    alignItems: 'center',
  },
  distanceText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  distanceNear: {
    color: '#f59e0b',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noteText: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef444420',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00ff88',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  emptyStateButtonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  symbolsScroll: {},
  symbolButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  symbolButtonActive: {
    borderColor: '#00ff88',
  },
  symbolButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  symbolButtonTextActive: {
    color: '#00ff88',
  },
  conditionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  conditionButtonActive: {
    borderColor: '#00ff88',
  },
  conditionButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  conditionButtonTextActive: {
    color: '#00ff88',
  },
  priceInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  notificationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationOption: {
    alignItems: 'center',
    gap: 8,
  },
  notificationLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  repeatOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  repeatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  repeatLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  repeatDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: '#00ff88',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '700',
  },
});
