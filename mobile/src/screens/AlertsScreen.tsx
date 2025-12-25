import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

type AlertType = 'trade' | 'bot' | 'price' | 'system';
type AlertPriority = 'high' | 'medium' | 'low';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: Date;
  priority: AlertPriority;
  read: boolean;
  data?: any;
}

export default function AlertsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'trade',
      title: 'Trade Executed',
      message: 'BUY order filled: 0.5 BTC at $43,250',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
      priority: 'high',
      read: false,
    },
    {
      id: '2',
      type: 'bot',
      title: 'Bot Alert',
      message: 'Grid Trading Bot reached profit target of 5%',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      priority: 'medium',
      read: false,
    },
    {
      id: '3',
      type: 'price',
      title: 'Price Alert',
      message: 'BTC/USDT crossed $43,000 (target price)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      priority: 'medium',
      read: true,
    },
    {
      id: '4',
      type: 'trade',
      title: 'Trade Executed',
      message: 'SELL order filled: 10 ETH at $2,280',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      priority: 'high',
      read: true,
    },
    {
      id: '5',
      type: 'system',
      title: 'System Notification',
      message: 'Your account security settings were updated',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      priority: 'low',
      read: true,
    },
    {
      id: '6',
      type: 'bot',
      title: 'Bot Paused',
      message: 'Scalping Bot auto-paused due to high volatility',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      priority: 'high',
      read: true,
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const markAsRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })));
  };

  const deleteAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter((alert) => !alert.read);

  const unreadCount = alerts.filter((alert) => !alert.read).length;

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'trade':
        return 'swap-horizontal';
      case 'bot':
        return 'hardware-chip';
      case 'price':
        return 'trending-up';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getAlertColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#6366f1';
      default:
        return '#94a3b8';
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => (
    <TouchableOpacity
      style={[styles.alertCard, !item.read && styles.alertCardUnread]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.alertIconContainer,
          { backgroundColor: `${getAlertColor(item.priority)}20` },
        ]}
      >
        <Ionicons
          name={getAlertIcon(item.type) as any}
          size={24}
          color={getAlertColor(item.priority)}
        />
      </View>

      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle}>{item.title}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.alertMessage}>{item.message}</Text>
        <Text style={styles.alertTime}>
          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteAlert(item.id)}
      >
        <Ionicons name="close" size={20} color="#64748b" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'unread' && styles.filterTabActive,
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'unread' && styles.filterTabTextActive,
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00ff88"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={64} color="#475569" />
            <Text style={styles.emptyStateText}>No alerts</Text>
            <Text style={styles.emptyStateSubtext}>
              You're all caught up!
            </Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ff88',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    borderColor: '#00ff88',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#00ff88',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  alertCardUnread: {
    borderColor: '#00ff88',
    backgroundColor: '#1e293b',
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
    lineHeight: 20,
  },
  alertTime: {
    fontSize: 12,
    color: '#64748b',
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
});
