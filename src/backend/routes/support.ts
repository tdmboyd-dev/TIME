/**
 * Support System API Routes
 *
 * Provides comprehensive customer support system with:
 * - AI chat support (24/7 automated assistance)
 * - Support ticket management
 * - FAQ system
 * - Chat history tracking
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/connection';
import { handleChatMessage, getUserChatHistory, clearChatSession } from '../support/ai_chat_handler';
import { createComponentLogger } from '../utils/logger';
import { authMiddleware } from './auth';
import {
  sendNewTicketNotification,
  sendAdminReplyNotification,
  sendTicketStatusNotification,
  sendAdminNewTicketAlert,
} from '../support/email_notification_service';

const router = Router();
const logger = createComponentLogger('SupportRoutes');

// ============================================================
// AI CHAT ENDPOINTS
// ============================================================

/**
 * POST /api/support/chat
 * Send message to AI chat assistant
 */
router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, sessionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Process chat message
    const result = await handleChatMessage(userId, sessionId, message);

    if (!result.success) {
      if (result.rateLimited) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: result.error,
        });
      }
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      response: result.response,
      intent: result.intent,
      shouldEscalate: result.shouldEscalate,
    });
  } catch (error) {
    logger.error('Error processing chat message', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * GET /api/support/history
 * Get user's chat session history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await getUserChatHistory(userId, 50);

    res.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    logger.error('Error getting chat history', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

/**
 * DELETE /api/support/session/:sessionId
 * Clear/end a chat session
 */
router.delete('/session/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const success = await clearChatSession(sessionId);

    res.json({
      success,
      message: success ? 'Chat session cleared' : 'Failed to clear session',
    });
  } catch (error) {
    logger.error('Error clearing chat session', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

// ============================================================
// SUPPORT TICKET ENDPOINTS
// ============================================================

/**
 * POST /api/support/ticket
 * Create a new support ticket
 */
router.post('/ticket', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { subject, category, priority, message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate inputs
    if (!subject || !category || !message) {
      return res.status(400).json({
        error: 'Subject, category, and message are required',
      });
    }

    const validCategories = ['technical', 'trading', 'broker', 'billing', 'bot', 'general'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category. Must be one of: ' + validCategories.join(', '),
      });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const ticketPriority = priority && validPriorities.includes(priority) ? priority : 'medium';

    // Generate ticket number
    const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create ticket
    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const ticket = {
      userId,
      ticketNumber,
      subject,
      category,
      priority: ticketPriority,
      status: 'open',
      initialMessage: message,
      messages: [
        {
          id: messageId,
          senderId: userId,
          senderType: 'user',
          message,
          timestamp: new Date(),
        },
      ],
      tags: [],
      relatedTickets: [],
      escalated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await tickets.insertOne(ticket);

    logger.info('Support ticket created', {
      ticketNumber,
      userId,
      category,
      priority: ticketPriority,
    });

    // Send email notifications (async, don't wait)
    const user = (req as any).user;
    if (user?.email && user?.username) {
      sendNewTicketNotification(
        user.email,
        user.username,
        ticketNumber,
        subject,
        category
      ).catch(err => logger.error('Failed to send ticket notification', { error: err }));

      sendAdminNewTicketAlert(
        ticketNumber,
        subject,
        category,
        ticketPriority,
        user.username,
        user.email
      ).catch(err => logger.error('Failed to send admin notification', { error: err }));
    }

    res.json({
      success: true,
      ticket: {
        id: result.insertedId,
        ticketNumber,
        subject,
        category,
        priority: ticketPriority,
        status: 'open',
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating support ticket', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

/**
 * GET /api/support/tickets
 * Get user's support tickets
 */
router.get('/tickets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const userTickets = await tickets
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      tickets: userTickets,
      count: userTickets.length,
    });
  } catch (error) {
    logger.error('Error getting support tickets', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to get support tickets' });
  }
});

/**
 * GET /api/support/ticket/:ticketNumber
 * Get specific ticket details
 */
router.get('/ticket/:ticketNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ticketNumber } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const ticket = await tickets.findOne({ ticketNumber, userId });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    logger.error('Error getting ticket details', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to get ticket details' });
  }
});

/**
 * POST /api/support/ticket/:ticketNumber/message
 * Add message to existing ticket
 */
router.post('/ticket/:ticketNumber/message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ticketNumber } = req.params;
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await tickets.updateOne(
      { ticketNumber, userId },
      {
        $push: {
          messages: {
            id: messageId,
            senderId: userId,
            senderType: 'user',
            message,
            timestamp: new Date(),
          },
        },
        $set: {
          updatedAt: new Date(),
          status: 'waiting_response',
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({
      success: true,
      message: 'Message added to ticket',
    });
  } catch (error) {
    logger.error('Error adding message to ticket', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// ============================================================
// FAQ ENDPOINTS
// ============================================================

/**
 * GET /api/support/faq
 * Get FAQ content (public endpoint)
 */
router.get('/faq', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const db = await getDatabase();
    const faqs = db.collection('support_faq');

    const filter: any = { published: true };
    if (category) {
      filter.category = category;
    }

    const faqList = await faqs
      .find(filter)
      .sort({ category: 1, order: 1 })
      .toArray();

    // Increment view count
    if (faqList.length > 0) {
      const faqIds = faqList.map(faq => faq._id);
      await faqs.updateMany(
        { _id: { $in: faqIds } },
        { $inc: { views: 1 } }
      );
    }

    res.json({
      success: true,
      faqs: faqList,
      count: faqList.length,
    });
  } catch (error) {
    logger.error('Error getting FAQs', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to get FAQs' });
  }
});

/**
 * POST /api/support/faq/:faqId/vote
 * Vote on FAQ helpfulness
 */
router.post('/faq/:faqId/vote', async (req: Request, res: Response) => {
  try {
    const { faqId } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Helpful vote (true/false) is required' });
    }

    const db = await getDatabase();
    const faqs = db.collection('support_faq');

    const update = helpful
      ? { $inc: { helpful_votes: 1 } }
      : { $inc: { unhelpful_votes: 1 } };

    await faqs.updateOne({ _id: faqId }, update);

    res.json({
      success: true,
      message: 'Vote recorded',
    });
  } catch (error) {
    logger.error('Error recording FAQ vote', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ============================================================
// QUICK ACTIONS
// ============================================================

/**
 * GET /api/support/quick-actions
 * Get suggested quick actions based on common issues
 */
router.get('/quick-actions', async (req: Request, res: Response) => {
  try {
    const quickActions = [
      {
        id: 'how-to-trade',
        title: 'How do I start trading?',
        description: 'Connect a broker and enable bots',
        action: '/brokers',
        category: 'trading',
      },
      {
        id: 'connect-broker',
        title: 'Connect my broker',
        description: 'Link Alpaca, IB, OANDA, or others',
        action: '/brokers',
        category: 'broker',
      },
      {
        id: 'bot-help',
        title: 'My bot isn\'t trading',
        description: 'Troubleshoot bot issues',
        action: '/live-trading',
        category: 'bot',
      },
      {
        id: 'enable-autopilot',
        title: 'Enable AutoPilot',
        description: 'Upgrade to DROPBOT AutoPilot',
        action: '/autopilot',
        category: 'bot',
      },
      {
        id: 'billing-help',
        title: 'Billing & payments',
        description: 'Manage subscriptions and payments',
        action: '/payments',
        category: 'billing',
      },
      {
        id: 'account-settings',
        title: 'Account settings',
        description: 'Update profile and preferences',
        action: '/settings',
        category: 'account',
      },
    ];

    res.json({
      success: true,
      actions: quickActions,
    });
  } catch (error) {
    logger.error('Error getting quick actions', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to get quick actions' });
  }
});

// ============================================================
// ADMIN TICKET MANAGEMENT
// ============================================================

/**
 * GET /api/support/admin/tickets
 * Get all support tickets (admin only)
 */
router.get('/admin/tickets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, category, priority, limit = 100 } = req.query;

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const allTickets = await tickets
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .toArray();

    // Get statistics
    const stats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'open').length,
      in_progress: allTickets.filter(t => t.status === 'in_progress').length,
      waiting_response: allTickets.filter(t => t.status === 'waiting_response').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.filter(t => t.status === 'closed').length,
    };

    res.json({
      success: true,
      tickets: allTickets,
      stats,
      count: allTickets.length,
    });
  } catch (error) {
    logger.error('Error getting admin tickets', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

/**
 * PUT /api/support/admin/ticket/:ticketNumber/status
 * Update ticket status (admin only)
 */
router.put('/admin/ticket/:ticketNumber/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ticketNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'waiting_response', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
      });
    }

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const result = await tickets.updateOne(
      { ticketNumber },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    logger.info('Ticket status updated by admin', {
      ticketNumber,
      newStatus: status,
      adminId: userId,
    });

    // Send email notification to ticket owner (async)
    const ticket = await tickets.findOne({ ticketNumber });
    if (ticket && ticket.userId) {
      const db = await getDatabase();
      const users = db.collection('users');
      const ticketOwner = await users.findOne({ _id: ticket.userId });

      if (ticketOwner?.email && ticketOwner?.username) {
        sendTicketStatusNotification(
          ticketOwner.email,
          ticketOwner.username,
          ticketNumber,
          ticket.subject,
          status
        ).catch(err => logger.error('Failed to send status notification', { error: err }));
      }
    }

    res.json({
      success: true,
      message: 'Ticket status updated',
    });
  } catch (error) {
    logger.error('Error updating ticket status', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

/**
 * POST /api/support/admin/ticket/:ticketNumber/reply
 * Reply to ticket as admin
 */
router.post('/admin/ticket/:ticketNumber/reply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ticketNumber } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await tickets.updateOne(
      { ticketNumber },
      {
        $push: {
          messages: {
            id: messageId,
            senderId: userId,
            senderType: 'admin',
            message,
            timestamp: new Date(),
          },
        },
        $set: {
          updatedAt: new Date(),
          status: 'waiting_response',
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    logger.info('Admin replied to ticket', {
      ticketNumber,
      adminId: userId,
    });

    // Send email notification to ticket owner (async)
    const ticket = await tickets.findOne({ ticketNumber });
    if (ticket && ticket.userId) {
      const db = await getDatabase();
      const users = db.collection('users');
      const ticketOwner = await users.findOne({ _id: ticket.userId });

      if (ticketOwner?.email && ticketOwner?.username) {
        sendAdminReplyNotification(
          ticketOwner.email,
          ticketOwner.username,
          ticketNumber,
          ticket.subject,
          message
        ).catch(err => logger.error('Failed to send reply notification', { error: err }));
      }
    }

    res.json({
      success: true,
      message: 'Reply added to ticket',
    });
  } catch (error) {
    logger.error('Error adding admin reply to ticket', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

/**
 * PUT /api/support/admin/ticket/:ticketNumber/assign
 * Assign ticket to admin user
 */
router.put('/admin/ticket/:ticketNumber/assign', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ticketNumber } = req.params;
    const { assigneeId } = req.body;

    const db = await getDatabase();
    const tickets = db.collection('support_tickets');

    const result = await tickets.updateOne(
      { ticketNumber },
      {
        $set: {
          assignedTo: assigneeId,
          assignedAt: new Date(),
          updatedAt: new Date(),
          status: 'in_progress',
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    logger.info('Ticket assigned', {
      ticketNumber,
      assignedTo: assigneeId,
      assignedBy: userId,
    });

    res.json({
      success: true,
      message: 'Ticket assigned',
    });
  } catch (error) {
    logger.error('Error assigning ticket', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

export default router;
