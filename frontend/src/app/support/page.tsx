'use client';

/**
 * Support Page
 *
 * Comprehensive support center with:
 * - AI chat in main area
 * - FAQ accordion
 * - Contact form for human support
 * - Support ticket history
 */

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  HelpCircle,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Plus,
  ExternalLink,
  Ticket,
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  helpful_votes: number;
  unhelpful_votes: number;
}

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'tickets' | 'contact'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    message: '',
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    const storedSessionId = localStorage.getItem('support_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadChatHistory(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('support_session_id', newSessionId);

      // Welcome message
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your AI support assistant. How can I help you today? You can ask me about trading, bots, broker connections, or any other questions about TIME BEYOND US.",
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }

    loadFAQs();
    loadTickets();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history
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

  // Load FAQs
  const loadFAQs = async () => {
    try {
      const response = await fetch('/api/support/faq');
      if (response.ok) {
        const data = await response.json();
        setFaqs(data.faqs || []);
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
    }
  };

  // Load tickets
  const loadTickets = async () => {
    try {
      const response = await fetch('/api/support/tickets', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    const text = input.trim();
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
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: "I'm having trouble processing your request. Please try again or create a support ticket.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit ticket
  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitting(true);
    setTicketSuccess(false);

    try {
      const response = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(ticketForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      setTicketSuccess(true);
      setTicketForm({
        subject: '',
        category: 'general',
        priority: 'medium',
        message: '',
      });

      // Reload tickets
      loadTickets();

      // Switch to tickets tab
      setTimeout(() => setActiveTab('tickets'), 2000);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create support ticket. Please try again.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Vote on FAQ
  const voteFAQ = async (faqId: string, helpful: boolean) => {
    try {
      await fetch(`/api/support/faq/${faqId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });

      // Update local state
      setFaqs(faqs.map(faq =>
        faq._id === faqId
          ? {
              ...faq,
              helpful_votes: helpful ? faq.helpful_votes + 1 : faq.helpful_votes,
              unhelpful_votes: !helpful ? faq.unhelpful_votes + 1 : faq.unhelpful_votes,
            }
          : faq
      ));
    } catch (error) {
      console.error('Error voting on FAQ:', error);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/20 text-blue-400';
      case 'in_progress':
        return 'bg-amber-500/20 text-amber-400';
      case 'resolved':
        return 'bg-green-500/20 text-green-400';
      case 'closed':
        return 'bg-slate-500/20 text-slate-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Support Center</h1>
          <p className="text-slate-400">
            Get help from our AI assistant or contact our support team
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2',
              activeTab === 'chat'
                ? 'text-time-primary border-time-primary'
                : 'text-slate-400 border-transparent hover:text-white'
            )}
          >
            <MessageCircle className="w-5 h-5" />
            AI Chat Support
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2',
              activeTab === 'tickets'
                ? 'text-time-primary border-time-primary'
                : 'text-slate-400 border-transparent hover:text-white'
            )}
          >
            <Ticket className="w-5 h-5" />
            My Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2',
              activeTab === 'contact'
                ? 'text-time-primary border-time-primary'
                : 'text-slate-400 border-transparent hover:text-white'
            )}
          >
            <Mail className="w-5 h-5" />
            Create Ticket
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'chat' && (
              <div className="card h-[700px] flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-700">
                  <div className="relative">
                    <Bot className="w-8 h-8 text-time-primary" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">AI Support Assistant</h3>
                    <p className="text-xs text-slate-400">Online 24/7 • Average response time: instant</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          <div className="w-10 h-10 bg-time-primary/20 rounded-full flex items-center justify-center">
                            <Bot className="w-6 h-6 text-time-primary" />
                          </div>
                        </div>
                      )}
                      <div
                        className={clsx(
                          'max-w-[70%] rounded-lg p-4',
                          message.role === 'user'
                            ? 'bg-time-primary text-white'
                            : 'bg-slate-800 text-slate-200'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-slate-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-time-primary/20 rounded-full flex items-center justify-center">
                          <Bot className="w-6 h-6 text-time-primary" />
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-4">
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-700">
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
                      className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-time-primary focus:outline-none"
                      disabled={isLoading}
                      maxLength={1000}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="bg-time-primary hover:bg-time-primary-dark text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-4">
                {tickets.length === 0 ? (
                  <div className="card p-12 text-center">
                    <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No support tickets</h3>
                    <p className="text-slate-400 mb-6">
                      You haven't created any support tickets yet.
                    </p>
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="btn-primary"
                    >
                      Create Your First Ticket
                    </button>
                  </div>
                ) : (
                  tickets.map(ticket => (
                    <div key={ticket._id} className="card p-6 hover:border-slate-600 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {ticket.subject}
                          </h3>
                          <p className="text-sm text-slate-400">
                            Ticket #{ticket.ticketNumber}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            getStatusColor(ticket.status)
                          )}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="capitalize">{ticket.category}</span>
                        <span>•</span>
                        <span className="capitalize">{ticket.priority} priority</span>
                        <span>•</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="card p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Create Support Ticket</h2>
                <p className="text-slate-400 mb-6">
                  Our support team typically responds within 1-2 hours during business hours.
                </p>

                {ticketSuccess && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-green-400 font-medium">Ticket created successfully!</p>
                      <p className="text-green-400/70 text-sm mt-1">
                        We'll get back to you shortly. Check the "My Tickets" tab for updates.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={submitTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-time-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Category *
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-time-primary focus:outline-none"
                      >
                        <option value="general">General</option>
                        <option value="technical">Technical Issue</option>
                        <option value="trading">Trading Help</option>
                        <option value="broker">Broker Connection</option>
                        <option value="billing">Billing & Payments</option>
                        <option value="bot">Bot Questions</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-time-primary focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      placeholder="Please provide as much detail as possible..."
                      rows={8}
                      className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-time-primary focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {ticketSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating Ticket...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Create Ticket
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar - FAQs */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-time-primary" />
                <h2 className="text-xl font-bold text-white">FAQ</h2>
              </div>

              <div className="space-y-2">
                {faqs.length === 0 ? (
                  <p className="text-slate-400 text-sm">Loading FAQs...</p>
                ) : (
                  faqs.map(faq => (
                    <div key={faq._id} className="border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === faq._id ? null : faq._id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800 transition-colors"
                      >
                        <span className="text-sm font-medium text-white pr-2">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={clsx(
                            'w-4 h-4 text-slate-400 transition-transform flex-shrink-0',
                            expandedFaq === faq._id && 'transform rotate-180'
                          )}
                        />
                      </button>
                      {expandedFaq === faq._id && (
                        <div className="px-4 pb-4 border-t border-slate-700">
                          <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700">
                            <span className="text-xs text-slate-400">Was this helpful?</span>
                            <button
                              onClick={() => voteFAQ(faq._id, true)}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Yes ({faq.helpful_votes})
                            </button>
                            <button
                              onClick={() => voteFAQ(faq._id, false)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              No ({faq.unhelpful_votes})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Support Hours</p>
                    <p className="text-xs text-slate-400">
                      AI Support: 24/7<br />
                      Human Support: Mon-Fri 9am-6pm EST
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
