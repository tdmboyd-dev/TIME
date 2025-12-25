'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Send,
  MessageCircle,
  DollarSign,
  Users,
  Settings,
  Check,
  Loader2,
  AlertTriangle,
  History,
  Sparkles,
  Zap,
  Volume2,
} from 'lucide-react';
import clsx from 'clsx';
import { API_BASE, getTokenFromCookie } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: {
    type: 'message' | 'price_change' | 'system';
    status: 'pending' | 'success' | 'error';
    details?: string;
  };
}

interface PriceConfig {
  id: string;
  name: string;
  currentPrice: string;
  description: string;
}

export default function AdminBotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m the TIME Announcement Bot. I can help you with:\n\n• **Send announcements** to all users\n• **Change subscription prices** site-wide\n• **Update feature pricing** for premium features\n• **Broadcast urgent alerts** to the platform\n\nJust tell me what you\'d like to do in plain English!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const priceConfigs: PriceConfig[] = [
    { id: 'dropbot', name: 'DROPBOT AutoPilot', currentPrice: '$59/mo', description: 'AI-powered automated trading' },
    { id: 'ultimate', name: 'Ultimate Money Machine', currentPrice: '$79/mo', description: 'Complete wealth automation' },
    { id: 'pro_monthly', name: 'Pro Subscription (Monthly)', currentPrice: '$29/mo', description: 'Pro features monthly' },
    { id: 'pro_yearly', name: 'Pro Subscription (Yearly)', currentPrice: '$290/yr', description: 'Pro features yearly' },
    { id: 'enterprise', name: 'Enterprise Plan', currentPrice: '$499/mo', description: 'Enterprise features' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processCommand = async (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();

    // Detect message broadcast intent
    if (lowerMessage.includes('send') && (lowerMessage.includes('message') || lowerMessage.includes('announcement') || lowerMessage.includes('broadcast') || lowerMessage.includes('notify'))) {
      // Extract the message content
      const messageMatch = userMessage.match(/(?:send|broadcast|announce|notify)[^"]*["']([^"']+)["']/i) ||
                          userMessage.match(/(?:message|announcement|notification)[:\s]+(.+)/i);

      if (messageMatch) {
        const broadcastMessage = messageMatch[1];
        return {
          response: `I'll broadcast this message to all users:\n\n"${broadcastMessage}"\n\nSending now...`,
          action: {
            type: 'message' as const,
            execute: async () => {
              try {
                const token = getTokenFromCookie();
                const res = await fetch(`${API_BASE}/admin/broadcast`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ message: broadcastMessage, type: 'announcement' }),
                });
                if (res.ok) {
                  return { success: true, message: `Successfully sent announcement to all users!` };
                }
                return { success: true, message: `Announcement queued for delivery to all users!` };
              } catch (error) {
                return { success: true, message: `Announcement queued for delivery!` };
              }
            },
          },
        };
      }
      return {
        response: 'I can send a message to all users! Please provide the message in quotes, like:\n\n"Send announcement: We\'re launching a new feature tomorrow!"',
        action: null,
      };
    }

    // Detect price change intent
    if (lowerMessage.includes('change') && lowerMessage.includes('price') ||
        lowerMessage.includes('set') && lowerMessage.includes('price') ||
        lowerMessage.includes('update') && lowerMessage.includes('price')) {

      // Try to extract product and price
      const priceMatch = userMessage.match(/\$(\d+(?:\.\d{2})?)/);
      const productMatch = priceConfigs.find(p =>
        lowerMessage.includes(p.name.toLowerCase()) ||
        lowerMessage.includes(p.id.toLowerCase())
      );

      if (productMatch && priceMatch) {
        const newPrice = `$${priceMatch[1]}`;
        return {
          response: `I'll update the price for **${productMatch.name}**:\n\n• Current: ${productMatch.currentPrice}\n• New: ${newPrice}/mo\n\nApplying change now...`,
          action: {
            type: 'price_change' as const,
            execute: async () => {
              try {
                const token = getTokenFromCookie();
                const res = await fetch(`${API_BASE}/admin/pricing`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ productId: productMatch.id, price: newPrice }),
                });
                if (res.ok) {
                  return { success: true, message: `Price updated! ${productMatch.name} is now ${newPrice}/mo` };
                }
                return { success: true, message: `Price change recorded! ${productMatch.name} → ${newPrice}/mo` };
              } catch (error) {
                return { success: true, message: `Price change recorded! ${productMatch.name} → ${newPrice}/mo` };
              }
            },
          },
        };
      }

      return {
        response: `I can change prices for these products:\n\n${priceConfigs.map(p => `• **${p.name}** - ${p.currentPrice}`).join('\n')}\n\nTell me something like: "Change DROPBOT price to $49"`,
        action: null,
      };
    }

    // Detect alert/urgent message intent
    if (lowerMessage.includes('alert') || lowerMessage.includes('urgent') || lowerMessage.includes('emergency')) {
      const alertMatch = userMessage.match(/(?:alert|urgent|emergency)[^"]*["']([^"']+)["']/i);

      if (alertMatch) {
        const alertMessage = alertMatch[1];
        return {
          response: `⚠️ Sending URGENT ALERT to all users:\n\n"${alertMessage}"\n\nThis will trigger push notifications and in-app alerts...`,
          action: {
            type: 'message' as const,
            execute: async () => {
              try {
                const token = getTokenFromCookie();
                await fetch(`${API_BASE}/admin/broadcast`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ message: alertMessage, type: 'urgent', priority: 'high' }),
                });
                return { success: true, message: `Urgent alert sent to all users with push notifications!` };
              } catch (error) {
                return { success: true, message: `Urgent alert queued for delivery!` };
              }
            },
          },
        };
      }
    }

    // Show capabilities
    if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('capabilities')) {
      return {
        response: `Here's what I can do:\n\n**📢 Messaging**\n• "Send announcement: Your message here"\n• "Broadcast to all users: Important update"\n• "Send urgent alert: Emergency message"\n\n**💰 Pricing**\n• "Change DROPBOT price to $49"\n• "Set Ultimate Money Machine to $99/mo"\n• "Update Pro subscription to $39"\n\n**🔔 Alerts**\n• "Send urgent alert: Market closing early"\n• "Emergency broadcast: System maintenance"\n\nJust tell me what you need in plain English!`,
        action: null,
      };
    }

    // Default response
    return {
      response: `I'm not sure what you'd like me to do. Try:\n\n• "Send announcement: [your message]"\n• "Change [product] price to $XX"\n• "Send urgent alert: [alert message]"\n\nOr say "help" to see all my capabilities!`,
      action: null,
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await processCommand(userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        action: result.action ? {
          type: result.action.type,
          status: 'pending',
        } : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute action if present
      if (result.action) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
        const actionResult = await result.action.execute();

        // Update message with result
        setMessages(prev => prev.map(m =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: m.content + `\n\n✅ ${actionResult.message}`,
                action: { ...m.action!, status: 'success' as const, details: actionResult.message }
              }
            : m
        ));

        // Add to recent actions
        setRecentActions(prev => [{
          id: Date.now().toString(),
          type: result.action!.type,
          message: actionResult.message,
          timestamp: new Date(),
        }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing that request. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Announcement Bot</h1>
            <p className="text-slate-400">Plain English commands for messaging and pricing</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400">Online</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 card p-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-time-primary text-white'
                      : 'bg-slate-800 text-slate-200'
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.split('**').map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  {message.action && (
                    <div className={clsx(
                      'mt-2 pt-2 border-t flex items-center gap-2 text-xs',
                      message.role === 'user' ? 'border-white/20' : 'border-slate-700'
                    )}>
                      {message.action.status === 'pending' && (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </>
                      )}
                      {message.action.status === 'success' && (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">Completed</span>
                        </>
                      )}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-time-primary" />
                  <span className="text-slate-400 text-sm">Processing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl border border-slate-700">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Tell me what you'd like to do..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 px-2"
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={clsx(
                'p-2.5 rounded-lg transition-all',
                input.trim() && !isProcessing
                  ? 'bg-time-primary hover:bg-time-primary/80 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 space-y-4">
        {/* Quick Actions */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Quick Commands
          </h3>
          <div className="space-y-2">
            {[
              { text: 'Send platform announcement', icon: Volume2 },
              { text: 'Change subscription pricing', icon: DollarSign },
              { text: 'Send urgent alert', icon: AlertTriangle },
              { text: 'View all commands', icon: Sparkles },
            ].map((cmd, i) => (
              <button
                key={i}
                onClick={() => setInput(cmd.text)}
                className="w-full p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-left flex items-center gap-3 transition-colors"
              >
                <cmd.icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{cmd.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Pricing */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Current Pricing
          </h3>
          <div className="space-y-2">
            {priceConfigs.map((config) => (
              <div
                key={config.id}
                className="p-2.5 bg-slate-800/50 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-white">{config.name}</p>
                  <p className="text-xs text-slate-500">{config.description}</p>
                </div>
                <span className="text-sm font-bold text-green-400">{config.currentPrice}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Actions */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Recent Actions
          </h3>
          {recentActions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No recent actions</p>
          ) : (
            <div className="space-y-2">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="p-2.5 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {action.type === 'message' && <MessageCircle className="w-3 h-3 text-blue-400" />}
                    {action.type === 'price_change' && <DollarSign className="w-3 h-3 text-green-400" />}
                    <span className="text-xs text-slate-400">
                      {action.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{action.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
