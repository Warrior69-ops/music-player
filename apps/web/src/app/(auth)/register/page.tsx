'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.post('/auth/register', { email, password, name: username });
      if (response.data.success) {
        toast.success('Registration successful! Please login.');
        router.push('/login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Join Antigravity</h1>
        <p className="text-muted-foreground mt-2">Create an account to start listening</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Username</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="musicfan99"
          />
        </div>

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
          <label className="text-sm font-medium text-foreground">Password</label>
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
          {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:text-primary transition-colors font-medium">Sign in</Link>
      </p>
    </div>
  );
}
