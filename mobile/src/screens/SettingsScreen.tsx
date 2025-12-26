/**
 * Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type: 'toggle' | 'link' | 'action';
  value?: boolean;
  onPress?: () => void;
}

export default function SettingsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [paperTrading, setPaperTrading] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('auth_token');
          navigation.replace('Login');
        },
      },
    ]);
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Profile', type: 'link', onPress: () => navigation.navigate('Profile') },
        { icon: 'card-outline', label: 'Subscription', type: 'link' },
        { icon: 'wallet-outline', label: 'Connected Brokers', type: 'link' },
      ],
    },
    {
      title: 'Trading',
      items: [
        {
          icon: 'flask-outline',
          label: 'Paper Trading Mode',
          type: 'toggle',
          value: paperTrading,
          onPress: () => setPaperTrading(!paperTrading),
        },
        { icon: 'shield-outline', label: 'Risk Settings', type: 'link' },
        { icon: 'analytics-outline', label: 'Trading Preferences', type: 'link' },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: 'finger-print',
          label: 'Biometric Login',
          type: 'toggle',
          value: biometrics,
          onPress: () => setBiometrics(!biometrics),
        },
        { icon: 'key-outline', label: 'Change Password', type: 'link' },
        { icon: 'shield-checkmark-outline', label: '2FA Settings', type: 'link', onPress: () => navigation.navigate('MFA') },
        { icon: 'lock-closed-outline', label: 'Security Settings', type: 'link', onPress: () => navigation.navigate('Security') },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          type: 'toggle',
          value: notifications,
          onPress: () => setNotifications(!notifications),
        },
        { icon: 'options-outline', label: 'Notification Preferences', type: 'link', onPress: () => navigation.navigate('NotificationPreferences') },
        { icon: 'pricetag-outline', label: 'Price Alerts', type: 'link', onPress: () => navigation.navigate('PriceAlerts') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', type: 'link' },
        { icon: 'chatbubble-outline', label: 'Contact Support', type: 'link' },
        { icon: 'document-text-outline', label: 'Terms of Service', type: 'link' },
        { icon: 'lock-closed-outline', label: 'Privacy Policy', type: 'link' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {sections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.item,
                  itemIndex < section.items.length - 1 && styles.itemBorder,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.itemLeft}>
                  <Ionicons name={item.icon} size={22} color="#6366f1" />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </View>
                {item.type === 'toggle' ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onPress}
                    trackColor={{ false: '#334155', true: '#6366f150' }}
                    thumbColor={item.value ? '#6366f1' : '#64748b'}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.version}>TIME Trading v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemLabel: {
    color: '#f8fafc',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
  },
});
