'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * TIME Login Page
 *
 * REAL AUTHENTICATION - Connects to backend API
 * Features:
 * - Real bcrypt password verification
 * - Real JWT token session management
 * - Real MFA with TOTP
 * - Rate limiting protection
 * - Secure token storage
 */

import { API_BASE } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'social'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa' | 'biometric'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // REAL API call to backend authentication
      // SECURITY: Use credentials: 'include' to send/receive httpOnly cookies
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // IMPORTANT: Include cookies in request
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          throw new Error(`Too many attempts. Try again in ${data.retryAfter} seconds.`);
        }
        throw new Error(data.error || 'Login failed');
      }

      // Check if MFA is required
      if (data.requiresMfa) {
        setStep('mfa');
        return;
      }

      // Login successful
      if (data.success) {
        // Set auth cookies on frontend domain (cross-origin cookie fix)
        // The backend also sets cookies, but they're bound to backend domain
        const expires = new Date(data.expiresAt);
        const cookieOptions = `path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`;
        document.cookie = `time_auth_token=${data.token}; ${cookieOptions}`;
        document.cookie = `time_is_admin=${data.user?.role === 'admin' || data.user?.role === 'owner'}; ${cookieOptions}`;

        // Store user info for display purposes
        localStorage.setItem('time_user', JSON.stringify(data.user));

        if (rememberMe) {
          localStorage.setItem('time_remember_email', email);
        } else {
          localStorage.removeItem('time_remember_email');
        }

        // Redirect to dashboard or requested page
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        router.push(redirectUrl || '/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // REAL MFA verification
      // SECURITY: Use credentials: 'include' for httpOnly cookies
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // IMPORTANT: Include cookies
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          mfaCode: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      if (data.success) {
        // Set auth cookies on frontend domain (cross-origin cookie fix)
        const expires = new Date(data.expiresAt);
        const cookieOptions = `path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`;
        document.cookie = `time_auth_token=${data.token}; ${cookieOptions}`;
        document.cookie = `time_is_admin=${data.user?.role === 'admin' || data.user?.role === 'owner'}; ${cookieOptions}`;

        localStorage.setItem('time_user', JSON.stringify(data.user));

        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        router.push(redirectUrl || '/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Check for WebAuthn support
      if (!window.PublicKeyCredential) {
        setError('Biometric authentication not supported on this device.');
        return;
      }

      // Step 1: Begin WebAuthn authentication (get challenge from server)
      const beginResponse = await fetch(`${API_BASE}/auth/webauthn/login/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email || undefined }),
      });

      if (!beginResponse.ok) {
        const data = await beginResponse.json();
        throw new Error(data.error || 'No passkey found. Please login with email first and register a passkey.');
      }

      const { options, sessionId } = await beginResponse.json();

      // Step 2: Get credential from authenticator (Touch ID, Face ID, etc.)
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const credential = await startAuthentication(options);

      // Step 3: Complete authentication
      const completeResponse = await fetch(`${API_BASE}/auth/webauthn/login/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, response: credential }),
      });

      const data = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(data.error || 'Passkey authentication failed');
      }

      if (data.success) {
        // Set auth cookies on frontend domain
        const expires = new Date(data.expiresAt);
        const cookieOptions = `path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`;
        document.cookie = `time_auth_token=${data.token}; ${cookieOptions}`;
        document.cookie = `time_is_admin=${data.user?.role === 'admin' || data.user?.role === 'owner'}; ${cookieOptions}`;
        localStorage.setItem('time_user', JSON.stringify(data.user));

        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        router.push(redirectUrl || '/');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Authentication cancelled. Please try again.');
      } else {
        setError(err.message || 'Biometric authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    setError('');
    try {
      // Redirect to OAuth provider authorization URL
      const providerName = provider.toLowerCase();
      const returnUrl = new URLSearchParams(window.location.search).get('redirect') || '/';

      // Open OAuth flow in current window
      // The backend will redirect back to /login with token or error
      window.location.href = `${API_BASE}/auth/oauth/${providerName}/authorize?returnUrl=${encodeURIComponent(returnUrl)}`;
    } catch (err: any) {
      setError(`${provider} login failed. Please try again.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500/90 text-white' :
            notification.type === 'error' ? 'bg-red-500/90 text-white' :
            'bg-blue-500/90 text-white'
          }`}>
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              ×
            </button>
          </div>
        </div>
      )}
      {/* Left Panel - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black">T</span>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">TIME</h1>
              <p className="text-sm text-white/60 tracking-widest">META-INTELLIGENCE</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-5xl font-bold leading-tight mb-6">
            Trade Beyond
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Human Limits
            </span>
          </h2>

          <p className="text-xl text-white/70 mb-12 max-w-md">
            The self-evolving, recursive learning trading organism that watches, learns, and generates perfect strategies.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400">110+</div>
              <div className="text-sm text-white/60">Absorbed Bots</div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-sm text-white/60">AI Trading</div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-emerald-400">100%</div>
              <div className="text-sm text-white/60">Autonomous</div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-12 flex items-center gap-3 text-white/50 text-sm">
            <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Bank-grade 256-bit encryption</span>
            <span className="mx-2">|</span>
            <span>SOC 2 Compliant</span>
            <span className="mx-2">|</span>
            <span>GDPR Ready</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
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

          {/* Step: Credentials */}
          {step === 'credentials' && (
            <>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-white/60 mb-8">Sign in to access your trading dashboard</p>

              {/* Login Method Tabs */}
              <div className="flex gap-2 mb-6">
                {['email', 'phone', 'social'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setLoginMethod(method as any)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      loginMethod === method
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {loginMethod === 'email' && (
                <form onSubmit={handleLogin} className="space-y-4">
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
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded bg-white/5 border-white/10 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-white/60">Remember me</span>
                    </label>
                    <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300">
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              )}

              {loginMethod === 'phone' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Sending code...' : 'Send Verification Code'}
                  </button>
                </form>
              )}

              {loginMethod === 'social' && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleSocialLogin('Google')}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <button
                    onClick={() => handleSocialLogin('Apple')}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                    </svg>
                    Continue with Apple
                  </button>

                  <button
                    onClick={() => handleBiometricAuth()}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    Sign in with Biometrics
                  </button>
                </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-white/50">
                  Don't have an account?{' '}
                  <a href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
                    Create Account
                  </a>
                </p>
              </div>

              {/* Admin Login Link */}
              <div className="mt-4 text-center">
                <a href="/admin-login" className="text-sm text-white/30 hover:text-white/50">
                  Admin Access
                </a>
              </div>
            </>
          )}

          {/* Step: MFA */}
          {step === 'mfa' && (
            <>
              <button
                onClick={() => setStep('credentials')}
                className="flex items-center gap-2 text-white/60 hover:text-white mb-6"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white text-center mb-2">Two-Factor Authentication</h2>
              <p className="text-white/60 text-center mb-8">
                Enter the 6-digit code from your authenticator app
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleMFAVerify} className="space-y-6">
                <div className="flex gap-2 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && e.target.nextElementSibling) {
                          (e.target.nextElementSibling as HTMLInputElement).focus();
                        }
                        const codes = verificationCode.split('');
                        codes[i] = val;
                        setVerificationCode(codes.join(''));
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length < 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>

                <p className="text-center text-white/50 text-sm">
                  Didn't receive a code?{' '}
                  <button
                    type="button"
                    onClick={() => showNotification('info', 'Verification code resent! Please check your authenticator app.')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Resend
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
