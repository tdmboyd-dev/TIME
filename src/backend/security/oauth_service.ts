/**
 * OAuth Service for TIME
 *
 * Implements OAuth 2.0 authentication for:
 * - Google Sign-In
 * - GitHub Login
 * - Apple Sign-In (future)
 *
 * Features:
 * - Account linking (link OAuth to existing account)
 * - Auto-registration (create account from OAuth)
 * - Multiple providers per account
 */

import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('OAuthService');

// OAuth Provider Configuration
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['email', 'profile'],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    scopes: ['read:user', 'user:email'],
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKey: process.env.APPLE_PRIVATE_KEY || '',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: ['email', 'name'],
  },
};

const CALLBACK_BASE_URL = process.env.OAUTH_CALLBACK_URL || 'https://time-backend-hosting.fly.dev/api/v1/auth/oauth';

// OAuth Provider Link interface
export interface OAuthProvider {
  provider: 'google' | 'github' | 'apple';
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;
  linkedAt: Date;
  lastUsedAt: Date;
  accessToken?: string; // Encrypted in production
  refreshToken?: string; // Encrypted in production
}

// State storage for CSRF protection (use Redis in production)
const pendingOAuthStates = new Map<string, {
  provider: string;
  returnUrl?: string;
  linkToUserId?: string; // If linking to existing account
  expiresAt: Date;
}>();

// Clean up expired states
setInterval(() => {
  const now = new Date();
  for (const [key, value] of pendingOAuthStates.entries()) {
    if (value.expiresAt < now) {
      pendingOAuthStates.delete(key);
    }
  }
}, 60000);

export class OAuthService {
  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(
    provider: 'google' | 'github' | 'apple',
    options: {
      returnUrl?: string;
      linkToUserId?: string; // If user wants to link OAuth to existing account
    } = {}
  ): { url: string; state: string } {
    const config = OAUTH_CONFIG[provider];
    if (!config.clientId) {
      throw new Error(`OAuth ${provider} not configured`);
    }

    const state = uuidv4();
    const callbackUrl = `${CALLBACK_BASE_URL}/${provider}/callback`;

    // Store state for CSRF protection
    pendingOAuthStates.set(state, {
      provider,
      returnUrl: options.returnUrl,
      linkToUserId: options.linkToUserId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    // Provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline'); // Get refresh token
      params.append('prompt', 'consent'); // Always show consent screen
    }

    const url = `${config.authUrl}?${params.toString()}`;

    logger.info('Generated OAuth authorization URL', { provider, state });

    return { url, state };
  }

  /**
   * Validate OAuth state (CSRF protection)
   */
  validateState(state: string): {
    valid: boolean;
    provider?: string;
    returnUrl?: string;
    linkToUserId?: string;
    error?: string;
  } {
    const pending = pendingOAuthStates.get(state);

    if (!pending) {
      return { valid: false, error: 'Invalid or expired state' };
    }

    if (pending.expiresAt < new Date()) {
      pendingOAuthStates.delete(state);
      return { valid: false, error: 'State expired' };
    }

    // Clean up state (one-time use)
    pendingOAuthStates.delete(state);

    return {
      valid: true,
      provider: pending.provider,
      returnUrl: pending.returnUrl,
      linkToUserId: pending.linkToUserId,
    };
  }

  /**
   * Exchange authorization code for tokens and get user info
   */
  async handleCallback(
    provider: 'google' | 'github',
    code: string
  ): Promise<{
    success: boolean;
    userInfo?: {
      providerId: string;
      email: string;
      name?: string;
      avatar?: string;
      accessToken: string;
      refreshToken?: string;
    };
    error?: string;
  }> {
    const config = OAUTH_CONFIG[provider];

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${CALLBACK_BASE_URL}/${provider}/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        logger.error('OAuth token exchange failed', { provider, error });
        return { success: false, error: 'Failed to exchange authorization code' };
      }

      const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string };
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;

      // Get user info
      let userInfo;
      if (provider === 'google') {
        userInfo = await this.getGoogleUserInfo(accessToken);
      } else if (provider === 'github') {
        userInfo = await this.getGitHubUserInfo(accessToken);
      }

      if (!userInfo) {
        return { success: false, error: 'Failed to get user information' };
      }

      logger.info('OAuth callback successful', { provider, email: userInfo.email });

      return {
        success: true,
        userInfo: {
          ...userInfo,
          accessToken,
          refreshToken,
        },
      };
    } catch (error: any) {
      logger.error('OAuth callback error', { provider, error: error.message });
      return { success: false, error: error.message || 'OAuth callback failed' };
    }
  }

  /**
   * Get Google user info
   */
  private async getGoogleUserInfo(accessToken: string): Promise<{
    providerId: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null> {
    try {
      const response = await fetch(OAUTH_CONFIG.google.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { id: string; email: string; name?: string; picture?: string };

      return {
        providerId: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture,
      };
    } catch (error) {
      logger.error('Failed to get Google user info', { error });
      return null;
    }
  }

  /**
   * Get GitHub user info
   */
  private async getGitHubUserInfo(accessToken: string): Promise<{
    providerId: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null> {
    try {
      // Get user profile
      const userResponse = await fetch(OAUTH_CONFIG.github.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!userResponse.ok) {
        return null;
      }

      const userData = await userResponse.json() as { id: number; email?: string; name?: string; login: string; avatar_url?: string };

      // Get user emails (GitHub may not return email in profile)
      let email = userData.email;
      if (!email) {
        const emailResponse = await fetch(OAUTH_CONFIG.github.emailUrl!, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
          const primaryEmail = emails.find((e) => e.primary && e.verified);
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        }
      }

      if (!email) {
        logger.warn('GitHub user has no verified email');
        return null;
      }

      return {
        providerId: userData.id.toString(),
        email,
        name: userData.name || userData.login,
        avatar: userData.avatar_url,
      };
    } catch (error) {
      logger.error('Failed to get GitHub user info', { error });
      return null;
    }
  }

  /**
   * Create OAuth provider link object
   */
  createProviderLink(
    provider: 'google' | 'github' | 'apple',
    userInfo: {
      providerId: string;
      email: string;
      name?: string;
      avatar?: string;
      accessToken: string;
      refreshToken?: string;
    }
  ): OAuthProvider {
    return {
      provider,
      providerId: userInfo.providerId,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.avatar,
      linkedAt: new Date(),
      lastUsedAt: new Date(),
      // In production, encrypt these tokens
      accessToken: userInfo.accessToken,
      refreshToken: userInfo.refreshToken,
    };
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: 'google' | 'github' | 'apple'): boolean {
    const config = OAUTH_CONFIG[provider];
    if (provider === 'apple') {
      return !!(config.clientId && (config as any).teamId);
    }
    return !!(config.clientId && (config as any).clientSecret);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): Array<{ provider: string; configured: boolean }> {
    return [
      { provider: 'google', configured: this.isProviderConfigured('google') },
      { provider: 'github', configured: this.isProviderConfigured('github') },
      { provider: 'apple', configured: this.isProviderConfigured('apple') },
    ];
  }
}

// Singleton instance
export const oAuthService = new OAuthService();
