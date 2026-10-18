/**
 * Loopd Library Store (Zustand)
 * Manages likes, follows, playlists, recently played, search history, and downloads.
 */
import { create } from 'zustand';
import type { Track, Artist, Album, Playlist } from '../types';

interface LibraryStore {
  likedSongIds: Set<string>;
  likedTracks: Track[];
  followedArtistIds: Set<string>;
  savedAlbumIds: Set<string>;
  downloadedTrackIds: Set<string>;
  recentlyPlayed: Track[];
  searchHistory: string[];
  playlists: Playlist[];
  userName: string;

  // Actions
  setUserName: (name: string) => void;
  toggleLike: (trackOrId: Track | string) => void;
  isLiked: (trackId: string) => boolean;
  toggleDownload: (trackId: string) => void;
  isDownloaded: (trackId: string) => boolean;
  toggleFollowArtist: (artistId: string) => void;
  isFollowing: (artistId: string) => boolean;
  toggleSaveAlbum: (albumId: string) => void;
  isAlbumSaved: (albumId: string) => boolean;
  addToRecentlyPlayed: (track: Track) => void;
  addSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  createPlaylist: (title: string, description?: string) => Playlist;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
}

const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'loopd-favorites',
    title: 'Daily Drop Mix',
    description: 'Curated fresh drops and hypnotic loops by Loopd editors.',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    tracks: [],
    trackCount: 0,
    provider: 'jamendo',
  },
  {
    id: 'midnight-vibes',
    title: 'Midnight Lo-Fi & Beats',
    description: 'Chill instrumentals and deep focus sounds.',
    artwork: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    tracks: [],
    trackCount: 0,
    provider: 'jamendo',
  },
];

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  likedSongIds: new Set<string>(),
  likedTracks: [],
  followedArtistIds: new Set<string>(),
  savedAlbumIds: new Set<string>(),
  downloadedTrackIds: new Set<string>(),
  recentlyPlayed: [],
  searchHistory: [],
  playlists: INITIAL_PLAYLISTS,
  userName: 'Guest Listener',

  setUserName: (name) => set({ userName: name }),

  toggleLike: (trackOrId) =>
    set((state) => {
      const isString = typeof trackOrId === 'string';
      const id = isString ? trackOrId : trackOrId.id;
      const newSet = new Set(state.likedSongIds);
      let newLikedTracks = [...state.likedTracks];

      if (newSet.has(id)) {
        newSet.delete(id);
        newLikedTracks = newLikedTracks.filter((t) => t.id !== id);
      } else {
        newSet.add(id);
        if (!isString) {
          if (!newLikedTracks.some((t) => t.id === id)) {
            newLikedTracks = [trackOrId, ...newLikedTracks];
          }
        } else {
          // If string, find in recentlyPlayed
          const found = state.recentlyPlayed.find((t) => t.id === id);
          if (found && !newLikedTracks.some((t) => t.id === id)) {
            newLikedTracks = [found, ...newLikedTracks];
          }
        }
      }
      return { likedSongIds: newSet, likedTracks: newLikedTracks };
    }),

  isLiked: (trackId) => get().likedSongIds.has(trackId),

  toggleDownload: (trackId) =>
    set((state) => {
      const newSet = new Set(state.downloadedTrackIds);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return { downloadedTrackIds: newSet };
    }),

  isDownloaded: (trackId) => get().downloadedTrackIds.has(trackId),

  toggleFollowArtist: (artistId) =>
    set((state) => {
      const newSet = new Set(state.followedArtistIds);
      if (newSet.has(artistId)) {
        newSet.delete(artistId);
      } else {
        newSet.add(artistId);
      }
      return { followedArtistIds: newSet };
    }),

  isFollowing: (artistId) => get().followedArtistIds.has(artistId),

  toggleSaveAlbum: (albumId) =>
    set((state) => {
      const newSet = new Set(state.savedAlbumIds);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return { savedAlbumIds: newSet };
    }),

  isAlbumSaved: (albumId) => get().savedAlbumIds.has(albumId),

  addToRecentlyPlayed: (track) =>
    set((state) => {
      const filtered = state.recentlyPlayed.filter((t) => t.id !== track.id);
      return {
        recentlyPlayed: [track, ...filtered].slice(0, 50),
      };
    }),

  addSearchHistory: (query) =>
    set((state) => {
      const filtered = state.searchHistory.filter((q) => q !== query);
      return {
        searchHistory: [query, ...filtered].slice(0, 20),
      };
    }),

  removeSearchHistory: (query) =>
    set((state) => ({
      searchHistory: state.searchHistory.filter((q) => q !== query),
    })),

  clearSearchHistory: () => set({ searchHistory: [] }),

  createPlaylist: (title, description) => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      title: title.trim() || 'My Playlist',
      description: description || 'Created on Loopd',
      artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      tracks: [],
      trackCount: 0,
      provider: 'custom',
    };
    set((state) => ({
      playlists: [newPlaylist, ...state.playlists],
    }));
    return newPlaylist;
  },

  addPlaylist: (playlist) =>
    set((state) => ({
      playlists: [playlist, ...state.playlists],
    })),

  removePlaylist: (id) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    })),

  addTrackToPlaylist: (playlistId, track) =>
    set((state) => ({
      playlists: state.playlists.map((p) => {
        if (p.id === playlistId) {
          const exists = p.tracks?.some((t) => t.id === track.id);
          if (exists) return p;
          const updatedTracks = [...(p.tracks || []), track];
          return {
            ...p,
            tracks: updatedTracks,
            trackCount: updatedTracks.length,
          };
        }
        return p;
      }),
    })),
}));
