import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  RepeatOnce,
  Heart,
  SpeakerHigh,
  SpeakerLow,
  SpeakerNone,
  Quotes,
  Queue,
  ArrowsOutSimple,
} from 'phosphor-react-native';
import { Colors, Typography } from '../../theme';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function DesktopPlayerBar() {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    togglePlay,
    next,
    previous,
    seek,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
    volume,
    setVolume,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const [prevVolume, setPrevVolume] = useState(1.0);

  if (!currentTrack) {
    return (
      <View style={styles.emptyBar}>
        <Text style={styles.emptyText}>Select a track to start listening to Loopd Music</Text>
      </View>
    );
  }

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const handleProgressBarPress = (e: any) => {
    if (duration <= 0) return;
    const { locationX } = e.nativeEvent;
    // On web or desktop native, compute ratio from width
    const barWidth = 450; // standard desktop progress bar width
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    seek(Math.floor(ratio * duration));
  };

  const handleVolumeBarPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const volWidth = 90;
    const newVol = Math.max(0, Math.min(1, locationX / volWidth));
    setVolume(newVol);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  return (
    <View style={styles.barContainer}>
      {/* 1. Left Section: Track Info */}
      <View style={styles.leftSection}>
        <Image
          source={{ uri: currentTrack.artwork }}
          style={styles.artwork}
          contentFit="cover"
        />
        <View style={styles.trackDetails}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
        <Pressable
          style={styles.likeBtn}
          onPress={() => toggleLike(currentTrack)}
          hitSlop={8}
        >
          <Heart
            size={20}
            color={liked ? '#1ED760' : Colors.textMuted}
            weight={liked ? 'fill' : 'regular'}
          />
        </Pressable>
      </View>

      {/* 2. Center Section: Playback Controls & Scrubber */}
      <View style={styles.centerSection}>
        <View style={styles.controlButtonsRow}>
          <Pressable onPress={toggleShuffle} hitSlop={6}>
            <Shuffle
              size={18}
              color={shuffle ? '#1ED760' : Colors.textSecondary}
              weight={shuffle ? 'bold' : 'regular'}
            />
          </Pressable>

          <Pressable onPress={previous} hitSlop={6}>
            <SkipBack size={20} color="#FFFFFF" weight="fill" />
          </Pressable>

          <Pressable style={styles.playPauseCircle} onPress={togglePlay} hitSlop={4}>
            {isPlaying ? (
              <Pause size={18} color="#000000" weight="fill" />
            ) : (
              <Play size={18} color="#000000" weight="fill" style={{ marginLeft: 2 }} />
            )}
          </Pressable>

          <Pressable onPress={next} hitSlop={6}>
            <SkipForward size={20} color="#FFFFFF" weight="fill" />
          </Pressable>

          <Pressable onPress={toggleRepeat} hitSlop={6}>
            {repeat === 'one' ? (
              <RepeatOnce size={18} color="#1ED760" weight="bold" />
            ) : (
              <Repeat
                size={18}
                color={repeat === 'all' ? '#1ED760' : Colors.textSecondary}
                weight={repeat === 'all' ? 'bold' : 'regular'}
              />
            )}
          </Pressable>
        </View>

        {/* Progress Bar & Timestamps */}
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Pressable style={styles.progressBarWrapper} onPress={handleProgressBarPress}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              <View
                style={[
                  styles.progressBarThumb,
                  { left: `${Math.min(99, Math.max(0, progressPercent))}%` },
                ]}
              />
            </View>
          </Pressable>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* 3. Right Section: Features & Volume */}
      <View style={styles.rightSection}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push('/nowPlaying' as any)}
          hitSlop={6}
        >
          <Quotes size={20} color={Colors.textSecondary} weight="regular" />
        </Pressable>

        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push('/nowPlaying' as any)}
          hitSlop={6}
        >
          <Queue size={20} color={Colors.textSecondary} weight="regular" />
        </Pressable>

        {/* Volume Slider */}
        <View style={styles.volumeContainer}>
          <Pressable onPress={toggleMute} hitSlop={6}>
            {volume === 0 ? (
              <SpeakerNone size={20} color={Colors.textMuted} weight="bold" />
            ) : volume < 0.5 ? (
              <SpeakerLow size={20} color={Colors.textSecondary} weight="bold" />
            ) : (
              <SpeakerHigh size={20} color={Colors.textSecondary} weight="bold" />
            )}
          </Pressable>

          <Pressable style={styles.volumeBarWrapper} onPress={handleVolumeBarPress}>
            <View style={styles.volumeTrack}>
              <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
            </View>
          </Pressable>
        </View>

        {/* Fullscreen Expand */}
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push('/nowPlaying' as any)}
          hitSlop={6}
        >
          <ArrowsOutSimple size={18} color={Colors.textSecondary} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    height: 90,
    backgroundColor: '#121318',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  emptyBar: {
    height: 60,
    backgroundColor: '#121318',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  emptyText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 260,
    gap: 12,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trackArtist: {
    fontFamily: Typography.fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  likeBtn: {
    padding: 6,
  },
  centerSection: {
    flex: 1,
    maxWidth: 620,
    alignItems: 'center',
    gap: 6,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  playPauseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  timeText: {
    fontFamily: Typography.fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    minWidth: 32,
    textAlign: 'center',
  },
  progressBarWrapper: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    position: 'relative',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressBarThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginLeft: -6,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 260,
    justifyContent: 'flex-end',
    gap: 16,
  },
  iconBtn: {
    padding: 6,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeBarWrapper: {
    width: 90,
    height: 18,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
  },
  volumeFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});
