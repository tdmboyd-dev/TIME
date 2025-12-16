'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * TIME Registration Page
 *
 * REAL REGISTRATION - Connects to backend API
 * Features:
 * - Real bcrypt password hashing (server-side)
 * - Real user creation in MongoDB
 * - Consent collection for data learning
 * - Email validation
 * - Password strength requirements
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev/api/v1';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'consent' | 'success'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Consent fields
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataLearningConsent, setDataLearningConsent] = useState(false);
  const [riskDisclosureAccepted, setRiskDisclosureAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Password strength check
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStep('consent');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted || !dataLearningConsent || !riskDisclosureAccepted) {
      setError('You must accept all required agreements to continue');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          consent: {
            termsAccepted,
            dataLearningConsent,
            riskDisclosureAccepted,
            marketingConsent,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.success && data.token) {
        // Store token and user info
        localStorage.setItem('time_auth_token', data.token);
        localStorage.setItem('time_user', JSON.stringify(data.user));

        setStep('success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black">T</span>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">TIME</h1>
              <p className="text-sm text-white/60 tracking-widest">META-INTELLIGENCE</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-6">
            Join the Future
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              of Trading
            </span>
          </h2>

          <p className="text-lg text-white/70 mb-8 max-w-md">
            Create your account and let TIME's self-evolving AI work for you 24/7.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-white/80">100+ absorbed trading strategies</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-white/80">24/7 autonomous trading</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-white/80">Bank-grade security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-950 p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-black text-white">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">TIME</h1>
              <p className="text-xs text-white/60">META-INTELLIGENCE</p>
            </div>
          </div>

          {/* Step: Details */}
          {step === 'details' && (
            <>
              <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-white/60 mb-8">Start your journey with TIME</p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all pr-12"
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-white/10'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/50">{strengthLabels[passwordStrength - 1] || 'Too short'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:ring-1 transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500'
                    }`}
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-purple-500 transition-all"
                >
                  Continue
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-white/50">
                  Already have an account?{' '}
                  <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Step: Consent */}
          {step === 'consent' && (
            <>
              <button
                onClick={() => setStep('details')}
                className="flex items-center gap-2 text-white/60 hover:text-white mb-6"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h2 className="text-2xl font-bold text-white mb-2">Agreements & Consent</h2>
              <p className="text-white/60 mb-6">Please review and accept the following to continue</p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Terms of Service */}
                <label className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/20 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-white font-medium">Terms of Service</span>
                    <span className="text-red-400 ml-1">*</span>
                    <p className="text-white/50 text-sm mt-1">
                      I agree to the TIME Platform Terms of Service and understand the risks involved in trading.
                    </p>
                  </div>
                </label>

                {/* Data Learning Consent */}
                <label className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={dataLearningConsent}
                    onChange={(e) => setDataLearningConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/20 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-white font-medium">Data Learning Consent</span>
                    <span className="text-red-400 ml-1">*</span>
                    <p className="text-white/50 text-sm mt-1">
                      I consent to TIME learning from my trading patterns to improve strategies for all users. My data helps TIME become smarter.
                    </p>
                  </div>
                </label>

                {/* Risk Disclosure */}
                <label className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={riskDisclosureAccepted}
                    onChange={(e) => setRiskDisclosureAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/20 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-white font-medium">Risk Disclosure</span>
                    <span className="text-red-400 ml-1">*</span>
                    <p className="text-white/50 text-sm mt-1">
                      I understand that trading involves substantial risk of loss and may not be suitable for all investors.
                    </p>
                  </div>
                </label>

                {/* Marketing (Optional) */}
                <label className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/20 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-white font-medium">Marketing Communications</span>
                    <span className="text-white/30 ml-1">(Optional)</span>
                    <p className="text-white/50 text-sm mt-1">
                      I'd like to receive updates about new features, trading insights, and educational content.
                    </p>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isLoading || !termsAccepted || !dataLearningConsent || !riskDisclosureAccepted}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to TIME!</h2>
              <p className="text-white/60 mb-4">Your account has been created successfully.</p>
              <p className="text-white/40 text-sm">Redirecting to dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
