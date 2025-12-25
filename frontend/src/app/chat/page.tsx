'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Hash,
  Users,
  Smile,
  Image as ImageIcon,
  AtSign,
  Clock,
  MoreVertical,
  Pin,
  Flag,
  Trash2,
  CheckCircle,
  Crown,
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  message: string;
  timestamp: Date;
  reactions: { emoji: string; count: number; userReacted: boolean }[];
  mentions: string[];
  isPinned: boolean;
  channel: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  memberCount: number;
  unreadCount: number;
}

const CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'general',
    description: 'General trading discussion',
    icon: MessageCircle,
    color: 'blue',
    memberCount: 1247,
    unreadCount: 0,
  },
  {
    id: 'stocks',
    name: 'stocks',
    description: 'Stock market trading',
    icon: Hash,
    color: 'green',
    memberCount: 892,
    unreadCount: 3,
  },
  {
    id: 'crypto',
    name: 'crypto',
    description: 'Cryptocurrency trading',
    icon: Hash,
    color: 'orange',
    memberCount: 1056,
    unreadCount: 12,
  },
  {
    id: 'forex',
    name: 'forex',
    description: 'Forex & currency pairs',
    icon: Hash,
    color: 'purple',
    memberCount: 634,
    unreadCount: 0,
  },
  {
    id: 'bots',
    name: 'bots',
    description: 'Trading bots & automation',
    icon: Hash,
    color: 'cyan',
    memberCount: 1389,
    unreadCount: 5,
  },
];

const EMOJI_LIST = ['👍', '❤️', '🚀', '💯', '🔥', '👀', '😂', '🎯'];

export default function CommunityChat() {
  const [currentChannel, setCurrentChannel] = useState<Channel>(CHANNELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(247);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch messages from API
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/v1/social/chat/${currentChannel.id}/messages?limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        const formattedMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          reactions: msg.reactions.map((r: any) => ({
            emoji: r.emoji,
            count: r.count,
            userReacted: r.users.includes(localStorage.getItem('userId') || ''),
          })),
        }));
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        // Fallback to demo data
        const demoMessages: Message[] = Array.from({ length: 20 }, (_, i) => {
          const usernames = ['TraderPro', 'CryptoKing', 'WallStWolf', 'BotMaster', 'ForexGuru', 'StockWhiz', 'ChartWizard'];
          const messages = [
            'Just made a huge profit on $AAPL calls!',
            'Anyone watching BTC right now? Looking bullish',
            'My bot just executed 50 trades in 5 minutes',
            'Best trading day of the year so far!',
            'Looking for good entry point on EUR/USD',
            'The market is crazy today',
            'Check out this pattern on $TSLA',
            'Who else is using the DROPBOT?',
          ];

          return {
            id: `msg-${i}`,
            userId: `user-${i % 7}`,
            username: usernames[i % 7],
            avatar: String.fromCharCode(65 + (i % 26)),
            verified: i % 5 === 0,
            isPro: i % 7 === 0,
            message: messages[i % messages.length],
            timestamp: new Date(Date.now() - (20 - i) * 60000),
            reactions: i % 3 === 0 ? [
              { emoji: '👍', count: Math.floor(Math.random() * 10) + 1, userReacted: false },
              { emoji: '🚀', count: Math.floor(Math.random() * 5) + 1, userReacted: false },
            ] : [],
            mentions: i % 4 === 0 ? ['@TraderPro'] : [],
            isPinned: i === 0,
            channel: currentChannel.id,
          };
        });

        setMessages(demoMessages);
      }
    };

    fetchMessages();

    // Simulate WebSocket connection
    setIsConnected(true);

    // TODO: Setup Socket.IO connection
    // const socket = io('/');
    // socket.on('connect', () => setIsConnected(true));
    // socket.on('disconnect', () => setIsConnected(false));
    // socket.emit('join_channel', currentChannel.id);
    // socket.on('new_message', (message) => {
    //   setMessages(prev => [...prev, message]);
    // });
    // return () => {
    //   socket.emit('leave_channel', currentChannel.id);
    //   socket.disconnect();
    // };

    // Simulate new messages (replace with Socket.IO in production)
    const interval = setInterval(() => {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        userId: `user-${Math.floor(Math.random() * 7)}`,
        username: ['TraderPro', 'CryptoKing', 'WallStWolf'][Math.floor(Math.random() * 3)],
        avatar: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        verified: Math.random() > 0.7,
        isPro: Math.random() > 0.8,
        message: [
          'Great analysis!',
          'Thanks for sharing!',
          'What do you think about this setup?',
          'Market looking strong today',
        ][Math.floor(Math.random() * 4)],
        timestamp: new Date(),
        reactions: [],
        mentions: [],
        isPinned: false,
        channel: currentChannel.id,
      };

      setMessages(prev => [...prev, newMessage]);
    }, 15000); // New message every 15 seconds

    return () => clearInterval(interval);
  }, [currentChannel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      const response = await fetch(`/api/v1/social/chat/${currentChannel.id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          replyTo: replyTo?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const newMessage = {
        ...data.message,
        timestamp: new Date(data.message.timestamp),
        reactions: [],
      };

      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      setReplyTo(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Fallback to local message
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        userId: 'current-user',
        username: 'You',
        avatar: 'Y',
        verified: true,
        isPro: true,
        message: inputMessage,
        timestamp: new Date(),
        reactions: [],
        mentions: inputMessage.match(/@\w+/g) || [],
        isPinned: false,
        channel: currentChannel.id,
      };

      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      setReplyTo(null);
      setShowEmojiPicker(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/v1/social/chat/${currentChannel.id}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, emoji }),
      });

      // Update local state optimistically
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const existingReaction = msg.reactions.find(r => r.emoji === emoji);
          if (existingReaction) {
            return {
              ...msg,
              reactions: msg.reactions.map(r =>
                r.emoji === emoji
                  ? { ...r, count: r.userReacted ? r.count - 1 : r.count + 1, userReacted: !r.userReacted }
                  : r
              ).filter(r => r.count > 0),
            };
          } else {
            return {
              ...msg,
              reactions: [...msg.reactions, { emoji, count: 1, userReacted: true }],
            };
          }
        }
        return msg;
      }));
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getChannelColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      orange: 'text-orange-400',
      purple: 'text-purple-400',
      cyan: 'text-cyan-400',
    };
    return colors[color] || 'text-slate-400';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Channels Sidebar */}
      <div className="w-64 card p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Channels</h2>
          <div className="flex items-center gap-1">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            )} />
            <span className="text-xs text-slate-400">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        <div className="space-y-1">
          {CHANNELS.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setCurrentChannel(channel)}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all',
                currentChannel.id === channel.id
                  ? 'bg-time-primary/20 text-time-primary border border-time-primary/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Hash className={clsx('w-4 h-4', getChannelColor(channel.color))} />
                <span className="font-medium">{channel.name}</span>
              </div>
              {channel.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {channel.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 px-3 py-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">
              <span className="text-green-400 font-semibold">{onlineUsers}</span> online
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 card flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hash className={clsx('w-5 h-5', getChannelColor(currentChannel.color))} />
              <h2 className="text-lg font-bold text-white">{currentChannel.name}</h2>
            </div>
            <p className="text-sm text-slate-400">{currentChannel.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{currentChannel.memberCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'group relative',
                message.isPinned && 'bg-yellow-500/5 border-l-2 border-yellow-500 pl-3 -ml-1'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {message.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{message.username}</span>
                    {message.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                    {message.isPro && (
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded font-bold">
                        PRO
                      </span>
                    )}
                    {message.isPinned && (
                      <Pin className="w-3 h-3 text-yellow-400" />
                    )}
                    <span className="text-xs text-slate-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-slate-300 break-words">
                    {message.message.split(' ').map((word, i) => (
                      <span key={i}>
                        {word.startsWith('@') ? (
                          <span className="text-time-primary font-medium">{word}</span>
                        ) : (
                          word
                        )}
                        {' '}
                      </span>
                    ))}
                  </p>

                  {/* Reactions */}
                  {message.reactions.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {message.reactions.map((reaction, i) => (
                        <button
                          key={i}
                          onClick={() => handleReaction(message.id, reaction.emoji)}
                          className={clsx(
                            'px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors',
                            reaction.userReacted
                              ? 'bg-time-primary/20 text-time-primary border border-time-primary/30'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          )}
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions (visible on hover) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Add reaction"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setReplyTo(message)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Reply"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute top-0 right-0 mt-8 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 flex gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReaction(message.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700/50">
          {replyTo && (
            <div className="mb-2 px-3 py-2 bg-slate-800/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Replying to</span>
                <span className="text-white font-medium">{replyTo.username}</span>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Message #${currentChannel.name}`}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                  <AtSign className="w-5 h-5" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="btn-primary px-4 py-3 flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Use @username to mention someone • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
