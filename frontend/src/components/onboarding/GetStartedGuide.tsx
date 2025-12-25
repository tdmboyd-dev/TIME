'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket,
  CheckCircle2,
  Circle,
  ChevronRight,
  Bot,
  Link2,
  Wallet,
  Shield,
  Zap,
  Play,
  X,
  Sparkles,
} from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  checkKey: string; // localStorage key to check if completed
}

const setupSteps: SetupStep[] = [
  {
    id: 'broker',
    title: 'Connect Your Broker',
    description: 'Link your trading account to enable live trading',
    href: '/brokers',
    icon: <Link2 className="w-5 h-5" />,
    checkKey: 'time_broker_connected',
  },
  {
    id: 'risk',
    title: 'Set Your Risk Profile',
    description: 'Tell us your risk tolerance for smarter recommendations',
    href: '/risk',
    icon: <Shield className="w-5 h-5" />,
    checkKey: 'time_risk_profile_set',
  },
  {
    id: 'deposit',
    title: 'Fund Your Account',
    description: 'Add funds to start trading with real money',
    href: '/payments',
    icon: <Wallet className="w-5 h-5" />,
    checkKey: 'time_account_funded',
  },
  {
    id: 'bot',
    title: 'Activate Your First Bot',
    description: 'Let AI start trading for you 24/7',
    href: '/bots',
    icon: <Bot className="w-5 h-5" />,
    checkKey: 'time_first_bot_activated',
  },
  {
    id: 'autopilot',
    title: 'Try AutoPilot Mode',
    description: 'Drop money and let TIME handle everything',
    href: '/autopilot',
    icon: <Rocket className="w-5 h-5" />,
    checkKey: 'time_autopilot_tried',
  },
];

const DISMISSED_KEY = 'time_get_started_dismissed';

export function GetStartedGuide() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden until we check
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Check if dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }
    setIsDismissed(false);

    // Check completed steps
    const completed = new Set<string>();
    setupSteps.forEach(step => {
      if (localStorage.getItem(step.checkKey) === 'true') {
        completed.add(step.id);
      }
    });
    setCompletedSteps(completed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  const handleStepClick = (step: SetupStep) => {
    // Mark step as visited
    localStorage.setItem(step.checkKey, 'true');
    setCompletedSteps(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(step.id);
      return newSet;
    });
  };

  const completedCount = completedSteps.size;
  const totalSteps = setupSteps.length;
  const progress = (completedCount / totalSteps) * 100;

  // Don't show if dismissed or all steps completed
  if (isDismissed || completedCount === totalSteps) {
    return null;
  }

  return (
    <div className="card border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Get Started with TIME
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                  {completedCount}/{totalSteps}
                </span>
              </h3>
              <p className="text-sm text-slate-400">Complete these steps to unlock the full power of AI trading</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {setupSteps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              return (
                <Link
                  key={step.id}
                  href={step.href}
                  onClick={() => handleStepClick(step)}
                  className={`group p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-400 group-hover:text-purple-400 group-hover:bg-purple-500/20'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                          Step {index + 1}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            Done
                          </span>
                        )}
                      </div>
                      <h4 className={`font-medium truncate ${isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Start CTA */}
          {completedCount === 0 && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-amber-400" />
                  <div>
                    <h4 className="font-medium text-white">Want to skip the setup?</h4>
                    <p className="text-sm text-slate-400">Try Paper Trading mode to explore without real money</p>
                  </div>
                </div>
                <Link
                  href="/settings"
                  className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Paper Mode
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to reset the guide (for testing or settings)
export function resetGetStartedGuide() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DISMISSED_KEY);
  setupSteps.forEach(step => {
    localStorage.removeItem(step.checkKey);
  });
}

export default GetStartedGuide;
