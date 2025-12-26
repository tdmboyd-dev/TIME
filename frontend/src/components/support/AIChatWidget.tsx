'use client';

/**
 * AI Chat Support Widget
 *
 * Floating chat widget providing 24/7 AI support:
 * - Bottom-right corner chat bubble
 * - Expandable chat window
 * - Real-time typing indicators
 * - Message history persistence
 * - Quick action buttons
 * - Minimize/maximize toggle
 * - Dark theme matching platform
 */

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Loader2,
  Bot,
  User,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  action: string;
  category?: string;
}

// Default quick actions in case API fails
const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'pricing',
    title: 'Show pricing plans',
    description: 'View subscription tiers',
    action: 'What are the pricing plans?',
    category: 'billing',
  },
  {
    id: 'how-to-trade',
    title: 'How do I start trading?',
    description: 'Connect a broker and enable bots',
    action: 'How do I start trading?',
    category: 'trading',
  },
  {
    id: 'connect-broker',
    title: 'Connect my broker',
    description: 'Link Alpaca, IB, OANDA, or others',
    action: 'How do I connect my broker?',
    category: 'broker',
  },
  {
    id: 'bot-help',
    title: 'My bot isn\'t trading',
    description: 'Troubleshoot bot issues',
    action: 'My bot is not trading. What should I check?',
    category: 'bot',
  },
  {
    id: 'dropbot',
    title: 'What is DROPBOT?',
    description: 'Learn about AutoPilot',
    action: 'What is DROPBOT AutoPilot and how much does it cost?',
    category: 'features',
  },
  {
    id: 'umm',
    title: 'Ultimate Money Machine',
    description: 'Premium trading features',
    action: 'What is the Ultimate Money Machine add-on?',
    category: 'features',
  },
];

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [shouldEscalate, setShouldEscalate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate session ID on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('support_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadChatHistory(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('support_session_id', newSessionId);
    }

    // Load quick actions
    loadQuickActions();

    // Show welcome message
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI support assistant. How can I help you today? You can ask me about trading, bots, broker connections, or any other questions about TIME BEYOND US.",
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Load chat history from server
  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch('/api/support/history', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.sessions && data.sessions.length > 0) {
          const latestSession = data.sessions.find((s: any) => s.sessionId === sessionId);
          if (latestSession && latestSession.messages) {
            const formattedMessages = latestSession.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              intent: msg.intent,
            }));
            setMessages(formattedMessages);
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Load quick actions
  const loadQuickActions = async () => {
    try {
      const response = await fetch('/api/support/quick-actions');
      if (response.ok) {
        const data = await response.json();
        setQuickActions(data.actions || DEFAULT_QUICK_ACTIONS);
      } else {
        // Use default quick actions if API fails
        setQuickActions(DEFAULT_QUICK_ACTIONS);
      }
    } catch (error) {
      console.error('Error loading quick actions:', error);
      // Use default quick actions if API fails
      setQuickActions(DEFAULT_QUICK_ACTIONS);
    }
  };

  // Send message
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        intent: data.intent,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if we should escalate
      if (data.shouldEscalate) {
        setShouldEscalate(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: "I'm having trouble processing your request. Please try again or create a support ticket for immediate assistance.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action click
  const handleQuickAction = (action: QuickAction) => {
    // Use the action string if provided, otherwise use the title
    sendMessage(action.action || action.title);
  };

  // Create support ticket
  const createTicket = () => {
    window.location.href = '/support';
  };

  // Toggle widget
  const toggleWidget = () => {
    if (isOpen && !isMinimized) {
      setIsMinimized(true);
    } else if (isOpen && isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  // Close widget
  const closeWidget = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleWidget}
        className="fixed bottom-6 right-6 z-50 bg-time-primary hover:bg-time-primary-dark text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
        aria-label="Open support chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl transition-all duration-300',
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-6 h-6 text-time-primary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></span>
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Support</h3>
            <p className="text-xs text-slate-400">Online 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            aria-label="Minimize"
          >
            <Minimize2 className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={closeWidget}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(600px-180px)]">
            {messages.map(message => (
              <div
                key={message.id}
                className={clsx(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-time-primary/20 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-time-primary" />
                    </div>
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[80%] rounded-lg p-3',
                    message.role === 'user'
                      ? 'bg-time-primary text-white'
                      : 'bg-slate-800 text-slate-200'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-time-primary/20 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-time-primary" />
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-time-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-time-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-time-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs text-slate-400 ml-1">AI is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && quickActions.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50 max-h-40 overflow-y-auto">
              <p className="text-xs text-slate-400 mb-2">Suggested questions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 6).map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className="text-left p-2 bg-slate-800 hover:bg-slate-700 hover:border-time-primary/50 border border-slate-600 rounded text-xs text-slate-300 transition-all duration-200"
                  >
                    <span className="block font-medium text-white truncate">{action.title}</span>
                    {action.description && (
                      <span className="text-slate-400 text-[10px] truncate block">{action.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Escalation Banner */}
          {shouldEscalate && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-amber-400 font-medium">Need human support?</p>
                  <button
                    onClick={createTicket}
                    className="text-xs text-amber-300 hover:text-amber-200 underline flex items-center gap-1 mt-1"
                  >
                    Create a support ticket
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-slate-900 text-white px-3 py-2 rounded border border-slate-600 focus:border-time-primary focus:outline-none text-sm"
                disabled={isLoading}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-time-primary hover:bg-time-primary-dark text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-2">
              AI responses may not always be accurate.{' '}
              <button
                onClick={createTicket}
                className="text-time-primary hover:text-time-primary-light underline"
              >
                Create ticket
              </button>{' '}
              for complex issues.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
