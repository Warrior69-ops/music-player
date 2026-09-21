import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';

export interface ImportedTrack {
  title: string;
  artist: string;
  albumArt?: string;
}

export interface ImportedPlaylist {
  title: string;
  author: string;
  thumbnail: string;
  tracks: ImportedTrack[];
}

@Injectable()
export class PlaylistImporterService {
  private readonly logger = new Logger(PlaylistImporterService.name);

  async importFromUrl(url: string): Promise<ImportedPlaylist> {
    try {
      const isSpotify = url.includes('spotify.com');
      const isAppleMusic = url.includes('music.apple.com');

      if (!isSpotify && !isAppleMusic) {
        throw new Error('Only Spotify and Apple Music URLs are supported by this generic scraper.');
      }

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch URL: ${res.statusText}`);
      }

      const html = await res.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      // Extract basic open-graph metadata
      const title =
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.title ||
        'Imported Playlist';
      const thumbnail =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      
      let author = 'Unknown';
      if (isSpotify) {
        author = 'Spotify';
      } else if (isAppleMusic) {
        author = 'Apple Music';
      }

      const tracks: ImportedTrack[] = [];

      // Look for schema.org application/ld+json
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        if (!script.textContent) continue;
        try {
          const data = JSON.parse(script.textContent);
          
          const processEntity = (entity: any) => {
            if (entity['@type'] === 'MusicPlaylist' || entity['@type'] === 'MusicAlbum') {
              if (entity.track && Array.isArray(entity.track)) {
                entity.track.forEach((t: any) => {
                  let artistName = 'Unknown Artist';
                  if (t.byArtist) {
                    if (Array.isArray(t.byArtist)) {
                      artistName = t.byArtist.map((a: any) => a.name).join(', ');
                    } else if (t.byArtist.name) {
                      artistName = t.byArtist.name;
                    }
                  } else if (entity.byArtist) {
                    if (Array.isArray(entity.byArtist)) {
                      artistName = entity.byArtist.map((a: any) => a.name).join(', ');
                    } else if (entity.byArtist.name) {
                      artistName = entity.byArtist.name;
                    }
                  }

                  tracks.push({
                    title: t.name,
                    artist: artistName,
                    albumArt: t.image || thumbnail,
                  });
                });
              }
            }
          };

          if (Array.isArray(data)) {
            data.forEach(processEntity);
          } else {
            processEntity(data);
          }
        } catch (e) {
          // ignore parsing errors for individual scripts
        }
      }

      // Fallback: If no schema.org tracks found, try to extract from Spotify meta tags
      if (tracks.length === 0 && isSpotify) {
        const songMetas = doc.querySelectorAll('meta[name="music:song"]');
        songMetas.forEach((meta) => {
          // In some versions of Spotify's open graph, it might just link to the song
          // but we can't get the title directly from this meta tag.
          // Fallback to searching standard text nodes or title
        });
      }

      return {
        title,
        author,
        thumbnail,
        tracks,
      };
    } catch (error: any) {
      this.logger.error(`Import failed for ${url}: ${error.message}`);
      throw error;
    }
  }
}
