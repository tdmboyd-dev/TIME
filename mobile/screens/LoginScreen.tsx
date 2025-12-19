/**
 * Login Screen with Biometric Support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const API_URL = 'https://time-backend-hosting.fly.dev/api/v1';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  async function checkBiometricSupport() {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        await SecureStore.setItemAsync('auth_token', data.token);
        await SecureStore.setItemAsync('user_email', email);
        navigation.replace('Main');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    const savedEmail = await SecureStore.getItemAsync('user_email');
    const savedToken = await SecureStore.getItemAsync('auth_token');

    if (!savedEmail || !savedToken) {
      Alert.alert('Setup Required', 'Please log in with email first to enable biometric login');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access TIME Trading',
      fallbackLabel: 'Use Password',
    });

    if (result.success) {
      navigation.replace('Main');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>T</Text>
        </View>
        <Text style={styles.title}>TIME Trading</Text>
        <Text style={styles.subtitle}>Meta-Intelligence Platform</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Logging in...' : 'Log In'}
          </Text>
        </TouchableOpacity>

        {biometricAvailable && (
          <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
            <Ionicons name="finger-print" size={32} color="#6366f1" />
            <Text style={styles.biometricText}>Use Biometrics</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity>
          <Text style={styles.footerLink}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.footerLink}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
  },
  biometricText: {
    color: '#6366f1',
    fontSize: 14,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLink: {
    color: '#6366f1',
    fontSize: 14,
  },
});
