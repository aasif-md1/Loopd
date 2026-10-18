/**
 * Loopd Player Service — V2
 * Serialized command queue, single source of truth playback state machine,
 * lock screen media metadata, and Android background playback.
 * Complies with Section 2 of LOOPD_V2.md
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from '../store/playerStore';
import { MusicService } from '../api/musicService';
import type { Track } from '../types';

const PLAYER_DEBUG = true;
const NOTIFICATION_RATIONALE_SHOWN_KEY = '@loopd_notification_rationale_shown';

function logPlayer(event: string, details?: any) {
  if (PLAYER_DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[PlayerService ${timestamp}] ${event}`, details || '');
  }
}

let setupPromise: Promise<void> | null = null;

class PlayerService {
  private player: AudioPlayer | null = null;
  private currentTrackId: string | null = null;
  private commandQueue: Promise<any> = Promise.resolve();
  private isBufferingOrLoading = false;
  private isSkipping = false;
  private hasRequestedNotificationPermission = false;
  private lastSkipTime = 0;

  constructor() {
    this.setupPlayer();
  }

  /**
   * setupPlayer() guarded by module-level promise so it runs exactly once.
   */
  setupPlayer(): Promise<void> {
    if (!setupPromise) {
      setupPromise = (async () => {
        if (Platform.OS === 'web') return;
        try {
          await setAudioModeAsync({
            shouldPlayInBackground: true,
            playsInSilentMode: true,
          });
          logPlayer('Audio mode configured successfully');
        } catch (e) {
          logPlayer('Failed to configure audio mode', e);
        }
      })();
    }
    return setupPromise;
  }

  /**
   * Serialized command executor. Two commands never run concurrently.
   */
  private enqueue<T>(action: () => Promise<T>): Promise<T> {
    const nextPromise = this.commandQueue.then(async () => {
      try {
        return await action();
      } catch (err) {
        logPlayer('Error in command queue action', err);
        throw err;
      }
    });
    this.commandQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  /**
   * Contextual notification permission request on first successful play (Android 13+)
   */
  private async requestNotificationPermissionIfNeeded() {
    if (Platform.OS !== 'android' || Platform.Version < 33 || this.hasRequestedNotificationPermission) {
      return;
    }
    this.hasRequestedNotificationPermission = true;
    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (!alreadyGranted) {
        logPlayer('Requesting POST_NOTIFICATIONS permission');
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Media Controls in Notifications',
            message: 'Loopd needs notification permission to show play/pause controls and album artwork on your lock screen and notification shade.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          }
        );
      }
    } catch (e) {
      logPlayer('Failed to request notification permission', e);
    }
  }

  /**
   * Attach native playback event listeners.
   * Single source of truth: UI state is updated strictly from events.
   */
  /**
   * Attach native playback event listeners.
   * Single source of truth: UI state is updated strictly from events.
   */
  private attachListeners(player: AudioPlayer) {
    player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      const store = usePlayerStore.getState();

      const isBuffering = Boolean(status.isBuffering);
      const isPlaying = Boolean(status.playing);
      this.isBufferingOrLoading = isBuffering;

      // Update store buffering and playback states without re-invoking audio commands
      store.setBuffering(isBuffering);
      store.setPlaybackState(isPlaying);

      if (status.duration > 0) {
        store.setDuration(Math.floor(status.duration));
      }
      if (typeof status.currentTime === 'number') {
        store.setPosition(Math.floor(status.currentTime));
      }

      logPlayer('PlaybackStatusUpdate', {
        playing: isPlaying,
        buffering: isBuffering,
        pos: Math.floor(status.currentTime || 0),
        duration: Math.floor(status.duration || 0),
      });

      // Handle natural track completion
      if (status.didJustFinish) {
        const pos = store.position;
        const dur = store.duration;
        const isNaturalEnd = dur > 10 && pos >= dur - 4;

        if (this.isSkipping) {
          logPlayer('Ignored didJustFinish while skip is in progress');
          return;
        }

        if (!isNaturalEnd) {
          logPlayer('Ignored premature didJustFinish during track transition or start', { pos, dur });
          return;
        }

        const finishedTrack = usePlayerStore.getState().currentTrack;
        logPlayer('Track naturally finished', finishedTrack?.title);
        if (store.repeat === 'one') {
          this.seek(0);
          this.play();
        } else if (store.repeat === 'all' || store.queueIndex < store.queue.length - 1) {
          store.next();
        } else {
          // Continuous playback: automatically fill queue with related songs so music NEVER stops unexpectedly
          logPlayer('Queue ended, auto-filling similar tracks');
          store.triggerAutoplay().then(() => {
            const refreshed = usePlayerStore.getState();
            if (refreshed.queue.length > store.queue.length) {
              store.next();
            } else if (store.repeat === 'all') {
              store.setQueueIndex(0);
              const first = store.queue[0];
              if (first) this.internalPlayTrack(first);
            } else {
              store.setPlaybackState(false);
            }
          }).catch(() => {
            store.setPlaybackState(false);
          });
        }
      }
    });

    try {
      (player as any).addListener('remoteNext', () => {
        logPlayer('Remote next track requested from lockscreen/notification');
        usePlayerStore.getState().next();
      });
      (player as any).addListener('remotePrevious', () => {
        logPlayer('Remote previous track requested from lockscreen/notification');
        usePlayerStore.getState().previous();
      });
    } catch (e) {
      logPlayer('Failed adding remoteNext/remotePrevious listeners', e);
    }
  }

  /**
   * Play from context: resets queue, sets active track, starts playback.
   */
  playFromContext(tracks: Track[], startIndex: number, source: string): Promise<void> {
    return this.enqueue(async () => {
      await this.setupPlayer();
      const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const targetTrack = tracks[validIndex];
      if (!targetTrack) return;

      logPlayer('playFromContext start', { track: targetTrack.title, index: validIndex, source });

      const store = usePlayerStore.getState();
      store.setContextQueue(tracks, validIndex, source);
      store.setBuffering(true);

      await this.internalPlayTrack(targetTrack);
    });
  }

  /**
   * Internal player initialization & playback start.
   */
  private async internalPlayTrack(track: Track) {
    if (!track.streamUrl) {
      try {
        logPlayer('Fetching streamUrl for track', track.title);
        usePlayerStore.getState().setBuffering(true);
        if (this.player) {
          try {
            this.player.setActiveForLockScreen(
              true,
              {
                title: track.title,
                artist: track.artist,
                albumTitle: track.album || 'Loopd Music',
                artworkUrl: track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
              },
              {
                showNextTrack: true,
                showPreviousTrack: true,
                showSeekForward: false,
                showSeekBackward: false,
              }
            );
          } catch (_) {}
        }
        const resolvedUrl = await MusicService.getStreamUrl(track.id);
        if (resolvedUrl) {
          track.streamUrl = resolvedUrl;
        } else {
          logPlayer('Could not resolve streamUrl for track', track.title);
          usePlayerStore.getState().setBuffering(false);
          return;
        }
      } catch (err) {
        logPlayer('Error resolving streamUrl', err);
        usePlayerStore.getState().setBuffering(false);
        return;
      }
    }

    try {
      this.isBufferingOrLoading = true;
      let activePlayer = this.player;

      if (!activePlayer) {
        activePlayer = createAudioPlayer(track.streamUrl, {
          updateInterval: 500,
        });
        this.player = activePlayer;
        this.attachListeners(activePlayer);
      } else {
        logPlayer('Reusing persistent player with replace()', track.title);
        activePlayer.replace(track.streamUrl);
      }

      this.currentTrackId = track.id;

      // Set hardware loop if repeat is 'one'
      const storeState = usePlayerStore.getState();
      if (storeState.repeat === 'one') {
        activePlayer.loop = true;
      }

      // Lock screen / MediaSession metadata with Next & Previous track controls
      try {
        activePlayer.setActiveForLockScreen(
          true,
          {
            title: track.title,
            artist: track.artist,
            albumTitle: track.album || 'Loopd Music',
            artworkUrl: track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          },
          {
            showNextTrack: true,
            showPreviousTrack: true,
            showSeekForward: false,
            showSeekBackward: false,
          }
        );
      } catch (e) {
        logPlayer('Failed setting lockscreen metadata', e);
      }

      activePlayer.play();
      this.isBufferingOrLoading = false;
      usePlayerStore.getState().setBuffering(false);
      usePlayerStore.getState().setPlaybackState(true);

      logPlayer('Started playback', track.title);

      // Pre-fill queue with similar songs in background so Next button is instant
      const currentQueue = usePlayerStore.getState().queue;
      if (currentQueue.length <= 2) {
        usePlayerStore.getState().triggerAutoplay().catch(() => {});
      }

      // Proactively prefetch stream URLs for the next 3 tracks in queue
      this.prefetchUpcomingTracks(storeState.queueIndex);

      // Contextual notification permission request
      this.requestNotificationPermissionIfNeeded();
    } catch (error) {
      logPlayer('Error in internalPlayTrack', error);
      this.isBufferingOrLoading = false;
      usePlayerStore.getState().setBuffering(false);
      usePlayerStore.getState().setPlaybackState(false);
    }
  }

  /**
   * Proactively prefetch stream URLs for the next 3 tracks in queue
   * so skipping in background / lockscreen is instantaneous with 0ms delay.
   */
  prefetchUpcomingTracks(startIndex: number) {
    const store = usePlayerStore.getState();
    const queue = store.queue;
    if (!queue || queue.length === 0) return;

    for (let offset = 1; offset <= 3; offset++) {
      const idx = startIndex + offset;
      if (idx < queue.length) {
        const candidate = queue[idx];
        if (candidate && !candidate.streamUrl) {
          MusicService.getStreamUrl(candidate.id).then((url) => {
            if (url) {
              candidate.streamUrl = url;
              logPlayer(`Prefetched streamUrl for upcoming track [+${offset}]`, candidate.title);
            }
          }).catch(() => {});
        }
      }
    }
  }

  /**
   * User tapped Play / Pause toggle.
   * If buffering, ignore tap (Section 2.1: tap while buffering is ignored, not treated as pause).
   */
  togglePlay(): Promise<void> {
    return this.enqueue(async () => {
      if (this.isBufferingOrLoading) {
        logPlayer('Ignoring togglePlay tap while buffering');
        return;
      }
      if (!this.player) {
        const current = usePlayerStore.getState().currentTrack;
        if (current) {
          await this.internalPlayTrack(current);
        }
        return;
      }

      const store = usePlayerStore.getState();
      if (store.isPlaying) {
        logPlayer('Pausing playback');
        this.player.pause();
        store.setPlaybackState(false);
      } else {
        logPlayer('Resuming playback');
        this.player.play();
        store.setPlaybackState(true);
      }
    });
  }

  play(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.player) {
        const current = usePlayerStore.getState().currentTrack;
        if (current) await this.internalPlayTrack(current);
        return;
      }
      this.player.play();
      usePlayerStore.getState().setPlaybackState(true);
    });
  }

  pause(): Promise<void> {
    return this.enqueue(async () => {
      if (this.player) {
        this.player.pause();
        usePlayerStore.getState().setPlaybackState(false);
      }
    });
  }

  seek(seconds: number): Promise<void> {
    return this.enqueue(async () => {
      if (this.player) {
        logPlayer('Seeking to', seconds);
        this.player.seekTo(seconds);
        usePlayerStore.getState().setPosition(Math.floor(seconds));
      }
    });
  }

  skipToNext(): Promise<void> {
    const now = Date.now();
    if (this.isSkipping && now - this.lastSkipTime < 2500) {
      logPlayer('skipToNext ignored - skip already in progress');
      return Promise.resolve();
    }

    if (now - this.lastSkipTime < 800) {
      logPlayer('Throttled skipToNext duplicate');
      return Promise.resolve();
    }
    this.lastSkipTime = now;
    this.isSkipping = true;

    return this.enqueue(async () => {
      try {
        const store = usePlayerStore.getState();
        const { queue, queueIndex, shuffle, repeat } = store;
        if (queue.length === 0) return;

        let nextIndex = queueIndex + 1;
        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (nextIndex >= queue.length) {
          if (repeat === 'all') {
            nextIndex = 0;
          } else {
            logPlayer('Reached end of queue in skipToNext, fetching more songs');
            await store.triggerAutoplay();
            const refreshed = usePlayerStore.getState();
            if (refreshed.queue.length > queue.length) {
              nextIndex = queueIndex + 1;
            } else {
              // Loop back to start
              nextIndex = 0;
            }
          }
        }

        const nextTrack = usePlayerStore.getState().queue[nextIndex];
        if (nextTrack) {
          store.setQueueIndex(nextIndex);
          await this.internalPlayTrack(nextTrack);
        }
      } finally {
        this.isSkipping = false;
      }
    });
  }

  skipToPrevious(): Promise<void> {
    const now = Date.now();
    if (this.isSkipping && now - this.lastSkipTime < 2500) {
      logPlayer('skipToPrevious ignored - skip already in progress');
      return Promise.resolve();
    }

    if (now - this.lastSkipTime < 800) {
      logPlayer('Throttled skipToPrevious duplicate');
      return Promise.resolve();
    }
    this.lastSkipTime = now;
    this.isSkipping = true;

    return this.enqueue(async () => {
      try {
        const store = usePlayerStore.getState();
        const { queue, queueIndex, position } = store;
        if (queue.length === 0) return;

        // If more than 3 seconds in, seek to start of current track
        if (position > 3) {
          this.seek(0);
          return;
        }

        const prevIndex = Math.max(0, queueIndex - 1);
        const prevTrack = queue[prevIndex];
        if (prevTrack) {
          store.setQueueIndex(prevIndex);
          await this.internalPlayTrack(prevTrack);
        }
      } finally {
        this.isSkipping = false;
      }
    });
  }

  /**
   * Set volume for sleep timer gradual 10-second fade out (Section 7)
   */
  setVolume(volume: number): Promise<void> {
    return this.enqueue(async () => {
      if (this.player && typeof (this.player as any).setVolume === 'function') {
        try {
          (this.player as any).setVolume(Math.max(0, Math.min(1, volume)));
        } catch (_) {}
      }
    });
  }
}

export const playerService = new PlayerService();
export const audioService = playerService; // Compatibility alias
