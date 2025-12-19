/**
 * AI Chat Assistant API Routes
 */

import { Router, Request, Response } from 'express';
import { chatAssistant } from '../ai/chat_assistant';
import { createComponentLogger } from '../utils/logger';

const router = Router();
const logger = createComponentLogger('ChatRoutes');

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
