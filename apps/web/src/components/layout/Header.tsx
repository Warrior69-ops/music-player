import { User } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="flex-1 max-w-xl">
      <div className="flex-1 max-w-xl">
        {/* Search removed from header as per user request */}
      </div>
      </div>
      
      <div className="ml-4 flex items-center">
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <User className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
