/**
 * Loopd Music Service — Unified Abstraction Layer
 * YouTube Music (via Loopd Backend) is PRIMARY for real Bollywood, Punjabi,
 * International Pop, and regional music catalogs with high-fidelity streams.
 * JioSaavn, Deezer & Jamendo act as fallbacks/discovery.
 */
import { YTMusicProvider } from './providers/ytmusic';
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
  YTMusicProvider,
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
    // Prefer non-preview tracks (YTMusic & JioSaavn are full length)
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
  /** Search across providers — YTMusic results take top priority */
  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    try {
      const ytResults = await YTMusicProvider.search(query, limit, offset);
      if (ytResults.tracks.length > 0) {
        return ytResults;
      }
    } catch (err) {
      console.warn('[MusicService] YTMusic search failed, trying JioSaavn/fallbacks:', err);
    }

    try {
      const jioResults = await JioSaavnProvider.search(query, limit, offset);
      if (jioResults.tracks.length > 0) {
        return jioResults;
      }
    } catch (err) {
      console.warn('[MusicService] JioSaavn search failed, trying others:', err);
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
    if (id.startsWith('ytmusic-')) {
      try {
        const art = await YTMusicProvider.getArtist(id);
        if (art) return art;
      } catch {}
    }
    // Search YouTube Music for artist
    const cleanQuery = id.replace(/^(ytmusic|jiosaavn)-/, '').replace(/[-_]/g, ' ');
    try {
      const searchRes = await YTMusicProvider.search(cleanQuery, 3);
      if (searchRes.artists.length > 0) {
        return searchRes.artists[0];
      }
    } catch {}

    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getArtist(id);
      } catch {}
    }
    return withFallback((p) => p.getArtist(id), null);
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    if (id.startsWith('ytmusic-')) {
      try {
        const tracks = await YTMusicProvider.getArtistTracks(id, limit);
        if (tracks.length > 0) return tracks;
      } catch {}
    }
    // Fallback: search YouTube Music for top songs
    const cleanQuery = id.replace(/^(ytmusic|jiosaavn)-/, '').replace(/[-_]/g, ' ');
    try {
      const searchRes = await YTMusicProvider.search(`${cleanQuery} songs`, limit);
      if (searchRes.tracks.length > 0) {
        return searchRes.tracks;
      }
    } catch {}

    const provider = getProviderForId(id);
    if (provider) {
      try {
        return await provider.getArtistTracks(id, limit);
      } catch {}
    }
    return withFallback((p) => p.getArtistTracks(id, limit), []);
  },

  async getArtistAlbums(id: string, limit = 20): Promise<Album[]> {
    if (id.startsWith('ytmusic-')) {
      try {
        const albums = await YTMusicProvider.getArtistAlbums(id, limit);
        if (albums.length > 0) return albums;
      } catch {}
    }
    const cleanQuery = id.replace(/^(ytmusic|jiosaavn)-/, '').replace(/[-_]/g, ' ');
    try {
      const searchRes = await YTMusicProvider.search(`${cleanQuery} albums`, limit);
      if (searchRes.albums.length > 0) {
        return searchRes.albums;
      }
    } catch {}

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

  /** Charts — YTMusic top charts, fallback to JioSaavn & Deezer */
  async getCharts(limit = 20): Promise<Track[]> {
    return withFallback(
      (p) => p.getCharts(limit),
      [],
      [YTMusicProvider, JioSaavnProvider, DeezerProvider, JamendoProvider]
    );
  },

  /** Trending — YTMusic real trending hits */
  async getTrending(limit = 20): Promise<Track[]> {
    return withFallback(
      (p) => p.getTrending(limit),
      [],
      [YTMusicProvider, JioSaavnProvider, DeezerProvider, JamendoProvider]
    );
  },

  /** Genres — Curated genres */
  async getGenres(): Promise<Genre[]> {
    try {
      return await YTMusicProvider.getGenres();
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
      [YTMusicProvider, DeezerProvider, JioSaavnProvider]
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

  /** Similar / Radio tracks for continuous playback */
  async getSimilarTracks(trackId: string, limit = 20): Promise<Track[]> {
    if (trackId.startsWith('ytmusic-')) {
      try {
        const tracks = await YTMusicProvider.getSimilarTracks(trackId, limit);
        if (tracks.length > 0) return tracks;
      } catch {}
    }
    return [];
  },

  /** Auto-complete search suggestions */
  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      return await YTMusicProvider.getSearchSuggestions(query);
    } catch {
      return [];
    }
  },

  /** Tracks by genre / tag */
  async getTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
    try {
      const tracks = await YTMusicProvider.getTracksByGenre(genre, limit);
      if (tracks.length > 0) return tracks;
    } catch {}
    try {
      const res = await JioSaavnProvider.search(`${genre} hits`, limit);
      if (res.tracks.length > 0) return res.tracks;
    } catch {}
    return [];
  },

  /** Popular artists — Top Indian & Global stars from YouTube Music */
  async getPopularArtists(limit = 20): Promise<Artist[]> {
    const defaultStars: Artist[] = [
      {
        id: 'ytmusic-UCDxKh1gFWeYsqePvgVzmPoQ',
        name: 'Arijit Singh',
        image: 'https://lh3.googleusercontent.com/W_yOqnKSDYyeVOY_AsXhuAtb6rW3vCL3GtJ9DA1GxWOrJfyeSOqzvTv_TkFHijdkVPXWutASBlRFPg=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCCTN01plFzn4npREHKT2_9Q',
        name: 'Pritam',
        image: 'https://yt3.googleusercontent.com/sjGMYJQ1J3FZEIBsMYUztMjjYOM4-NJ24CjmIHqxTWCxAM1YgjL-d_17u7_PRhTouOwwAjbu-2x5S6I=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCJ2m-WpROlZCiZZID9r7NSQ',
        name: 'Diljit Dosanjh',
        image: 'https://yt3.googleusercontent.com/7EYXXMXY594V8y4sZT2aawmdKgDAGTu5jNm9C-HpR3jY9cZJ0NMxS__nZKBdWZ1PUpJPjc2BAA=w544-h544-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCrC-7fsdTCYeaRBpwA6j-Eg',
        name: 'Shreya Ghoshal',
        image: 'https://yt3.googleusercontent.com/PgINZNe0qVxgMSXKG5vF82bNN4WCC12zgWsz9I7OLs4CLF9Cn0Vxq7Xc1ToupnzXrCv0nKfe3VM=w544-h544-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCVGomUS__PL0c4jDXa0QwXA',
        name: 'Atif Aslam',
        image: 'https://yt3.googleusercontent.com/ykJkyILKum4B2oudDxjnf5WNenWWZAp-WEz0_CHp4cu0VnqB2-uaNDylItqC68WLXV62rdHDun-ahbg=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCQmNiXx378nooDuZPA2fTAg',
        name: 'AP Dhillon',
        image: 'https://lh3.googleusercontent.com/yJh1MZL2FvtJz3YeDAUhTRpfdUSwdotWw8XmB_An-4coKiVG4pDpUGRAPV7ooqmzBP4HAWrtjPyAfI4=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCSmK5WX5U4gdtebWjoL81og',
        name: 'Karan Aujla',
        image: 'https://lh3.googleusercontent.com/k7sgqqcV5VScaMZtTmS8W_tfouLVBpgyJII0epYE2Vjw1-zzhGgUCV51aHxZn6cmZKKJgUfNlIVpZg=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCtJe0RYzgPddQXKtWduxz_w',
        name: 'A. R. Rahman',
        image: 'https://yt3.googleusercontent.com/vHMOuDn8gr3SW9Pm8yFgmtYzM5kj4ayng5HKRjW0OyjG9mPK923XMVtTZTt4NUG_1aemWNLSQ27zjtA=w544-h544-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UClYV6hHlupm_S_ObS1W-DYw',
        name: 'The Weeknd',
        image: 'https://lh3.googleusercontent.com/U-SAmNOu4TynE818gLCfKsuHZ0U5YNEtO9mrjSI9WCCKERs98LzrCal5kajBBTQNwdcisoB2Bn-pHp4=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCPC0L1d253x-KuMNwa05TpA',
        name: 'Taylor Swift',
        image: 'https://yt3.googleusercontent.com/RCpTA6EXJQyjVFDosWOKa2SMmqkua_lA9mHPDWWciLwgqpZLz-k8rXWRF_367trrQ7up9BUwCbk6kRk=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCVfSAUepe_FzP6ge6WexO5Q',
        name: 'Badshah',
        image: 'https://yt3.googleusercontent.com/bbR8znm7CX07mCGQH-M484ckFRaKkSmTjwrwuFZxQUBy7Uc5gQcintkpqDXCuSX0DdLLg2aPskZhC2s=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCIOXXUXQ8y5ivei97JkiBAw',
        name: 'Sidhu Moose Wala',
        image: 'https://yt3.ggpht.com/ytc/AIdro_kiQJ0Hhp0O-tdaY1dy81-gSNujjccUlWstnpFr686ZlMk=w544-h544-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCbRSywya_rl8YS15Lo9ttsA',
        name: 'Anirudh Ravichander',
        image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
      {
        id: 'ytmusic-UCGvj8kfUV5Q6lzECIrGY19g',
        name: 'Justin Bieber',
        image: 'https://lh3.googleusercontent.com/4ULlRiFBFglNemZJyKn6_e2-iOIdJEbgBgq_79RQclndG6pge0yGgS2k2On6E1FkCJzenyHkHRzkvjFp=w544-h544-p-l90-rj',
        provider: 'ytmusic',
      },
    ];

    return defaultStars.slice(0, limit);
  },
};

/** Get the correct provider adapter based on ID prefix */
function getProviderForId(id: string): MusicProvider | null {
  if (id.startsWith('ytmusic-')) return YTMusicProvider;
  if (id.startsWith('jiosaavn-')) return JioSaavnProvider;
  if (id.startsWith('jamendo-')) return JamendoProvider;
  if (id.startsWith('deezer-')) return DeezerProvider;
  if (id.startsWith('audius-')) return AudiusProvider;
  return null;
}
