/**
 * Track list item — used everywhere tracks are displayed.
 * Shows artwork, title, artist, 3-dot menu, optional index.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { DotsThree } from 'phosphor-react-native';
import { Colors, Typography, Spacing, Shape } from '../../theme';
import { ScalePressable } from './ScalePressable';
import type { Track } from '../../types';

interface TrackItemProps {
  track: Track;
  index?: number;
  showArt?: boolean;
  isPlaying?: boolean;
  onPress?: (track: Track) => void;
  onMore?: (track: Track) => void;
}

export function TrackItem({
  track,
  index,
  showArt = true,
  isPlaying = false,
  onPress,
  onMore,
}: TrackItemProps) {
  return (
    <ScalePressable
      style={styles.container}
      onPress={() => onPress?.(track)}
      haptic
    >
      {index !== undefined && (
        <Text style={[styles.index, isPlaying && styles.indexPlaying]}>
          {index + 1}
        </Text>
      )}

      {showArt && (
        <Image
          source={{ uri: track.artwork }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
          placeholder={require('../../../assets/images/loopd-icon.png')}
          placeholderContentFit="cover"
        />
      )}

      <View style={styles.info}>
        <Text
          style={[styles.title, isPlaying && styles.titlePlaying]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <View style={styles.subtitleRow}>
          {track.isExplicit && (
            <View style={styles.explicitBadge}>
              <Text style={styles.explicitText}>E</Text>
            </View>
          )}
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
      </View>

      <ScalePressable
        style={styles.moreBtn}
        onPress={() => onMore?.(track)}
        hitSlop={8}
      >
        <DotsThree size={24} color={Colors.textSecondary} weight="bold" />
      </ScalePressable>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 8,
    minHeight: 56,
  },
  index: {
    width: 28,
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  indexPlaying: {
    color: Colors.primary,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: Shape.cardRadius,
    backgroundColor: Colors.card,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.trackTitle,
    color: Colors.textPrimary,
  },
  titlePlaying: {
    color: Colors.primary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  explicitBadge: {
    backgroundColor: Colors.textSecondary,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 6,
  },
  explicitText: {
    fontFamily: Typography.fonts.bold,
    fontSize: 9,
    color: Colors.background,
  },
  artist: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textSecondary,
    flex: 1,
  },
  moreBtn: {
    padding: 8,
  },
});
