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

// Lyrics
export const useLyrics = (trackName?: string, artistName?: string, duration?: number) => {
  return useQuery({
    queryKey: ['lyrics', trackName, artistName],
    queryFn: async () => {
      if (!trackName || !artistName) return null;
      let url = `/music/lyrics?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`;
      if (duration) url += `&duration=${Math.floor(duration)}`;
      
      const { data } = await api.get(url);
      return data.data;
    },
    enabled: !!trackName && !!artistName,
    retry: false, // Don't retry if lyrics not found
  });
};
