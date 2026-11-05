/**
 * YouTube Music Provider — Loopd
 * Integrates with Loopd YTMusic & Streaming Backend (FastAPI + ytmusicapi + yt-dlp).
 * Provides world-class search, high-quality audio streaming, and seamless continuous playback.
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

const client = axios.create({
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

function getBaseUrl(): string {
  return ApiConfig.ytmusic.baseUrl.replace(/\/$/, '');
}

function normalizeTrack(raw: any): Track {
  const videoId = (raw.id || '').replace(/^ytmusic-/, '');
  const base = getBaseUrl();
  const directStreamUrl = raw.streamUrl?.startsWith('http')
    ? raw.streamUrl
    : `${base}/stream/${videoId}`;

  return {
    id: raw.id?.startsWith('ytmusic-') ? raw.id : `ytmusic-${videoId}`,
    title: raw.title || 'Unknown Track',
    artist: raw.artist || 'Unknown Artist',
    artistId: raw.artistId,
    album: raw.album || undefined,
    albumId: raw.albumId || undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : 0,
    artwork: raw.artwork || undefined,
    streamUrl: directStreamUrl,
    provider: 'ytmusic',
    isExplicit: Boolean(raw.isExplicit),
    releaseDate: raw.releaseDate,
    previewOnly: false,
  };
}

export const YTMusicProvider: MusicProvider & {
  getSimilarTracks(trackId: string, limit?: number): Promise<Track[]>;
  getTracksByGenre(genre: string, limit?: number): Promise<Track[]>;
  getSearchSuggestions(query: string): Promise<string[]>;
} = {
  name: 'ytmusic',

  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    try {
      const base = getBaseUrl();
      const res = await client.get(`${base}/search`, {
        params: { q: query, limit },
      });

      const rawTracks = res.data?.tracks || [];
      const rawArtists = res.data?.artists || [];
      const rawAlbums = res.data?.albums || [];

      return {
        tracks: rawTracks.map(normalizeTrack),
        artists: rawArtists.map((a: any) => ({
          id: a.id?.startsWith('ytmusic-') ? a.id : `ytmusic-${a.id}`,
          name: a.name || 'Unknown Artist',
          image: a.image,
          provider: 'ytmusic',
        })),
        albums: rawAlbums.map((alb: any) => ({
          id: alb.id?.startsWith('ytmusic-') ? alb.id : `ytmusic-${alb.id}`,
          title: alb.title || 'Unknown Album',
          artist: alb.artist || 'Unknown Artist',
          artwork: alb.artwork,
          releaseDate: alb.releaseDate,
          provider: 'ytmusic',
        })),
        playlists: [],
      };
    } catch (err) {
      console.warn('[YTMusic] search failed:', err);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  },

  async getTrack(id: string): Promise<Track | null> {
    const cleanId = id.replace(/^ytmusic-/, '');
    const base = getBaseUrl();
    try {
      // Fetch stream URL to ensure valid track
      const streamUrl = await this.getStreamUrl(cleanId);
      return {
        id: `ytmusic-${cleanId}`,
        title: 'Playing from YouTube Music',
        artist: 'YouTube Music',
        duration: 0,
        streamUrl: streamUrl || `${base}/stream/${cleanId}`,
        provider: 'ytmusic',
        previewOnly: false,
      };
    } catch (err) {
      console.warn('[YTMusic] getTrack failed:', err);
      return null;
    }
  },

  async getStreamUrl(trackId: string): Promise<string | null> {
    try {
      const cleanId = trackId.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/stream-url/${cleanId}`);
      return res.data?.streamUrl || `${base}/stream/${cleanId}`;
    } catch (err) {
      console.warn('[YTMusic] getStreamUrl failed:', err);
      const cleanId = trackId.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      return `${base}/stream/${cleanId}`;
    }
  },

  async getCharts(limit = 30): Promise<Track[]> {
    try {
      const base = getBaseUrl();
      const res = await client.get(`${base}/charts`, {
        params: { limit, country: 'IN' },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(normalizeTrack);
    } catch (err) {
      console.warn('[YTMusic] getCharts failed:', err);
      return [];
    }
  },

  async getTrending(limit = 20): Promise<Track[]> {
    try {
      const base = getBaseUrl();
      const res = await client.get(`${base}/trending`, {
        params: { limit, country: 'IN' },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(normalizeTrack);
    } catch (err) {
      console.warn('[YTMusic] getTrending failed:', err);
      return [];
    }
  },

  async getNewReleases(limit = 20): Promise<Album[]> {
    try {
      const base = getBaseUrl();
      const res = await client.get(`${base}/new-releases`, {
        params: { limit },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map((alb: any) => ({
        id: alb.id?.startsWith('ytmusic-') ? alb.id : `ytmusic-${alb.id}`,
        title: alb.title || 'New Release',
        artist: alb.artist || 'Unknown Artist',
        artwork: alb.artwork,
        releaseDate: alb.releaseDate,
        provider: 'ytmusic',
      }));
    } catch (err) {
      console.warn('[YTMusic] getNewReleases failed:', err);
      return [];
    }
  },

  async getArtist(id: string): Promise<Artist | null> {
    try {
      const cleanId = id.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/artist/${cleanId}`);
      if (!res.data?.artist) return null;
      return {
        id: `ytmusic-${cleanId}`,
        name: res.data.artist.name,
        image: res.data.artist.image,
        bio: res.data.artist.bio,
        provider: 'ytmusic',
      };
    } catch (err) {
      console.warn('[YTMusic] getArtist failed:', err);
      return null;
    }
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    try {
      const cleanId = id.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/artist/${cleanId}`);
      const tracks = res.data?.tracks || [];
      return tracks.slice(0, limit).map(normalizeTrack);
    } catch (err) {
      console.warn('[YTMusic] getArtistTracks failed:', err);
      return [];
    }
  },

  async getArtistAlbums(id: string, limit = 20): Promise<Album[]> {
    try {
      const cleanId = id.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/artist/${cleanId}`);
      const albums = res.data?.albums || [];
      return albums.slice(0, limit).map((alb: any) => ({
        id: alb.id?.startsWith('ytmusic-') ? alb.id : `ytmusic-${alb.id}`,
        title: alb.title,
        artist: alb.artist,
        artwork: alb.artwork,
        releaseDate: alb.releaseDate,
        provider: 'ytmusic',
      }));
    } catch (err) {
      console.warn('[YTMusic] getArtistAlbums failed:', err);
      return [];
    }
  },

  async getAlbum(id: string): Promise<Album | null> {
    try {
      const cleanId = id.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/album/${cleanId}`);
      const raw = res.data;
      if (!raw) return null;

      const tracks = (raw.tracks || []).map(normalizeTrack);
      return {
        id: `ytmusic-${cleanId}`,
        title: raw.title,
        artist: raw.artist,
        artwork: raw.artwork,
        releaseDate: raw.releaseDate,
        trackCount: raw.trackCount || tracks.length,
        tracks,
        provider: 'ytmusic',
      };
    } catch (err) {
      console.warn('[YTMusic] getAlbum failed:', err);
      return null;
    }
  },

  async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      const cleanId = id.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/playlist/${cleanId}`);
      const raw = res.data;
      if (!raw) return null;

      const tracks = (raw.tracks || []).map(normalizeTrack);
      return {
        id: `ytmusic-${cleanId}`,
        title: raw.title,
        description: raw.description,
        artwork: raw.artwork,
        trackCount: raw.trackCount || tracks.length,
        tracks,
        provider: 'ytmusic',
      };
    } catch (err) {
      console.warn('[YTMusic] getPlaylist failed:', err);
      return null;
    }
  },

  async getSimilarTracks(trackId: string, limit = 20): Promise<Track[]> {
    try {
      const cleanId = trackId.replace(/^ytmusic-/, '');
      const base = getBaseUrl();
      const res = await client.get(`${base}/similar/${cleanId}`, {
        params: { limit },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(normalizeTrack);
    } catch (err) {
      console.warn('[YTMusic] getSimilarTracks failed:', err);
      return [];
    }
  },

  async getTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
    try {
      const results = await this.search(`${genre} music`, limit);
      return results.tracks;
    } catch (err) {
      return [];
    }
  },

  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const base = getBaseUrl();
      const res = await client.get(`${base}/suggestions`, {
        params: { q: query },
      });
      return res.data?.suggestions || [];
    } catch (err) {
      return [];
    }
  },

  async getGenres(): Promise<Genre[]> {
    return [
      { id: 'bollywood', name: 'Bollywood', color: '#E11D48' },
      { id: 'punjabi', name: 'Punjabi', color: '#F59E0B' },
      { id: 'pop', name: 'Pop Hits', color: '#8B5CF6' },
      { id: 'hiphop', name: 'Hip Hop & Rap', color: '#EC4899' },
      { id: 'lofi', name: 'Lo-Fi Chill', color: '#10B981' },
      { id: 'romance', name: 'Romantic', color: '#F43F5E' },
      { id: 'devotional', name: 'Bhakti / Devotional', color: '#F97316' },
      { id: 'indie', name: 'Indie India', color: '#06B6D4' },
      { id: 'workout', name: 'Workout & Energy', color: '#EF4444' },
      { id: 'party', name: 'Party Mashup', color: '#A855F7' },
    ];
  },
};

