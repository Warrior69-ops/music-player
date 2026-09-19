'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Shuffle,
  Disc3,
  Clock,
  Music2,
  Volume2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAlbum } from '@/hooks/queries';
import { usePlayerStore, Track, getTrackId } from '@/store/usePlayerStore';
import { TrackMenu } from '@/components/ui/TrackMenu';
import { smartShuffleTracks } from '@/lib/smartShuffle';
import { warmupStandbyTrack } from '@/hooks/useAudioPlayer';
import api from '@/lib/api';

function formatDuration(sec?: number) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function AlbumPage() {
  const params = useParams();
  const albumId = (params?.id as string) || '';
  const { data: album, isLoading, error } = useAlbum(albumId);

  const { currentTrack, isPlaying, setQueue } = usePlayerStore();

  const tracks = album?.tracks || [];

  // Warm up track 0 on standby node and prefetch all album tracks in background for instant random jumping
  useEffect(() => {
    if (tracks.length > 0) {
      // 1. Prime track 0 immediately on standby audio element
      warmupStandbyTrack(tracks[0]);

      // 2. Prefetch all tracks in staggered sequence so ANY track clicked is instant
      tracks.forEach((track, idx) => {
        if (idx === 0) return;
        if (track?.providerTrackId) {
          setTimeout(() => {
            api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
          }, idx * 120);
        }
      });
    }
  }, [tracks]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading album details...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="p-8 text-center py-24 text-muted-foreground">
        <Disc3 className="w-16 h-16 mx-auto mb-4 opacity-30 animate-spin-slow" />
        <h2 className="text-2xl font-bold text-white mb-2">Album Not Found</h2>
        <p className="text-sm">We couldn&apos;t load the album tracklist. Please try again.</p>
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
    if (tracks.length === 0) return;
    setQueue(tracks, 0);
  };

  const handleSmartShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = smartShuffleTracks(tracks);
    setQueue(shuffled, 0);
  };

  const handlePlayTrack = (trackIndex: number) => {
    setQueue(tracks, trackIndex);
  };

  const handlePrefetch = (trackId: string) => {
    if (!trackId) return;
    api.get(`/music/proxy/youtube/${trackId}/prefetch`).catch(() => {});
  };

  const artistLink = album.artistId
    ? `/artist/${encodeURIComponent(album.artistId)}`
    : album.artist
    ? `/artist/${encodeURIComponent(album.artist)}`
    : null;

  return (
    <div className="min-h-screen pb-36">
      {/* ── Album Hero Section ─────────────────────────────────────── */}
      <div className="relative p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          {/* Large Square Cover Artwork with Ambient Glow */}
          <div
            onClick={handlePlayAll}
            className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] shrink-0 bg-black/50 border border-white/10 group cursor-pointer"
          >
            {album.thumbnail ? (
              <Image
                src={album.thumbnail}
                alt={album.title}
                fill
                priority
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 224px, 256px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-black">
                <Disc3 className="w-20 h-20 text-white/40 animate-spin-slow" />
              </div>
            )}

            {/* Hover Dark Overlay & Large Play Button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                <Play className="w-7 h-7 fill-current ml-1" />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-primary mb-3">
              Album
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3 line-clamp-2">
              {album.title}
            </h1>

            {/* Subtitle: Clickable Artist, Year, Tracks, Duration */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground mb-6 font-medium">
              {album.artist && (
                <>
                  {artistLink ? (
                    <Link
                      href={artistLink}
                      className="text-white hover:text-primary font-bold transition-colors underline-offset-4 hover:underline"
                    >
                      {album.artist}
                    </Link>
                  ) : (
                    <span className="text-white font-bold">{album.artist}</span>
                  )}
                  <span>•</span>
                </>
              )}

              {album.year && (
                <>
                  <span>{album.year}</span>
                  <span>•</span>
                </>
              )}

              <span>{tracks.length} songs</span>

              {album.duration && (
                <>
                  <span>•</span>
                  <span>{album.duration}</span>
                </>
              )}
            </div>

            {/* Action Buttons: Play All & Smart Shuffle */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayAll}
                onMouseEnter={() => tracks[0] && warmupStandbyTrack(tracks[0])}
                onPointerDown={() => tracks[0] && warmupStandbyTrack(tracks[0])}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-[0_4px_24px_rgba(236,72,153,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleSmartShuffle}
                onMouseEnter={() => tracks[0] && warmupStandbyTrack(tracks[0])}
                onPointerDown={() => tracks[0] && warmupStandbyTrack(tracks[0])}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm backdrop-blur-md border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span>Smart Shuffle</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tracklist Section ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-6">
        {/* Table Header */}
        <div className="grid grid-cols-[3rem_1fr_4rem_3rem] items-center px-4 py-2.5 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="text-right">Time</span>
          <span className="text-center"></span>
        </div>

        {/* Track Rows */}
        <div className="space-y-1">
          {tracks.map((track, idx) => {
            const isCurrent = getTrackId(currentTrack) === track.providerTrackId;
            const isTrackPlaying = isCurrent && isPlaying;

            return (
              <div
                key={`${track.providerTrackId}-${idx}`}
                onMouseEnter={() => warmupStandbyTrack(track)}
                onPointerDown={() => warmupStandbyTrack(track)}
                onClick={() => handlePlayTrack(idx)}
                className={`group grid grid-cols-[3rem_1fr_4rem_3rem] items-center px-4 py-3 rounded-xl transition-all duration-150 cursor-pointer border ${
                  isCurrent
                    ? 'bg-white/10 border-primary/40 shadow-[0_4px_20px_rgba(236,72,153,0.15)]'
                    : 'bg-white/[0.01] hover:bg-white/[0.06] border-transparent'
                }`}
              >
                {/* Number / Play Button Overlay */}
                <div className="flex items-center justify-center">
                  {isTrackPlaying ? (
                    <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                  ) : (
                    <>
                      <span className={`text-sm font-semibold group-hover:hidden ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                      <Play className="w-4 h-4 fill-white text-white hidden group-hover:block ml-0.5" />
                    </>
                  )}
                </div>

                {/* Title & Artist */}
                <div className="flex flex-col min-w-0 pr-4">
                  <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary' : 'text-white group-hover:text-primary transition-colors'}`}>
                    {track.title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {track.artist}
                  </span>
                </div>

                {/* Duration */}
                <div className="text-right font-mono text-xs text-muted-foreground">
                  {formatDuration(track.duration)}
                </div>

                {/* 3-Dots Dropdown Action Menu */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  <TrackMenu track={track} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
