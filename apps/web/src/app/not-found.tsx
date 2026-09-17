import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-9xl font-black text-white/5">404</h1>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <h2 className="text-3xl font-bold text-white">Lost in space?</h2>
          <p className="text-muted-foreground mt-2">The track or page you're looking for doesn't exist.</p>
        </div>
        <div className="mt-12">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-black font-semibold hover:bg-accent hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
