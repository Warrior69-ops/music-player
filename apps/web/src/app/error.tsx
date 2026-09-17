'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center space-y-6">
      <div className="glass-panel p-10 rounded-2xl max-w-md text-center shadow-2xl">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 mb-4">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-8">
          We hit an unexpected error while loading this page.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={() => reset()}
            className="px-6 py-2 rounded-lg bg-primary text-black font-medium hover:bg-accent transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
