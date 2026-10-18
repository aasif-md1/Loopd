/**
 * Loopd — Unified Music Types
 * All providers normalize their data into these shapes.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: number; // seconds
  artwork?: string;
  streamUrl: string;
  provider: MusicProviderName;
  isExplicit?: boolean;
  releaseDate?: string;
  genre?: string;
  previewOnly?: boolean; // true if only 30s preview (Deezer)
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artwork?: string;
  releaseDate?: string;
  trackCount?: number;
  tracks?: Track[];
  provider: MusicProviderName;
  genre?: string;
  copyright?: string;
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
  monthlyListeners?: number;
  provider: MusicProviderName;
  bio?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  trackCount?: number;
  tracks?: Track[];
  owner?: string;
  provider: MusicProviderName;
  isPublic?: boolean;
  createdAt?: string;
}

export interface Genre {
  id: string;
  name: string;
  image?: string;
  color?: string;
}

export interface ChartItem {
  id: string;
  title: string;
  artwork?: string;
  tracks?: Track[];
  provider: MusicProviderName;
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

export type MusicProviderName = 'jiosaavn' | 'jamendo' | 'audius' | 'deezer' | 'custom';

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextOffset?: number;
  total?: number;
}

/**
 * MusicProvider — Abstract interface for all music data sources.
 */
export interface MusicProvider {
  name: MusicProviderName;
  search(query: string, limit?: number, offset?: number): Promise<SearchResults>;
  getTrack(id: string): Promise<Track | null>;
  getAlbum(id: string): Promise<Album | null>;
  getArtist(id: string): Promise<Artist | null>;
  getArtistTracks(id: string, limit?: number): Promise<Track[]>;
  getArtistAlbums(id: string, limit?: number): Promise<Album[]>;
  getPlaylist(id: string): Promise<Playlist | null>;
  getCharts(limit?: number): Promise<Track[]>;
  getTrending(limit?: number): Promise<Track[]>;
  getGenres(): Promise<Genre[]>;
  getNewReleases(limit?: number): Promise<Album[]>;
  getStreamUrl(trackId: string): Promise<string | null>;
}

// Player types
export type RepeatMode = 'off' | 'all' | 'one';
export type AudioQuality = 'low' | 'normal' | 'high';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
}

export interface UserLibrary {
  likedSongs: string[]; // track IDs
  followedArtists: string[];
  savedAlbums: string[];
  playlists: Playlist[];
  recentlyPlayed: Track[];
  searchHistory: string[];
}
