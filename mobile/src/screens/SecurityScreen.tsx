/**
 * Security Screen
 * TIME BEYOND US - Security and Authentication Settings
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
import * as LocalAuthentication from 'expo-local-authentication';
import authService from '../services/auth';
import { useSettingsStore } from '../store/settingsStore';

export default function SecurityScreen({ navigation }: any) {
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { security, updateSecurity } = useSettingsStore();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      if (compatible) {
        const type = await authService.getBiometricType();
        setBiometricType(type);
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value && !biometricAvailable) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this device. Please set up Face ID or fingerprint in your device settings.'
      );
      return;
    }

    if (value) {
      // Verify biometric before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType} for TIME BEYOND US`,
      });

      if (result.success) {
        updateSecurity({ biometricEnabled: true });
        await authService.setBiometricEnabled(true);
      }
    } else {
      updateSecurity({ biometricEnabled: false });
      await authService.setBiometricEnabled(false);
    }
  };

  const handleAutoLockChange = (minutes: number) => {
    updateSecurity({ autoLockMinutes: minutes });
  };

  const handleTradeAuthToggle = (value: boolean) => {
    updateSecurity({ requireAuthForTrades: value });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Biometric Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Biometric Authentication</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons
              name="finger-print"
              size={24}
              color={biometricAvailable ? '#00ff88' : '#64748b'}
            />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>{biometricType}</Text>
              <Text style={styles.settingDescription}>
                {biometricAvailable
                  ? `Use ${biometricType} to unlock the app`
                  : 'Not available on this device'}
              </Text>
            </View>
          </View>
          <Switch
            value={security.biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: '#334155', true: '#00ff8860' }}
            thumbColor={security.biometricEnabled ? '#00ff88' : '#94a3b8'}
            disabled={!biometricAvailable}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="lock-closed" size={24} color="#6366f1" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Require for Trades</Text>
              <Text style={styles.settingDescription}>
                Authenticate before executing trades
              </Text>
            </View>
          </View>
          <Switch
            value={security.requireAuthForTrades}
            onValueChange={handleTradeAuthToggle}
            trackColor={{ false: '#334155', true: '#00ff8860' }}
            thumbColor={security.requireAuthForTrades ? '#00ff88' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Auto-Lock Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Auto-Lock</Text>
        <Text style={styles.sectionDescription}>
          Automatically lock the app after inactivity
        </Text>

        <View style={styles.autoLockOptions}>
          {[1, 5, 15, 30, 0].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.autoLockButton,
                security.autoLockMinutes === minutes && styles.autoLockButtonActive,
              ]}
              onPress={() => handleAutoLockChange(minutes)}
            >
              <Text
                style={[
                  styles.autoLockText,
                  security.autoLockMinutes === minutes && styles.autoLockTextActive,
                ]}
              >
                {minutes === 0 ? 'Never' : `${minutes} min`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Password Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Password</Text>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="key-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>Two-Factor Authentication</Text>
          </View>
          <View style={styles.menuItemRight}>
            <View style={styles.enabledBadge}>
              <Text style={styles.enabledText}>Enabled</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Sessions Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Sessions</Text>

        <View style={styles.sessionItem}>
          <View style={styles.sessionIcon}>
            <Ionicons name="phone-portrait-outline" size={24} color="#00ff88" />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDevice}>This Device</Text>
            <Text style={styles.sessionDetails}>iPhone 15 Pro - New York, US</Text>
            <Text style={styles.sessionTime}>Active now</Text>
          </View>
          <View style={styles.currentBadge}>
            <Text style={styles.currentText}>Current</Text>
          </View>
        </View>

        <View style={styles.sessionItem}>
          <View style={styles.sessionIcon}>
            <Ionicons name="laptop-outline" size={24} color="#6366f1" />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDevice}>MacBook Pro</Text>
            <Text style={styles.sessionDetails}>Safari - New York, US</Text>
            <Text style={styles.sessionTime}>2 hours ago</Text>
          </View>
          <TouchableOpacity style={styles.revokeButton}>
            <Text style={styles.revokeText}>Revoke</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutAllButton}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutAllText}>Log Out All Other Devices</Text>
        </TouchableOpacity>
      </View>

      {/* Security Log */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Security Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityItem}>
          <Ionicons name="log-in-outline" size={20} color="#00ff88" />
          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>Successful login</Text>
            <Text style={styles.activityTime}>Today, 10:30 AM</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <Ionicons name="key-outline" size={20} color="#f59e0b" />
          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>Password changed</Text>
            <Text style={styles.activityTime}>Yesterday, 3:45 PM</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <Ionicons name="finger-print" size={20} color="#6366f1" />
          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>Biometric enabled</Text>
            <Text style={styles.activityTime}>Dec 20, 2024</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  viewAllText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionDescription: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 16,
    marginTop: -8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    color: '#f8fafc',
    fontSize: 16,
  },
  settingDescription: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  autoLockOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  autoLockButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  autoLockButtonActive: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8820',
  },
  autoLockText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  autoLockTextActive: {
    color: '#00ff88',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: '#f8fafc',
    fontSize: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enabledBadge: {
    backgroundColor: '#00ff8820',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  enabledText: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDetails: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  sessionTime: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: '#00ff8820',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentText: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: '600',
  },
  revokeButton: {
    backgroundColor: '#ef444420',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  revokeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutAllText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  activityTime: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
});
