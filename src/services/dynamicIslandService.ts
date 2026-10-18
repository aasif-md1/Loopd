import {
  Platform,
  NativeModules,
  DeviceEventEmitter,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';

const { LoopdDynamicIslandModule } = NativeModules;

class DynamicIslandService {
  private isEnabled: boolean = true;
  private currentAppState: AppStateStatus = (AppState.currentState as AppStateStatus) || 'active';
  private appStateSubscription: any = null;
  private remoteActionSubscription: any = null;
  private playerStoreUnsubscribe: any = null;

  init() {
    if (Platform.OS !== 'android' || !LoopdDynamicIslandModule) {
      return;
    }

    // 1. Listen to React Native AppState (background / active)
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    // 2. Listen to user interaction on the Dynamic Island floating pill
    this.remoteActionSubscription = DeviceEventEmitter.addListener(
      'onDynamicIslandAction',
      (data: { action: string }) => {
        const store = usePlayerStore.getState();
        if (data.action === 'playPause') {
          store.togglePlay();
        } else if (data.action === 'next') {
          store.next();
        } else if (data.action === 'previous') {
          store.previous();
        }
      }
    );

    // 3. Subscribe to usePlayerStore state changes
    this.playerStoreUnsubscribe = usePlayerStore.subscribe(
      (state, prevState) => {
        // If track or playing state changed while in background
        if (
          state.currentTrack !== prevState.currentTrack ||
          state.isPlaying !== prevState.isPlaying
        ) {
          this.syncIslandState(state.currentTrack, state.isPlaying);
        }
      }
    );
  }

  private handleAppStateChange = async (nextState: AppStateStatus) => {
    this.currentAppState = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      const { currentTrack, isPlaying } = usePlayerStore.getState();
      if (currentTrack && isPlaying && this.isEnabled) {
        await this.showIsland(currentTrack, isPlaying);
      }
    } else if (nextState === 'active') {
      // User returned to the app: hide the floating overlay
      this.hideIsland();
    }
  };

  private syncIslandState = async (track: any, isPlaying: boolean) => {
    if (this.currentAppState === 'background' || this.currentAppState === 'inactive') {
      if (!track || !isPlaying) {
        this.hideIsland();
      } else {
        await this.updateIsland(track, isPlaying);
      }
    }
  };

  async canDrawOverlays(): Promise<boolean> {
    if (Platform.OS !== 'android' || !LoopdDynamicIslandModule) return false;
    try {
      return await LoopdDynamicIslandModule.canDrawOverlays();
    } catch {
      return false;
    }
  }

  async requestOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !LoopdDynamicIslandModule) return false;
    try {
      return await LoopdDynamicIslandModule.requestOverlayPermission();
    } catch {
      return false;
    }
  }

  async showIsland(track: any, isPlaying: boolean) {
    if (Platform.OS !== 'android' || !LoopdDynamicIslandModule) return;
    try {
      const canDraw = await this.canDrawOverlays();
      if (!canDraw) return;

      const title = track.title || 'Now Playing';
      const artist = track.artist || 'Loopd Music';
      const artwork = track.artwork || null;

      await LoopdDynamicIslandModule.show(title, artist, artwork, isPlaying);
    } catch (e) {
      console.warn('[DynamicIsland] Show error:', e);
    }
  }

  async updateIsland(track: any, isPlaying: boolean) {
    if (Platform.OS !== 'android' || !LoopdDynamicIslandModule) return;
    try {
      const title = track.title || 'Now Playing';
      const artist = track.artist || 'Loopd Music';
      const artwork = track.artwork || null;

      await LoopdDynamicIslandModule.update(title, artist, artwork, isPlaying);
    } catch (e) {
      console.warn('[DynamicIsland] Update error:', e);
    }
  }

  hideIsland() {
    if (Platform.OS !== 'android' || !LoopdDynamicIslandModule) return;
    try {
      LoopdDynamicIslandModule.hide();
    } catch (e) {
      console.warn('[DynamicIsland] Hide error:', e);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hideIsland();
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  destroy() {
    this.appStateSubscription?.remove();
    this.remoteActionSubscription?.remove();
    this.playerStoreUnsubscribe?.();
    this.hideIsland();
  }
}

export const dynamicIslandService = new DynamicIslandService();
