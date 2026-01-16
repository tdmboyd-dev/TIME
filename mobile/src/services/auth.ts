import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import apiService from './api';
import { logger } from '../utils/logger';

class AuthService {
  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'user_data';
  private BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

  // Token management
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(this.TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(this.TOKEN_KEY);
  }

  // User data management
  async setUser(userData: any): Promise<void> {
    await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(userData));
  }

  async getUser(): Promise<any | null> {
    const userData = await SecureStore.getItemAsync(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  async removeUser(): Promise<void> {
    await SecureStore.deleteItemAsync(this.USER_KEY);
  }

  // Authentication methods
  async login(email: string, password: string): Promise<any> {
    try {
      const response = await apiService.login(email, password);

      if (response.token) {
        await this.setToken(response.token);
      }

      if (response.user) {
        await this.setUser(response.user);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string, name: string): Promise<any> {
    try {
      const response = await apiService.register(email, password, name);

      if (response.token) {
        await this.setToken(response.token);
      }

      if (response.user) {
        await this.setUser(response.user);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } catch (error) {
      logger.error('Logout API call failed', { tag: 'Auth', data: error });
    } finally {
      await this.removeToken();
      await this.removeUser();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Biometric authentication
  async isBiometricSupported(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  }

  async isBiometricEnrolled(): Promise<boolean> {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(
      this.BIOMETRIC_ENABLED_KEY,
      enabled.toString()
    );
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(this.BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access TIME BEYOND US',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      logger.error('Biometric authentication error', { tag: 'Auth', data: error });
      return false;
    }
  }

  async getBiometricType(): Promise<string> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }

    return 'Biometric';
  }

  // Session validation
  async validateSession(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // Try to fetch user profile to validate token
      await apiService.getProfile();
      return true;
    } catch (error) {
      // Token is invalid
      await this.logout();
      return false;
    }
  }

  // Password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiService.post('/auth/forgot-password', { email });
    } catch (error) {
      throw error;
    }
  }

  async verifyResetCode(email: string, code: string): Promise<boolean> {
    try {
      const response = await apiService.post('/auth/verify-reset-code', { email, code });
      return response.valid === true;
    } catch (error) {
      return false;
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await apiService.post('/auth/reset-password', { email, code, newPassword });
    } catch (error) {
      throw error;
    }
  }

  // MFA Methods
  async getMFAStatus(): Promise<{ enabled: boolean; method?: string }> {
    try {
      const response = await apiService.get('/auth/mfa/status');
      return response;
    } catch (error) {
      return { enabled: false };
    }
  }

  async setupMFA(method: 'authenticator' | 'sms' | 'email'): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      const response = await apiService.post('/auth/mfa/setup', { method });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async verifyMFA(code: string): Promise<{ success: boolean; backupCodes?: Array<{ code: string; used: boolean }> }> {
    try {
      const response = await apiService.post('/auth/mfa/verify', { code });
      return response;
    } catch (error) {
      return { success: false };
    }
  }

  async disableMFA(): Promise<void> {
    try {
      await apiService.post('/auth/mfa/disable');
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
