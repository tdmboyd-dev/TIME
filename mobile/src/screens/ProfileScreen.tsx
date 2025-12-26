/**
 * Profile Screen
 * TIME BEYOND US - User Profile Management
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    // Update user data
    if (user) {
      setUser({ ...user, name: name.trim() });
    }
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color="#f8fafc" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
        <View style={styles.memberBadge}>
          <Ionicons name="star" size={14} color="#f59e0b" />
          <Text style={styles.memberText}>Premium Member</Text>
        </View>
      </View>

      {/* Profile Form */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={20} color="#00ff88" />
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#64748b"
            />
          ) : (
            <Text style={styles.value}>{user?.name || '-'}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={[styles.value, styles.emailValue]}>{user?.email || '-'}</Text>
          <Text style={styles.hint}>Contact support to change email</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : 'January 2024'}
          </Text>
        </View>
      </View>

      {/* Account Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="swap-horizontal" size={24} color="#6366f1" />
            <Text style={styles.statValue}>1,250</Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="hardware-chip" size={24} color="#00ff88" />
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Active Bots</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>365</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Security')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>Security Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="card-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>Subscription</Text>
          </View>
          <View style={styles.menuItemRight}>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>Premium</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="wallet-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>Connected Brokers</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.menuItemBadge}>2</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="key-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>API Keys</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="download-outline" size={22} color="#6366f1" />
            <Text style={styles.menuItemText}>Export Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#020617',
    fontSize: 40,
    fontWeight: 'bold',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#020617',
  },
  userName: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  memberText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {},
  cancelText: {
    color: '#64748b',
    fontSize: 14,
  },
  saveButton: {},
  saveText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },
  value: {
    color: '#f8fafc',
    fontSize: 16,
  },
  emailValue: {
    color: '#94a3b8',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
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
  menuItemBadge: {
    color: '#94a3b8',
    fontSize: 14,
  },
  premiumBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerCard: {
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#ef444450',
  },
  dangerTitle: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
