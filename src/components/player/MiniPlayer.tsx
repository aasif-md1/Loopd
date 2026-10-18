/**
 * Mini Player — sits above tab bar, visible when a track is loaded.
 * Shows: album art, title/artist, like, play/pause, thin progress bar.
 * Tap opens Now Playing. Swipe left/right changes track.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Play, Pause, Heart } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shape, Layout } from '../../theme';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { ScalePressable } from '../ui/ScalePressable';

export function MiniPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentTrack, isPlaying, position, duration, togglePlay, next, previous } =
    usePlayerStore();
  const { likedSongIds, toggleLike } = useLibraryStore();

  const translateX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.3 }],
  }));

  if (!currentTrack) return null;

  const isLiked = likedSongIds.has(currentTrack.id);
  const progress = duration > 0 ? position / duration : 0;
  const bottomOffset = Layout.tabBarHeight + (insets.bottom > 0 ? insets.bottom : 8) + 6;

  const handleSwipeEnd = (direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (direction === 'left') {
      next();
    } else {
      previous();
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        runOnJS(handleSwipeEnd)('left');
      } else if (e.translationX > 80) {
        runOnJS(handleSwipeEnd)('right');
      }
      translateX.value = withSpring(0, { damping: 15 });
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.wrapper, { bottom: bottomOffset }, animatedStyle]}>
        <Pressable
          style={styles.container}
          onPress={() => router.push('/nowPlaying' as any)}
        >
          <LinearGradient
            colors={['#282828', '#1a1a1a']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.artwork}
            contentFit="cover"
            transition={200}
          />

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          <ScalePressable
            style={styles.iconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleLike(currentTrack.id);
            }}
            haptic
          >
            <Heart
              size={20}
              color={isLiked ? Colors.primary : Colors.textPrimary}
              weight={isLiked ? 'fill' : 'regular'}
            />
          </ScalePressable>

          <ScalePressable
            style={styles.iconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              togglePlay();
            }}
            haptic
          >
            {isPlaying ? (
              <Pause size={22} color={Colors.textPrimary} weight="fill" />
            ) : (
              <Play size={22} color={Colors.textPrimary} weight="fill" />
            )}
          </ScalePressable>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` as any }]} />
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    zIndex: 100,
  },
  container: {
    height: Layout.miniPlayerHeight,
    borderRadius: Shape.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  artwork: {
    width: Layout.miniPlayerArt,
    height: Layout.miniPlayerArt,
    borderRadius: Shape.cardRadius,
    backgroundColor: Colors.card,
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 4,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.miniPlayerTitle,
    color: Colors.textPrimary,
  },
  artist: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  iconBtn: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  progressBar: {
    height: 2,
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
});
