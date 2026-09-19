'use client';

import { useHistory } from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import { Clock } from 'lucide-react';

export default function HistoryPage() {
  const { data: history, isLoading } = useHistory();

  return (
    <div className="p-8 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-white">Recently Played</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-64 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : history?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {history.map((track, idx) => (
            <TrackCard key={`${track.providerTrackId}-${idx}`} track={track} contextQueue={history} trackIndex={idx} />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
          <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No listening history</h3>
          <p className="text-muted-foreground">When you play songs, they'll show up here.</p>
        </div>
      )}
    </div>
  );
}
