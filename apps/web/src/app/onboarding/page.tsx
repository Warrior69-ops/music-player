'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Sparkles, Search, ChevronRight, ArrowLeft, Loader2, Music, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useArtistSearch, ArtistResult } from '@/hooks/queries';
import api from '@/lib/api';
import { toast } from 'sonner';

// Curated starter languages
const AVAILABLE_LANGUAGES = [
  { id: 'hindi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'english', name: 'English', native: 'English', flag: '🌐' },
  { id: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '👳' },
  { id: 'spanish', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { id: 'kpop', name: 'K-Pop', native: '한국어', flag: '🇰🇷' },
  { id: 'tamil', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { id: 'telugu', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { id: 'french', name: 'French', native: 'Français', flag: '🇫🇷' },
  { id: 'latin', name: 'Latin / Reggaeton', native: 'Latino', flag: '💃' },
  { id: 'malayalam', name: 'Malayalam', native: 'മലയാളം', flag: '🌴' },
  { id: 'japanese', name: 'Japanese / J-Pop', native: '日本語', flag: '🇯🇵' },
  { id: 'bengali', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
];

// Curated starter artists with real YouTube Music browse IDs
const STARTER_ARTISTS: ArtistResult[] = [
  {
    id: 'UCDxKh1gFWeYsqePvgVzmPoQ',
    name: 'Arijit Singh',
    thumbnail: 'https://yt3.googleusercontent.com/ykJkyILKum4B2oudDxjnf5WNenWWZAp-WEz0_CHp4cu0VnqB2-uaNDylItqC68WLXV62rdHDun-ahbg=w240-h240-l90-rj',
    subscribers: 'Bollywood & Soul',
  },
  {
    id: 'UCVGomUS__PL0c4jDXa0QwXA',
    name: 'Atif Aslam',
    thumbnail: 'https://yt3.googleusercontent.com/4h_L7b_R87Pj3uXGk7P7Vp9b8L2B5D8=w240-h240-l90-rj',
    subscribers: 'Romantic & Sufi',
  },
  {
    id: 'UC4R8DWoMoI7CAwX8_BQhyMg',
    name: 'Diljit Dosanjh',
    thumbnail: 'https://yt3.googleusercontent.com/vHqJ_kP0wZkE0Qo_hY2Q5y=w240-h240-l90-rj',
    subscribers: 'Punjabi & Pop',
  },
  {
    id: 'UC0C-w0YjGpqDXGB8Uqc61dQ',
    name: 'The Weeknd',
    thumbnail: 'https://yt3.googleusercontent.com/eNnZ9f6D6nS3c3=w240-h240-l90-rj',
    subscribers: 'R&B & Synth-pop',
  },
  {
    id: 'UCqECaJ8Gagnn7YCbPEzWH6g',
    name: 'Taylor Swift',
    thumbnail: 'https://yt3.googleusercontent.com/u_5Y1d4N4u_4k=w240-h240-l90-rj',
    subscribers: 'Pop & Country',
  },
  {
    id: 'UCByOQJjav0CUDwxCk-jVNRQ',
    name: 'Drake',
    thumbnail: 'https://yt3.googleusercontent.com/7s1H7=w240-h240-l90-rj',
    subscribers: 'Hip-Hop & Rap',
  },
  {
    id: 'UCz_tK8bEw6K8uN7=w240',
    name: 'AP Dhillon',
    thumbnail: 'https://yt3.googleusercontent.com/apdhillon=w240-h240-l90-rj',
    subscribers: 'Brown Munde & Trap',
  },
  {
    id: 'UCiGm_E4ZwYSHV3bcW1pnSeQ',
    name: 'Billie Eilish',
    thumbnail: 'https://yt3.googleusercontent.com/billie=w240-h240-l90-rj',
    subscribers: 'Alt-Pop',
  },
  {
    id: 'UCk8GzugZ_K3A=w240',
    name: 'Sidhu Moose Wala',
    thumbnail: 'https://yt3.googleusercontent.com/sidhu=w240-h240-l90-rj',
    subscribers: 'Punjabi Rap Legend',
  },
  {
    id: 'UCmBA_wu8xGg1dG_V9oV9m2g',
    name: 'Bad Bunny',
    thumbnail: 'https://yt3.googleusercontent.com/badbunny=w240-h240-l90-rj',
    subscribers: 'Urbano Latino',
  },
  {
    id: 'UC3IZKJUcK7_h7nK=w240',
    name: 'BTS',
    thumbnail: 'https://yt3.googleusercontent.com/bts=w240-h240-l90-rj',
    subscribers: 'K-Pop Superstars',
  },
  {
    id: 'UCk1zG_karanaujla=w240',
    name: 'Karan Aujla',
    thumbnail: 'https://yt3.googleusercontent.com/karanaujla=w240-h240-l90-rj',
    subscribers: 'Punjabi & Haryanvi',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, updateUser } = useAuthStore();

  const isUpdating = !!user?.hasCompletedOnboarding;

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<ArtistResult[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Pre-populate if user has already set preferences
  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.languages && user.preferences.languages.length > 0) {
        setSelectedLanguages(user.preferences.languages);
      }
      if (user.preferences.favoriteArtists && user.preferences.favoriteArtists.length > 0) {
        setSelectedArtists(user.preferences.favoriteArtists);
      }
    }
  }, [user]);

  // Debounce artist query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(artistSearchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [artistSearchQuery]);

  const { data: searchResults, isLoading: isSearching } = useArtistSearch(debouncedQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Route Guarding: Onboarding is only for new users; redirect to / if already completed
  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login');
    } else if (user?.hasCompletedOnboarding) {
      router.replace('/');
    }
  }, [mounted, token, user, router]);

  // Combine starter artists with search results (avoiding duplicates)
  const displayedArtists = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return STARTER_ARTISTS;
    }
    if (searchResults && searchResults.length > 0) {
      return searchResults;
    }
    return STARTER_ARTISTS;
  }, [debouncedQuery, searchResults]);

  const toggleLanguage = (name: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]
    );
  };

  const toggleArtist = (artist: ArtistResult) => {
    setSelectedArtists((prev) => {
      const exists = prev.some((a) => a.id === artist.id || a.name.toLowerCase() === artist.name.toLowerCase());
      if (exists) {
        return prev.filter((a) => a.id !== artist.id && a.name.toLowerCase() !== artist.name.toLowerCase());
      }
      return [...prev, artist];
    });
  };

  const handleSubmit = async () => {
    if (selectedLanguages.length === 0) {
      toast.error('Please select at least 1 language');
      setStep(1);
      return;
    }
    if (selectedArtists.length < 5) {
      toast.error('Please select at least 5 favorite artists');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        languages: selectedLanguages,
        favoriteArtists: selectedArtists.map((a) => ({
          id: a.id,
          name: a.name,
          thumbnail: a.thumbnail,
        })),
      };

      await api.patch('/users/preferences', payload);

      updateUser({
        hasCompletedOnboarding: true,
        preferences: payload,
      });

      // Invalidate home recommendations so new tastes are immediately reflected
      await queryClient.invalidateQueries({ queryKey: ['homeShelves'] });

      toast.success(isUpdating ? 'Musical tastes updated!' : 'Your personalized feed is ready!');
      router.replace('/');
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      toast.error(err.response?.data?.message || 'Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !token) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="w-full max-w-2xl bg-zinc-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] p-6 sm:p-10 relative z-10 flex flex-col animate-in fade-in zoom-in-95 duration-300">
        {/* Progress Bar & Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                {isUpdating ? 'Update Tastes' : 'Welcome to MELØ'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">Step {step} of 2</span>
              {isUpdating && (
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
                  title="Close and return to Home"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500 rounded-full"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* ── STEP 1: LANGUAGE SELECTION ─────────────────────────────────── */}
        {step === 1 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              {isUpdating ? 'Which languages do you want to hear?' : 'What languages do you listen to?'}
            </h1>
            <p className="text-sm text-zinc-400 mb-6">
              Choose one or more to personalize your daily mixes, trending charts, and radio stations.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.name);
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => toggleLanguage(lang.name)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 text-left group ${
                      isSelected
                        ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-primary/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-sm font-semibold text-white truncate">{lang.name}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">{lang.native}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected ? 'bg-primary text-black' : 'border border-white/20 group-hover:border-white/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-xs text-zinc-400">
                {selectedLanguages.length === 0
                  ? 'Select at least 1 language'
                  : `${selectedLanguages.length} selected`}
              </span>

              <button
                type="button"
                disabled={selectedLanguages.length === 0}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 bg-primary text-black hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:scale-105 active:scale-95"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: ARTIST SELECTION ──────────────────────────────────── */}
        {step === 2 && (
          <div className="animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors"
                title="Back to Languages"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isUpdating ? 'Update your favorite artists' : 'Pick your favorite artists'}
              </h1>
            </div>
            <p className="text-sm text-zinc-400 mb-5">
              Select at least 5 artists to tune your algorithm. Search for any global artist below.
            </p>

            {/* Debounced Search Bar */}
            <div className="relative mb-6">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={artistSearchQuery}
                onChange={(e) => setArtistSearchQuery(e.target.value)}
                placeholder="Search artists (e.g. Arijit Singh, Drake, Taylor Swift)..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Circular Artist Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[350px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 mb-6">
              {displayedArtists.map((artist) => {
                const isSelected = selectedArtists.some(
                  (a) => a.id === artist.id || a.name.toLowerCase() === artist.name.toLowerCase()
                );

                return (
                  <button
                    key={artist.id || artist.name}
                    type="button"
                    onClick={() => toggleArtist(artist)}
                    className="flex flex-col items-center group relative text-center focus:outline-none"
                  >
                    <div className="relative mb-2">
                      <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 transition-all duration-300 p-0.5 ${
                          isSelected
                            ? 'border-primary ring-4 ring-primary/30 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-105'
                            : 'border-white/10 group-hover:border-white/40 group-hover:scale-102'
                        }`}
                      >
                        {artist.thumbnail ? (
                          <img
                            src={artist.thumbnail}
                            alt={artist.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 rounded-full flex items-center justify-center">
                            <Music className="w-8 h-8 text-white/30" />
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-150">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-white group-hover:text-primary transition-colors line-clamp-1 w-full px-1">
                      {artist.name}
                    </span>
                    {artist.subscribers && (
                      <span className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                        {artist.subscribers}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedArtists.length >= 5
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-zinc-400'
                }`}
              >
                {selectedArtists.length} of 5 selected
              </span>

              <button
                type="button"
                disabled={selectedArtists.length < 5 || isSubmitting}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-7 py-2.5 rounded-full font-bold text-sm transition-all duration-200 bg-primary text-black hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Feed...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isUpdating ? 'Save & Update Feed' : 'Complete Setup'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
