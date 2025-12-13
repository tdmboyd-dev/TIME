/**
 * TIME Security API Routes
 *
 * Endpoints for MFA, API keys, and audit logging.
 */

import { Router, Request, Response } from 'express';
import { mfaService } from '../security/mfa_service';
import { apiKeyManager, PERMISSION_PRESETS, PERMISSION_DESCRIPTIONS } from '../security/api_key_manager';
import { auditLogger, AUDIT_ACTIONS } from '../security/audit_logger';
import { logger } from '../utils/logger';

const router = Router();

// ===================================
// MFA ENDPOINTS
// ===================================

/**
 * POST /api/v1/security/mfa/setup
 * Generate MFA setup (secret + QR code)
 */
router.post('/mfa/setup', async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' });
    }

    const setup = await mfaService.setupMFA(userId, email);

    // Audit log
    await auditLogger.logAction(AUDIT_ACTIONS.MFA_ENABLED, {
      userId,
      clientIP: req.ip || 'unknown',
      resource: 'mfa',
      result: 'success',
      metadata: { email },
    });

    res.json({
      success: true,
      data: {
        secret: setup.base32,
        otpauthUrl: setup.otpauthUrl,
        qrCodeDataUrl: setup.qrCodeDataUrl,
        message: 'Scan QR code with Google Authenticator or Authy',
      },
    });
  } catch (error) {
    logger.error('MFA setup failed', { error });
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

/**
 * POST /api/v1/security/mfa/enable
 * Verify token and enable MFA
 */
router.post('/mfa/enable', async (req: Request, res: Response) => {
  try {
    const { userId, secret, token } = req.body;

    if (!userId || !secret || !token) {
      return res.status(400).json({ error: 'userId, secret, and token are required' });
    }

    const result = await mfaService.enableMFA(userId, secret, token);

    if (!result.success) {
      await auditLogger.logAction(AUDIT_ACTIONS.MFA_FAILED, {
        userId,
        clientIP: req.ip || 'unknown',
        resource: 'mfa',
        result: 'failure',
        errorMessage: 'Invalid token',
      });

      return res.status(400).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      data: {
        recoveryCodes: result.recoveryCodes,
        message: 'MFA enabled. Save your recovery codes in a safe place!',
      },
    });
  } catch (error) {
    logger.error('MFA enable failed', { error });
    res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

/**
 * POST /api/v1/security/mfa/verify
 * Verify MFA token during login
 */
router.post('/mfa/verify', async (req: Request, res: Response) => {
  try {
    const { secret, token } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ error: 'secret and token are required' });
    }

    const isValid = mfaService.verifyMFA(secret, token);

    res.json({
      success: true,
      data: { valid: isValid },
    });
  } catch (error) {
    logger.error('MFA verify failed', { error });
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

/**
 * POST /api/v1/security/mfa/recovery
 * Use recovery code
 */
router.post('/mfa/recovery', async (req: Request, res: Response) => {
  try {
    const { userId, codes, inputCode } = req.body;

    if (!codes || !inputCode) {
      return res.status(400).json({ error: 'codes and inputCode are required' });
    }

    const result = mfaService.useRecoveryCode(codes, inputCode);

    if (result.valid) {
      await auditLogger.logAction(AUDIT_ACTIONS.MFA_ENABLED, {
        userId,
        clientIP: req.ip || 'unknown',
        resource: 'mfa_recovery',
        result: 'success',
        metadata: { recoveryCodeUsed: true },
      });
    }

    res.json({
      success: true,
      data: {
        valid: result.valid,
        updatedCodes: result.updatedCodes,
        codesRemaining: result.updatedCodes.filter((c) => !c.used).length,
      },
    });
  } catch (error) {
    logger.error('MFA recovery failed', { error });
    res.status(500).json({ error: 'Failed to verify recovery code' });
  }
});

// ===================================
// API KEY ENDPOINTS
// ===================================

/**
 * GET /api/v1/security/api-keys
 * List all API keys for user
 */
router.get('/api-keys', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const keys = apiKeyManager.listKeys(userId);

    res.json({
      success: true,
      data: { keys, count: keys.length },
    });
  } catch (error) {
    logger.error('List API keys failed', { error });
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * POST /api/v1/security/api-keys
 * Create new API key
 */
router.post('/api-keys', async (req: Request, res: Response) => {
  try {
    const { userId, name, permissions, ipWhitelist, expiryDays, description, environment } = req.body;

    if (!userId || !name || !permissions) {
      return res.status(400).json({ error: 'userId, name, and permissions are required' });
    }

    const result = await apiKeyManager.createKey(userId, {
      name,
      permissions,
      ipWhitelist,
      expiryDays,
      description,
      environment,
    });

    await auditLogger.logAction(AUDIT_ACTIONS.API_KEY_CREATED, {
      userId,
      clientIP: req.ip || 'unknown',
      resource: 'api_key',
      resourceId: result.key.id,
      result: 'success',
      metadata: { keyName: name, permissions },
    });

    res.json({
      success: true,
      data: {
        key: result.key,
        apiKey: result.apiKey,
        apiSecret: result.apiSecret,
        message: 'Save your API key and secret! They will not be shown again.',
      },
    });
  } catch (error) {
    logger.error('Create API key failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create API key' });
  }
});

/**
 * POST /api/v1/security/api-keys/validate
 * Validate API key
 */
router.post('/api-keys/validate', async (req: Request, res: Response) => {
  try {
    const { apiKey, apiSecret } = req.body;
    const clientIP = req.ip || 'unknown';

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'apiKey and apiSecret are required' });
    }

    const result = await apiKeyManager.validateKey(apiKey, apiSecret, clientIP);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Validate API key failed', { error });
    res.status(500).json({ error: 'Failed to validate API key' });
  }
});

/**
 * POST /api/v1/security/api-keys/:keyId/rotate
 * Rotate API key secret
 */
router.post('/api-keys/:keyId/rotate', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await apiKeyManager.rotateKey(keyId, userId);

    await auditLogger.logAction(AUDIT_ACTIONS.API_KEY_ROTATED, {
      userId,
      clientIP: req.ip || 'unknown',
      resource: 'api_key',
      resourceId: keyId,
      result: 'success',
    });

    res.json({
      success: true,
      data: {
        newSecret: result.newSecret,
        message: 'API key rotated. Update your applications with the new secret.',
      },
    });
  } catch (error) {
    logger.error('Rotate API key failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to rotate API key' });
  }
});

/**
 * DELETE /api/v1/security/api-keys/:keyId
 * Revoke API key
 */
router.delete('/api-keys/:keyId', async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    apiKeyManager.revokeKey(keyId, userId);

    await auditLogger.logAction(AUDIT_ACTIONS.API_KEY_REVOKED, {
      userId,
      clientIP: req.ip || 'unknown',
      resource: 'api_key',
      resourceId: keyId,
      result: 'success',
    });

    res.json({
      success: true,
      message: 'API key revoked',
    });
  } catch (error) {
    logger.error('Revoke API key failed', { error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to revoke API key' });
  }
});

/**
 * GET /api/v1/security/api-keys/permissions
 * Get available permissions
 */
router.get('/api-keys/permissions', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      permissions: PERMISSION_DESCRIPTIONS,
      presets: PERMISSION_PRESETS,
    },
  });
});

// ===================================
// AUDIT LOG ENDPOINTS
// ===================================

/**
 * GET /api/v1/security/audit
 * Search audit logs
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      category,
      action,
      severity,
      result,
      startTime,
      endTime,
      limit,
      offset,
    } = req.query;

    const filters = {
      userId: userId as string,
      category: category as any,
      action: action as string,
      severity: severity as any,
      result: result as any,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    };

    const results = auditLogger.search(filters);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Search audit logs failed', { error });
    res.status(500).json({ error: 'Failed to search audit logs' });
  }
});

/**
 * GET /api/v1/security/audit/stats
 * Get audit statistics
 */
router.get('/audit/stats', (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.query;

    const stats = auditLogger.getStatistics(
      startTime ? new Date(startTime as string) : undefined,
      endTime ? new Date(endTime as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get audit stats failed', { error });
    res.status(500).json({ error: 'Failed to get audit statistics' });
  }
});

/**
 * GET /api/v1/security/audit/integrity
 * Verify audit log integrity
 */
router.get('/audit/integrity', (req: Request, res: Response) => {
  try {
    const result = auditLogger.verifyIntegrity();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Verify audit integrity failed', { error });
    res.status(500).json({ error: 'Failed to verify audit integrity' });
  }
});

export default router;
