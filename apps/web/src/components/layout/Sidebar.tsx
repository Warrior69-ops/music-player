import Link from 'next/link';
import { Home, Search, Library, ListMusic, Heart, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="w-64 bg-black/60 backdrop-blur-xl border-r border-white/5 h-full flex flex-col pt-6 z-20">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center">
          <ListMusic className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">Resonance</h1>
      </div>

      <nav className="flex-1 px-4 space-y-8">
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
