'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Shuffle,
  Disc3,
  Sparkles,
  UserCheck,
  ChevronRight,
  Clock,
  Music2,
  Volume2,
  Loader2,
} from 'lucide-react';
import { useArtist } from '@/hooks/queries';
import { usePlayerStore, Track, getTrackId } from '@/store/usePlayerStore';
import { TrackMenu } from '@/components/ui/TrackMenu';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { smartShuffleTracks } from '@/lib/smartShuffle';
import { warmupStandbyTrack } from '@/hooks/useAudioPlayer';
import api from '@/lib/api';

function formatDuration(sec?: number) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function ArtistPage() {
  const params = useParams();
  const artistId = (params?.id as string) || '';
  const { data: artist, isLoading, error } = useArtist(artistId);

  const { currentTrack, isPlaying, setQueue, setIsPlaying } = usePlayerStore();
  const [showFullBio, setShowFullBio] = useState(false);

  const topSongs = artist?.topSongs || [];
  const albums = artist?.albums || [];
  const singles = artist?.singles || [];

  // Warm up track 0 on standby node and prefetch all top songs in background for instant random jumping
  useEffect(() => {
    if (topSongs.length > 0) {
      // 1. Prime track 0 immediately on standby audio element
      warmupStandbyTrack(topSongs[0]);

      // 2. Prefetch ALL top songs in staggered sequence so ANY random song click (1st, 8th, 10th, 15th) is instant
      topSongs.forEach((track, idx) => {
        if (idx === 0) return;
        if (track?.providerTrackId) {
          setTimeout(() => {
            api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
          }, idx * 120);
        }
      });
    }
  }, [topSongs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading artist profile...</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="p-8 text-center py-24 text-muted-foreground">
        <Disc3 className="w-16 h-16 mx-auto mb-4 opacity-30 animate-spin-slow" />
        <h2 className="text-2xl font-bold text-white mb-2">Artist Not Found</h2>
        <p className="text-sm">We couldn&apos;t load the artist information. Please try again.</p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Return to Search
        </Link>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (topSongs.length === 0) return;
    setQueue(topSongs, 0);
  };

  const handleSmartShuffle = () => {
    if (topSongs.length === 0) return;
    const shuffled = smartShuffleTracks(topSongs);
    setQueue(shuffled, 0);
  };

  const handlePlayTrack = (trackIndex: number) => {
    setQueue(topSongs, trackIndex);
  };

  const handlePrefetch = (trackId: string) => {
    if (!trackId) return;
    api.get(`/music/proxy/youtube/${trackId}/prefetch`).catch(() => {});
  };

  return (
    <div className="min-h-screen pb-36">
      {/* ── Ambient Backdrop Banner ─────────────────────────────────── */}
      <div className="relative w-full h-80 md:h-96 overflow-hidden">
        {artist.thumbnail && (
          <Image
            src={artist.thumbnail}
            alt={artist.name}
            fill
            priority
            unoptimized
            className="object-cover object-top scale-105 filter blur-2xl opacity-40"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/40" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end p-6 md:p-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full">
            {/* Circular Artist Avatar with Ambient Glow */}
            <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(236,72,153,0.3)] shrink-0 bg-black/60">
              {artist.thumbnail ? (
                <Image
                  src={artist.thumbnail}
                  alt={artist.name}
                  fill
                  priority
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 144px, 176px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20">
                  <UserCheck className="w-16 h-16 text-primary" />
                </div>
              )}
            </div>

            {/* Details & Actions */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-primary mb-2">
                <Sparkles className="w-3.5 h-3.5 fill-primary" />
                <span>Verified Artist</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2 truncate max-w-full">
                {artist.name}
              </h1>

              {artist.subscribers && (
                <p className="text-sm font-medium text-white/70 mb-5">
                  {artist.subscribers}
                </p>
              )}

              {/* Action Buttons: Play All & Shuffle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayAll}
                  onMouseEnter={() => topSongs[0] && warmupStandbyTrack(topSongs[0])}
                  onPointerDown={() => topSongs[0] && warmupStandbyTrack(topSongs[0])}
                  className="flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-[0_4px_20px_rgba(236,72,153,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play All</span>
                </button>

                <button
                  onClick={handleSmartShuffle}
                  onMouseEnter={() => topSongs[0] && warmupStandbyTrack(topSongs[0])}
                  onPointerDown={() => topSongs[0] && warmupStandbyTrack(topSongs[0])}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm backdrop-blur-md border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Smart Shuffle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-8 space-y-12">
        {/* Bio / Description (if available) */}
        {artist.description && (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <p className={`text-sm text-white/70 leading-relaxed ${!showFullBio ? 'line-clamp-2' : ''}`}>
              {artist.description}
            </p>
            {artist.description.length > 180 && (
              <button
                onClick={() => setShowFullBio(!showFullBio)}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                {showFullBio ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* ── 1. Top Songs Section (YouTube Music Columns of 3) ─────── */}
        {topSongs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Top Songs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Most played releases</p>
              </div>
            </div>

            {/* 3-Row Horizontal Flow Grid (Columns of 3 like YouTube Music) */}
            <div className="relative">
              <div
                className="grid grid-rows-3 grid-flow-col auto-cols-[320px] md:auto-cols-[380px] gap-x-6 gap-y-2.5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {topSongs.map((track, idx) => {
                  const isCurrent = getTrackId(currentTrack) === track.providerTrackId;
                  const isTrackPlaying = isCurrent && isPlaying;

                  return (
                    <div
                      key={`${track.providerTrackId}-${idx}`}
                      onMouseEnter={() => warmupStandbyTrack(track)}
                      onPointerDown={() => warmupStandbyTrack(track)}
                      onClick={() => handlePlayTrack(idx)}
                      style={{ scrollSnapAlign: 'start' }}
                      className={`group relative flex items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer border ${
                        isCurrent
                          ? 'bg-white/10 border-primary/40 shadow-[0_4px_20px_rgba(236,72,153,0.15)]'
                          : 'bg-white/[0.02] hover:bg-white/[0.07] border-white/5'
                      }`}
                    >
                      {/* Left: Rank, Artwork & Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Rank Number or Equalizer */}
                        <div className="w-5 text-center shrink-0">
                          {isTrackPlaying ? (
                            <Volume2 className="w-4 h-4 text-primary animate-pulse mx-auto" />
                          ) : (
                            <span className={`text-xs font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground group-hover:text-white'}`}>
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Square Artwork with Play Overlay */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/40 shadow">
                          {track.albumArt ? (
                            <Image
                              src={track.albumArt}
                              alt={track.title}
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/20">
                              <Music2 className="w-5 h-5 text-primary" />
                            </div>
                          )}

                          {/* Hover Play Button Overlay */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          </div>
                        </div>

                        {/* Title & Artist */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary' : 'text-white group-hover:text-primary transition-colors'}`}>
                            {track.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {track.artist}
                          </span>
                        </div>
                      </div>

                      {/* Right: Duration & 3-dots Menu */}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDuration(track.duration)}
                        </span>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-80 group-hover:opacity-100 transition-opacity"
                        >
                          <TrackMenu track={track} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── 2. Most Recent Songs / Singles & EPs Section ───────────── */}
        {singles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Latest Releases</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Singles &amp; EPs</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {singles.map((single) => (
                <AlbumCard
                  key={single.id}
                  album={{
                    id: single.id,
                    title: single.title,
                    artist: artist.name,
                    year: single.year,
                    thumbnail: single.thumbnail,
                    type: 'single',
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 3. All Albums Section ─────────────────────────────────── */}
        {albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Albums</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Full studio discography</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={{
                    id: album.id,
                    title: album.title,
                    artist: artist.name,
                    year: album.year,
                    thumbnail: album.thumbnail,
                    type: 'album',
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
