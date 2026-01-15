'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Gift,
  MessageSquare,
  Send,
  Trash2,
  Plus,
  Clock,
  Users,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  CheckCircle,
  Calendar,
  DollarSign,
  Percent,
  Tag,
  User,
} from 'lucide-react';
import { API_BASE, getAuthHeaders, getAuthHeadersWithCSRF } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GiftCode {
  code: string;
  tier: string;
  durationDays: number;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
}

export default function GiftAccessPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'gifts' | 'promos'>('chat');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Gift state
  const [gifts, setGifts] = useState<GiftCode[]>([]);
  const [isCreatingGift, setIsCreatingGift] = useState(false);
  const [giftTier, setGiftTier] = useState('PRO');
  const [giftDuration, setGiftDuration] = useState(30);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchChatHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/gift-access/chat/history`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
          setIsConnected(true);
        }
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGifts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/gift-access/gifts`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGifts(data.gifts || []);
        }
      }
    } catch (error) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchChatHistory();
    fetchGifts();
  }, [fetchChatHistory, fetchGifts]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Add user message immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const headers = await getAuthHeadersWithCSRF();
      const res = await fetch(`${API_BASE}/gift-access/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMessage }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.response) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to process command. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChatHistory = async () => {
    try {
      const headers = await getAuthHeadersWithCSRF();
      await fetch(`${API_BASE}/gift-access/chat/history`, {
        method: 'DELETE',
        headers,
      });
      setMessages([]);
    } catch (error) {
      // Ignore
    }
  };

  const createGift = async () => {
    setIsCreatingGift(true);
    try {
      const headers = await getAuthHeadersWithCSRF();
      const res = await fetch(`${API_BASE}/gift-access/gift`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tier: giftTier,
          durationDays: giftDuration,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          fetchGifts();
        }
      }
    } catch (error) {
      // Ignore
    } finally {
      setIsCreatingGift(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const tiers = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE', 'UNLIMITED'];
  const durations = [7, 14, 30, 90, 365];

  const quickCommands = [
    { label: 'System Status', cmd: 'status' },
    { label: 'List Active Gifts', cmd: 'list gifts' },
    { label: 'Bot Stats', cmd: 'bot stats' },
    { label: 'User Count', cmd: 'user count' },
    { label: 'Revenue Today', cmd: 'revenue today' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Gift className="w-8 h-8 text-pink-400" />
                Gift Access Manager
              </h1>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
              }`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{isConnected ? 'Live' : 'Demo'}</span>
              </div>
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-bold">
                ADMIN ONLY
              </span>
            </div>
            <p className="text-gray-400 mt-2">
              Admin chatbot, gift codes, and promotional management
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'chat', label: 'Admin Chatbot', icon: MessageSquare },
            { id: 'gifts', label: 'Gift Codes', icon: Gift },
            { id: 'promos', label: 'Promo Calendar', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
          </div>
        ) : (
          <>
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Quick Commands */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <h3 className="font-bold mb-3">Quick Commands</h3>
                    <div className="space-y-2">
                      {quickCommands.map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputMessage(cmd.cmd);
                          }}
                          className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-left text-sm transition-colors"
                        >
                          {cmd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chat Window */}
                <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-gray-800 flex flex-col" style={{ height: '600px' }}>
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-pink-400" />
                      Admin Command Interface
                    </h2>
                    <button
                      onClick={clearChatHistory}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Try a command!</p>
                      </div>
                    ) : (
                      messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-pink-500/20 text-pink-100'
                                : 'bg-gray-800 text-gray-200'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a command..."
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={isSending || !inputMessage.trim()}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 rounded-lg transition-colors"
                      >
                        {isSending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gifts Tab */}
            {activeTab === 'gifts' && (
              <div className="space-y-6">
                {/* Create Gift */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-pink-400" />
                    Create Gift Code
                  </h2>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Tier</label>
                      <select
                        value={giftTier}
                        onChange={(e) => setGiftTier(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                      >
                        {tiers.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Duration (days)</label>
                      <select
                        value={giftDuration}
                        onChange={(e) => setGiftDuration(Number(e.target.value))}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                      >
                        {durations.map(d => (
                          <option key={d} value={d}>{d} days</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={createGift}
                      disabled={isCreatingGift}
                      className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 rounded-lg font-medium flex items-center gap-2"
                    >
                      {isCreatingGift ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Gift className="w-5 h-5" />
                      )}
                      Generate Code
                    </button>
                  </div>
                </div>

                {/* Gift List */}
                <div className="bg-gray-900 rounded-xl border border-gray-800">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold">Active Gift Codes</h2>
                  </div>
                  {gifts.length === 0 ? (
                    <div className="p-12 text-center">
                      <Gift className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400">No Gift Codes</h3>
                      <p className="text-gray-500 mt-2">Create your first gift code above</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {gifts.map((gift, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-800/50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
                              <Tag className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                              <div className="font-mono font-bold">{gift.code}</div>
                              <div className="text-sm text-gray-400">
                                {gift.tier} • {gift.durationDays} days
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {gift.usedBy ? (
                              <div className="flex items-center gap-2 text-green-400 text-sm">
                                <User className="w-4 h-4" />
                                Used by {gift.usedBy}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                Expires {new Date(gift.expiresAt).toLocaleDateString()}
                              </div>
                            )}
                            <button
                              onClick={() => copyToClipboard(gift.code)}
                              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded flex items-center gap-1"
                            >
                              {copiedCode === gift.code ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Promos Tab */}
            {activeTab === 'promos' && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-6">Promotional Calendar 2025</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'New Year Sale', date: 'Jan 1-7', discount: '25%' },
                    { name: 'Valentine\'s Day', date: 'Feb 14', discount: '15%' },
                    { name: 'Spring Sale', date: 'Mar 20-27', discount: '20%' },
                    { name: 'Summer Launch', date: 'Jun 1-7', discount: '30%' },
                    { name: 'Back to Trading', date: 'Sep 1-7', discount: '20%' },
                    { name: 'Black Friday', date: 'Nov 28', discount: '50%' },
                    { name: 'Cyber Monday', date: 'Dec 1', discount: '50%' },
                    { name: 'Holiday Sale', date: 'Dec 20-31', discount: '40%' },
                  ].map((promo, i) => (
                    <div key={i} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold">{promo.name}</h3>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded">
                          {promo.discount} OFF
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        {promo.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
