'use client';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data.success) {
        setStatus('success');
        toast.success('Check your email for a password reset link.');
      }
    } catch (err: any) {
      setStatus('error');
      toast.error(err.response?.data?.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-muted-foreground mt-2">Enter your email to receive a reset link</p>
      </div>

      {status === 'success' ? (
        <div className="text-center space-y-6">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
            Check your email for a password reset link.
          </div>
          <Link href="/login" className="inline-block px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
            Return to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Send Reset Link'}
          </button>
          
          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-white transition-colors">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
