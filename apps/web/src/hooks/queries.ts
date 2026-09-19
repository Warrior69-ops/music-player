import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Track } from '@/store/usePlayerStore';

// Search
export const useSearchMusic = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query) return [];
      const { data } = await api.get(`/music/search?q=${encodeURIComponent(query)}`);
      return data.data as Track[];
    },
    enabled: !!query,
    staleTime: 5 * 60 * 1000, // cache results for 5 min
  });
};

export type MusicSuggestion =
  | { type: 'query'; text: string }
  | { type: 'song'; id: string; title: string; artist: string };

// Live suggestions while typing (debounced via staleTime)
export const useSuggestMusic = (query: string) => {
  return useQuery({
    queryKey: ['suggest', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [] as MusicSuggestion[];
      const { data } = await api.get(`/music/suggest?q=${encodeURIComponent(query)}`);
      return data.data as MusicSuggestion[];
    },
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000, // cache suggestions for 30s
    placeholderData: [] as MusicSuggestion[], // never show loading spinner for suggestions

  });
};

// History
export const useHistory = () => {
  return useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const { data } = await api.get('/history');
      return data.data as Track[];
    },
  });
};

// Favorites
export const useFavorites = () => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await api.get('/favorites');
      return data.data as Track[];
    },
  });
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (track: Track) => {
      await api.post('/favorites', track);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerTrackId: string) => {
      await api.delete(`/favorites/${providerTrackId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });
};

// Playlists
export const usePlaylists = () => {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data } = await api.get('/playlists');
      return data.data;
    },
  });
};

export const usePlaylist = (id: string) => {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/playlists/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      await api.post('/playlists', { name, description });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playlists'] }),
  });
};

export const useAddTrackToPlaylist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, track }: { playlistId: string; track: Track }) => {
      await api.post(`/playlists/${playlistId}/tracks`, track);
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    },
  });
};

import { LyricsPayload } from '@/types/lyrics';

// Lyrics
export const useLyrics = (trackName?: string, artistName?: string, duration?: number) => {
  return useQuery({
    queryKey: ['lyrics', trackName, artistName],
    queryFn: async () => {
      if (!trackName) return null;
      let url = `/lyrics?title=${encodeURIComponent(trackName)}`;
      if (artistName) url += `&artist=${encodeURIComponent(artistName)}`;
      if (duration) url += `&duration=${Math.floor(duration)}`;
      
      const { data } = await api.get(url);
      return data as LyricsPayload;
    },
    enabled: !!trackName,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: false, // Don't retry if lyrics not found
  });
};

export interface RecommendationShelf {
  id: string;
  title: string;
  type: 'track-list';
  items: Track[];
}

export interface ArtistResult {
  id: string;
  name: string;
  thumbnail: string;
  subscribers?: string;
}

// Algorithmic Home Shelves
export const useHomeShelves = (enabled = true) => {
  return useQuery({
    queryKey: ['homeShelves'],
    queryFn: async () => {
      const { data } = await api.get('/recommendations/home');
      return data as RecommendationShelf[];
    },
    enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

// Artist search for onboarding
export const useArtistSearch = (query: string) => {
  return useQuery({
    queryKey: ['artistSearch', query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return [] as ArtistResult[];
      const { data } = await api.get(`/recommendations/artists?q=${encodeURIComponent(query.trim())}`);
      return data as ArtistResult[];
    },
    enabled: !!query && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};

export interface ArtistData {
  id: string;
  name: string;
  subscribers: string;
  description: string;
  thumbnail: string;
  topSongs: Track[];
  singles: Array<{ id: string; title: string; year: string; thumbnail: string; type: string }>;
  albums: Array<{ id: string; title: string; year: string; thumbnail: string; type: string }>;
}

export const useArtist = (artistId: string) => {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      if (!artistId) return null;
      const { data } = await api.get(`/music/artist/${encodeURIComponent(artistId)}`);
      return data.data as ArtistData;
    },
    enabled: !!artistId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export interface AlbumData {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  year?: string;
  trackCount: number;
  duration?: string;
  thumbnail: string;
  description?: string;
  tracks: Track[];
}

export const useAlbum = (albumId: string) => {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      if (!albumId) return null;
      const { data } = await api.get(`/music/album/${encodeURIComponent(albumId)}`);
      return data.data as AlbumData;
    },
    enabled: !!albumId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export interface CategorizedSearchResults {
  topResult?: {
    type: 'artist' | 'song';
    id: string;
    name?: string;
    title?: string;
    artist?: string;
    subscribers?: string;
    thumbnail?: string;
    albumArt?: string;
    providerTrackId?: string;
    duration?: number;
  };
  songs: Track[];
  albums: Array<{ id: string; title: string; artist: string; year: string; thumbnail: string; type: string }>;
  artists: Array<{ id: string; name: string; subscribers: string; thumbnail: string }>;
  playlists: Array<{ id: string; title: string; author: string; itemCount: string; thumbnail: string }>;
}

export const useCategorizedSearch = (query: string, type: 'all' | 'song' | 'album' | 'artist' | 'playlist' = 'all') => {
  return useQuery({
    queryKey: ['categorizedSearch', query, type],
    queryFn: async () => {
      if (!query || !query.trim()) return null;
      const { data } = await api.get(`/music/search?q=${encodeURIComponent(query.trim())}&type=${type}`);
      return data.data as CategorizedSearchResults;
    },
    enabled: !!query && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

