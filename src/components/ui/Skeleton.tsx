/**
 * Skeleton Shimmer Loader
 * Premium loading state with animated shimmer effect.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '../../theme';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.highlight,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Pre-built skeleton patterns */
export function TrackSkeleton() {
  return (
    <View style={styles.trackRow}>
      <Skeleton width={48} height={48} borderRadius={4} />
      <View style={styles.trackInfo}>
        <Skeleton width={160} height={14} />
        <Skeleton width={100} height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function CardSkeleton({ size = 150 }: { size?: number }) {
  return (
    <View style={{ marginRight: 12 }}>
      <Skeleton width={size} height={size} borderRadius={4} />
      <Skeleton width={size - 20} height={14} style={{ marginTop: 8 }} />
      <Skeleton width={size - 50} height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

export function ArtistSkeleton() {
  return (
    <View style={{ alignItems: 'center', marginRight: 16 }}>
      <Skeleton width={120} height={120} borderRadius={60} />
      <Skeleton width={80} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

export function QuickAccessSkeleton() {
  return (
    <View style={styles.quickAccess}>
      <Skeleton width={48} height={48} borderRadius={4} />
      <Skeleton width={80} height={13} style={{ marginLeft: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  trackInfo: {
    marginLeft: 12,
    flex: 1,
  },
  quickAccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.highlight,
    borderRadius: 4,
    height: 56,
    paddingHorizontal: 0,
    overflow: 'hidden',
    flex: 1,
    margin: 4,
  },
});
