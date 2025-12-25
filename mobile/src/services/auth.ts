import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import apiService from './api';

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
      console.error('Logout API call failed:', error);
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
      console.error('Biometric authentication error:', error);
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
    // Implement password reset API call
    // await apiService.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Implement password reset API call
    // await apiService.resetPassword(token, newPassword);
  }
}

export default new AuthService();
