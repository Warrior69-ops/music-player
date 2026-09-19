'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Search, Library, ListMusic, Heart, Clock, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

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
    <aside className="w-64 bg-black/60 backdrop-blur-xl border-r border-white/5 h-full flex flex-col pt-6 z-20">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center">
          <ListMusic className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">Nocturne</h1>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Discover</p>
          <NavLink href="/" icon={Home}>Home</NavLink>
          <NavLink href="/search" icon={Search}>Search</NavLink>
        </div>

        <div className="space-y-1">
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Library</p>
          <NavLink href="/library" icon={Library}>Playlists</NavLink>
          <NavLink href="/favorites" icon={Heart}>Favorites</NavLink>
          <NavLink href="/history" icon={Clock}>Recently Played</NavLink>
        </div>
      </nav>

      {/* User Info & Quick Logout Footer */}
      {user && (
        <div className="p-3 mx-3 mb-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/40 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initial}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {user.name || user.username || 'User'}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        "text-muted-foreground hover:text-white hover:bg-white/5 active:scale-95"
      )}
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );
}
