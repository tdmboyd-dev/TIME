# Social Trading Features - Complete Documentation

**Version:** 1.0.0
**Last Updated:** 2025-12-25
**Status:** Production Ready

---

## Overview

TIME BEYOND US now includes comprehensive social trading features that enable users to:
- View and compete on leaderboards
- Follow top-performing traders
- Copy successful trading strategies
- Chat in real-time with the community
- Share trades and insights
- React to messages and participate in discussions

---

## Table of Contents

1. [Leaderboard System](#leaderboard-system)
2. [Community Chat](#community-chat)
3. [Socket.IO Real-Time Events](#socketio-real-time-events)
4. [Database Schemas](#database-schemas)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Security & Permissions](#security--permissions)
8. [Production Setup](#production-setup)

---

## Leaderboard System

### Features

The leaderboard system tracks and ranks traders based on their performance across different time periods.

#### Ranking Criteria
- **Daily Rankings**: Last 24 hours performance
- **Weekly Rankings**: Last 7 days performance
- **Monthly Rankings**: Last 30 days performance
- **All-Time Rankings**: Complete trading history

#### Displayed Metrics
- Rank (with crown/medal/award icons for top 3)
- Username with verification badges
- Profit percentage (time-period specific)
- Win rate percentage
- Total trades executed
- Risk score (1-10 scale)
- Sharpe ratio
- Maximum drawdown
- Primary asset class
- Trading strategy type

#### Filters
- **Time Period**: Daily, Weekly, Monthly, All-Time
- **Asset Class**: All, Stocks, Crypto, Forex, Options
- **Minimum Trades**: Filter out traders with too few trades

### Backend Implementation

#### Caching Strategy
- Leaderboard data is cached for 5 minutes
- Background job recalculates rankings from trades collection
- Efficient MongoDB queries with compound indexes
- Pagination support for large datasets

#### Data Generation
```typescript
// Calculate trader metrics from trades
const calculateTraderMetrics = async (userId: string, period: string) => {
  const startDate = getPeriodStartDate(period);

  const trades = await db.trades.find({
    userId,
    exitTime: { $gte: startDate },
    status: 'closed'
  });

  return {
    profitPercent: calculateProfitPercent(trades),
    winRate: calculateWinRate(trades),
    totalTrades: trades.length,
    sharpeRatio: calculateSharpeRatio(trades),
    maxDrawdown: calculateMaxDrawdown(trades)
  };
};
```

### Frontend Implementation

Located at: `C:\Users\Timeb\OneDrive\TIME\frontend\src\app\leaderboard\page.tsx`

#### Key Features
- Real-time data fetching from API
- Search by username
- Sortable columns
- Colored profit indicators (green for profit, red for loss)
- Progress bars for win rates
- Follow/Unfollow buttons
- Copy Trader buttons
- Responsive table design

#### Usage Example
```typescript
// Fetch leaderboard
const response = await fetch(
  `/api/v1/social/leaderboard?period=monthly&assetClass=crypto&limit=50`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const data = await response.json();
```

---

## Community Chat

### Features

Real-time community chat system with multiple channels and comprehensive moderation tools.

#### Channels
1. **#general** - General trading discussion
2. **#stocks** - Stock market trading
3. **#crypto** - Cryptocurrency trading
4. **#forex** - Forex and currency pairs
5. **#bots** - Trading bots and automation

#### Message Features
- **Text Messages**: Up to 2000 characters
- **@Mentions**: Tag other users with @username
- **Emoji Reactions**: 8 built-in reactions (👍 ❤️ 🚀 💯 🔥 👀 😂 🎯)
- **Threading**: Reply to specific messages
- **Pinning**: Admins can pin important messages
- **Attachments**: Share trades and bot configurations

#### User Features
- Online/offline status
- Typing indicators
- Message timestamps
- Verification badges
- PRO user labels
- User avatars

#### Moderation
- **Delete Messages**: Soft delete with reason (admin only)
- **Pin Messages**: Highlight important messages (admin only)
- **Ban Users**: Temporary or permanent bans from channels
- **Audit Logs**: All moderation actions are logged

### Backend Implementation

Located at: `C:\Users\Timeb\OneDrive\TIME\src\backend\routes\social.ts`

#### Message Storage
```typescript
interface CommunityMessageSchema {
  userId: string;
  username: string;
  channel: string;
  message: string;
  timestamp: Date;
  reactions: Array<{ emoji: string; count: number; users: string[] }>;
  mentions: string[];
  isPinned: boolean;
  isDeleted: boolean;
  deletedReason?: string;
  replyTo?: string;
}
```

#### Message Validation
- Maximum length: 2000 characters
- XSS protection via sanitization
- Rate limiting: 10 messages per minute per user
- Ban checking before allowing messages

### Frontend Implementation

Located at: `C:\Users\Timeb\OneDrive\TIME\frontend\src\app\chat\page.tsx`

#### Key Features
- Real-time message updates via Socket.IO
- Auto-scroll to latest message
- Emoji picker
- @mention autocomplete
- Message threading UI
- Typing indicators
- Online user count

#### Usage Example
```typescript
// Send a message
const response = await fetch(`/api/v1/social/chat/crypto/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'BTC looking bullish! @TraderPro what do you think?',
  })
});
```

---

## Socket.IO Real-Time Events

### Setup

Located at: `C:\Users\Timeb\OneDrive\TIME\src\backend\services\socket_service.ts`

#### Server Initialization
```typescript
import { socketService } from './services/socket_service';

const httpServer = createServer(app);
socketService.initialize(httpServer);

httpServer.listen(PORT, () => {
  console.log('Server + Socket.IO running on port', PORT);
});
```

#### Client Connection
```typescript
import io from 'socket.io-client';

const socket = io('/', {
  auth: { token: localStorage.getItem('token') }
});

socket.on('connect', () => {
  socket.emit('authenticate', {
    userId: currentUser.id,
    username: currentUser.username,
    token: authToken
  });
});
```

### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `authenticate` | Authenticate user | `{ userId, username, token }` |
| `join_channel` | Join a chat channel | `channelId: string` |
| `leave_channel` | Leave a chat channel | `channelId: string` |
| `send_message` | Send a message | `{ channelId, message, messageId, replyTo? }` |
| `typing_start` | User started typing | `channelId: string` |
| `typing_stop` | User stopped typing | `channelId: string` |
| `add_reaction` | Add emoji reaction | `{ channelId, messageId, emoji }` |
| `delete_message` | Delete message (admin) | `{ channelId, messageId, reason }` |
| `pin_message` | Pin message (admin) | `{ channelId, messageId }` |

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `authenticated` | Authentication confirmed | `{ success, userId }` |
| `channel_joined` | Joined channel successfully | `{ channelId, onlineUsers }` |
| `new_message` | New message in channel | `{ id, userId, username, message, timestamp }` |
| `user_joined` | User joined channel | `{ userId, username, timestamp }` |
| `user_left` | User left channel | `{ userId, username, timestamp }` |
| `user_typing` | User is typing | `{ userId, username, channelId }` |
| `user_stopped_typing` | User stopped typing | `{ userId, channelId }` |
| `reaction_added` | Reaction added | `{ messageId, emoji, userId, username }` |
| `message_deleted` | Message deleted | `{ messageId, deletedBy, reason }` |
| `message_pinned` | Message pinned | `{ messageId, pinnedBy }` |
| `notification` | Personal notification | `{ type, title, message, data }` |
| `trading_signal` | Platform-wide signal | `{ symbol, direction, confidence }` |

### Example Usage

```typescript
// Join a channel
socket.emit('join_channel', 'crypto');

// Listen for new messages
socket.on('new_message', (message) => {
  setMessages(prev => [...prev, message]);
});

// Send a message
socket.emit('send_message', {
  channelId: 'crypto',
  message: 'Hello world!',
  messageId: `msg-${Date.now()}`
});

// Add a reaction
socket.emit('add_reaction', {
  channelId: 'crypto',
  messageId: 'msg-123',
  emoji: '🚀'
});
```

---

## Database Schemas

### CommunityMessageSchema

Stores all chat messages with metadata.

```typescript
{
  _id: string;
  userId: string;              // Message author
  username: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  channel: string;             // Channel ID
  message: string;             // Message content (max 2000 chars)
  timestamp: Date;

  // Reactions
  reactions: Array<{
    emoji: string;
    count: number;
    users: string[];           // User IDs who reacted
  }>;

  // Mentions
  mentions: string[];          // Array of @usernames

  // Moderation
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  deletedReason?: string;

  // Threading
  replyTo?: string;            // Message ID this replies to
  threadCount: number;         // Number of replies

  // Attachments
  attachments?: Array<{
    type: 'trade' | 'bot' | 'image';
    data: Record<string, any>;
  }>;
}
```

**Indexes:**
```javascript
{ channel: 1, timestamp: -1 }
{ userId: 1, timestamp: -1 }
{ isPinned: 1, channel: 1 }
{ isDeleted: 1 }
{ timestamp: -1 }
```

### TraderLeaderboardSchema

Cached leaderboard data for performance.

```typescript
{
  _id: string;
  userId: string;
  username: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;

  // Performance metrics
  rank: number;
  profitPercent: number;
  winRate: number;
  totalTrades: number;

  // Social metrics
  followers: number;
  copiers: number;

  // Time-based profits
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  allTimeProfit: number;

  // Risk metrics
  riskScore: number;           // 1-10
  sharpeRatio: number;
  maxDrawdown: number;

  // Strategy info
  assetClass: string;
  strategy: string;

  // Cache info
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  cacheExpiry: Date;
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;
}
```

**Indexes:**
```javascript
{ period: 1, rank: 1 }
{ userId: 1, period: 1 }
{ profitPercent: -1, period: 1 }
{ winRate: -1, period: 1 }
{ cacheExpiry: 1 }
```

### ChatChannelSchema

Channel configuration and statistics.

```typescript
{
  _id: string;
  channelId: string;           // Unique channel identifier
  name: string;
  description: string;
  icon: string;
  color: string;

  // Settings
  isActive: boolean;
  isPrivate: boolean;
  requiresVerification: boolean;
  requiresPro: boolean;

  // Stats
  memberCount: number;
  messageCount: number;
  activeUsers: number;

  // Moderation
  moderators: string[];        // User IDs with mod powers
  bannedUsers: Array<{
    userId: string;
    bannedBy: string;
    bannedAt: Date;
    reason: string;
    expiresAt?: Date;          // null = permanent
  }>;

  createdAt: Date;
  lastMessageAt: Date;
}
```

**Indexes:**
```javascript
{ channelId: 1, unique: true }
{ isActive: 1 }
{ lastMessageAt: -1 }
```

### UserFollowSchema

Tracks following relationships and copy trading.

```typescript
{
  _id: string;
  followerId: string;
  followingId: string;
  followedAt: Date;

  // Copy trading relationship
  isCopying: boolean;
  copyConfig?: {
    mode: 'proportional' | 'fixed';
    maxRiskPerTrade: number;
    maxDailyRisk: number;
    maxOpenTrades: number;
  };
}
```

**Indexes:**
```javascript
{ followerId: 1, followingId: 1, unique: true }
{ followerId: 1, followedAt: -1 }
{ followingId: 1, followedAt: -1 }
```

---

## API Endpoints

### Leaderboard Endpoints

#### GET /api/v1/social/leaderboard
Get trader or bot leaderboard with filtering.

**Query Parameters:**
- `period` (string): daily, weekly, monthly, all-time (default: monthly)
- `type` (string): traders, bots (default: traders)
- `assetClass` (string): all, stocks, crypto, forex, options (default: all)
- `minTrades` (number): Minimum trades filter (default: 0)
- `limit` (number): Results limit (default: 50)

**Response:**
```json
{
  "success": true,
  "period": "monthly",
  "type": "traders",
  "total": 50,
  "leaderboard": [
    {
      "id": "trader-1",
      "userId": "user-123",
      "username": "Trader001",
      "rank": 1,
      "avatar": "A",
      "verified": true,
      "isPro": true,
      "profitPercent": 158.5,
      "winRate": 75.2,
      "totalTrades": 1247,
      "followers": 1523,
      "copiers": 284,
      "riskScore": 4,
      "sharpeRatio": 2.8,
      "maxDrawdown": 8.5,
      "assetClass": "crypto",
      "strategy": "Momentum",
      "lastUpdated": "2025-12-25T..."
    }
  ],
  "lastUpdated": "2025-12-25T...",
  "nextUpdate": "2025-12-25T..."
}
```

### Follow/Unfollow Endpoints

#### POST /api/v1/social/follow/:userId
Follow a trader.

**Response:**
```json
{
  "success": true,
  "message": "Started following user user-123",
  "userId": "user-123",
  "isFollowing": true
}
```

#### DELETE /api/v1/social/follow/:userId
Unfollow a trader.

**Response:**
```json
{
  "success": true,
  "message": "Unfollowed user user-123",
  "userId": "user-123",
  "isFollowing": false
}
```

### Chat Endpoints

#### GET /api/v1/social/chat/channels
Get all available chat channels.

**Response:**
```json
{
  "success": true,
  "channels": [
    {
      "id": "general",
      "name": "general",
      "description": "General trading discussion",
      "icon": "MessageCircle",
      "color": "blue",
      "memberCount": 1247,
      "messageCount": 15234,
      "isActive": true,
      "isPrivate": false,
      "requiresVerification": false,
      "requiresPro": false,
      "lastMessageAt": "2025-12-25T..."
    }
  ],
  "total": 5
}
```

#### GET /api/v1/social/chat/:channel/messages
Get messages for a specific channel.

**Query Parameters:**
- `limit` (number): Max messages to return (default: 50)
- `before` (string): Message ID for pagination

**Response:**
```json
{
  "success": true,
  "channel": "crypto",
  "messages": [
    {
      "id": "msg-123",
      "userId": "user-456",
      "username": "TraderPro",
      "avatar": "T",
      "verified": true,
      "isPro": false,
      "message": "BTC looking bullish!",
      "timestamp": "2025-12-25T...",
      "reactions": [
        { "emoji": "👍", "count": 5, "users": ["user-1", "user-2"] },
        { "emoji": "🚀", "count": 3, "users": ["user-3"] }
      ],
      "mentions": [],
      "isPinned": false,
      "isDeleted": false,
      "threadCount": 0
    }
  ],
  "total": 50,
  "hasMore": true
}
```

#### POST /api/v1/social/chat/:channel/send
Send a message to a channel.

**Request Body:**
```json
{
  "message": "Great analysis! @TraderPro",
  "replyTo": "msg-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg-456",
    "userId": "user-789",
    "username": "You",
    "message": "Great analysis! @TraderPro",
    "timestamp": "2025-12-25T...",
    "reactions": [],
    "mentions": ["TraderPro"],
    "isPinned": false,
    "channel": "crypto"
  }
}
```

#### POST /api/v1/social/chat/:channel/react
Add or remove a reaction to a message.

**Request Body:**
```json
{
  "messageId": "msg-123",
  "emoji": "🚀"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-123",
  "emoji": "🚀",
  "action": "toggled"
}
```

#### DELETE /api/v1/social/chat/:channel/messages/:messageId (Admin Only)
Delete a message.

**Request Body:**
```json
{
  "reason": "Violates community guidelines"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-123",
  "deleted": true,
  "deletedBy": "admin-user-id",
  "reason": "Violates community guidelines"
}
```

#### POST /api/v1/social/chat/:channel/pin/:messageId (Admin Only)
Pin or unpin a message.

**Response:**
```json
{
  "success": true,
  "messageId": "msg-123",
  "isPinned": true,
  "pinnedBy": "admin-user-id"
}
```

---

## Frontend Integration

### Leaderboard Page

**Location:** `frontend/src/app/leaderboard/page.tsx`

**Features:**
- Auto-refresh on time period or filter change
- Optimistic UI updates for follow/unfollow
- Search functionality
- Responsive table layout
- Colored profit indicators
- Progress bars for win rates

**Key Components:**
```typescript
// Fetch leaderboard
const fetchLeaderboard = async () => {
  const response = await fetch(
    `/api/v1/social/leaderboard?period=${timePeriod}&assetClass=${assetFilter}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await response.json();
  setTraders(data.leaderboard);
};

// Handle follow
const handleFollow = async (traderId: string) => {
  const method = isFollowing ? 'DELETE' : 'POST';
  await fetch(`/api/v1/social/follow/${traderId}`, { method });
  // Update UI optimistically
};
```

### Chat Page

**Location:** `frontend/src/app/chat/page.tsx`

**Features:**
- Real-time message updates
- Auto-scroll to latest
- Emoji picker
- @mention highlighting
- Typing indicators
- Online user count

**Socket.IO Integration:**
```typescript
useEffect(() => {
  const socket = io('/');

  socket.on('connect', () => {
    socket.emit('authenticate', { userId, username, token });
    socket.emit('join_channel', currentChannel.id);
  });

  socket.on('new_message', (message) => {
    setMessages(prev => [...prev, message]);
  });

  return () => {
    socket.emit('leave_channel', currentChannel.id);
    socket.disconnect();
  };
}, [currentChannel]);
```

---

## Security & Permissions

### Authentication
- All endpoints require JWT authentication
- Token validated via `authMiddleware`
- User ID extracted from token for all operations

### Message Security
- **Length Limit**: 2000 characters max
- **XSS Protection**: Messages sanitized before storage
- **Rate Limiting**: 10 messages per minute per user
- **Spam Detection**: Auto-flag suspicious patterns

### Admin Controls
- Only `admin` and `owner` roles can:
  - Delete messages
  - Pin/unpin messages
  - Ban users from channels
- All moderation actions logged to audit trail

### Data Privacy
- User IDs never exposed to frontend
- Messages only visible in joined channels
- Banned users cannot see channel messages
- Soft deletes preserve data for audits

---

## Production Setup

### 1. Install Dependencies

```bash
# Backend
npm install socket.io

# Frontend
npm install socket.io-client
```

### 2. Initialize Socket.IO Server

In your main server file (e.g., `server.ts` or `app.ts`):

```typescript
import express from 'express';
import { createServer } from 'http';
import { socketService } from './services/socket_service';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
socketService.initialize(httpServer);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server with Socket.IO running on port ${PORT}`);
});
```

### 3. Configure MongoDB

Create the following collections and indexes:

```javascript
// Community messages
db.communityMessages.createIndex({ channel: 1, timestamp: -1 });
db.communityMessages.createIndex({ userId: 1, timestamp: -1 });
db.communityMessages.createIndex({ isPinned: 1, channel: 1 });
db.communityMessages.createIndex({ isDeleted: 1 });

// Trader leaderboard
db.traderLeaderboard.createIndex({ period: 1, rank: 1 });
db.traderLeaderboard.createIndex({ userId: 1, period: 1 });
db.traderLeaderboard.createIndex({ profitPercent: -1, period: 1 });
db.traderLeaderboard.createIndex({ cacheExpiry: 1 });

// Chat channels
db.chatChannels.createIndex({ channelId: 1 }, { unique: true });
db.chatChannels.createIndex({ isActive: 1 });

// User follows
db.userFollows.createIndex({ followerId: 1, followingId: 1 }, { unique: true });
db.userFollows.createIndex({ followerId: 1, followedAt: -1 });
db.userFollows.createIndex({ followingId: 1, followedAt: -1 });
```

### 4. Set Up Cron Jobs

Create a background job to refresh leaderboard cache:

```typescript
import cron from 'node-cron';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Refreshing leaderboard cache...');
  await refreshLeaderboardCache();
});

async function refreshLeaderboardCache() {
  const periods = ['daily', 'weekly', 'monthly', 'all-time'];

  for (const period of periods) {
    const traders = await calculateTraderRankings(period);
    await db.traderLeaderboard.bulkWrite(
      traders.map(trader => ({
        updateOne: {
          filter: { userId: trader.userId, period },
          update: { $set: { ...trader, cacheExpiry: new Date(Date.now() + 5 * 60 * 1000) } },
          upsert: true
        }
      }))
    );
  }
}
```

### 5. Configure CORS

For production Socket.IO:

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

### 6. Multi-Server Setup (Optional)

For horizontal scaling with Redis:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

---

## Testing

### Manual Testing

1. **Leaderboard:**
   - Visit `/leaderboard`
   - Change time periods (daily, weekly, monthly, all-time)
   - Filter by asset class
   - Search for specific traders
   - Click Follow/Unfollow buttons

2. **Chat:**
   - Visit `/chat`
   - Send messages in different channels
   - Add emoji reactions
   - Try @mentions
   - Test typing indicators (if Socket.IO connected)

### API Testing with cURL

```bash
# Get leaderboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/social/leaderboard?period=monthly"

# Follow a trader
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/social/follow/user-123"

# Send a chat message
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello world!"}' \
  "http://localhost:5000/api/v1/social/chat/general/send"
```

---

## Troubleshooting

### Socket.IO Connection Issues

**Problem:** Frontend can't connect to Socket.IO

**Solutions:**
1. Check CORS configuration in `socket_service.ts`
2. Verify frontend is using correct URL (usually `/`)
3. Check firewall rules allow WebSocket connections
4. Ensure HTTP server is used (not just Express app)

### Messages Not Appearing

**Problem:** Sent messages don't show in chat

**Solutions:**
1. Check if user is authenticated with Socket.IO
2. Verify user has joined the channel
3. Check MongoDB connection
4. Review browser console for errors
5. Ensure Socket.IO events are being emitted

### Leaderboard Not Updating

**Problem:** Leaderboard shows stale data

**Solutions:**
1. Check if cache expiry job is running
2. Verify MongoDB indexes exist
3. Manually trigger cache refresh
4. Check if trades are being recorded properly

---

## Future Enhancements

### Planned Features
- [ ] Voice channels
- [ ] Video streaming for market analysis
- [ ] Private DMs between users
- [ ] Trading strategy sharing (code snippets)
- [ ] Chart annotations in chat
- [ ] Bot performance comparison tool
- [ ] Copy trading automation
- [ ] Leaderboard tournaments with prizes
- [ ] Social trading analytics dashboard
- [ ] Integration with Discord/Telegram

---

## Support

For issues or questions:
- Email: support@timebeyondus.com
- Documentation: https://docs.timebeyondus.com
- Community Chat: `/chat` in the platform

---

**End of Documentation**
