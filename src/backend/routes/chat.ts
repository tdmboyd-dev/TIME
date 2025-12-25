/**
 * Community Chat & AI Chat Assistant API Routes
 */

import { Router, Request, Response } from 'express';
import { chatAssistant } from '../ai/chat_assistant';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('ChatRoutes');

// ============================================================
// COMMUNITY CHAT - Channels & Messages
// ============================================================

/**
 * GET /chat/channels
 * Get available chat channels
 */
router.get('/channels', (req: Request, res: Response) => {
  try {
    const channels = [
      {
        id: 'general',
        name: 'general',
        description: 'General trading discussion',
        memberCount: 1247,
        unreadCount: 0,
      },
      {
        id: 'stocks',
        name: 'stocks',
        description: 'Stock market trading',
        memberCount: 892,
        unreadCount: 3,
      },
      {
        id: 'crypto',
        name: 'crypto',
        description: 'Cryptocurrency trading',
        memberCount: 1056,
        unreadCount: 12,
      },
      {
        id: 'forex',
        name: 'forex',
        description: 'Forex & currency pairs',
        memberCount: 634,
        unreadCount: 0,
      },
      {
        id: 'bots',
        name: 'bots',
        description: 'Trading bots & automation',
        memberCount: 1389,
        unreadCount: 5,
      },
    ];

    res.json({
      success: true,
      channels,
      count: channels.length,
    });
  } catch (error) {
    logger.error('Error getting channels', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

/**
 * GET /chat/messages/:channel
 * Get messages for a specific channel
 */
router.get('/messages/:channel', (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // In production, this would fetch from database
    // For now, return empty array - client will generate demo messages
    res.json({
      success: true,
      channel,
      messages: [],
      count: 0,
      hasMore: false,
    });
  } catch (error) {
    logger.error('Error getting messages', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * POST /chat/messages/:channel
 * Send a message to a channel
 */
router.post('/messages/:channel', (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const { message, mentions, replyTo } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
    }

    // In production, this would save to database and broadcast via WebSocket
    const newMessage = {
      id: `msg-${Date.now()}`,
      userId,
      username: 'User', // Would fetch from user database
      avatar: 'U',
      verified: false,
      isPro: false,
      message,
      timestamp: new Date(),
      reactions: [],
      mentions: mentions || [],
      isPinned: false,
      channel,
      replyTo,
    };

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    logger.error('Error sending message', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * POST /chat/messages/:messageId/reaction
 * Add or remove a reaction to a message
 */
router.post('/messages/:messageId/reaction', (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // In production, this would update database and broadcast via WebSocket
    res.json({
      success: true,
      messageId,
      emoji,
      action: 'added', // or 'removed'
    });
  } catch (error) {
    logger.error('Error adding reaction', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

/**
 * GET /chat/online-users/:channel
 * Get online users in a channel
 */
router.get('/online-users/:channel', (req: Request, res: Response) => {
  try {
    const { channel } = req.params;

    // In production, this would track WebSocket connections
    res.json({
      success: true,
      channel,
      onlineCount: Math.floor(Math.random() * 500) + 200,
      users: [],
    });
  } catch (error) {
    logger.error('Error getting online users', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// ============================================================
// AI CHAT ASSISTANT - Original Functionality
// ============================================================

// Send message to chat assistant
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
    }

    const response = await chatAssistant.processMessage(userId, message);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    logger.error('Error processing chat message', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get chat history
router.get('/history', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const history = chatAssistant.getHistory(userId);

    res.json({
      success: true,
      messages: history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Error getting chat history', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Clear chat history
router.delete('/history', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    chatAssistant.clearHistory(userId);

    res.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    logger.error('Error clearing chat history', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

export default router;
