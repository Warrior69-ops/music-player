import { Innertube, UniversalCache, Platform } from 'youtubei.js';
import { Logger } from '@nestjs/common';

const logger = new Logger('YoutubeScraper');

// Inject JS evaluator for YouTube's signature deciphering
Platform.shim.eval = (data) => {
  const code = typeof data === 'string' ? data : (data as any).output || data;
  return Promise.resolve(new Function(code)());
};

let innertubeClient: Innertube | null = null;

/**
 * Reusable singleton instance of InnerTube
 */
export async function getClient(): Promise<Innertube> {
  if (!innertubeClient) {
    logger.log('Initializing youtubei.js InnerTube client...');
    innertubeClient = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
  }
  return innertubeClient;
}

export interface YoutubeSearchResult {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  artist: string;
}

export interface YoutubeTrackInfo {
  success: boolean;
  videoId?: string;
  title?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
  client?: Innertube;
  error?: string;
}

/**
 * Resolves a track query or YouTube URL into playable metadata and an active download stream
 */
export async function resolveYoutubeTrack(
  queryOrUrl: string,
): Promise<YoutubeTrackInfo> {
  try {
    const yt = await getClient();
    let videoId = queryOrUrl;

    // 1. Extract video ID if a URL was passed
    if (queryOrUrl.includes('youtube.com') || queryOrUrl.includes('youtu.be')) {
      const urlObj = new URL(queryOrUrl);
      videoId =
        urlObj.searchParams.get('v') ||
        queryOrUrl.split('/').pop() ||
        queryOrUrl;
    }
    // 2. Otherwise search YouTube Music catalog directly
    else if (videoId.length !== 11) {
      logger.log(`Searching youtubei.js for: ${queryOrUrl}`);
      const searchResults = await yt.music.search(queryOrUrl, { type: 'song' });
      const firstSong = searchResults.songs?.contents?.[0];
      if (!firstSong || !firstSong.id) {
        throw new Error(`No matching track found for: ${queryOrUrl}`);
      }
      videoId = firstSong.id;
    }

    // 3. Fetch track playback details and metadata
    const info = await yt.music.getInfo(videoId);
    const basic = info.basic_info;

    return {
      success: true,
      videoId,
      title: basic.title,
      artist: basic.author,
      duration: basic.duration,
      thumbnail: basic.thumbnail?.[0]?.url,
      client: yt,
    };
  } catch (err: any) {
    logger.error('youtubei.js resolver error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Native Search functionality replicating yt-search
 */
export async function searchYoutubeTracks(
  query: string,
  limit = 10,
): Promise<YoutubeSearchResult[]> {
  try {
    const yt = await getClient();
    logger.log(`Searching via youtubei.js (music): ${query}`);

    // We use YouTube Music search to only index songs, filtering out vlogs, documentaries, etc.
    const search = await yt.music.search(query, { type: 'song' });

    // Extract songs from the search results
    const songs = search.songs?.contents || [];
    const limitedSongs = songs.slice(0, limit);

    return limitedSongs.map((v: any) => ({
      id: v.id,
      title: v.title?.toString() || 'Unknown Title',
      duration: v.duration?.seconds || 0,
      thumbnail:
        v.thumbnails?.[0]?.url || v.thumbnail?.contents?.[0]?.url || '',
      artist: v.artists?.[0]?.name || 'Unknown Artist',
    }));
  } catch (err: any) {
    logger.error('youtubei.js music search failed:', err.message);
    return [];
  }
}

export interface ArtistDetails {
  id: string;
  name: string;
  subscribers: string;
  description: string;
  thumbnail: string;
  topSongs: any[];
  singles: any[];
  albums: any[];
}

/**
 * Fetches full artist profile: header, top 10-15 songs, recent releases/singles, and albums
 */
export async function getArtistDetails(
  artistIdOrName: string,
): Promise<ArtistDetails | null> {
  try {
    const yt = await getClient();
    let channelId = artistIdOrName;

    // If a name or query was passed instead of a YouTube channel ID
    if (!channelId.startsWith('UC') && !channelId.startsWith('FE')) {
      logger.log(`Resolving artist channel ID for query: ${artistIdOrName}`);
      const artistSearch = await yt.music.search(artistIdOrName, {
        type: 'artist',
      });
      const firstArtist = artistSearch.artists?.contents?.[0];
      if (firstArtist?.id) {
        channelId = firstArtist.id;
      } else {
        throw new Error(`Artist not found for "${artistIdOrName}"`);
      }
    }

    logger.log(`Fetching artist details for channel: ${channelId}`);
    const artist = await yt.music.getArtist(channelId);
    const anyArtist = artist as any;
    const anyHeader = (artist.header || {}) as any;

    const name = anyHeader.title?.toString() || '';
    const subscribers = anyHeader.subscribers?.toString() || '';
    const description = anyHeader.description?.toString() || '';

    // Extract best thumbnail
    let thumbnail = '';
    const headerThumb = anyHeader.thumbnail?.contents || anyHeader.thumbnails;
    if (Array.isArray(headerThumb) && headerThumb.length > 0) {
      thumbnail =
        headerThumb[headerThumb.length - 1]?.url || headerThumb[0]?.url || '';
    }

    // 1. Fetch Top 15 Songs
    let rawSongs: any[] = [];
    try {
      if (typeof anyArtist.getAllSongs === 'function') {
        const all = await anyArtist.getAllSongs();
        rawSongs = all.contents || [];
      }
    } catch {
      // Fallback
    }

    if (rawSongs.length === 0 && anyArtist.sections) {
      const songsSec = anyArtist.sections.find((s: any) =>
        (s.header?.title?.toString() || s.title?.toString())
          ?.toLowerCase()
          ?.includes('song'),
      );
      rawSongs = songsSec?.contents || [];
    }

    const topSongs = rawSongs.slice(0, 15).map((s: any) => ({
      provider: 'youtube',
      providerTrackId: s.id,
      title: s.title?.toString() || 'Unknown Title',
      artist: s.artists?.[0]?.name || name || 'Unknown Artist',
      artistId: s.artists?.[0]?.channel_id || channelId,
      albumArt:
        s.thumbnails?.contents?.[0]?.url ||
        s.thumbnail?.contents?.[0]?.url ||
        s.thumbnails?.[0]?.url ||
        thumbnail ||
        '',
      duration: s.duration?.seconds || 0,
      explicit: false,
      isStreamable: true,
      audioUrl: `/api/music/proxy/youtube/${s.id}`,
    }));

    // If header thumbnail was empty, borrow artwork from top song
    if (!thumbnail && topSongs[0]?.albumArt) {
      thumbnail = topSongs[0].albumArt;
    }

    // 2. Extract Recent Singles & EPs
    const singlesSec = anyArtist.sections?.find((s: any) =>
      (s.header?.title?.toString() || s.title?.toString())
        ?.toLowerCase()
        ?.includes('single'),
    );
    const singles = (singlesSec?.contents || [])
      .slice(0, 12)
      .map((item: any) => {
        const itemThumb =
          item.thumbnail?.[0]?.url ||
          item.thumbnail?.contents?.[0]?.url ||
          item.thumbnails?.[0]?.url ||
          '';
        return {
          id: item.id,
          title: item.title?.toString() || 'Unknown',
          year: item.year?.toString() || '',
          thumbnail: itemThumb,
          type: 'single',
        };
      });

    // 3. Extract Studio Albums
    const albumsSec = anyArtist.sections?.find((s: any) =>
      (s.header?.title?.toString() || s.title?.toString())
        ?.toLowerCase()
        ?.includes('album'),
    );
    const albums = (albumsSec?.contents || []).slice(0, 16).map((item: any) => {
      const itemThumb =
        item.thumbnail?.[0]?.url ||
        item.thumbnail?.contents?.[0]?.url ||
        item.thumbnails?.[0]?.url ||
        '';
      return {
        id: item.id,
        title: item.title?.toString() || 'Unknown Album',
        year: item.year?.toString() || '',
        thumbnail: itemThumb,
        type: 'album',
      };
    });

    return {
      id: channelId,
      name,
      subscribers,
      description,
      thumbnail,
      topSongs,
      singles,
      albums,
    };
  } catch (err: any) {
    logger.error(
      `Failed to fetch artist details for ${artistIdOrName}:`,
      err.message,
    );
    return null;
  }
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  year?: string;
  trackCount: number;
  duration?: string;
  thumbnail: string;
  description?: string;
  tracks: any[];
}

/**
 * Fetches album or community playlist details, tracklist, and playback metadata
 */
export async function getAlbumDetails(
  albumId: string,
): Promise<AlbumDetails | null> {
  try {
    const yt = await getClient();
    logger.log(`Fetching album details for: ${albumId}`);

    const isPlaylist = albumId.startsWith('VLPL') || albumId.startsWith('PL');

    if (isPlaylist) {
      const p = await yt.music.getPlaylist(albumId);
      const anyP = p as any;
      const anyPHeader = anyP.header || {};
      const title = anyPHeader.title?.toString() || 'Curated Playlist';
      const author = anyPHeader.author?.name || 'YouTube Music';
      const authorId = anyPHeader.author?.channel_id || '';
      const thumb =
        anyPHeader.thumbnail?.contents?.[0]?.url ||
        anyPHeader.thumbnails?.[0]?.url ||
        '';
      const items = p.items || anyP.contents || [];

      const tracks = items.map((t: any, idx: number) => ({
        provider: 'youtube',
        providerTrackId: t.id,
        title: t.title?.toString() || `Track ${idx + 1}`,
        artist: t.artists?.[0]?.name || author || 'Unknown Artist',
        artistId: t.artists?.[0]?.channel_id || authorId,
        albumArt:
          t.thumbnail?.contents?.[0]?.url || t.thumbnails?.[0]?.url || thumb,
        duration: t.duration?.seconds || 0,
        explicit: false,
        isStreamable: true,
        audioUrl: `/api/music/proxy/youtube/${t.id}`,
      }));

      return {
        id: albumId,
        title,
        artist: author,
        artistId: authorId,
        trackCount: tracks.length,
        thumbnail: thumb || tracks[0]?.albumArt || '',
        tracks,
      };
    }

    const album = await yt.music.getAlbum(albumId);
    const anyAlbum = album as any;
    const anyHeader = (album.header || {}) as any;
    const title =
      anyHeader.title?.toString() ||
      anyAlbum.title?.toString() ||
      'Unknown Album';

    // Subtitle contains format like "Album • 2025" or "Artist • 2025"
    const subtitle = anyHeader.subtitle?.toString() || '';
    const secondSubtitle = anyHeader.second_subtitle?.toString() || '';

    const yearMatch = subtitle.match(/\b(19|20)\d{2}\b/);
    const year = anyHeader.year?.toString() || (yearMatch ? yearMatch[0] : '');

    const straplineRun = anyHeader.strapline_text_one?.runs?.[0];
    const authorName =
      anyHeader.author?.name ||
      straplineRun?.text ||
      anyHeader.strapline_text_one?.toString() ||
      anyAlbum.artists?.[0]?.name ||
      'Unknown Artist';

    const authorId =
      anyHeader.author?.channel_id ||
      straplineRun?.endpoint?.payload?.browseId ||
      anyAlbum.artists?.[0]?.channel_id ||
      '';

    const thumbContents = anyHeader.thumbnail?.contents || anyHeader.thumbnails;
    const thumbnail =
      Array.isArray(thumbContents) && thumbContents.length > 0
        ? thumbContents[thumbContents.length - 1]?.url || thumbContents[0]?.url
        : '';

    const tracks = (anyAlbum.contents || []).map((t: any, idx: number) => ({
      provider: 'youtube',
      providerTrackId: t.id,
      title: t.title?.toString() || `Track ${idx + 1}`,
      artist: t.artists?.[0]?.name || authorName,
      artistId: t.artists?.[0]?.channel_id || authorId,
      albumArt: thumbnail,
      duration: t.duration?.seconds || 0,
      explicit: false,
      isStreamable: true,
      audioUrl: `/api/music/proxy/youtube/${t.id}`,
    }));

    return {
      id: albumId,
      title,
      artist: authorName,
      artistId: authorId,
      year,
      trackCount: tracks.length,
      duration: secondSubtitle,
      thumbnail: thumbnail || tracks[0]?.albumArt || '',
      description: anyHeader.description?.toString() || '',
      tracks,
    };
  } catch (err: any) {
    logger.error(`Failed to fetch album details for ${albumId}:`, err.message);
    return null;
  }
}

/**
 * Searches YouTube Music categorized into songs, albums, artists, and playlists
 */
export async function searchCategorized(
  query: string,
  type: 'all' | 'song' | 'album' | 'artist' | 'playlist' = 'all',
) {
  try {
    const yt = await getClient();
    logger.log(`Searching categorized (${type}): ${query}`);

    if (type === 'song') {
      const res = await yt.music.search(query, { type: 'song' });
      const songs = (res.songs?.contents || []).map((v: any) => ({
        provider: 'youtube',
        providerTrackId: v.id,
        title: v.title?.toString() || 'Unknown Title',
        artist: v.artists?.[0]?.name || 'Unknown Artist',
        artistId: v.artists?.[0]?.channel_id || '',
        albumArt:
          v.thumbnails?.[0]?.url || v.thumbnail?.contents?.[0]?.url || '',
        duration: v.duration?.seconds || 0,
        explicit: false,
        isStreamable: true,
        audioUrl: `/api/music/proxy/youtube/${v.id}`,
      }));
      return { songs };
    }

    if (type === 'album') {
      const res = await yt.music.search(query, { type: 'album' });
      const albums = (res.albums?.contents || []).map((a: any) => ({
        id: a.id,
        title: a.title?.toString() || 'Unknown Album',
        artist: a.artists?.[0]?.name || a.author?.name || 'Unknown Artist',
        artistId: a.artists?.[0]?.channel_id || '',
        year: a.year?.toString() || '',
        thumbnail:
          a.thumbnail?.[0]?.url ||
          a.thumbnail?.contents?.[0]?.url ||
          a.thumbnails?.[0]?.url ||
          '',
        type: 'album',
      }));
      return { albums };
    }

    if (type === 'artist') {
      const res = await yt.music.search(query, { type: 'artist' });
      const artists = (res.artists?.contents || []).map((ar: any) => ({
        id: ar.id,
        name: ar.name || ar.title?.toString() || 'Unknown Artist',
        subscribers: ar.subscribers?.toString() || '',
        thumbnail:
          ar.thumbnail?.contents?.[0]?.url || ar.thumbnails?.[0]?.url || '',
      }));
      return { artists };
    }

    if (type === 'playlist') {
      const res = await yt.music.search(query, { type: 'playlist' });
      const playlists = (res.playlists?.contents || []).map((p: any) => ({
        id: p.id,
        title: p.title?.toString() || 'Curated Playlist',
        author: p.author?.name || p.authors?.[0]?.name || 'YouTube Music',
        itemCount: p.item_count || '',
        thumbnail:
          p.thumbnail?.contents?.[0]?.url || p.thumbnails?.[0]?.url || '',
      }));
      return { playlists };
    }

    // Type === 'all': Fetch parallel batches for speed
    const [songRes, albumRes, artistRes, playlistRes] =
      await Promise.allSettled([
        yt.music.search(query, { type: 'song' }),
        yt.music.search(query, { type: 'album' }),
        yt.music.search(query, { type: 'artist' }),
        yt.music.search(query, { type: 'playlist' }),
      ]);

    const songs =
      songRes.status === 'fulfilled'
        ? (songRes.value.songs?.contents || []).slice(0, 10).map((v: any) => ({
            provider: 'youtube',
            providerTrackId: v.id,
            title: v.title?.toString() || 'Unknown Title',
            artist: v.artists?.[0]?.name || 'Unknown Artist',
            artistId: v.artists?.[0]?.channel_id || '',
            albumArt:
              v.thumbnails?.[0]?.url || v.thumbnail?.contents?.[0]?.url || '',
            duration: v.duration?.seconds || 0,
            explicit: false,
            isStreamable: true,
            audioUrl: `/api/music/proxy/youtube/${v.id}`,
          }))
        : [];

    const albums =
      albumRes.status === 'fulfilled'
        ? (albumRes.value.albums?.contents || []).slice(0, 6).map((a: any) => ({
            id: a.id,
            title: a.title?.toString() || 'Unknown Album',
            artist: a.artists?.[0]?.name || a.author?.name || 'Unknown Artist',
            artistId: a.artists?.[0]?.channel_id || '',
            year: a.year?.toString() || '',
            thumbnail:
              a.thumbnail?.[0]?.url ||
              a.thumbnail?.contents?.[0]?.url ||
              a.thumbnails?.[0]?.url ||
              '',
            type: 'album',
          }))
        : [];

    const artists =
      artistRes.status === 'fulfilled'
        ? (artistRes.value.artists?.contents || [])
            .slice(0, 6)
            .map((ar: any) => ({
              id: ar.id,
              name: ar.name || ar.title?.toString() || 'Unknown Artist',
              subscribers: ar.subscribers?.toString() || '',
              thumbnail:
                ar.thumbnail?.contents?.[0]?.url ||
                ar.thumbnails?.[0]?.url ||
                '',
            }))
        : [];

    const playlists =
      playlistRes.status === 'fulfilled'
        ? (playlistRes.value.playlists?.contents || [])
            .slice(0, 6)
            .map((p: any) => ({
              id: p.id,
              title: p.title?.toString() || 'Curated Playlist',
              author: p.author?.name || p.authors?.[0]?.name || 'YouTube Music',
              itemCount: p.item_count || '',
              thumbnail:
                p.thumbnail?.contents?.[0]?.url || p.thumbnails?.[0]?.url || '',
            }))
        : [];

    // Determine Top Result (Artist if strong match, else top Song)
    let topResult: any = null;
    const cleanQ = query.toLowerCase().trim();
    if (artists.length > 0 && artists[0].name.toLowerCase().includes(cleanQ)) {
      topResult = { type: 'artist', ...artists[0] };
    } else if (songs.length > 0) {
      topResult = { type: 'song', ...songs[0] };
    }

    return {
      topResult,
      songs,
      albums,
      artists,
      playlists,
    };
  } catch (err: any) {
    logger.error('Categorized search failed:', err.message);
    return { songs: [], albums: [], artists: [], playlists: [] };
  }
}
