/**
 * Socket.IO Service for Real-Time Community Chat
 *
 * Handles WebSocket connections for:
 * - Community chat messages
 * - Real-time notifications
 * - Trading signals broadcast
 * - User presence tracking
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

interface SocketUser {
  userId: string;
  username: string;
  socketId: string;
  channels: Set<string>;
  connectedAt: Date;
}

class SocketService {
  private io: Server | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private channelUsers: Map<string, Set<string>> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer) {
    const corsOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://timebeyondus.com',
      'https://www.timebeyondus.com',
      'https://time-frontend.vercel.app',
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
    ];

    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);
      this.handleConnection(socket);
    });

    console.log('[Socket.IO] Service initialized');
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket) {
    // Authenticate user
    socket.on('authenticate', (data: { userId: string; username: string; token: string }) => {
      // TODO: Validate JWT token
      const { userId, username } = data;

      const user: SocketUser = {
        userId,
        username,
        socketId: socket.id,
        channels: new Set(),
        connectedAt: new Date(),
      };

      this.connectedUsers.set(socket.id, user);
      socket.emit('authenticated', { success: true, userId });

      console.log(`[Socket.IO] User authenticated: ${username} (${userId})`);
    });

    // Join channel
    socket.on('join_channel', (channelId: string) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.join(channelId);
      user.channels.add(channelId);

      // Track channel users
      if (!this.channelUsers.has(channelId)) {
        this.channelUsers.set(channelId, new Set());
      }
      this.channelUsers.get(channelId)!.add(user.userId);

      // Notify channel of new user
      this.io!.to(channelId).emit('user_joined', {
        userId: user.userId,
        username: user.username,
        timestamp: new Date(),
      });

      // Send current channel stats
      socket.emit('channel_joined', {
        channelId,
        onlineUsers: this.channelUsers.get(channelId)!.size,
      });

      console.log(`[Socket.IO] ${user.username} joined #${channelId}`);
    });

    // Leave channel
    socket.on('leave_channel', (channelId: string) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      socket.leave(channelId);
      user.channels.delete(channelId);
      this.channelUsers.get(channelId)?.delete(user.userId);

      // Notify channel
      this.io!.to(channelId).emit('user_left', {
        userId: user.userId,
        username: user.username,
        timestamp: new Date(),
      });

      console.log(`[Socket.IO] ${user.username} left #${channelId}`);
    });

    // Send message
    socket.on('send_message', (data: {
      channelId: string;
      message: string;
      messageId: string;
      replyTo?: string;
    }) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Broadcast to all users in channel (including sender for confirmation)
      const messageData = {
        id: data.messageId,
        userId: user.userId,
        username: user.username,
        message: data.message,
        timestamp: new Date(),
        channelId: data.channelId,
        replyTo: data.replyTo,
      };

      this.io!.to(data.channelId).emit('new_message', messageData);
      console.log(`[Socket.IO] Message sent to #${data.channelId} by ${user.username}`);
    });

    // Typing indicator
    socket.on('typing_start', (channelId: string) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      socket.to(channelId).emit('user_typing', {
        userId: user.userId,
        username: user.username,
        channelId,
      });
    });

    socket.on('typing_stop', (channelId: string) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      socket.to(channelId).emit('user_stopped_typing', {
        userId: user.userId,
        channelId,
      });
    });

    // Reaction added
    socket.on('add_reaction', (data: {
      channelId: string;
      messageId: string;
      emoji: string;
    }) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      this.io!.to(data.channelId).emit('reaction_added', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: user.userId,
        username: user.username,
      });
    });

    // Message deleted (admin only)
    socket.on('delete_message', (data: {
      channelId: string;
      messageId: string;
      reason: string;
    }) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      // TODO: Check if user is admin

      this.io!.to(data.channelId).emit('message_deleted', {
        messageId: data.messageId,
        deletedBy: user.userId,
        reason: data.reason,
      });
    });

    // Message pinned (admin only)
    socket.on('pin_message', (data: {
      channelId: string;
      messageId: string;
    }) => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      // TODO: Check if user is admin

      this.io!.to(data.channelId).emit('message_pinned', {
        messageId: data.messageId,
        pinnedBy: user.userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      // Notify all channels user was in
      user.channels.forEach(channelId => {
        this.channelUsers.get(channelId)?.delete(user.userId);
        this.io!.to(channelId).emit('user_left', {
          userId: user.userId,
          username: user.username,
          timestamp: new Date(),
        });
      });

      this.connectedUsers.delete(socket.id);
      console.log(`[Socket.IO] User disconnected: ${user.username}`);
    });
  }

  /**
   * Broadcast notification to specific user
   */
  sendNotificationToUser(userId: string, notification: any) {
    if (!this.io) return;

    // Find user's socket
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === userId) {
        this.io.to(socketId).emit('notification', notification);
        break;
      }
    }
  }

  /**
   * Broadcast trading signal to all users
   */
  broadcastTradingSignal(signal: any) {
    if (!this.io) return;
    this.io.emit('trading_signal', signal);
  }

  /**
   * Broadcast to specific channel
   */
  broadcastToChannel(channelId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(channelId).emit(event, data);
  }

  /**
   * Get online users count for a channel
   */
  getChannelOnlineCount(channelId: string): number {
    return this.channelUsers.get(channelId)?.size || 0;
  }

  /**
   * Get total connected users
   */
  getTotalConnectedUsers(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): Server | null {
    return this.io;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
