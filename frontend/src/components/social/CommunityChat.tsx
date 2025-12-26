'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Smile,
  Image,
  AtSign,
  Hash,
  Pin,
  MoreVertical,
  Reply,
  Heart,
  ThumbsUp,
  Trash2,
  Flag,
  Shield,
  Crown,
  Sparkles,
  TrendingUp,
  Bot,
  Bitcoin,
  DollarSign,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Users,
  X,
  Check,
  Settings,
  Bell,
  BellOff,
} from 'lucide-react';
import clsx from 'clsx';
import { API_BASE } from '@/lib/api';

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'general' | 'crypto' | 'stocks' | 'forex' | 'options' | 'bots' | 'strategies' | 'help';
  memberCount: number;
  isActive: boolean;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  isPro: boolean;
  role: 'user' | 'moderator' | 'admin';
  badges: string[];
  content: string;
  timestamp: Date;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  replyTo?: { id: string; username: string; content: string };
  isPinned: boolean;
  isDeleted: boolean;
  attachments?: { type: string; data: any }[];
}

const channelIcons: Record<string, any> = {
  general: MessageCircle,
  crypto: Bitcoin,
  stocks: TrendingUp,
  forex: DollarSign,
  options: Layers,
  bots: Bot,
  strategies: Sparkles,
  help: HelpCircle,
};

const defaultChannels: ChatChannel[] = [
  { id: 'general', name: 'General', description: 'General trading discussion', icon: 'MessageCircle', color: '#3B82F6', category: 'general', memberCount: 12453, isActive: true, unreadCount: 5 },
  { id: 'crypto', name: 'Crypto Trading', description: 'Bitcoin, Ethereum, and altcoin discussion', icon: 'Bitcoin', color: '#F59E0B', category: 'crypto', memberCount: 8932, isActive: true, unreadCount: 12 },
  { id: 'stocks', name: 'Stocks & ETFs', description: 'Stock market and ETF discussion', icon: 'TrendingUp', color: '#22C55E', category: 'stocks', memberCount: 7654, isActive: true, unreadCount: 0 },
  { id: 'forex', name: 'Forex', description: 'Currency trading discussion', icon: 'DollarSign', color: '#8B5CF6', category: 'forex', memberCount: 5432, isActive: true, unreadCount: 3 },
  { id: 'options', name: 'Options', description: 'Options trading strategies', icon: 'Layers', color: '#EC4899', category: 'options', memberCount: 3210, isActive: true, unreadCount: 0 },
  { id: 'bots', name: 'Trading Bots', description: 'Bot development and automation', icon: 'Bot', color: '#14B8A6', category: 'bots', memberCount: 4567, isActive: true, unreadCount: 8 },
  { id: 'strategies', name: 'Strategy Lab', description: 'Strategy development and backtesting', icon: 'Sparkles', color: '#6366F1', category: 'strategies', memberCount: 2890, isActive: true, unreadCount: 0 },
  { id: 'help', name: 'Help & Support', description: 'Get help from the community', icon: 'HelpCircle', color: '#F97316', category: 'help', memberCount: 1234, isActive: true, unreadCount: 0 },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    channelId: 'general',
    userId: '1',
    username: 'AlphaTrader_Pro',
    displayName: 'Alpha Trader',
    avatar: 'AT',
    verified: true,
    isPro: true,
    role: 'user',
    badges: ['top_trader', 'verified'],
    content: 'GM everyone! Markets are looking interesting today. BTC holding strong above 43k, expecting a breakout soon.',
    timestamp: new Date(Date.now() - 300000),
    reactions: [{ emoji: 'fire', count: 12, hasReacted: false }, { emoji: 'rocket', count: 8, hasReacted: true }],
    isPinned: false,
    isDeleted: false,
  },
  {
    id: '2',
    channelId: 'general',
    userId: '2',
    username: 'CryptoKing',
    displayName: 'Crypto King',
    avatar: 'CK',
    verified: true,
    isPro: true,
    role: 'user',
    badges: ['signal_master'],
    content: '@AlphaTrader_Pro Agreed! The weekly chart is showing a clear bull flag. I\'m positioned long with stops below 42.5k.',
    timestamp: new Date(Date.now() - 240000),
    reactions: [{ emoji: 'thumbsUp', count: 5, hasReacted: false }],
    replyTo: { id: '1', username: 'AlphaTrader_Pro', content: 'GM everyone! Markets are looking...' },
    isPinned: false,
    isDeleted: false,
  },
  {
    id: '3',
    channelId: 'general',
    userId: '3',
    username: 'ValueHunter',
    displayName: 'Value Hunter',
    avatar: 'VH',
    verified: false,
    isPro: false,
    role: 'user',
    badges: [],
    content: 'Anyone watching NVDA today? Earnings coming up next week.',
    timestamp: new Date(Date.now() - 180000),
    reactions: [],
    isPinned: false,
    isDeleted: false,
  },
  {
    id: '4',
    channelId: 'general',
    userId: '4',
    username: 'TIME_Mod',
    displayName: 'TIME Moderator',
    avatar: 'TM',
    verified: true,
    isPro: true,
    role: 'moderator',
    badges: ['moderator', 'staff'],
    content: 'Reminder: Please keep discussions respectful and on-topic. Check out our new Strategy Lab channel for advanced strategy discussions!',
    timestamp: new Date(Date.now() - 120000),
    reactions: [{ emoji: 'heart', count: 15, hasReacted: false }],
    isPinned: true,
    isDeleted: false,
  },
  {
    id: '5',
    channelId: 'general',
    userId: '5',
    username: 'NewTrader2025',
    displayName: 'New Trader',
    avatar: 'NT',
    verified: false,
    isPro: false,
    role: 'user',
    badges: [],
    content: 'Just started my trading journey! Any tips for a beginner?',
    timestamp: new Date(Date.now() - 60000),
    reactions: [{ emoji: 'wave', count: 8, hasReacted: false }, { emoji: 'star', count: 3, hasReacted: false }],
    isPinned: false,
    isDeleted: false,
  },
];

const emojiList = ['thumbsUp', 'heart', 'fire', 'rocket', 'eyes', 'clap', 'star', 'wave', '100', 'thinking'];
const emojiMap: Record<string, string> = {
  thumbsUp: 'thumb_up',
  heart: 'favorite',
  fire: 'local_fire_department',
  rocket: 'rocket_launch',
  eyes: 'visibility',
  clap: 'sign_language',
  star: 'star',
  wave: 'waving_hand',
  '100': 'looks_one',
  thinking: 'psychology',
};

export function CommunityChat() {
  const [channels, setChannels] = useState<ChatChannel[]>(defaultChannels);
  const [activeChannel, setActiveChannel] = useState<ChatChannel>(defaultChannels[0]);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Fetch messages for active channel
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/social/chat/messages?channel=${activeChannel.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setMessages(data.data);
          }
        }
      } catch {
        // Use mock data
        setMessages(mockMessages.filter(m => m.channelId === activeChannel.id));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    // Reset unread count
    setChannels(prev => prev.map(c =>
      c.id === activeChannel.id ? { ...c, unreadCount: 0 } : c
    ));
  }, [activeChannel.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      channelId: activeChannel.id,
      userId: 'current_user',
      username: 'You',
      displayName: 'You',
      avatar: 'YO',
      verified: false,
      isPro: false,
      role: 'user',
      badges: [],
      content: newMessage,
      timestamp: new Date(),
      reactions: [],
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username, content: replyingTo.content.substring(0, 50) + '...' } : undefined,
      isPinned: false,
      isDeleted: false,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyingTo(null);

    // Send to API
    try {
      await fetch(`${API_BASE}/social/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeChannel.id, content: newMessage, replyToId: replyingTo?.id }),
      });
    } catch {
      // Message already added optimistically
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      const existingReaction = msg.reactions.find(r => r.emoji === emoji);
      if (existingReaction) {
        if (existingReaction.hasReacted) {
          // Remove reaction
          return {
            ...msg,
            reactions: msg.reactions.map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, hasReacted: false }
                : r
            ).filter(r => r.count > 0),
          };
        } else {
          // Add reaction
          return {
            ...msg,
            reactions: msg.reactions.map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, hasReacted: true }
                : r
            ),
          };
        }
      } else {
        // New reaction
        return {
          ...msg,
          reactions: [...msg.reactions, { emoji, count: 1, hasReacted: true }],
        };
      }
    }));
    setShowEmojiPicker(null);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-400';
      case 'moderator':
        return 'text-green-400';
      default:
        return 'text-white';
    }
  };

  const ChannelIcon = channelIcons[activeChannel.category] || MessageCircle;

  return (
    <div className="flex h-[600px] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" />
            Channels
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map((channel) => {
            const Icon = channelIcons[channel.category] || MessageCircle;
            return (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  activeChannel.id === channel.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" style={{ color: channel.color }} />
                <span className="flex-1 text-sm truncate">{channel.name}</span>
                {channel.unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-time-primary text-white rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{channels.reduce((s, c) => s + c.memberCount, 0).toLocaleString()} members</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              1,234 online
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <ChannelIcon className="w-5 h-5" style={{ color: activeChannel.color }} />
            <div>
              <h4 className="font-medium text-white">{activeChannel.name}</h4>
              <p className="text-xs text-slate-500">{activeChannel.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuteNotifications(!muteNotifications)}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              {muteNotifications ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowMemberList(!showMemberList)}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400">No messages yet</p>
              <p className="text-sm text-slate-500">Be the first to say something!</p>
            </div>
          ) : (
            <>
              {messages.filter(m => !m.isDeleted).map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    'group flex gap-3',
                    message.isPinned && 'bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/20'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {message.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('font-medium', getRoleColor(message.role))}>
                        {message.displayName}
                      </span>
                      {message.verified && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                      {message.isPro && (
                        <span className="px-1 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">PRO</span>
                      )}
                      {message.role === 'moderator' && (
                        <span className="px-1 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">MOD</span>
                      )}
                      {message.role === 'admin' && (
                        <span className="px-1 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">ADMIN</span>
                      )}
                      {message.isPinned && <Pin className="w-3 h-3 text-yellow-400" />}
                      <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                    </div>

                    {message.replyTo && (
                      <div className="mb-2 pl-3 border-l-2 border-slate-600">
                        <p className="text-xs text-slate-500">
                          Replying to <span className="text-slate-400">@{message.replyTo.username}</span>
                        </p>
                        <p className="text-xs text-slate-500 truncate">{message.replyTo.content}</p>
                      </div>
                    )}

                    <p className="text-slate-300 break-words">{message.content}</p>

                    {/* Reactions */}
                    {message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(message.id, reaction.emoji)}
                            className={clsx(
                              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors',
                              reaction.hasReacted
                                ? 'bg-time-primary/20 text-time-primary'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            )}
                          >
                            <span>{reaction.emoji === 'thumbsUp' ? '👍' : reaction.emoji === 'heart' ? '❤️' : reaction.emoji === 'fire' ? '🔥' : reaction.emoji === 'rocket' ? '🚀' : '⭐'}</span>
                            <span>{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons (on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-2 transition-opacity">
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(message);
                          inputRef.current?.focus();
                        }}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Emoji Picker */}
                    {showEmojiPicker === message.id && (
                      <div className="absolute mt-2 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg flex gap-1 z-10">
                        {['👍', '❤️', '🔥', '🚀', '👀', '👏', '⭐', '👋', '💯', '🤔'].map((emoji, i) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emojiList[i])}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">
                Replying to <span className="text-white">@{replyingTo.username}</span>
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Message #${activeChannel.name}`}
                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
              />
              <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <AtSign className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <Smile className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <Image className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={clsx(
                'p-3 rounded-lg transition-colors',
                newMessage.trim()
                  ? 'bg-time-primary text-white hover:bg-time-primary/80'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Member List (optional sidebar) */}
      {showMemberList && (
        <div className="w-64 bg-slate-800/50 border-l border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-white">Members</h4>
            <button onClick={() => setShowMemberList(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Online - 5</div>
            {['AlphaTrader_Pro', 'CryptoKing', 'ValueHunter', 'TIME_Mod', 'NewTrader2025'].map((name) => (
              <div key={name} className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-time-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-slate-800 rounded-full" />
                </div>
                <span className="text-sm text-slate-300">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityChat;
