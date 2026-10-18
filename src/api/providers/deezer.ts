/**
 * Deezer Music Provider (fallback/discovery)
 * Public API — no key needed. 30s previews only.
 * https://developers.deezer.com/api
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
import { Platform } from 'react-native';

const baseUrl = ApiConfig.deezer.baseUrl;

// Deezer needs CORS proxy on web
function getUrl(path: string): string {
  const url = `${baseUrl}${path}`;
  if (Platform.OS === 'web') {
    return `${ApiConfig.deezer.corsProxy}${encodeURIComponent(url)}`;
  }
  return url;
}

const api = axios.create({ timeout: 10000 });

function mapTrack(raw: any): Track {
  return {
    id: `deezer-${raw.id}`,
    title: raw.title || raw.title_short || 'Unknown',
    artist: raw.artist?.name || 'Unknown Artist',
    artistId: raw.artist?.id ? `deezer-${raw.artist.id}` : undefined,
    album: raw.album?.title || undefined,
    albumId: raw.album?.id ? `deezer-${raw.album.id}` : undefined,
    duration: raw.duration || 0,
    artwork:
      raw.album?.cover_big ||
      raw.album?.cover_medium ||
      raw.album?.cover ||
      undefined,
    streamUrl: raw.preview || '',
    provider: 'deezer',
    isExplicit: raw.explicit_lyrics || false,
    previewOnly: true,
  };
}

function mapAlbum(raw: any): Album {
  return {
    id: `deezer-${raw.id}`,
    title: raw.title || 'Unknown Album',
    artist: raw.artist?.name || 'Unknown Artist',
    artistId: raw.artist?.id ? `deezer-${raw.artist.id}` : undefined,
    artwork:
      raw.cover_big || raw.cover_medium || raw.cover || undefined,
    releaseDate: raw.release_date || undefined,
    trackCount: raw.nb_tracks || undefined,
    provider: 'deezer',
    genre: raw.genres?.data?.[0]?.name || undefined,
  };
}

function mapArtist(raw: any): Artist {
  return {
    id: `deezer-${raw.id}`,
    name: raw.name || 'Unknown Artist',
    image:
      raw.picture_big || raw.picture_medium || raw.picture || undefined,
    provider: 'deezer',
    monthlyListeners: raw.nb_fan || undefined,
  };
}

function mapPlaylist(raw: any): Playlist {
  return {
    id: `deezer-${raw.id}`,
    title: raw.title || 'Unknown Playlist',
    description: raw.description || undefined,
    artwork:
      raw.picture_big || raw.picture_medium || raw.picture || undefined,
    trackCount: raw.nb_tracks || undefined,
    owner: raw.creator?.name || 'Deezer',
    provider: 'deezer',
    isPublic: raw.public || true,
  };
}

export const DeezerProvider: MusicProvider = {
  name: 'deezer',

  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    const [tracksRes, artistsRes, albumsRes] = await Promise.allSettled([
      api.get(getUrl(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}&index=${offset}`)),
      api.get(getUrl(`/search/artist?q=${encodeURIComponent(query)}&limit=10`)),
      api.get(getUrl(`/search/album?q=${encodeURIComponent(query)}&limit=10`)),
    ]);

    return {
      tracks:
        tracksRes.status === 'fulfilled'
          ? (tracksRes.value.data?.data || []).map(mapTrack)
          : [],
      artists:
        artistsRes.status === 'fulfilled'
          ? (artistsRes.value.data?.data || []).map(mapArtist)
          : [],
      albums:
        albumsRes.status === 'fulfilled'
          ? (albumsRes.value.data?.data || []).map(mapAlbum)
          : [],
      playlists: [],
    };
  },

  async getTrack(id: string): Promise<Track | null> {
    const rawId = id.replace('deezer-', '');
    try {
      const res = await api.get(getUrl(`/track/${rawId}`));
      return res.data ? mapTrack(res.data) : null;
    } catch {
      return null;
    }
  },

  async getAlbum(id: string): Promise<Album | null> {
    const rawId = id.replace('deezer-', '');
    try {
      const res = await api.get(getUrl(`/album/${rawId}`));
      const album = mapAlbum(res.data);
      if (res.data?.tracks?.data) {
        album.tracks = res.data.tracks.data.map(mapTrack);
      }
      return album;
    } catch {
      return null;
    }
  },

  async getArtist(id: string): Promise<Artist | null> {
    const rawId = id.replace('deezer-', '');
    try {
      const res = await api.get(getUrl(`/artist/${rawId}`));
      return res.data ? mapArtist(res.data) : null;
    } catch {
      return null;
    }
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    const rawId = id.replace('deezer-', '');
    try {
      const res = await api.get(getUrl(`/artist/${rawId}/top?limit=${limit}`));
      return (res.data?.data || []).map(mapTrack);
    } catch {
      return [];
    }
  },

  async getArtistAlbums(id: string, limit = 20): Promise<Album[]> {
    const rawId = id.replace('deezer-', '');
    try {
      const res = await api.get(getUrl(`/artist/${rawId}/albums?limit=${limit}`));
      return (res.data?.data || []).map(mapAlbum);
    } catch {
      return [];
    }
  },

  async getPlaylist(id: string): Promise<Playlist | null> {
    const rawId = id.replace('deezer-', '');
    try {
      const res = await api.get(getUrl(`/playlist/${rawId}`));
      const pl = mapPlaylist(res.data);
      if (res.data?.tracks?.data) {
        pl.tracks = res.data.tracks.data.map(mapTrack);
      }
      return pl;
    } catch {
      return null;
    }
  },

  async getCharts(limit = 20): Promise<Track[]> {
    try {
      const res = await api.get(getUrl(`/chart/0/tracks?limit=${limit}`));
      return (res.data?.data || []).map(mapTrack);
    } catch {
      return [];
    }
  },

  async getTrending(limit = 20): Promise<Track[]> {
    return this.getCharts(limit);
  },

  async getGenres(): Promise<Genre[]> {
    try {
      const res = await api.get(getUrl('/genre'));
      return (res.data?.data || [])
        .filter((g: any) => g.id !== 0)
        .map((g: any) => ({
          id: `deezer-${g.id}`,
          name: g.name,
          image: g.picture_big || g.picture_medium || g.picture,
        }));
    } catch {
      return [];
    }
  },

  async getNewReleases(limit = 20): Promise<Album[]> {
    try {
      // Deezer editorial new releases
      const res = await api.get(getUrl(`/chart/0/albums?limit=${limit}`));
      return (res.data?.data || []).map(mapAlbum);
    } catch {
      return [];
    }
  },

  async getStreamUrl(trackId: string): Promise<string | null> {
    const track = await this.getTrack(trackId);
    return track?.streamUrl || null;
  },
};
