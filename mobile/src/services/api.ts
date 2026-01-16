import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getSecurityHeaders } from '../utils/security';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        ...getSecurityHeaders(),
      },
    });

    logger.api(`Initialized with base URL: ${config.apiUrl}`);

    // Request interceptor to add auth token and security headers
    this.client.interceptors.request.use(
      async (requestConfig: InternalAxiosRequestConfig) => {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp for debugging
        (requestConfig as any).metadata = { startTime: Date.now() };

        return requestConfig;
      },
      (error) => {
        logger.error('Request interceptor error', { tag: 'API', data: error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response) => {
        // Log successful requests in dev mode
        const duration = Date.now() - ((response.config as any).metadata?.startTime || Date.now());
        logger.api(`${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
        return response;
      },
      async (error: AxiosError) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || Date.now());

        if (error.response?.status === 401) {
          // Token expired or invalid
          logger.warn('Authentication failed - clearing token', { tag: 'API' });
          await SecureStore.deleteItemAsync('auth_token');
          // Trigger logout/redirect to login
        } else if (error.response?.status === 403) {
          logger.warn('Access forbidden', { tag: 'API' });
        } else if (error.response?.status === 429) {
          logger.warn('Rate limited - too many requests', { tag: 'API' });
        } else if (error.response?.status && error.response.status >= 500) {
          logger.error(`Server error: ${error.response.status}`, { tag: 'API' });
        }

        logger.api(`${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'NETWORK_ERROR'} (${duration}ms)`);

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  }

  async logout() {
    await SecureStore.deleteItemAsync('auth_token');
  }

  // Portfolio endpoints
  async getPortfolio() {
    const response = await this.client.get('/portfolio');
    return response.data;
  }

  async getPositions() {
    const response = await this.client.get('/portfolio/positions');
    return response.data;
  }

  async getPortfolioHistory(timeframe: string = '24h') {
    const response = await this.client.get('/portfolio/history', {
      params: { timeframe },
    });
    return response.data;
  }

  // Trading endpoints
  async createOrder(orderData: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  }) {
    const response = await this.client.post('/trades/order', orderData);
    return response.data;
  }

  async getOrders(status?: string) {
    const response = await this.client.get('/trades/orders', {
      params: { status },
    });
    return response.data;
  }

  async cancelOrder(orderId: string) {
    const response = await this.client.delete(`/trades/orders/${orderId}`);
    return response.data;
  }

  // Bot endpoints
  async getBots() {
    const response = await this.client.get('/bots');
    return response.data;
  }

  async getBot(botId: string) {
    const response = await this.client.get(`/bots/${botId}`);
    return response.data;
  }

  async startBot(botId: string) {
    const response = await this.client.post(`/bots/${botId}/start`);
    return response.data;
  }

  async stopBot(botId: string) {
    const response = await this.client.post(`/bots/${botId}/stop`);
    return response.data;
  }

  async pauseBot(botId: string) {
    const response = await this.client.post(`/bots/${botId}/pause`);
    return response.data;
  }

  async createBot(botData: any) {
    const response = await this.client.post('/bots', botData);
    return response.data;
  }

  async updateBot(botId: string, botData: any) {
    const response = await this.client.put(`/bots/${botId}`, botData);
    return response.data;
  }

  async deleteBot(botId: string) {
    const response = await this.client.delete(`/bots/${botId}`);
    return response.data;
  }

  // Market data endpoints
  async getMarkets() {
    const response = await this.client.get('/markets');
    return response.data;
  }

  async getMarketData(symbol: string) {
    const response = await this.client.get(`/markets/${symbol}`);
    return response.data;
  }

  async getCandles(symbol: string, timeframe: string, limit: number = 100) {
    const response = await this.client.get(`/markets/${symbol}/candles`, {
      params: { timeframe, limit },
    });
    return response.data;
  }

  // Notification endpoints
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.put(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsRead() {
    const response = await this.client.put('/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.client.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  // User/Account endpoints
  async getProfile() {
    const response = await this.client.get('/user/profile');
    return response.data;
  }

  async updateProfile(profileData: any) {
    const response = await this.client.put('/user/profile', profileData);
    return response.data;
  }

  async getSettings() {
    const response = await this.client.get('/user/settings');
    return response.data;
  }

  async updateSettings(settings: any) {
    const response = await this.client.put('/user/settings', settings);
    return response.data;
  }

  // Analytics endpoints
  async getAnalytics(timeframe: string = '7d') {
    const response = await this.client.get('/analytics', {
      params: { timeframe },
    });
    return response.data;
  }

  async getTradingStats() {
    const response = await this.client.get('/analytics/trading-stats');
    return response.data;
  }

  // Generic HTTP methods for auth.ts and other services
  async get(path: string, params?: any) {
    const response = await this.client.get(path, { params });
    return response.data;
  }

  async post(path: string, data?: any) {
    const response = await this.client.post(path, data);
    return response.data;
  }

  async put(path: string, data?: any) {
    const response = await this.client.put(path, data);
    return response.data;
  }

  async patch(path: string, data?: any) {
    const response = await this.client.patch(path, data);
    return response.data;
  }

  async delete(path: string) {
    const response = await this.client.delete(path);
    return response.data;
  }
}

export default new ApiService();
