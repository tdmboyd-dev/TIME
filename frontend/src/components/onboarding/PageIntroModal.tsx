'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Zap, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';

export interface PageIntroContent {
  pageId: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string; // gradient classes
  description: string;
  features: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
  warnings?: string[];
  tips?: string[];
  ctaText?: string;
}

interface PageIntroModalProps {
  content: PageIntroContent;
  onClose?: () => void;
}

const STORAGE_PREFIX = 'time_page_intro_dismissed_';

export function PageIntroModal({ content, onClose }: PageIntroModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this page intro before
    const dismissed = localStorage.getItem(`${STORAGE_PREFIX}${content.pageId}`);
    if (!dismissed) {
      // Small delay for smoother page load
      const timer = setTimeout(() => {
        setIsOpen(true);
        setIsAnimating(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [content.pageId]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      if (dontShowAgain) {
        localStorage.setItem(`${STORAGE_PREFIX}${content.pageId}`, 'true');
      }
      setIsOpen(false);
      onClose?.();
    }, 200);
  };

  const handleGotIt = () => {
    // Always save preference when clicking "Got it"
    if (dontShowAgain) {
      localStorage.setItem(`${STORAGE_PREFIX}${content.pageId}`, 'true');
    }
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      onClose?.();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-200 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl ${content.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
              {content.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Welcome to</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{content.title}</h2>
              <p className="text-slate-400 mt-1">{content.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-4">
          <p className="text-slate-300 leading-relaxed">{content.description}</p>
        </div>

        {/* Features */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            What You Can Do Here
          </h3>
          <div className="grid gap-3">
            {content.features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-white">{feature.title}</h4>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings */}
        {content.warnings && content.warnings.length > 0 && (
          <div className="px-6 pb-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Important to Know
              </h3>
              <ul className="space-y-1">
                {content.warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tips */}
        {content.tips && content.tips.length > 0 && (
          <div className="px-6 pb-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Pro Tips
              </h3>
              <ul className="space-y-1">
                {content.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-emerald-200/80 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-slate-700/50 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
              Don't show this again
            </span>
          </label>

          <button
            onClick={handleGotIt}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all shadow-lg shadow-purple-500/20"
          >
            {content.ctaText || "Got it, let's go!"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to reset all page intros (for testing or settings)
export function resetAllPageIntros() {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

// Helper to reset a specific page intro
export function resetPageIntro(pageId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_PREFIX}${pageId}`);
}

export default PageIntroModal;
