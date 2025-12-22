/**
 * WebAuthn (Passkey) Service for TIME
 *
 * Implements FIDO2/WebAuthn for passwordless authentication
 * Supports:
 * - Passkey registration (platform authenticators like Face ID, Touch ID, Windows Hello)
 * - Hardware security keys (YubiKey, etc.)
 * - Cross-platform authentication
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '../utils/logger';
import { sessionStore } from '../utils/session_store';

const logger = createComponentLogger('WebAuthnService');

// WebAuthn Configuration
const RP_NAME = 'TIME Trading';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'timebeyondus.com';
const RP_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://timebeyondus.com';

// Credential storage interface
export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  publicKey: string; // Base64 encoded
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports?: string[];
  createdAt: Date;
  lastUsedAt: Date;
  friendlyName: string;
}

export class WebAuthnService {
  private rpName = RP_NAME;
  private rpID = RP_ID;
  private origin = RP_ORIGIN;

  constructor() {
    logger.info('WebAuthn Service initialized', {
      rpName: this.rpName,
      rpID: this.rpID,
      origin: this.origin,
    });
  }

  /**
   * Generate registration options for a new passkey
   */
  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
    userName: string,
    existingCredentials: WebAuthnCredential[] = []
  ): Promise<any> {
    const sessionId = uuidv4();

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(userId),
      userName: userEmail,
      userDisplayName: userName,
      attestationType: 'none', // Don't require attestation for better compatibility
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialId,
        transports: cred.transports as any,
      })),
      authenticatorSelection: {
        // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
        // but also allow cross-platform (security keys)
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: undefined, // Allow both platform and cross-platform
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });

    // Store challenge for verification (Redis-backed with in-memory fallback)
    await sessionStore.setWebAuthnChallenge(sessionId, {
      challenge: options.challenge,
      userId,
    });

    logger.info('Generated WebAuthn registration options', { userId, sessionId });

    return {
      ...options,
      // Include sessionId for client to send back
      sessionId,
    };
  }

  /**
   * Verify registration response and create credential
   */
  async verifyRegistration(
    sessionId: string,
    response: any,
    friendlyName: string = 'Passkey'
  ): Promise<{ success: boolean; credential?: WebAuthnCredential; error?: string }> {
    // Get challenge from Redis-backed store (auto-deleted after retrieval)
    const pending = await sessionStore.getWebAuthnChallenge(sessionId);

    if (!pending) {
      return { success: false, error: 'Registration session expired or not found' };
    }

    try {
      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: false, // More compatible
      });

      if (!verification.verified || !verification.registrationInfo) {
        return { success: false, error: 'Verification failed' };
      }

      const regInfo = verification.registrationInfo;
      const credentialData = regInfo.credential;

      const credential: WebAuthnCredential = {
        id: uuidv4(),
        credentialId: credentialData.id,
        publicKey: Buffer.from(credentialData.publicKey).toString('base64'),
        counter: credentialData.counter,
        deviceType: regInfo.credentialDeviceType,
        backedUp: regInfo.credentialBackedUp,
        transports: response.response?.transports,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        friendlyName,
      };

      // Challenge already deleted by getWebAuthnChallenge

      logger.info('WebAuthn registration verified', {
        userId: pending.userId,
        credentialId: credential.id,
        deviceType: regInfo.credentialDeviceType,
      });

      return { success: true, credential };
    } catch (error: any) {
      logger.error('WebAuthn registration verification failed', { error: error.message });
      return { success: false, error: error.message || 'Verification failed' };
    }
  }

  /**
   * Generate authentication options for login
   */
  async generateAuthenticationOptions(
    credentials: WebAuthnCredential[] = [],
    userId?: string
  ): Promise<any> {
    const sessionId = uuidv4();

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentials.length > 0 ? credentials.map(cred => ({
        id: cred.credentialId,
        transports: cred.transports as any,
      })) : undefined,
      userVerification: 'preferred',
    });

    // Store challenge for verification (Redis-backed with in-memory fallback)
    await sessionStore.setWebAuthnChallenge(sessionId, {
      challenge: options.challenge,
      userId,
    });

    logger.info('Generated WebAuthn authentication options', { sessionId, credentialCount: credentials.length });

    return {
      ...options,
      sessionId,
    };
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(
    sessionId: string,
    response: any,
    credential: WebAuthnCredential
  ): Promise<{ success: boolean; newCounter?: number; error?: string }> {
    // Get challenge from Redis-backed store (auto-deleted after retrieval)
    const pending = await sessionStore.getWebAuthnChallenge(sessionId);

    if (!pending) {
      return { success: false, error: 'Authentication session expired or not found' };
    }

    try {
      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: credential.counter,
          transports: credential.transports as any,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        return { success: false, error: 'Authentication failed' };
      }

      // Challenge already deleted by getWebAuthnChallenge

      logger.info('WebAuthn authentication verified', {
        credentialId: credential.id,
        newCounter: verification.authenticationInfo.newCounter,
      });

      return {
        success: true,
        newCounter: verification.authenticationInfo.newCounter,
      };
    } catch (error: any) {
      logger.error('WebAuthn authentication verification failed', { error: error.message });
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }

  /**
   * Get credential by ID from a list
   */
  findCredentialById(credentials: WebAuthnCredential[], credentialId: string): WebAuthnCredential | undefined {
    return credentials.find(c => c.credentialId === credentialId);
  }
}

// Singleton instance
export const webAuthnService = new WebAuthnService();
