'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchMusic, useSuggestMusic, type MusicSuggestion } from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import { Search as SearchIcon, X, Loader2, Music2, ArrowUpLeft } from 'lucide-react';
import api from '@/lib/api';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce suggestion queries by 250ms
  const debouncedQuery = useDebounce(query, 250);

  const { data: suggestions = [] } = useSuggestMusic(debouncedQuery);
  const { data: tracks, isLoading } = useSearchMusic(searchTrigger);

  // Eager Pre-fetching: resolve top 3 YouTube stream URLs in background
  useEffect(() => {
    if (tracks && tracks.length > 0) {
      const topYoutubeTracks = tracks.filter(t => t.provider === 'youtube').slice(0, 3);
      topYoutubeTracks.forEach(track => {
        api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
      });
    }
  }, [tracks]);

  // KEY OPTIMIZATION: prefetch song suggestion IDs the moment they appear —
  // before the user even finishes thinking. Starts yt-dlp 2-3s early!
  useEffect(() => {
    if (!suggestions) return;
    suggestions
      .filter((s): s is Extract<MusicSuggestion, { type: 'song' }> => s.type === 'song')
      .slice(0, 3)
      .forEach(s => {
        api.get(`/music/proxy/youtube/${s.id}/prefetch`).catch(() => {});
      });
  }, [suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setSearchTrigger(q);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchTrigger('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const hasSuggestions = showSuggestions && suggestions && suggestions.length > 0;

  return (
    <div className="p-8 pb-32">
      <h1 className="text-3xl font-bold text-white mb-6">Search</h1>

      {/* Search Bar */}
      <div className="relative max-w-2xl mb-10">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (query.length >= 2) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  inputRef.current?.blur();
                }
              }}
              className="block w-full pl-12 pr-12 py-4 border border-white/10 leading-5 bg-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-lg"
              style={{
                borderRadius: hasSuggestions ? '1rem 1rem 0 0' : '1rem',
              }}
              placeholder="Search songs, artists, albums..."
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {hasSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 z-50 border border-white/10 border-t-0 rounded-b-2xl shadow-2xl overflow-hidden"
            style={{ background: 'rgba(15,15,30,0.97)', backdropFilter: 'blur(24px)' }}
          >
            {/* Divider label */}
            {suggestions.some(s => s.type === 'query') && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Suggestions</span>
              </div>
            )}

            {/* Query text suggestions */}
            {suggestions
              .filter((s): s is Extract<MusicSuggestion, { type: 'query' }> => s.type === 'query')
              .map((s, i) => (
                <button
                  key={`q-${i}`}
                  type="button"
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/8 transition-colors group"
                  onClick={() => handleSearch(s.text)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <SearchIcon className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover:text-primary transition-colors" />
                  <span className="text-sm text-foreground/90">
                    {/* Bold the matching prefix */}
                    <span className="text-primary font-medium">{query}</span>
                    {s.text.slice(query.length)}
                  </span>
                  {/* Autocomplete fill-in arrow */}
                  <ArrowUpLeft className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto shrink-0" />
                </button>
              ))}

            {/* Song suggestions */}
            {suggestions.some(s => s.type === 'song') && (
              <>
                <div className="px-4 pt-3 pb-1 border-t border-white/5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Songs</span>
                </div>
                {suggestions
                  .filter((s): s is Extract<MusicSuggestion, { type: 'song' }> => s.type === 'song')
                  .map((s, i) => (
                    <button
                      key={`s-${i}`}
                      type="button"
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/8 transition-colors group"
                      onClick={() => handleSearch(s.title)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {/* Music note icon */}
                      <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                        <Music2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{s.title}</span>
                        {s.artist && (
                          <span className="text-xs text-muted-foreground truncate">{s.artist}</span>
                        )}
                      </div>
                    </button>
                  ))}
              </>
            )}

            <div className="h-2" />
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Searching...</p>
        </div>
      ) : tracks?.length ? (
        <>
          <p className="text-muted-foreground text-sm mb-6">
            {tracks.length} result{tracks.length !== 1 ? 's' : ''} for &quot;{searchTrigger}&quot;
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tracks.map((track, idx) => (
              <TrackCard key={`${track.providerTrackId}-${idx}`} track={track} />
            ))}
          </div>
        </>
      ) : searchTrigger && !isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No results found for &quot;{searchTrigger}&quot;</p>
          <p className="text-sm mt-2 opacity-60">Try a different search term</p>
        </div>
      ) : null}
    </div>
  );
}
