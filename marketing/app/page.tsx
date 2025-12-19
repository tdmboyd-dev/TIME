/**
 * TIME Marketing Landing Page
 */

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-white font-bold text-xl">TIME</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
            <a href="#bots" className="text-slate-300 hover:text-white transition">Bots</a>
            <a href="#faq" className="text-slate-300 hover:text-white transition">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.timebeyondus.com/login" className="text-slate-300 hover:text-white transition">Log In</a>
            <a href="https://www.timebeyondus.com/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
              Start Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-indigo-300 text-sm">Live Trading Now</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Trade Smarter with
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"> AI Bots</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-3xl mx-auto">
            133 intelligent trading bots working 24/7. Stocks, crypto, forex, options.
            Drop your money and watch it grow. No experience required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://www.timebeyondus.com/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition">
              Start Trading Free
            </a>
            <a href="#demo" className="border border-slate-600 hover:border-slate-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition">
              Watch Demo
            </a>
          </div>
          <p className="text-slate-500 mt-6 text-sm">No credit card required. Paper trading included.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-slate-700/50">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '133', label: 'Trading Bots' },
            { value: '$2M+', label: 'Trading Volume' },
            { value: '24/7', label: 'Market Coverage' },
            { value: '72%', label: 'Avg Win Rate' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg">One platform. All markets. Unlimited potential.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'AI-Powered Bots',
                description: '133 intelligent bots using machine learning, pattern recognition, and real-time market analysis.',
              },
              {
                icon: '📊',
                title: 'All Markets',
                description: 'Trade stocks, crypto, forex, and options from a single platform.',
              },
              {
                icon: '🎯',
                title: 'Copy Trading',
                description: 'Follow top traders and automatically copy their strategies.',
              },
              {
                icon: '📱',
                title: 'Mobile App',
                description: 'Trade on the go with our iOS and Android apps.',
              },
              {
                icon: '🔒',
                title: 'Secure',
                description: 'Bank-level encryption. Your funds stay with your broker.',
              },
              {
                icon: '💬',
                title: '24/7 Support',
                description: 'AI chat assistant plus human support when you need it.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 hover:border-indigo-500/50 transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-slate-400 text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                name: 'FREE',
                price: '$0',
                period: 'forever',
                features: ['3 trading bots', 'Paper trading', 'Basic analytics', 'Community support'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'STARTER',
                price: '$19',
                period: '/month',
                features: ['10 trading bots', 'Live trading', 'Copy trading', 'Email support', 'Mobile app'],
                cta: 'Start Trial',
                popular: false,
              },
              {
                name: 'PRO',
                price: '$49',
                period: '/month',
                features: ['50 trading bots', 'All strategies', 'Priority execution', 'Advanced analytics', 'Phone support'],
                cta: 'Start Trial',
                popular: true,
              },
              {
                name: 'ENTERPRISE',
                price: '$249',
                period: '/month',
                features: ['Unlimited bots', 'Custom strategies', 'API access', 'Dedicated manager', 'White-label options'],
                cta: 'Contact Sales',
                popular: false,
              },
            ].map((plan, i) => (
              <div key={i} className={`rounded-2xl p-8 ${plan.popular ? 'bg-indigo-600 border-2 border-indigo-400' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                {plan.popular && (
                  <div className="text-indigo-200 text-sm font-semibold mb-4">MOST POPULAR</div>
                )}
                <div className="text-white font-semibold mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className={plan.popular ? 'text-indigo-200' : 'text-slate-400'}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <span className={plan.popular ? 'text-indigo-200' : 'text-green-500'}>✓</span>
                      <span className={plan.popular ? 'text-white' : 'text-slate-300'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://www.timebeyondus.com/register"
                  className={`block text-center py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-white text-indigo-600 hover:bg-slate-100'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: 'Is TIME safe to use?',
                a: 'Yes! TIME never holds your funds. We connect to your existing brokerage account and execute trades on your behalf. Your money stays with regulated brokers.',
              },
              {
                q: 'Do I need trading experience?',
                a: 'No experience required. Our bots handle all the trading decisions. You just set your risk preferences and deposit funds.',
              },
              {
                q: 'Which brokers do you support?',
                a: 'We currently support Alpaca for stocks and crypto. Interactive Brokers and TD Ameritrade are coming soon.',
              },
              {
                q: 'Can I try before buying?',
                a: 'Absolutely! Our FREE tier includes paper trading so you can test strategies with virtual money before going live.',
              },
              {
                q: 'How do the bots work?',
                a: 'Our AI bots analyze market data, news, and patterns in real-time. They make buy/sell decisions based on proven strategies.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">{faq.q}</h3>
                <p className="text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Start Trading?</h2>
          <p className="text-xl text-indigo-100 mb-10">
            Join thousands of traders using TIME to grow their wealth.
          </p>
          <a
            href="https://www.timebeyondus.com/register"
            className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-100 transition"
          >
            Create Free Account
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-slate-700/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <span className="text-white font-bold text-xl">TIME</span>
            </div>
            <p className="text-slate-400 text-sm">
              AI-powered trading platform for everyone.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
              <li><a href="#bots" className="hover:text-white transition">Bots</a></li>
              <li><a href="#" className="hover:text-white transition">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">About</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
              <li><a href="#" className="hover:text-white transition">Careers</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Risk Disclosure</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-700/50 text-center text-slate-500 text-sm">
          © 2025 TIME Trading. All rights reserved. Trading involves risk.
        </div>
      </footer>
    </div>
  );
}
