/**
 * Loopd Audio Service
 * Powered by expo-audio (Native ExoPlayer on Android, AVPlayer on iOS)
 * Built for React Native New Architecture (RN 0.88+) with full background playback,
 * lock-screen controls, buffering states, and queue navigation.
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import { Platform, DeviceEventEmitter } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../types';

class AudioService {
  private player: AudioPlayer | null = null;
  private isConfigured = false;
  private currentTrackId: string | null = null;

  constructor() {
    this.configureAudioMode();
  }

  private async configureAudioMode() {
    if (this.isConfigured || Platform.OS === 'web') return;
    try {
      await setAudioModeAsync({
        shouldPlayInBackground: true,
        playsInSilentMode: true,
      });
      this.isConfigured = true;
    } catch (e) {
      console.warn('[AudioService] Failed to configure audio mode:', e);
    }
  }

  private attachListeners(player: AudioPlayer, track: Track) {
    player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      const store = usePlayerStore.getState();

      // Sync buffering
      store.setBuffering(status.isBuffering);

      // Sync duration & position
      if (status.duration > 0) {
        store.setDuration(Math.floor(status.duration));
      }
      if (typeof status.currentTime === 'number') {
        store.setPosition(Math.floor(status.currentTime));
      }

      // Sync play/pause state
      if (status.playing !== store.isPlaying) {
        if (status.playing) {
          store.play();
        } else {
          store.pause();
        }
      }

      // Handle track completion (didJustFinish)
      if (status.didJustFinish) {
        if (store.repeat === 'one') {
          player.seekTo(0);
          player.play();
        } else if (store.repeat === 'all' || store.queueIndex < store.queue.length - 1) {
          store.next();
        } else {
          store.pause();
        }
      }
    });

    // Remote next/previous transport controls from Android notification & lock screen
    try {
      (player as any).addListener('remoteNext', () => {
        console.log('[AudioService] remoteNext event received from lockscreen/notification');
        usePlayerStore.getState().next();
      });
      (player as any).addListener('remotePrevious', () => {
        console.log('[AudioService] remotePrevious event received from lockscreen/notification');
        usePlayerStore.getState().previous();
      });
    } catch (e) {
      console.warn('[AudioService] Failed adding remoteNext/remotePrevious listeners:', e);
    }
  }

  /**
   * Play a track and optionally update the queue.
   */
  async playTrack(track: Track, queue?: Track[], index?: number) {
    await this.configureAudioMode();
    const store = usePlayerStore.getState();
    store.setBuffering(true);

    try {
      if (!track.streamUrl) {
        console.warn('[AudioService] No stream URL for track:', track.title);
        store.setBuffering(false);
        return;
      }

      // If already playing this track, just resume
      if (this.player && this.currentTrackId === track.id) {
        this.player.play();
        store.setBuffering(false);
        store.play();
        return;
      }

      const oldPlayer = this.player;

      // Create new player with remote stream
      const newPlayer = createAudioPlayer(track.streamUrl, {
        updateInterval: 500,
      });

      try {
        const curVol = usePlayerStore.getState().volume ?? 1;
        newPlayer.volume = curVol;
      } catch (_) {}

      this.player = newPlayer;
      this.currentTrackId = track.id;

      // Set lock screen / notification metadata
      try {
        newPlayer.setActiveForLockScreen(
          true,
          {
            title: track.title,
            artist: track.artist,
            albumTitle: track.album || 'Loopd',
            artworkUrl: track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          },
          {
            showNextTrack: true,
            showPreviousTrack: true,
            showSeekForward: false,
            showSeekBackward: false,
          }
        );
      } catch (lockError) {
        // Safe fallback on unsupported platforms
      }

      this.attachListeners(newPlayer, track);

      newPlayer.play();
      store.setBuffering(false);
      store.play();

      // Clean up previous player smoothly now that new player is active
      if (oldPlayer) {
        try {
          oldPlayer.pause();
          (oldPlayer as any).removeAllListeners?.('playbackStatusUpdate');
          (oldPlayer as any).removeAllListeners?.('remoteNext');
          (oldPlayer as any).removeAllListeners?.('remotePrevious');
          oldPlayer.release();
        } catch (_) {}
      }
    } catch (error) {
      console.warn('[AudioService] playTrack error:', error);
      store.setBuffering(false);
    }
  }

  async play() {
    try {
      if (this.player) {
        this.player.play();
        usePlayerStore.getState().play();
      }
    } catch (e) {
      console.warn('[AudioService] play error:', e);
    }
  }

  async pause() {
    try {
      if (this.player) {
        this.player.pause();
        usePlayerStore.getState().pause();
      }
    } catch (e) {
      console.warn('[AudioService] pause error:', e);
    }
  }

  async togglePlay() {
    const isPlaying = usePlayerStore.getState().isPlaying;
    if (isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async seek(seconds: number) {
    try {
      if (this.player) {
        await this.player.seekTo(seconds);
        usePlayerStore.getState().setPosition(seconds);
      }
    } catch (e) {
      console.warn('[AudioService] seek error:', e);
    }
  }

  async next() {
    const store = usePlayerStore.getState();
    store.next();
  }

  async previous() {
    const store = usePlayerStore.getState();
    store.previous();
  }

  setVolume(volume: number) {
    try {
      const vol = Math.max(0, Math.min(1, volume));
      if (this.player) {
        this.player.volume = vol;
      }
    } catch (e) {
      console.warn('[AudioService] setVolume error:', e);
    }
  }

  async stop() {
    try {
      if (this.player) {
        this.player.pause();
        this.player.seekTo(0);
        usePlayerStore.getState().pause();
        usePlayerStore.getState().setPosition(0);
      }
    } catch (e) {
      console.warn('[AudioService] stop error:', e);
    }
  }
}

export const audioService = new AudioService();

// Global listeners for direct Native event dispatching from notification actions
if (typeof DeviceEventEmitter !== 'undefined' && DeviceEventEmitter.addListener) {
  DeviceEventEmitter.addListener('ExpoAudioRemoteNext', () => {
    console.log('[AudioService] ExpoAudioRemoteNext global event received');
    usePlayerStore.getState().next();
  });
  DeviceEventEmitter.addListener('ExpoAudioRemotePrevious', () => {
    console.log('[AudioService] ExpoAudioRemotePrevious global event received');
    usePlayerStore.getState().previous();
  });
}
