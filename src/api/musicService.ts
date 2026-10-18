/**
 * Loopd Music Service — Unified Abstraction Layer
 * JioSaavn is PRIMARY for all real Indian & International music (320kbps full songs).
 * Deezer & Jamendo act as fallbacks/discovery.
 */
import { JioSaavnProvider } from './providers/jiosaavn';
import { DeezerProvider } from './providers/deezer';
import { JamendoProvider } from './providers/jamendo';
import { AudiusProvider } from './providers/audius';
import type {
  MusicProvider,
  Track,
  Album,
  Artist,
  Genre,
  SearchResults,
} from '../types';

const providers: MusicProvider[] = [
  JioSaavnProvider,
  DeezerProvider,
  JamendoProvider,
  AudiusProvider,
];

/** Remove duplicate tracks by title+artist similarity */
function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Map<string, Track>();
  for (const track of tracks) {
    const key = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}`;
    // Prefer non-preview tracks (JioSaavn is full length)
    if (!seen.has(key) || (seen.get(key)?.previewOnly && !track.previewOnly)) {
      seen.set(key, track);
    }
  }
  return Array.from(seen.values());
}

function dedupeAlbums(albums: Album[]): Album[] {
  const seen = new Map<string, Album>();
  for (const album of albums) {
    const key = `${album.title.toLowerCase().trim()}|${album.artist.toLowerCase().trim()}`;
    if (!seen.has(key)) seen.set(key, album);
  }
  return Array.from(seen.values());
}

function dedupeArtists(artists: Artist[]): Artist[] {
  const seen = new Map<string, Artist>();
  for (const artist of artists) {
    const key = artist.name.toLowerCase().trim();
    if (!seen.has(key)) seen.set(key, artist);
  }
  return Array.from(seen.values());
}

/** Retry a provider call with fallback to others */
async function withFallback<T>(
  fn: (provider: MusicProvider) => Promise<T>,
  fallbackValue: T,
  providerOrder = providers
): Promise<T> {
  for (const provider of providerOrder) {
    try {
      const result = await fn(provider);
      if (result !== null && result !== undefined) {
        if (Array.isArray(result) && result.length === 0) continue;
        return result;
      }
    } catch (err) {
      console.warn(`[MusicService] ${provider.name} failed:`, err);
    }
  }
  return fallbackValue;
}

export const MusicService = {
  /** Search across providers — JioSaavn results take top priority */
  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    try {
      const jioResults = await JioSaavnProvider.search(query, limit, offset);
      if (jioResults.tracks.length > 0) {
        return jioResults;
      }
    } catch (err) {
      console.warn('[MusicService] JioSaavn search failed, trying fallbacks:', err);
    }

    const results = await Promise.allSettled(
      providers.map((p) => p.search(query, limit, offset))
    );

    const merged: SearchResults = {
      tracks: [],
      artists: [],
      albums: [],
      playlists: [],
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        merged.tracks.push(...result.value.tracks);
        merged.artists.push(...result.value.artists);
        merged.albums.push(...result.value.albums);
        merged.playlists.push(...result.value.playlists);
      }
    }

    return {
      tracks: dedupeTracks(merged.tracks),
      artists: dedupeArtists(merged.artists),
      albums: dedupeAlbums(merged.albums),
      playlists: merged.playlists,
    };
  },

  /** Get track, falling back through providers */
  async getTrack(id: string): Promise<Track | null> {
    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getTrack(id);
      } catch {}
    }
    return withFallback((p) => p.getTrack(id), null);
  },

  async getAlbum(id: string): Promise<Album | null> {
    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getAlbum(id);
      } catch {}
    }
    return withFallback((p) => p.getAlbum(id), null);
  },

  async getArtist(id: string): Promise<Artist | null> {
    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getArtist(id);
      } catch {}
    }
    return withFallback((p) => p.getArtist(id), null);
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getArtistTracks(id, limit);
      } catch {}
    }
    return withFallback((p) => p.getArtistTracks(id, limit), []);
  },

  async getArtistAlbums(id: string, limit = 20): Promise<Album[]> {
    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getArtistAlbums(id, limit);
      } catch {}
    }
    return withFallback((p) => p.getArtistAlbums(id, limit), []);
  },

  async getPlaylist(id: string) {
    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getPlaylist(id);
      } catch {}
    }
    return withFallback((p) => p.getPlaylist(id), null);
  },

  /** Charts — JioSaavn real top 50 charts, fallback to Deezer */
  async getCharts(limit = 20): Promise<Track[]> {
    return withFallback(
      (p) => p.getCharts(limit),
      [],
      [JioSaavnProvider, DeezerProvider, JamendoProvider]
    );
  },

  /** Trending — JioSaavn real trending hits */
  async getTrending(limit = 20): Promise<Track[]> {
    return withFallback(
      (p) => p.getTrending(limit),
      [],
      [JioSaavnProvider, DeezerProvider, JamendoProvider]
    );
  },

  /** Genres — JioSaavn curated genres */
  async getGenres(): Promise<Genre[]> {
    try {
      return await JioSaavnProvider.getGenres();
    } catch {
      return [
        { id: 'bollywood', name: 'Bollywood Hits', color: '#E13300' },
        { id: 'punjabi', name: 'Punjabi Hits', color: '#1E3264' },
        { id: 'pop', name: 'Pop & International', color: '#8D67AB' },
        { id: 'romance', name: 'Romantic & Love', color: '#E8115B' },
        { id: 'hiphop', name: 'Desi Hip-Hop', color: '#BC5900' },
        { id: 'chill', name: 'Chill & Lo-Fi', color: '#006450' },
      ];
    }
  },

  /** New Releases */
  async getNewReleases(limit = 20): Promise<Album[]> {
    return withFallback(
      (p) => p.getNewReleases(limit),
      [],
      [DeezerProvider, JioSaavnProvider]
    );
  },

  /** Get a working stream URL */
  async getStreamUrl(trackId: string): Promise<string | null> {
    const provider = getProviderForId(trackId);
    if (provider) {
      try {
        const url = await provider.getStreamUrl(trackId);
        if (url) return url;
      } catch {}
    }
    return withFallback((p) => p.getStreamUrl(trackId), null);
  },

  /** Tracks by genre / tag */
  async getTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
    try {
      const res = await JioSaavnProvider.search(`${genre} hits`, limit);
      if (res.tracks.length > 0) return res.tracks;
    } catch {}
    try {
      const res = await DeezerProvider.search(genre, limit);
      if (res.tracks.length > 0) return res.tracks;
    } catch {}
    return [];
  },

  /** Popular artists — Top Indian & Global stars */
  async getPopularArtists(limit = 20): Promise<Artist[]> {
    const defaultStars: Artist[] = [
      {
        id: 'jiosaavn-459320',
        name: 'Arijit Singh',
        image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-468245',
        name: 'Diljit Dosanjh',
        image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_006_20231025143324_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-456323',
        name: 'Pritam',
        image: 'https://c.saavncdn.com/artists/Pritam_Chakraborty-20170711073326_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-455132',
        name: 'Shreya Ghoshal',
        image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230616110931_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-889657',
        name: 'AP Dhillon',
        image: 'https://c.saavncdn.com/artists/AP_Dhillon_000_20221011114409_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-1144287',
        name: 'Karan Aujla',
        image: 'https://c.saavncdn.com/artists/Karan_Aujla_004_20230616110931_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-455125',
        name: 'Atif Aslam',
        image: 'https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-455124',
        name: 'AR Rahman',
        image: 'https://c.saavncdn.com/artists/A_R_Rahman_004_20230616110931_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-1123456',
        name: 'The Weeknd',
        image: 'https://c.saavncdn.com/artists/The_Weeknd_500x500.jpg',
        provider: 'jiosaavn',
      },
      {
        id: 'jiosaavn-1123457',
        name: 'Taylor Swift',
        image: 'https://c.saavncdn.com/artists/Taylor_Swift_500x500.jpg',
        provider: 'jiosaavn',
      },
    ];

    try {
      const res = await JioSaavnProvider.search('Arijit Singh Pritam Diljit', 10);
      if (res.artists.length > 0) {
        return [...res.artists, ...defaultStars].slice(0, limit);
      }
    } catch {}
    return defaultStars.slice(0, limit);
  },
};

/** Get the correct provider adapter based on ID prefix */
function getProviderForId(id: string): MusicProvider | null {
  if (id.startsWith('jiosaavn-')) return JioSaavnProvider;
  if (id.startsWith('jamendo-')) return JamendoProvider;
  if (id.startsWith('deezer-')) return DeezerProvider;
  if (id.startsWith('audius-')) return AudiusProvider;
  return null;
}
