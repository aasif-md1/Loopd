/**
 * Jamendo Music Provider
 * Primary source: full-length streaming, albums, artists, playlists.
 * https://developer.jamendo.com/v3.0
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

const api = axios.create({
  baseURL: ApiConfig.jamendo.baseUrl,
  timeout: 10000,
});

// Add client_id to every request
api.interceptors.request.use((config) => {
  config.params = {
    ...config.params,
    client_id: ApiConfig.jamendo.clientId,
    format: 'json',
  };
  return config;
});

/** Map Jamendo track to our unified Track type */
function mapTrack(raw: any): Track {
  return {
    id: `jamendo-${raw.id}`,
    title: raw.name || raw.track_name || 'Unknown',
    artist: raw.artist_name || 'Unknown Artist',
    artistId: raw.artist_id ? `jamendo-${raw.artist_id}` : undefined,
    album: raw.album_name || undefined,
    albumId: raw.album_id ? `jamendo-${raw.album_id}` : undefined,
    duration: Number(raw.duration) || 0,
    artwork: raw.album_image || raw.image || raw.album_image || undefined,
    streamUrl: raw.audio || raw.audiodownload || '',
    provider: 'jamendo',
    releaseDate: raw.releasedate || undefined,
    genre: raw.genre || undefined,
  };
}

function mapAlbum(raw: any): Album {
  return {
    id: `jamendo-${raw.id}`,
    title: raw.name || 'Unknown Album',
    artist: raw.artist_name || 'Unknown Artist',
    artistId: raw.artist_id ? `jamendo-${raw.artist_id}` : undefined,
    artwork: raw.image || undefined,
    releaseDate: raw.releasedate || undefined,
    trackCount: raw.tracks?.length || undefined,
    tracks: raw.tracks?.map(mapTrack),
    provider: 'jamendo',
  };
}

function mapArtist(raw: any): Artist {
  return {
    id: `jamendo-${raw.id}`,
    name: raw.name || 'Unknown Artist',
    image: raw.image || undefined,
    provider: 'jamendo',
    bio: raw.shorturl || undefined,
  };
}

function mapPlaylist(raw: any): Playlist {
  return {
    id: `jamendo-${raw.id}`,
    title: raw.name || 'Unknown Playlist',
    description: raw.name || undefined,
    artwork: raw.tracks?.[0]?.album_image || undefined,
    trackCount: raw.tracks?.length,
    tracks: raw.tracks?.map(mapTrack),
    owner: raw.user_name || 'Jamendo',
    provider: 'jamendo',
    createdAt: raw.creationdate || undefined,
  };
}

export const JamendoProvider: MusicProvider = {
  name: 'jamendo',

  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    const [tracksRes, artistsRes, albumsRes] = await Promise.allSettled([
      api.get('/tracks', {
        params: {
          search: query,
          limit,
          offset,
          include: 'musicinfo',
          audioformat: 'mp32',
        },
      }),
      api.get('/artists', {
        params: { namesearch: query, limit: 10, offset: 0 },
      }),
      api.get('/albums', {
        params: { namesearch: query, limit: 10, offset: 0 },
      }),
    ]);

    const tracks =
      tracksRes.status === 'fulfilled'
        ? (tracksRes.value.data?.results || []).map(mapTrack)
        : [];
    const artists =
      artistsRes.status === 'fulfilled'
        ? (artistsRes.value.data?.results || []).map(mapArtist)
        : [];
    const albums =
      albumsRes.status === 'fulfilled'
        ? (albumsRes.value.data?.results || []).map(mapAlbum)
        : [];

    return { tracks, artists, albums, playlists: [] };
  },

  async getTrack(id: string): Promise<Track | null> {
    const rawId = id.replace('jamendo-', '');
    try {
      const res = await api.get('/tracks', {
        params: { id: rawId, audioformat: 'mp32' },
      });
      const data = res.data?.results?.[0];
      return data ? mapTrack(data) : null;
    } catch {
      return null;
    }
  },

  async getAlbum(id: string): Promise<Album | null> {
    const rawId = id.replace('jamendo-', '');
    try {
      const res = await api.get('/albums/tracks', {
        params: { id: rawId, audioformat: 'mp32' },
      });
      const data = res.data?.results?.[0];
      return data ? mapAlbum(data) : null;
    } catch {
      return null;
    }
  },

  async getArtist(id: string): Promise<Artist | null> {
    const rawId = id.replace('jamendo-', '');
    try {
      const res = await api.get('/artists', {
        params: { id: rawId },
      });
      const data = res.data?.results?.[0];
      return data ? mapArtist(data) : null;
    } catch {
      return null;
    }
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    const rawId = id.replace('jamendo-', '');
    try {
      const res = await api.get('/artists/tracks', {
        params: { id: rawId, limit, audioformat: 'mp32' },
      });
      const artist = res.data?.results?.[0];
      return artist?.tracks?.map(mapTrack) || [];
    } catch {
      return [];
    }
  },

  async getArtistAlbums(id: string, limit = 20): Promise<Album[]> {
    const rawId = id.replace('jamendo-', '');
    try {
      const res = await api.get('/artists/albums', {
        params: { id: rawId, limit },
      });
      const artist = res.data?.results?.[0];
      return artist?.albums?.map(mapAlbum) || [];
    } catch {
      return [];
    }
  },

  async getPlaylist(id: string): Promise<Playlist | null> {
    const rawId = id.replace('jamendo-', '');
    try {
      const res = await api.get('/playlists/tracks', {
        params: { id: rawId, audioformat: 'mp32' },
      });
      const data = res.data?.results?.[0];
      return data ? mapPlaylist(data) : null;
    } catch {
      return null;
    }
  },

  async getCharts(limit = 20): Promise<Track[]> {
    try {
      const res = await api.get('/tracks', {
        params: {
          order: 'popularity_week',
          limit,
          audioformat: 'mp32',
          include: 'musicinfo',
        },
      });
      return (res.data?.results || []).map(mapTrack);
    } catch {
      return [];
    }
  },

  async getTrending(limit = 20): Promise<Track[]> {
    try {
      const res = await api.get('/tracks', {
        params: {
          order: 'popularity_month',
          limit,
          audioformat: 'mp32',
          include: 'musicinfo',
          boost: 'buzz',
        },
      });
      return (res.data?.results || []).map(mapTrack);
    } catch {
      return [];
    }
  },

  async getGenres(): Promise<Genre[]> {
    // Jamendo uses tags, but we can define common genres
    const genreColors: Record<string, string> = {
      pop: '#8C67AC',
      rock: '#E61E32',
      electronic: '#DC148C',
      hiphop: '#BA5D07',
      jazz: '#477D95',
      classical: '#E8115B',
      rnb: '#1E3264',
      country: '#608108',
      ambient: '#0D73EC',
      metal: '#503750',
      folk: '#A56C3C',
      blues: '#1F6B75',
      latin: '#E1118C',
      reggae: '#148A08',
      indie: '#5179A1',
      soundtrack: '#7358FF',
    };

    return Object.entries(genreColors).map(([name, color]) => ({
      id: name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      color,
    }));
  },

  async getNewReleases(limit = 20): Promise<Album[]> {
    try {
      const res = await api.get('/albums', {
        params: {
          order: 'releasedate_desc',
          limit,
          imagesize: 500,
        },
      });
      return (res.data?.results || []).map(mapAlbum);
    } catch {
      return [];
    }
  },

  async getStreamUrl(trackId: string): Promise<string | null> {
    const track = await this.getTrack(trackId);
    return track?.streamUrl || null;
  },
};
