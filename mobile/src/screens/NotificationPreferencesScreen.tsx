/**
 * Notification Preferences Screen
 * TIME BEYOND US - Configure Push & Email Notification Settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Note: expo-notifications removed - Firebase not configured
import { useSettingsStore } from '../store/settingsStore';
import pushService from '../services/push';
import { logger } from '../utils/logger';

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  subcategories: {
    id: string;
    label: string;
    description: string;
  }[];
}

const notificationCategories: NotificationCategory[] = [
  {
    id: 'trades',
    title: 'Trade Notifications',
    description: 'Updates about your trading activity',
    icon: 'swap-horizontal',
    color: '#00ff88',
    subcategories: [
      { id: 'trades_executed', label: 'Trade Executions', description: 'When orders are filled' },
      { id: 'trades_failed', label: 'Failed Orders', description: 'When orders fail or are rejected' },
      { id: 'trades_pending', label: 'Pending Orders', description: 'Updates on pending orders' },
      { id: 'trades_summary', label: 'Daily Summary', description: 'Daily trading recap' },
    ],
  },
  {
    id: 'bots',
    title: 'Bot Notifications',
    description: 'AI trading bot activity and status',
    icon: 'hardware-chip',
    color: '#6366f1',
    subcategories: [
      { id: 'bots_signals', label: 'Trading Signals', description: 'When bots generate signals' },
      { id: 'bots_trades', label: 'Bot Trades', description: 'When bots execute trades' },
      { id: 'bots_status', label: 'Status Changes', description: 'When bots start, stop, or pause' },
      { id: 'bots_performance', label: 'Performance Alerts', description: 'Profit/loss milestones' },
      { id: 'bots_errors', label: 'Error Alerts', description: 'When bots encounter issues' },
    ],
  },
  {
    id: 'price',
    title: 'Price Alerts',
    description: 'Market price movements and targets',
    icon: 'trending-up',
    color: '#f59e0b',
    subcategories: [
      { id: 'price_targets', label: 'Target Reached', description: 'When price targets are hit' },
      { id: 'price_movement', label: 'Significant Moves', description: 'Large price changes' },
      { id: 'price_volatility', label: 'Volatility Alerts', description: 'Unusual market activity' },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio Updates',
    description: 'Account and portfolio changes',
    icon: 'wallet',
    color: '#22c55e',
    subcategories: [
      { id: 'portfolio_balance', label: 'Balance Updates', description: 'Deposits and withdrawals' },
      { id: 'portfolio_performance', label: 'Performance', description: 'Weekly/monthly reports' },
      { id: 'portfolio_risk', label: 'Risk Alerts', description: 'Margin and exposure warnings' },
    ],
  },
  {
    id: 'security',
    title: 'Security Alerts',
    description: 'Account security and access',
    icon: 'shield-checkmark',
    color: '#ef4444',
    subcategories: [
      { id: 'security_login', label: 'Login Activity', description: 'New device logins' },
      { id: 'security_changes', label: 'Security Changes', description: 'Password and 2FA updates' },
      { id: 'security_suspicious', label: 'Suspicious Activity', description: 'Unusual account behavior' },
    ],
  },
  {
    id: 'marketing',
    title: 'News & Updates',
    description: 'Platform news and promotions',
    icon: 'newspaper',
    color: '#94a3b8',
    subcategories: [
      { id: 'marketing_news', label: 'Platform News', description: 'New features and updates' },
      { id: 'marketing_tips', label: 'Trading Tips', description: 'Educational content' },
      { id: 'marketing_promotions', label: 'Promotions', description: 'Special offers and events' },
    ],
  },
];

export default function NotificationPreferencesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  const { notifications: storeNotifications, updateNotifications } = useSettingsStore();

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      // Check notification permission status (stubbed - Firebase not configured)
      // When Firebase is configured, replace with actual permission check
      setPermissionGranted(false);

      // Initialize preferences from store or defaults
      const defaultPrefs: Record<string, boolean> = {};
      notificationCategories.forEach((cat) => {
        cat.subcategories.forEach((sub) => {
          defaultPrefs[sub.id] = true;
        });
      });

      // Merge with stored preferences
      setPreferences({ ...defaultPrefs, ...storeNotifications });
    } catch (error) {
      logger.error('Error initializing notification settings', { tag: 'Notifications', data: error });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const token = await pushService.registerForPushNotifications();
      if (token) {
        setPermissionGranted(true);
        Alert.alert('Success', 'Push notifications have been enabled');
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive alerts.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable notifications');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleAllInCategory = (category: NotificationCategory, enabled: boolean) => {
    const newPrefs = { ...preferences };
    category.subcategories.forEach((sub) => {
      newPrefs[sub.id] = enabled;
    });
    setPreferences(newPrefs);
  };

  const togglePreference = (prefId: string) => {
    setPreferences((prev) => ({
      ...prev,
      [prefId]: !prev[prefId],
    }));
  };

  const isCategoryEnabled = (category: NotificationCategory): boolean => {
    return category.subcategories.every((sub) => preferences[sub.id] === true);
  };

  const isCategoryPartiallyEnabled = (category: NotificationCategory): boolean => {
    const enabled = category.subcategories.filter((sub) => preferences[sub.id] === true);
    return enabled.length > 0 && enabled.length < category.subcategories.length;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      updateNotifications(preferences);
      // Also sync with backend
      await pushService.updateNotificationPreferences(preferences);
      Alert.alert('Success', 'Notification preferences saved');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAll = () => {
    Alert.alert(
      'Disable All Notifications',
      'Are you sure you want to disable all notifications? You may miss important alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable All',
          style: 'destructive',
          onPress: () => {
            const newPrefs: Record<string, boolean> = {};
            notificationCategories.forEach((cat) => {
              cat.subcategories.forEach((sub) => {
                newPrefs[sub.id] = false;
              });
            });
            setPreferences(newPrefs);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Banner */}
        {!permissionGranted && (
          <TouchableOpacity
            style={styles.permissionBanner}
            onPress={handleRequestPermission}
          >
            <Ionicons name="notifications-off" size={24} color="#f59e0b" />
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>Notifications Disabled</Text>
              <Text style={styles.permissionDescription}>
                Tap to enable push notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleDisableAll}>
            <Ionicons name="notifications-off-outline" size={20} color="#ef4444" />
            <Text style={styles.quickActionText}>Disable All</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Categories */}
        {notificationCategories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category.id)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                <Ionicons name={category.icon as any} size={24} color={category.color} />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <View style={styles.categoryActions}>
                <Switch
                  value={isCategoryEnabled(category)}
                  onValueChange={(value) => toggleAllInCategory(category, value)}
                  trackColor={{ false: '#334155', true: `${category.color}60` }}
                  thumbColor={isCategoryEnabled(category) ? category.color : '#94a3b8'}
                />
                <Ionicons
                  name={expandedCategories.includes(category.id) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#64748b"
                  style={styles.expandIcon}
                />
              </View>
            </TouchableOpacity>

            {expandedCategories.includes(category.id) && (
              <View style={styles.subcategories}>
                {category.subcategories.map((sub) => (
                  <View key={sub.id} style={styles.subcategoryItem}>
                    <View style={styles.subcategoryInfo}>
                      <Text style={styles.subcategoryLabel}>{sub.label}</Text>
                      <Text style={styles.subcategoryDescription}>{sub.description}</Text>
                    </View>
                    <Switch
                      value={preferences[sub.id] === true}
                      onValueChange={() => togglePreference(sub.id)}
                      trackColor={{ false: '#334155', true: '#00ff8860' }}
                      thumbColor={preferences[sub.id] ? '#00ff88' : '#94a3b8'}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Quiet Hours */}
        <View style={styles.quietHoursCard}>
          <View style={styles.quietHoursHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: '#6366f120' }]}>
              <Ionicons name="moon" size={24} color="#6366f1" />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryTitle}>Quiet Hours</Text>
              <Text style={styles.categoryDescription}>
                Mute notifications during specific hours
              </Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ false: '#334155', true: '#6366f160' }}
              thumbColor={quietHoursEnabled ? '#6366f1' : '#94a3b8'}
            />
          </View>

          {quietHoursEnabled && (
            <View style={styles.quietHoursSettings}>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>From</Text>
                <TouchableOpacity style={styles.timeButton}>
                  <Text style={styles.timeValue}>{quietHoursStart}</Text>
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Until</Text>
                <TouchableOpacity style={styles.timeButton}>
                  <Text style={styles.timeValue}>{quietHoursEnd}</Text>
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.quietHoursNote}>
                Critical security alerts will still be delivered
              </Text>
            </View>
          )}
        </View>

        {/* Email Preferences */}
        <View style={styles.emailSection}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <View style={styles.emailCard}>
            <View style={styles.emailItem}>
              <View style={styles.emailInfo}>
                <Text style={styles.emailLabel}>Daily Digest</Text>
                <Text style={styles.emailDescription}>
                  Summary of your daily trading activity
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor="#00ff88"
              />
            </View>
            <View style={styles.emailItem}>
              <View style={styles.emailInfo}>
                <Text style={styles.emailLabel}>Weekly Report</Text>
                <Text style={styles.emailDescription}>
                  Detailed weekly performance analysis
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor="#00ff88"
              />
            </View>
            <View style={styles.emailItem}>
              <View style={styles.emailInfo}>
                <Text style={styles.emailLabel}>Monthly Newsletter</Text>
                <Text style={styles.emailDescription}>
                  Platform updates and market insights
                </Text>
              </View>
              <Switch
                value={false}
                onValueChange={() => {}}
                trackColor={{ false: '#334155', true: '#00ff8860' }}
                thumbColor="#94a3b8"
              />
            </View>
          </View>
        </View>

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
  content: {
    flex: 1,
    padding: 16,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b50',
  },
  permissionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  permissionTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionDescription: {
    color: '#f59e0b',
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  quickActionText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryDescription: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    marginLeft: 8,
  },
  subcategories: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  subcategoryInfo: {
    flex: 1,
    marginLeft: 60,
  },
  subcategoryLabel: {
    color: '#f8fafc',
    fontSize: 14,
  },
  subcategoryDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  quietHoursCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quietHoursSettings: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  quietHoursNote: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  emailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emailCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  emailInfo: {
    flex: 1,
  },
  emailLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  emailDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
