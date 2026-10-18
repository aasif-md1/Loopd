/**
 * JioSaavn Music Provider — Loopd
 * Direct integration with JioSaavn API for real Bollywood, Punjabi,
 * International Pop, and regional music catalogs.
 * Decrypts 320 kbps high-fidelity audio streams via pure JavaScript DES-ECB.
 */
import axios from 'axios';
import CryptoJS from 'crypto-js';
import type {
  MusicProvider,
  Track,
  Album,
  Artist,
  Playlist,
  Genre,
  SearchResults,
} from '../../types';

const BASE_URL = 'https://www.jiosaavn.com/api.php';
const DES_KEY = '38346591';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
  },
});

function decodeHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .trim();
}

function getHDArtwork(imageUrl?: any): string | undefined {
  if (!imageUrl) return undefined;
  if (Array.isArray(imageUrl)) {
    const best = imageUrl[imageUrl.length - 1];
    const url = typeof best === 'string' ? best : best?.url || best?.link;
    return getHDArtwork(url);
  }
  if (typeof imageUrl === 'string') {
    return imageUrl
      .replace(/http:\/\//g, 'https://')
      .replace(/50x50/g, '500x500')
      .replace(/150x150/g, '500x500');
  }
  return undefined;
}

export function decryptMediaUrl(encryptedUrl?: string): string {
  if (!encryptedUrl) return '';
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const decrypted = (CryptoJS.DES as any).decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const rawUrl = decrypted.toString(CryptoJS.enc.Utf8);
    if (!rawUrl) return '';
    // Upgrade to 320kbps high quality where available
    return rawUrl
      .replace('_96.mp4', '_320.mp4')
      .replace('_160.mp4', '_320.mp4');
  } catch (err) {
    console.warn('[JioSaavn] Failed to decrypt media URL:', err);
    return '';
  }
}

function mapTrack(raw: any): Track | null {
  if (!raw) return null;
  const moreInfo = raw.more_info || {};
  const encUrl = moreInfo.encrypted_media_url || raw.encrypted_media_url;
  const streamUrl = decryptMediaUrl(encUrl) || moreInfo.media_preview_url || '';

  // Extract primary artists
  let artistName = 'Unknown Artist';
  let primaryArtistId: string | undefined;

  if (Array.isArray(moreInfo.artistMap?.primary_artists) && moreInfo.artistMap.primary_artists.length > 0) {
    artistName = moreInfo.artistMap.primary_artists.map((a: any) => a.name).join(', ');
    primaryArtistId = moreInfo.artistMap.primary_artists[0].id ? `jiosaavn-${moreInfo.artistMap.primary_artists[0].id}` : undefined;
  } else if (raw.primary_artists) {
    artistName = raw.primary_artists;
  } else if (moreInfo.singers) {
    artistName = moreInfo.singers;
  } else if (moreInfo.music) {
    artistName = moreInfo.music;
  }

  return {
    id: `jiosaavn-${raw.id}`,
    title: decodeHtml(raw.song || raw.title || 'Unknown Track'),
    artist: decodeHtml(artistName),
    artistId: primaryArtistId,
    album: decodeHtml(raw.album || moreInfo.album || undefined),
    albumId: raw.albumid || moreInfo.album_id ? `jiosaavn-${raw.albumid || moreInfo.album_id}` : undefined,
    duration: parseInt(moreInfo.duration || raw.duration || '0', 10),
    artwork: getHDArtwork(raw.image || moreInfo.image),
    streamUrl,
    provider: 'jiosaavn',
    isExplicit: raw.explicit_content === '1',
    releaseDate: moreInfo.release_date || raw.year || undefined,
    previewOnly: false,
  };
}

export const JioSaavnProvider: MusicProvider = {
  name: 'jiosaavn',

  async search(query: string, limit = 20, offset = 0): Promise<SearchResults> {
    try {
      const page = Math.floor(offset / limit) + 1;
      const [songsRes, artistsRes] = await Promise.allSettled([
        client.get('', {
          params: {
            __call: 'search.getResults',
            _format: 'json',
            _marker: 0,
            api_version: 4,
            ctx: 'web6dot0',
            q: query,
            p: page,
            n: limit,
          },
        }),
        client.get('', {
          params: {
            __call: 'search.getArtistResults',
            _format: 'json',
            _marker: 0,
            api_version: 4,
            ctx: 'web6dot0',
            q: query,
            p: 1,
            n: 8,
          },
        }),
      ]);

      const tracks: Track[] = [];
      if (songsRes.status === 'fulfilled' && songsRes.value.data?.results) {
        for (const item of songsRes.value.data.results) {
          const t = mapTrack(item);
          if (t && t.streamUrl) tracks.push(t);
        }
      }

      const artists: Artist[] = [];
      if (artistsRes.status === 'fulfilled' && artistsRes.value.data?.results) {
        for (const item of artistsRes.value.data.results) {
          artists.push({
            id: `jiosaavn-${item.artistid || item.id}`,
            name: decodeHtml(item.name || item.title),
            image: getHDArtwork(item.image),
            provider: 'jiosaavn',
          });
        }
      }

      return {
        tracks,
        artists,
        albums: [],
        playlists: [],
      };
    } catch (err) {
      console.warn('[JioSaavn] Search failed:', err);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  },

  async getTrack(id: string): Promise<Track | null> {
    try {
      const cleanId = id.replace('jiosaavn-', '');
      const res = await client.get('', {
        params: {
          __call: 'song.getDetails',
          cc: 'in',
          _marker: 0,
          _format: 'json',
          api_version: 4,
          ctx: 'web6dot0',
          pids: cleanId,
        },
      });
      const songData = res.data?.[cleanId] || res.data?.songs?.[0];
      return songData ? mapTrack(songData) : null;
    } catch (err) {
      console.warn('[JioSaavn] getTrack failed:', err);
      return null;
    }
  },

  async getCharts(limit = 30): Promise<Track[]> {
    try {
      // First try fetching India Superhits Top 50 playlist (listid 1134543272)
      const res = await client.get('', {
        params: {
          __call: 'playlist.getDetails',
          _format: 'json',
          _marker: 0,
          api_version: 4,
          ctx: 'web6dot0',
          listid: '1134543272',
        },
      });

      const songs = res.data?.list || res.data?.songs || [];
      const tracks: Track[] = [];
      for (const item of songs.slice(0, limit)) {
        const t = mapTrack(item);
        if (t && t.streamUrl) tracks.push(t);
      }

      if (tracks.length > 0) return tracks;

      // Fallback: search for top hits
      const fallback = await this.search('Top 50 Hindi Hits', limit);
      return fallback.tracks;
    } catch (err) {
      console.warn('[JioSaavn] getCharts failed, falling back:', err);
      const fallback = await this.search('Trending Hits', limit);
      return fallback.tracks;
    }
  },

  async getTrending(limit = 20): Promise<Track[]> {
    try {
      // Fetch trending Punjabi or Hindi chart playlist
      const res = await client.get('', {
        params: {
          __call: 'playlist.getDetails',
          _format: 'json',
          _marker: 0,
          api_version: 4,
          ctx: 'web6dot0',
          listid: '1134548194', // India Superhits Top 50
        },
      });

      const songs = res.data?.list || res.data?.songs || [];
      const tracks: Track[] = [];
      for (const item of songs.slice(0, limit)) {
        const t = mapTrack(item);
        if (t && t.streamUrl) tracks.push(t);
      }

      if (tracks.length > 0) return tracks;
      const fallback = await this.search('Trending Bollywood Punjabi', limit);
      return fallback.tracks;
    } catch (err) {
      console.warn('[JioSaavn] getTrending failed:', err);
      const fallback = await this.search('Arijit Singh Hits', limit);
      return fallback.tracks;
    }
  },

  async getArtist(id: string): Promise<Artist | null> {
    try {
      const cleanId = id.replace('jiosaavn-', '');
      const res = await client.get('', {
        params: {
          __call: 'artist.getArtistPageDetails',
          _format: 'json',
          _marker: 0,
          api_version: 4,
          ctx: 'web6dot0',
          artistId: cleanId,
          n_song: 5,
        },
      });
      const d = res.data;
      if (!d || !d.name) return null;
      return {
        id: `jiosaavn-${d.artistId || cleanId}`,
        name: decodeHtml(d.name),
        image: getHDArtwork(d.image),
        monthlyListeners: parseInt(d.follower_count || '500000', 10),
        provider: 'jiosaavn',
        bio: decodeHtml(d.bio),
      };
    } catch (err) {
      console.warn('[JioSaavn] getArtist failed:', err);
      return null;
    }
  },

  async getArtistTracks(id: string, limit = 20): Promise<Track[]> {
    try {
      const cleanId = id.replace('jiosaavn-', '');
      const res = await client.get('', {
        params: {
          __call: 'artist.getArtistPageDetails',
          _format: 'json',
          _marker: 0,
          api_version: 4,
          ctx: 'web6dot0',
          artistId: cleanId,
          n_song: limit,
        },
      });

      const songs = res.data?.topSongs || [];
      const tracks: Track[] = [];
      for (const item of songs) {
        const t = mapTrack(item);
        if (t && t.streamUrl) tracks.push(t);
      }
      return tracks;
    } catch (err) {
      console.warn('[JioSaavn] getArtistTracks failed:', err);
      return [];
    }
  },

  async getArtistAlbums(id: string, limit = 10): Promise<Album[]> {
    return [];
  },

  async getAlbum(id: string): Promise<Album | null> {
    try {
      const cleanId = id.replace('jiosaavn-', '');
      const res = await client.get('', {
        params: {
          __call: 'content.getAlbumDetails',
          _format: 'json',
          _marker: 0,
          api_version: 4,
          ctx: 'web6dot0',
          albumid: cleanId,
        },
      });
      const d = res.data;
      if (!d) return null;
      const songs = d.list || d.songs || [];
      const tracks: Track[] = [];
      for (const item of songs) {
        const t = mapTrack(item);
        if (t) tracks.push(t);
      }
      return {
        id: `jiosaavn-${cleanId}`,
        title: decodeHtml(d.title || d.name),
        artist: decodeHtml(d.primary_artists || 'Various Artists'),
        artwork: getHDArtwork(d.image),
        trackCount: tracks.length,
        tracks,
        provider: 'jiosaavn',
        releaseDate: d.release_date || d.year,
      };
    } catch (err) {
      console.warn('[JioSaavn] getAlbum failed:', err);
      return null;
    }
  },

  async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      const cleanId = id.replace('jiosaavn-', '');
      const res = await client.get('', {
        params: {
          __call: 'playlist.getDetails',
          _format: 'json',
          _marker: 0,
          api_version: 4,
          ctx: 'web6dot0',
          listid: cleanId,
        },
      });
      const d = res.data;
      if (!d) return null;
      const songs = d.list || d.songs || [];
      const tracks: Track[] = [];
      for (const item of songs) {
        const t = mapTrack(item);
        if (t) tracks.push(t);
      }
      return {
        id: `jiosaavn-${cleanId}`,
        title: decodeHtml(d.title || d.listname),
        description: decodeHtml(d.header_desc || d.subtitle),
        artwork: getHDArtwork(d.image),
        trackCount: tracks.length,
        tracks,
        provider: 'jiosaavn',
      };
    } catch (err) {
      console.warn('[JioSaavn] getPlaylist failed:', err);
      return null;
    }
  },

  async getNewReleases(limit = 10): Promise<Album[]> {
    return [];
  },

  async getGenres(): Promise<Genre[]> {
    return [
      {
        id: 'bollywood',
        name: 'Bollywood Hits',
        color: '#E13300',
        image: 'https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg',
      },
      {
        id: 'punjabi',
        name: 'Punjabi Hits',
        color: '#1E3264',
        image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg',
      },
      {
        id: 'pop',
        name: 'Pop & International',
        color: '#8D67AB',
        image: 'https://c.saavncdn.com/artists/AP_Dhillon_004_20251023102150_500x500.jpg',
      },
      {
        id: 'romance',
        name: 'Romantic & Love',
        color: '#E8115B',
        image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
      },
      {
        id: 'hiphop',
        name: 'Desi Hip-Hop & Rap',
        color: '#BC5900',
        image: 'https://c.saavncdn.com/artists/Karan_Aujla_005_20260925061936_500x500.jpg',
      },
      {
        id: 'lofi',
        name: 'Chill & Lo-Fi Beats',
        color: '#006450',
        image: 'https://c.saavncdn.com/artists/Anuv_Jain_001_20231206073013_500x500.jpg',
      },
      {
        id: 'devotional',
        name: 'Bhakti & Devotional',
        color: '#537AA1',
        image: 'https://c.saavncdn.com/artists/Jagjit_Singh_500x500.jpg',
      },
      {
        id: 'party',
        name: 'Dance & Party Club',
        color: '#D84000',
        image: 'https://c.saavncdn.com/artists/Yo_Yo_Honey_Singh_004_20260811095253_500x500.jpg',
      },
    ];
  },

  async getStreamUrl(trackId: string): Promise<string | null> {
    const t = await this.getTrack(trackId);
    return t?.streamUrl || null;
  },
};
