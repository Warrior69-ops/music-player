'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const userData = response.data.data.user;
        setAuth(response.data.data.accessToken, { ...userData, username: userData.name });
        toast.success(`Welcome back, ${userData.name}!`);
        router.push('/');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK' || err.message === 'Network Error'
          ? 'Backend server is connecting. Please wait a moment and try again.'
          : err.message) ||
        'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Welcome Back</h1>
        <p className="text-muted-foreground mt-2">Sign in to continue exploring music</p>
      </div>

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
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Link href="/forgot-password" className="text-xs text-primary hover:text-accent transition-colors">Forgot password?</Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-primary text-black font-semibold hover:bg-accent hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Don't have an account?{' '}
        <Link href="/register" className="text-white hover:text-primary transition-colors font-medium">Create one</Link>
      </p>
    </div>
  );
}
