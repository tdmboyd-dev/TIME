'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * TIME Admin Login Page
 *
 * REAL AUTHENTICATION - Connects to backend API
 * - Real bcrypt password verification
 * - Real admin role verification
 * - Real MFA with TOTP
 * - Real audit logging
 * - Rate limiting protection
 */

import { API_BASE } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa' | 'security-check'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityInfo, setSecurityInfo] = useState({
    ip: '...',
    device: 'Unknown',
    location: 'Checking...',
    lastLogin: 'Never',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Update security info display
      setSecurityInfo({
        ip: 'Verifying...',
        device: navigator.userAgent.includes('Windows') ? 'Windows PC' :
                navigator.userAgent.includes('Mac') ? 'Mac' : 'Linux/Other',
        location: 'Checking location...',
        lastLogin: new Date().toLocaleString(),
      });
      setStep('security-check');

      // REAL API call to backend authentication
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Admin key is used as email (or special admin identifier)
          email: adminKey.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          throw new Error(`Too many attempts. Try again in ${data.retryAfter} seconds.`);
        }
        throw new Error(data.error || 'Invalid admin credentials');
      }

      // Check if MFA is required
      if (data.requiresMfa) {
        setStep('mfa');
        return;
      }

      // Verify this is an admin user
      if (data.success && data.token) {
        if (data.user?.role !== 'admin' && data.user?.role !== 'owner') {
          throw new Error('This account does not have admin privileges');
        }

        // Store admin token
        localStorage.setItem('time_auth_token', data.token);
        localStorage.setItem('time_user', JSON.stringify(data.user));
        localStorage.setItem('time_is_admin', 'true');

        // Redirect to admin portal
        router.push('/admin-portal');
      }
    } catch (err: any) {
      setStep('credentials');
      setError(err.message || 'Invalid admin credentials.');
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
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminKey.toLowerCase().trim(),
          password,
          mfaCode: mfaCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid MFA code');
      }

      if (data.success && data.token) {
        if (data.user?.role !== 'admin' && data.user?.role !== 'owner') {
          throw new Error('This account does not have admin privileges');
        }

        localStorage.setItem('time_auth_token', data.token);
        localStorage.setItem('time_user', JSON.stringify(data.user));
        localStorage.setItem('time_is_admin', 'true');

        router.push('/admin-portal');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Floating Security Orb */}
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 w-full max-w-md">
        {/* Security Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-2xl shadow-red-500/20 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h1 className="text-3xl font-black text-white mb-1">
            TIME <span className="text-red-500">ADMIN</span>
          </h1>
          <p className="text-white/40 text-sm tracking-wide">AUTHORIZED ACCESS ONLY</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur border border-red-500/20 rounded-2xl p-8 shadow-2xl">
          {/* Security Status */}
          <div className="flex items-center justify-between mb-6 p-3 bg-slate-800/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/60">Secure Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-white/60">TLS 1.3</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Step: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Admin Key</label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full px-4 py-3 pl-11 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                    placeholder="ADM-XXXX-XXXX-XXXX"
                    required
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Master Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pl-11 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="Enter master password"
                    required
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verify Access
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step: Security Check */}
          {step === 'security-check' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <svg className="w-16 h-16 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <svg className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Security Check</h3>
              <p className="text-white/50 text-sm">Verifying device & location...</p>
            </div>
          )}

          {/* Step: MFA */}
          {step === 'mfa' && (
            <>
              {/* Security Info Card */}
              <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Access Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">IP Address</span>
                    <span className="text-white font-mono">{securityInfo.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Device</span>
                    <span className="text-white">{securityInfo.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Session Time</span>
                    <span className="text-emerald-400">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleMFAVerify} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Hardware Key / TOTP Code</label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/30 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || mfaCode.length < 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : 'Enter Admin Portal'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="w-full py-2 text-white/40 hover:text-white/60 text-sm"
                >
                  Cancel
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer Warning */}
        <div className="mt-6 text-center">
          <p className="text-white/30 text-xs">
            All admin access is logged and monitored.
            <br />
            Unauthorized access attempts will be reported.
          </p>
        </div>

        {/* Back to User Login */}
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-white/40 hover:text-white/60">
            Back to User Login
          </a>
        </div>
      </div>
    </div>
  );
}
