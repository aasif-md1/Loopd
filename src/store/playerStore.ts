/**
 * Loopd Player Store (Zustand) — V2
 * Single source of truth coordinated with playerService serialized queue.
 * Complies with Section 2 of LOOPD_V2.md
 */
import { create } from 'zustand';
import { router } from 'expo-router';
import type { Track, RepeatMode } from '../types';
import { playerService } from '../services/playerService';
import { audioService } from '../services/audioService';
import { useLibraryStore } from './libraryStore';
import { MusicService } from '../api/musicService';

interface PlayerStore {
  // State
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackSource: string;
  autoOpenNowPlaying: boolean;
  smartAutoplay: boolean;
  volume: number;

  // Actions
  setVolume: (volume: number) => void;
  setTrack: (track: Track) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setBuffering: (buffering: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setQueueIndex: (index: number) => void;
  setContextQueue: (tracks: Track[], index: number, source: string) => void;

  playFromContext: (tracks: Track[], startIndex?: number, source?: string) => void;
  playTrack: (track: Track, queue?: Track[], index?: number) => void;
  openNowPlaying: () => void;

  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setSmartAutoplay: (enabled: boolean) => void;
  triggerAutoplay: () => Promise<void>;

  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  setAutoOpenNowPlaying: (enabled: boolean) => void;
}

let isNavigatingToNowPlaying = false;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  playbackSource: 'Loopd',
  autoOpenNowPlaying: true,
  smartAutoplay: true,
  volume: 1.0,

  setVolume: (volume) => {
    const v = Math.max(0, Math.min(1, volume));
    set({ volume: v });
    audioService.setVolume(v);
  },
  setTrack: (track) => set({ currentTrack: track }),
  setPlaybackState: (isPlaying) => set({ isPlaying }),
  setBuffering: (buffering) => set({ isBuffering: buffering }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setQueueIndex: (index) => {
    const queue = get().queue;
    const current = queue[index] || null;
    set({ queueIndex: index, currentTrack: current, position: 0 });
    if (current) {
      try {
        useLibraryStore.getState().addToRecentlyPlayed(current);
      } catch (_) {}
    }
  },

  setContextQueue: (tracks, index, source) => {
    const validIndex = Math.max(0, Math.min(index, tracks.length - 1));
    const targetTrack = tracks[validIndex] || null;
    set({
      queue: tracks,
      queueIndex: validIndex,
      currentTrack: targetTrack,
      playbackSource: source,
      position: 0,
      duration: targetTrack?.duration || 0,
    });
    if (targetTrack) {
      try {
        useLibraryStore.getState().addToRecentlyPlayed(targetTrack);
      } catch (_) {}
    }
    playerService.prefetchUpcomingTracks(validIndex);
  },

  setAutoOpenNowPlaying: (enabled) => set({ autoOpenNowPlaying: enabled }),

  openNowPlaying: () => {
    if (isNavigatingToNowPlaying) return;
    isNavigatingToNowPlaying = true;
    try {
      router.push('/nowPlaying' as any);
    } catch (e) {
      console.warn('[PlayerStore] openNowPlaying error:', e);
    } finally {
      setTimeout(() => {
        isNavigatingToNowPlaying = false;
      }, 700);
    }
  },

  playFromContext: (tracks, startIndex = 0, source = 'Loopd') => {
    if (!tracks || tracks.length === 0) return;
    playerService.playFromContext(tracks, startIndex, source);

    if (get().autoOpenNowPlaying) {
      setTimeout(() => {
        get().openNowPlaying();
      }, 50);
    }
  },

  playTrack: (track, queue, index) => {
    const list = queue && queue.length > 0 ? queue : [track];
    const targetIdx = index !== undefined && index >= 0 ? index : list.findIndex((t) => t.id === track.id);
    get().playFromContext(list, targetIdx >= 0 ? targetIdx : 0, 'Loopd');
  },

  togglePlay: () => {
    playerService.togglePlay();
  },

  pause: () => {
    playerService.pause();
  },

  play: () => {
    playerService.play();
  },

  next: () => {
    playerService.skipToNext();
  },

  previous: () => {
    playerService.skipToPrevious();
  },

  seek: (pos) => {
    playerService.seek(pos);
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  toggleRepeat: () =>
    set((state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const currentIdx = modes.indexOf(state.repeat);
      return { repeat: modes[(currentIdx + 1) % modes.length] };
    }),

  setSmartAutoplay: (enabled) => set({ smartAutoplay: enabled }),

  triggerAutoplay: async () => {
    const { currentTrack, queue } = get();
    if (!currentTrack) return;
    try {
      // Find similar tracks by artist or query
      const query = currentTrack.artist.split(',')[0].trim();
      const res = await MusicService.search(query, 10);
      const newTracks = res.tracks.filter(
        (t) => !queue.some((q) => q.id === t.id)
      );
      if (newTracks.length > 0) {
        set((state) => ({ queue: [...state.queue, ...newTracks] }));
      }
    } catch (_) {}
  },

  addToQueue: (track) =>
    set((state) => ({ queue: [...state.queue, track] })),

  playNext: (track) =>
    set((state) => {
      const queue = [...state.queue];
      const insertAt = state.queueIndex >= 0 ? state.queueIndex + 1 : 0;
      queue.splice(insertAt, 0, track);
      return { queue };
    }),

  removeFromQueue: (index) =>
    set((state) => {
      const queue = [...state.queue];
      queue.splice(index, 1);
      const newQueueIndex =
        index < state.queueIndex
          ? state.queueIndex - 1
          : state.queueIndex;
      return { queue, queueIndex: newQueueIndex };
    }),

  clearQueue: () => {
    const { currentTrack } = get();
    set({
      queue: currentTrack ? [currentTrack] : [],
      queueIndex: 0,
    });
  },

  reorderQueue: (from, to) =>
    set((state) => {
      const queue = [...state.queue];
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);

      let newIndex = state.queueIndex;
      if (state.queueIndex === from) {
        newIndex = to;
      } else if (from < state.queueIndex && to >= state.queueIndex) {
        newIndex--;
      } else if (from > state.queueIndex && to <= state.queueIndex) {
        newIndex++;
      }

      return { queue, queueIndex: newIndex };
    }),
}));
