'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.username
    ? user.username.charAt(0).toUpperCase()
    : 'U';

  return (
    <header
      className="h-16 flex items-center justify-between px-8 bg-zinc-950/40 border-b border-white/10 sticky top-0 z-50 transform-gpu will-change-transform select-none"
      style={{
        WebkitBackdropFilter: 'blur(28px) saturate(135%)',
        backdropFilter: 'blur(28px) saturate(135%)',
      }}
    >
      <div className="flex-1 max-w-xl" />

      <div className="ml-4 relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="liquid-glass-pill flex items-center gap-2.5 px-3 py-1.5 hover:scale-105 active:scale-95 text-xs text-white"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-black text-xs shadow-md">
            {initial}
          </div>
          <span className="hidden sm:inline font-medium max-w-[120px] truncate">
            {user?.name || user?.username || 'Account'}
          </span>
        </button>

        {isOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-2xl liquid-glass-dropdown py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            style={{
              WebkitBackdropFilter: 'blur(28px) saturate(135%)',
              backdropFilter: 'blur(28px) saturate(135%)',
            }}
          >
            <div className="px-4 py-2.5 border-b border-white/5">
              <p className="text-xs font-bold text-white truncate">
                {user?.name || user?.username || 'MELØ Listener'}
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {user?.email || ''}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-primary font-semibold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>MELØ High Fidelity</span>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
