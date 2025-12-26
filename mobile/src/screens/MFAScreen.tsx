/**
 * MFA (Multi-Factor Authentication) Screen
 * TIME BEYOND US - Two-Factor Authentication Setup & Verification
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Clipboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import authService from '../services/auth';

type MFAStep = 'choose' | 'setup-app' | 'verify' | 'backup-codes' | 'manage';

interface BackupCode {
  code: string;
  used: boolean;
}

export default function MFAScreen({ navigation, route }: any) {
  const { mode = 'setup' } = route.params || {};

  const [step, setStep] = useState<MFAStep>(mode === 'verify' ? 'verify' : 'choose');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [error, setError] = useState('');

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const status = await authService.getMFAStatus();
      setMfaEnabled(status.enabled);
      if (status.enabled && mode !== 'verify') {
        setStep('manage');
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAuthenticator = async () => {
    setLoading(true);
    setError('');

    try {
      const setup = await authService.setupMFA('authenticator');
      setSecretKey(setup.secret);
      setQrCodeUrl(setup.qrCodeUrl);
      setStep('setup-app');
    } catch (err: any) {
      setError(err.message || 'Failed to set up authenticator');
      Alert.alert('Error', err.message || 'Failed to set up authenticator');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newDigits = [...codeDigits];
    newDigits[index] = text.replace(/[^0-9]/g, '');
    setCodeDigits(newDigits);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      setVerificationCode(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = codeDigits.join('');
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const result = await authService.verifyMFA(code);
      if (result.success) {
        if (step === 'setup-app') {
          // Setup complete, show backup codes
          setBackupCodes(result.backupCodes || []);
          setStep('backup-codes');
        } else {
          // Verification successful
          Alert.alert('Success', 'Two-factor authentication verified');
          navigation.goBack();
        }
      } else {
        setError('Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    Alert.alert(
      'Disable 2FA',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await authService.disableMFA();
              setMfaEnabled(false);
              setStep('choose');
              Alert.alert('Success', 'Two-factor authentication has been disabled');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to disable 2FA');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCopySecret = () => {
    Clipboard.setString(secretKey);
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };

  const handleCopyBackupCodes = () => {
    const codes = backupCodes.map((c) => c.code).join('\n');
    Clipboard.setString(codes);
    Alert.alert('Copied', 'Backup codes copied to clipboard');
  };

  const handleOpenAuthenticator = () => {
    const otpUrl = `otpauth://totp/TIME%20BEYOND%20US?secret=${secretKey}&issuer=TIME`;
    Linking.openURL(otpUrl).catch(() => {
      Alert.alert(
        'No Authenticator App',
        'Please install an authenticator app like Google Authenticator or Authy.'
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  const renderChooseStep = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={48} color="#00ff88" />
      </View>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>
        Add an extra layer of security to your account by requiring a verification code in addition to your password.
      </Text>

      <View style={styles.methodsContainer}>
        <TouchableOpacity
          style={styles.methodCard}
          onPress={handleSetupAuthenticator}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="phone-portrait-outline" size={28} color="#6366f1" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Authenticator App</Text>
            <Text style={styles.methodDescription}>
              Use an app like Google Authenticator or Authy to generate codes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748b" />
        </TouchableOpacity>

        <View style={[styles.methodCard, styles.methodCardDisabled]}>
          <View style={styles.methodIcon}>
            <Ionicons name="mail-outline" size={28} color="#64748b" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodTitle, styles.methodTitleDisabled]}>Email Verification</Text>
            <Text style={styles.methodDescription}>
              Receive codes via email (coming soon)
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <View style={[styles.methodCard, styles.methodCardDisabled]}>
          <View style={styles.methodIcon}>
            <Ionicons name="chatbubble-outline" size={28} color="#64748b" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodTitle, styles.methodTitleDisabled]}>SMS Verification</Text>
            <Text style={styles.methodDescription}>
              Receive codes via SMS (coming soon)
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSetupAppStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.iconContainer}>
        <Ionicons name="qr-code-outline" size={48} color="#00ff88" />
      </View>
      <Text style={styles.title}>Set Up Authenticator</Text>
      <Text style={styles.subtitle}>
        Scan the QR code below with your authenticator app, or enter the secret key manually.
      </Text>

      {/* QR Code Placeholder */}
      <View style={styles.qrContainer}>
        <View style={styles.qrPlaceholder}>
          <Ionicons name="qr-code" size={120} color="#f8fafc" />
        </View>
        <Text style={styles.qrHint}>Scan with authenticator app</Text>
      </View>

      {/* Secret Key */}
      <View style={styles.secretContainer}>
        <Text style={styles.secretLabel}>Or enter this key manually:</Text>
        <TouchableOpacity style={styles.secretBox} onPress={handleCopySecret}>
          <Text style={styles.secretKey}>{secretKey || 'XXXX-XXXX-XXXX-XXXX'}</Text>
          <Ionicons name="copy-outline" size={20} color="#00ff88" />
        </TouchableOpacity>
      </View>

      {/* Open Authenticator Button */}
      <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenAuthenticator}>
        <Ionicons name="open-outline" size={20} color="#00ff88" />
        <Text style={styles.secondaryButtonText}>Open Authenticator App</Text>
      </TouchableOpacity>

      {/* Verification Input */}
      <View style={styles.verifySection}>
        <Text style={styles.verifyLabel}>Enter the 6-digit code from your app:</Text>
        <View style={styles.codeInputContainer}>
          {codeDigits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, verifying && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify & Enable 2FA</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBackupCodesStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#00ff88" />
      </View>
      <Text style={styles.title}>2FA Enabled!</Text>
      <Text style={styles.subtitle}>
        Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
      </Text>

      <View style={styles.backupCodesContainer}>
        <View style={styles.backupCodesHeader}>
          <Text style={styles.backupCodesTitle}>Backup Codes</Text>
          <TouchableOpacity onPress={handleCopyBackupCodes}>
            <Ionicons name="copy-outline" size={20} color="#00ff88" />
          </TouchableOpacity>
        </View>
        <View style={styles.backupCodesGrid}>
          {backupCodes.map((code, index) => (
            <View key={index} style={styles.backupCodeItem}>
              <Text style={styles.backupCode}>{code.code}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.backupCodesHint}>
          Each code can only be used once
        </Text>
      </View>

      <View style={styles.warningContainer}>
        <Ionicons name="warning-outline" size={24} color="#f59e0b" />
        <Text style={styles.warningText}>
          Store these codes securely. Without them, you may lose access to your account if you lose your authenticator device.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.primaryButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderManageStep = () => (
    <View style={styles.content}>
      <View style={styles.enabledBadge}>
        <Ionicons name="shield-checkmark" size={24} color="#00ff88" />
        <Text style={styles.enabledText}>Two-Factor Authentication is Enabled</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait-outline" size={24} color="#6366f1" />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>Authenticator App</Text>
            <Text style={styles.cardSubtitle}>Primary verification method</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemLeft}>
          <Ionicons name="key-outline" size={22} color="#6366f1" />
          <Text style={styles.menuItemText}>View Backup Codes</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemLeft}>
          <Ionicons name="refresh-outline" size={22} color="#6366f1" />
          <Text style={styles.menuItemText}>Regenerate Backup Codes</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dangerButton}
        onPress={handleDisableMFA}
      >
        <Ionicons name="shield-outline" size={20} color="#ef4444" />
        <Text style={styles.dangerButtonText}>Disable Two-Factor Authentication</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad-outline" size={48} color="#00ff88" />
      </View>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code from your authenticator app to continue.
      </Text>

      <View style={styles.codeInputContainer}>
        {codeDigits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, verifying && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backupCodeLink}>
        <Text style={styles.backupCodeLinkText}>Use a backup code instead</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>Security</Text>
        <View style={styles.headerRight} />
      </View>

      {step === 'choose' && renderChooseStep()}
      {step === 'setup-app' && renderSetupAppStep()}
      {step === 'backup-codes' && renderBackupCodesStep()}
      {step === 'manage' && renderManageStep()}
      {step === 'verify' && renderVerifyStep()}
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  scrollContent: {
    flex: 1,
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00ff8820',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  methodsContainer: {
    gap: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodTitleDisabled: {
    color: '#94a3b8',
  },
  methodDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  comingSoonBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrHint: {
    color: '#64748b',
    fontSize: 14,
  },
  secretContainer: {
    marginBottom: 24,
  },
  secretLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secretKey: {
    color: '#f8fafc',
    fontSize: 16,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ff88',
    marginBottom: 32,
  },
  secondaryButtonText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: '600',
  },
  verifySection: {
    marginBottom: 16,
  },
  verifyLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: '#00ff88',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#00ff88',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '700',
  },
  backupCodesContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backupCodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backupCodesTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  backupCodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  backupCodeItem: {
    width: '48%',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backupCode: {
    color: '#f8fafc',
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  backupCodesHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 14,
    lineHeight: 20,
  },
  enabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00ff8820',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  enabledText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#00ff8820',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: '600',
  },
  menuItem: {
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: '#f8fafc',
    fontSize: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef444420',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  backupCodeLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  backupCodeLinkText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
});
