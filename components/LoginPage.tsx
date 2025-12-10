'use client';

import { useState } from 'react';
import { signInWithEmail, verifyMagicCode } from '@/lib/instantdb';

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await signInWithEmail(email);
    if (result.success) {
      setStep('code');
    } else {
      setError('Failed to send code. Please try again.');
    }
    setIsLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await verifyMagicCode(email, code);
    if (result.success) {
      onLoginSuccess();
    } else {
      setError('Invalid code. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            Bobola<span className="text-[#e5a825]">&apos;</span>s
          </h1>
          <p className="text-[#6b6b75] mt-2">Staff Scheduler</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {step === 'email' ? 'Sign In' : 'Enter Code'}
          </h2>

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 bg-[#141417] border border-[#2a2a32] rounded-xl text-white placeholder:text-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-[#ef4444]">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 bg-[#e5a825] hover:bg-[#f0b429] disabled:bg-[#3a3a45] text-[#0d0d0f] disabled:text-[#6b6b75] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#e5a825]/20 hover:shadow-[#e5a825]/40 disabled:shadow-none"
              >
                {isLoading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-sm text-[#a0a0a8] mb-4">
                We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 bg-[#141417] border border-[#2a2a32] rounded-xl text-white text-center text-2xl tracking-widest placeholder:text-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-[#ef4444]">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full py-3 bg-[#e5a825] hover:bg-[#f0b429] disabled:bg-[#3a3a45] text-[#0d0d0f] disabled:text-[#6b6b75] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#e5a825]/20 hover:shadow-[#e5a825]/40 disabled:shadow-none"
              >
                {isLoading ? 'Verifying...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                }}
                className="w-full py-2 text-[#a0a0a8] hover:text-white text-sm transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-[#6b6b75] mt-6">
          Need access? Contact your manager.
        </p>
      </div>
    </div>
  );
}
