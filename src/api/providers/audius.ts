/**
 * Audius Music Provider (secondary)
 * Trending tracks, search, stream URLs.
 * https://docs.audius.org/
 */
import axios from 'axios';
import { ApiConfig } from '../config';
import type {
  MusicProvider,
  Track,
  Album,
  Artist,
  Playlist,
  Genre,
  SearchResults,
} from '../../types';

let resolvedHost: string | null = null;

/** Resolve a working Audius discovery node */
async function getHost(): Promise<string> {
  if (resolvedHost) return resolvedHost;
  try {
    const res = await axios.get(
      'https://api.audius.co',
      { timeout: 5000 }
    );
    const hosts = res.data?.data;
    if (hosts && hosts.length > 0 && typeof hosts[0] === 'string') {
      resolvedHost = hosts[0];
      return resolvedHost;
    }
  } catch {}
  const fallback = ApiConfig.audius.discoveryEndpoint || 'https://discoveryprovider.audius.co';
  resolvedHost = fallback;
  return fallback;
}

async function apiGet(path: string, params: Record<string, any> = {}) {
  const host = await getHost();
  return axios.get(`${host}/v1${path}`, {
    params: { ...params, app_name: ApiConfig.audius.appName },
    timeout: 10000,
  });
}

function mapTrack(raw: any): Track {
  const host = resolvedHost || ApiConfig.audius.discoveryEndpoint;
  return {
    id: `audius-${raw.id}`,
    title: raw.title || 'Unknown',
    artist: raw.user?.name || 'Unknown Artist',
    artistId: raw.user?.id ? `audius-${raw.user.id}` : undefined,
    album: raw.album?.title || undefined,
    duration: raw.duration || 0,
    artwork:
      raw.artwork?.['1000x1000'] ||
      raw.artwork?.['480x480'] ||
      raw.artwork?.['150x150'] ||
      raw.user?.profile_picture?.['1000x1000'] ||
      undefined,
    streamUrl: `${host}/v1/tracks/${raw.id}/stream?app_name=${ApiConfig.audius.appName}`,
    provider: 'audius',
    releaseDate: raw.release_date || undefined,
    genre: raw.genre || undefined,
  };
}

function mapArtist(raw: any): Artist {
  return {
    id: `audius-${raw.id}`,
    name: raw.name || 'Unknown Artist',
    image:
      raw.profile_picture?.['1000x1000'] ||
      raw.profile_picture?.['480x480'] ||
      raw.profile_picture?.['150x150'] ||
      undefined,
    provider: 'audius',
    monthlyListeners: raw.follower_count || undefined,
    bio: raw.bio || undefined,
  };
}

function mapPlaylist(raw: any): Playlist {
  return {
    id: `audius-${raw.id}`,
    title: raw.playlist_name || 'Unknown Playlist',
    description: raw.description || undefined,
    artwork:
      raw.artwork?.['1000x1000'] ||
      raw.artwork?.['480x480'] ||
      undefined,
    trackCount: raw.track_count || undefined,
    owner: raw.user?.name || 'Audius',
    provider: 'audius',
    isPublic: !raw.is_private,
  };
}

export const AudiusProvider: MusicProvider = {
  name: 'audius',

  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    const [tracksRes, usersRes, playlistsRes] = await Promise.allSettled([
      apiGet('/tracks/search', { query, limit, offset }),
      apiGet('/users/search', { query, limit: 10 }),
      apiGet('/playlists/search', { query, limit: 10 }),
    ]);

    return {
      tracks:
        tracksRes.status === 'fulfilled'
          ? (tracksRes.value.data?.data || []).map(mapTrack)
          : [],
      artists:
        usersRes.status === 'fulfilled'
          ? (usersRes.value.data?.data || []).map(mapArtist)
          : [],
      albums: [],
      playlists:
        playlistsRes.status === 'fulfilled'
          ? (playlistsRes.value.data?.data || []).map(mapPlaylist)
          : [],
    };
  },

  async getTrack(id: string): Promise<Track | null> {
    const rawId = id.replace('audius-', '');
    try {
      const res = await apiGet(`/tracks/${rawId}`);
      return res.data?.data ? mapTrack(res.data.data) : null;
    } catch {
      return null;
    }
  },

  async getAlbum(_id: string): Promise<Album | null> {
    // Audius doesn't have a strong album concept
    return null;
  },

  async getArtist(id: string): Promise<Artist | null> {
    const rawId = id.replace('audius-', '');
    try {
      const res = await apiGet(`/users/${rawId}`);
      return res.data?.data ? mapArtist(res.data.data) : null;
    } catch {
      return null;
    }
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    const rawId = id.replace('audius-', '');
    try {
      const res = await apiGet(`/users/${rawId}/tracks`, { limit });
      return (res.data?.data || []).map(mapTrack);
    } catch {
      return [];
    }
  },

  async getArtistAlbums(_id: string, _limit = 20): Promise<Album[]> {
    return [];
  },

  async getPlaylist(id: string): Promise<Playlist | null> {
    const rawId = id.replace('audius-', '');
    try {
      const res = await apiGet(`/playlists/${rawId}`);
      const pl = res.data?.data;
      if (!pl) return null;
      const mapped = mapPlaylist(pl);
      if (pl.tracks) {
        mapped.tracks = pl.tracks.map(mapTrack);
      }
      return mapped;
    } catch {
      return null;
    }
  },

  async getCharts(limit = 20): Promise<Track[]> {
    return this.getTrending(limit);
  },

  async getTrending(limit = 20): Promise<Track[]> {
    try {
      const res = await apiGet('/tracks/trending', { limit });
      return (res.data?.data || []).map(mapTrack);
    } catch {
      return [];
    }
  },

  async getGenres(): Promise<Genre[]> {
    const genres = [
      { id: 'Electronic', name: 'Electronic', color: '#DC148C' },
      { id: 'Hip-Hop/Rap', name: 'Hip-Hop/Rap', color: '#BA5D07' },
      { id: 'Pop', name: 'Pop', color: '#8C67AC' },
      { id: 'R&B/Soul', name: 'R&B/Soul', color: '#1E3264' },
      { id: 'Rock', name: 'Rock', color: '#E61E32' },
      { id: 'Alternative', name: 'Alternative', color: '#5179A1' },
      { id: 'Ambient', name: 'Ambient', color: '#0D73EC' },
      { id: 'Classical', name: 'Classical', color: '#E8115B' },
      { id: 'Jazz', name: 'Jazz', color: '#477D95' },
      { id: 'Latin', name: 'Latin', color: '#E1118C' },
    ];
    return genres;
  },

  async getNewReleases(_limit = 20): Promise<Album[]> {
    return [];
  },

  async getStreamUrl(trackId: string): Promise<string | null> {
    const rawId = trackId.replace('audius-', '');
    const host = await getHost();
    return `${host}/v1/tracks/${rawId}/stream?app_name=${ApiConfig.audius.appName}`;
  },
};
