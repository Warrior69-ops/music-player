'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Library, ListMusic, Heart, Clock, LogOut, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { motion } from 'framer-motion';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

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
    <aside
      className="w-64 bg-zinc-950/60 border-r border-white/10 h-full flex flex-col pt-6 z-20 select-none transform-gpu will-change-transform"
      style={{
        WebkitBackdropFilter: 'blur(28px) saturate(135%)',
        backdropFilter: 'blur(28px) saturate(135%)',
      }}
    >
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center">
          <ListMusic className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-white/60 tracking-tight">Nocturne</h1>
      </div>

      <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-white uppercase tracking-wider mb-2">Discover</p>
          <NavLink href="/" icon={Home} isActive={pathname === '/'}>Home</NavLink>
          <NavLink href="/search" icon={Search} isActive={pathname.startsWith('/search')}>Search</NavLink>
        </div>

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-white uppercase tracking-wider mb-2">Your Library</p>
          <NavLink href="/library" icon={Library} isActive={pathname.startsWith('/library')}>Playlists</NavLink>
          <NavLink href="/favorites" icon={Heart} isActive={pathname.startsWith('/favorites')}>Favorites</NavLink>
          <NavLink href="/history" icon={Clock} isActive={pathname.startsWith('/history')}>Recently Played</NavLink>
          <NavLink href="/stats" icon={BarChart3} isActive={pathname.startsWith('/stats')}>Stats & Wrapped</NavLink>
        </div>
      </nav>

      {/* User Info & Quick Logout Footer with Liquid Glass finish (aligned beside PlayerBar) */}
      {user && (
        <div className="p-3 mx-2.5 mb-2.5 rounded-2xl liquid-glass-card flex items-center justify-between gap-2.5 h-[76px] shrink-0 border border-white/12">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-purple-600/40 border border-primary/50 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
              {initial}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-white truncate drop-shadow-sm">
                {user.name || user.username || 'User'}
              </p>
              <p className="text-[10px] text-white/90 truncate mt-0.5 font-normal">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-white/80 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

function NavLink({
  href,
  icon: Icon,
  isActive,
  children,
}: {
  href: string;
  icon: any;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group active:scale-95 text-white",
        isActive ? "text-white" : "text-white/80 hover:text-white"
      )}
    >
      {/* Sliding Liquid Indicator Pill with Framer Motion Spring Dynamics */}
      {isActive && (
        <motion.div
          layoutId="sidebarActivePill"
          className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/30 shadow-[0_0_16px_rgba(168,85,247,0.25)]"
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 34,
            mass: 0.5,
          }}
        />
      )}
      <Icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" : "text-white/80 group-hover:text-white")} />
      <span className="relative z-10 text-white font-medium">{children}</span>
    </Link>
  );
}
