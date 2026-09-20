'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  useSuggestMusic,
  useCategorizedSearch,
  type MusicSuggestion,
} from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import {
  Search as SearchIcon,
  X,
  Loader2,
  Music2,
  ArrowUpLeft,
  ChevronRight,
  Disc3,
  ListMusic,
  UserCheck,
  Play,
} from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import api from '@/lib/api';

type SearchCategory = 'all' | 'song' | 'album' | 'artist' | 'playlist';

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs' },
  { id: 'album', label: 'Albums' },
  { id: 'artist', label: 'Artists' },
  { id: 'playlist', label: 'Community Playlists' },
];

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
  const [category, setCategory] = useState<SearchCategory>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { setQueue } = usePlayerStore();

  // Debounce suggestion queries by 250ms
  const debouncedQuery = useDebounce(query, 250);

  const { data: suggestions = [] } = useSuggestMusic(debouncedQuery);
  const { data: results, isLoading } = useCategorizedSearch(searchTrigger, category);

  // Suggestions partitioned & flattened for keyboard navigation
  const querySuggestions = suggestions.filter((s): s is Extract<MusicSuggestion, { type: 'query' }> => s.type === 'query');
  const songSuggestions = suggestions.filter((s): s is Extract<MusicSuggestion, { type: 'song' }> => s.type === 'song');
  const allSuggestions = [...querySuggestions, ...songSuggestions];

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
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
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showSuggestions && selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
      const selected = allSuggestions[selectedIndex];
      if (selected.type === 'query') {
        handleSearch(selected.text);
      } else if (selected.type === 'song') {
        handleSearch(selected.title);
      }
      return;
    }
    handleSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchTrigger('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const hasSuggestions = showSuggestions && suggestions && suggestions.length > 0;

  // Prefetch first result track for instantaneous play
  useEffect(() => {
    if (results?.songs?.[0]?.providerTrackId) {
      api.get(`/music/proxy/youtube/${results.songs[0].providerTrackId}/prefetch`).catch(() => {});
    }
  }, [results]);

  const topResult = results?.topResult;
  const songs = results?.songs || [];
  const albums = results?.albums || [];
  const artists = results?.artists || [];
  const playlists = results?.playlists || [];

  return (
    <div className="p-6 md:p-10 pb-36 max-w-7xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">Search</h1>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <div className="relative max-w-2xl mb-6">
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
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                if (query.length >= 2) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!showSuggestions && allSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                  setSelectedIndex((prev) => (prev < allSuggestions.length - 1 ? prev + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allSuggestions.length - 1));
                } else if (e.key === 'Enter') {
                  if (showSuggestions && selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
                    e.preventDefault();
                    const selected = allSuggestions[selectedIndex];
                    if (selected.type === 'query') {
                      handleSearch(selected.text);
                    } else if (selected.type === 'song') {
                      handleSearch(selected.title);
                    }
                  }
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  setSelectedIndex(-1);
                  inputRef.current?.blur();
                }
              }}
              className="block w-full pl-12 pr-12 py-4 border border-white/10 leading-5 bg-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-base md:text-lg"
              style={{
                borderRadius: hasSuggestions ? '1rem 1rem 0 0' : '1rem',
              }}
              placeholder="Search songs, artists, albums, playlists..."
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
            className="absolute left-0 right-0 z-50 border border-white/10 border-t-0 rounded-b-2xl shadow-2xl overflow-hidden max-h-[420px] overflow-y-auto"
            style={{ background: 'rgba(15,15,30,0.97)', backdropFilter: 'blur(24px)' }}
          >
            {querySuggestions.length > 0 && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Suggestions
                </span>
              </div>
            )}

            {querySuggestions.map((s, i) => {
              const isSelected = selectedIndex === i;
              return (
                <button
                  key={`q-${i}`}
                  ref={(node) => {
                    if (isSelected && node) {
                      node.scrollIntoView({ block: 'nearest' });
                    }
                  }}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors group cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/25 text-white border-l-2 border-primary'
                      : 'hover:bg-white/8 text-foreground/90'
                  }`}
                  onClick={() => handleSearch(s.text)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <SearchIcon className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-primary'}`} />
                  <span className="text-sm">
                    <span className="text-primary font-medium">{query}</span>
                    {s.text.slice(query.length)}
                  </span>
                  <ArrowUpLeft className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto shrink-0" />
                </button>
              );
            })}

            {songSuggestions.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1 border-t border-white/5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Songs
                  </span>
                </div>
                {songSuggestions.map((s, i) => {
                  const globalIdx = querySuggestions.length + i;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <button
                      key={`s-${i}`}
                      ref={(node) => {
                        if (isSelected && node) {
                          node.scrollIntoView({ block: 'nearest' });
                        }
                      }}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors group cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/25 text-white border-l-2 border-primary'
                          : 'hover:bg-white/8 text-foreground/90'
                      }`}
                      onClick={() => handleSearch(s.title)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                        <Music2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{s.title}</span>
                        {s.artist && (
                          <span className="text-xs text-muted-foreground truncate">{s.artist}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            <div className="h-2" />
          </div>
        )}
      </div>

      {/* ── Filter Chips (YouTube Music Style) ──────────────────────── */}
      {searchTrigger && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-400 via-primary to-purple-200 text-black shadow-[0_2px_16px_rgba(168,85,247,0.5)] font-bold scale-105'
                    : 'glass-pill text-purple-200/70 hover:text-white border border-purple-500/20 hover:border-purple-400/40'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search Results Area ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Searching YouTube Music...</p>
        </div>
      ) : searchTrigger && results ? (
        <div className="space-y-12">
          {/* ════ ALL TAB VIEW ══════════════════════════════════════════ */}
          {category === 'all' && (
            <>
              {/* Top Result Spotlight Card */}
              {topResult && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Top Result
                  </h2>

                  {topResult.type === 'artist' ? (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-primary/40 transition-all max-w-xl shadow-xl">
                      {/* Circular Avatar */}
                      <Link
                        href={`/artist/${encodeURIComponent(topResult.id)}`}
                        className="relative w-28 h-28 rounded-full overflow-hidden shrink-0 border-2 border-primary/50 shadow-lg group"
                      >
                        {topResult.thumbnail ? (
                          <Image
                            src={topResult.thumbnail}
                            alt={topResult.name || ''}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="112px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20">
                            <UserCheck className="w-10 h-10 text-primary" />
                          </div>
                        )}
                      </Link>

                      {/* Details & Actions */}
                      <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0 flex-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] uppercase font-bold text-primary mb-2">
                          Artist
                        </span>
                        <Link
                          href={`/artist/${encodeURIComponent(topResult.id)}`}
                          className="text-2xl font-black text-white hover:text-primary transition-colors line-clamp-1 mb-1"
                        >
                          {topResult.name}
                        </Link>
                        {topResult.subscribers && (
                          <span className="text-xs text-muted-foreground mb-4">
                            {topResult.subscribers}
                          </span>
                        )}

                        <Link
                          href={`/artist/${encodeURIComponent(topResult.id)}`}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-tr from-purple-400 via-primary to-purple-200 text-black font-bold text-xs shadow-md hover:scale-105 transition-transform"
                        >
                          <span>View Artist</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ) : topResult.type === 'song' ? (
                    <div className="flex items-center gap-5 p-5 rounded-2xl glass-panel border border-purple-500/20 hover:border-purple-400/40 transition-all max-w-xl shadow-xl">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-purple-950/40 shadow border border-purple-500/20">
                        {topResult.albumArt ? (
                          <Image
                            src={topResult.albumArt}
                            alt={topResult.title || ''}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-purple-500/20">
                            <Music2 className="w-8 h-8 text-purple-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-full glass-pill text-[10px] uppercase font-bold text-purple-300 border border-purple-500/30 w-fit mb-1.5">
                          Song
                        </span>
                        <span className="text-lg font-bold text-white truncate">
                          {topResult.title}
                        </span>
                        <span className="text-xs text-purple-300/70 truncate mb-3">
                          {topResult.artist}
                        </span>

                        <button
                          onClick={() => {
                            if (songs[0]) setQueue(songs, 0);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-tr from-purple-400 via-primary to-purple-200 text-black font-bold text-xs w-fit shadow-md hover:scale-105 transition-transform cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          <span>Play</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Songs Section */}
              {songs.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Songs</h2>
                    <button
                      onClick={() => setCategory('song')}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>See all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {songs.slice(0, 5).map((track, idx) => (
                      <TrackCard
                        key={`${track.providerTrackId}-${idx}`}
                        track={track}
                        contextQueue={songs}
                        trackIndex={idx}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Albums Section */}
              {albums.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Albums</h2>
                    <button
                      onClick={() => setCategory('album')}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>See all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {albums.slice(0, 6).map((album) => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                </section>
              )}

              {/* Artists Section */}
              {artists.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Artists</h2>
                    <button
                      onClick={() => setCategory('artist')}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>See all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {artists.slice(0, 6).map((artist) => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                </section>
              )}

              {/* Community Playlists Section */}
              {playlists.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Community Playlists</h2>
                    <button
                      onClick={() => setCategory('playlist')}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>See all</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {playlists.slice(0, 6).map((p) => (
                      <Link
                        key={p.id}
                        href={`/album/${encodeURIComponent(p.id)}`}
                        className="group flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-3 shadow">
                          {p.thumbnail ? (
                            <Image
                              src={p.thumbnail}
                              alt={p.title}
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 768px) 160px, 200px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20">
                              <ListMusic className="w-10 h-10 text-primary" />
                            </div>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-1">
                          {p.title}
                        </h3>
                        <span className="text-xs text-muted-foreground truncate mt-1">
                          {p.author}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ════ SONGS TAB VIEW ═════════════════════════════════════════ */}
          {category === 'song' && (
            <div>
              <p className="text-xs text-muted-foreground mb-6">
                {songs.length} song{songs.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {songs.map((track, idx) => (
                  <TrackCard
                    key={`${track.providerTrackId}-${idx}`}
                    track={track}
                    contextQueue={songs}
                    trackIndex={idx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ════ ALBUMS TAB VIEW ════════════════════════════════════════ */}
          {category === 'album' && (
            <div>
              <p className="text-xs text-muted-foreground mb-6">
                {albums.length} album{albums.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </div>
          )}

          {/* ════ ARTISTS TAB VIEW ═══════════════════════════════════════ */}
          {category === 'artist' && (
            <div>
              <p className="text-xs text-muted-foreground mb-6">
                {artists.length} artist{artists.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </div>
          )}

          {/* ════ COMMUNITY PLAYLISTS TAB VIEW ═══════════════════════════ */}
          {category === 'playlist' && (
            <div>
              <p className="text-xs text-muted-foreground mb-6">
                {playlists.length} playlist{playlists.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {playlists.map((p) => (
                  <Link
                    key={p.id}
                    href={`/album/${encodeURIComponent(p.id)}`}
                    className="group flex flex-col p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-3 shadow">
                      {p.thumbnail ? (
                        <Image
                          src={p.thumbnail}
                          alt={p.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 160px, 200px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20">
                          <ListMusic className="w-10 h-10 text-primary" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    <span className="text-xs text-muted-foreground truncate mt-1">
                      {p.author}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : searchTrigger && !isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No results found for &quot;{searchTrigger}&quot;</p>
          <p className="text-sm mt-2 opacity-60">Try searching for a different song, artist, or album</p>
        </div>
      ) : null}
    </div>
  );
}
