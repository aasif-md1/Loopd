/**
 * Album Detail Screen — Loopd
 * Shows cover art with gradient banner, metadata, Play/Shuffle buttons,
 * and tracklist. Tapping a track plays it in the context of the album.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Heart,
  Play,
  Shuffle,
  DotsThree,
} from 'phosphor-react-native';
import { Colors, Typography, Spacing, Shape, Layout } from '@/src/theme';
import { useAlbum } from '@/src/hooks';
import { usePlayerStore } from '@/src/store/playerStore';
import { useLibraryStore } from '@/src/store/libraryStore';
import { ScalePressable } from '@/src/components/ui/ScalePressable';
import { TrackItem } from '@/src/components/ui/TrackItem';
import type { Track } from '@/src/types';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: album, isLoading, error } = useAlbum(id as string);
  const { playFromContext, currentTrack, isPlaying } = usePlayerStore();
  const { savedAlbumIds, toggleSaveAlbum } = useLibraryStore();

  const isSaved = album ? savedAlbumIds.has(album.id) : false;

  const handlePlayAll = (shuffle = false) => {
    if (!album?.tracks || album.tracks.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tracks = [...album.tracks];
    if (shuffle) {
      tracks.sort(() => Math.random() - 0.5);
    }
    playFromContext(tracks, 0, `Album • ${album.title}`);
    router.push('/nowPlaying' as any);
  };

  const handleTrackPress = (track: Track, index: number) => {
    if (album?.tracks) {
      playFromContext(album.tracks, index, `Album • ${album.title}`);
    } else {
      playFromContext([track], 0, `Album • ${album?.title || 'Loopd'}`);
    }
    router.push('/nowPlaying' as any);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Top Floating Back Button */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <ScalePressable
          style={styles.circleBtn}
          onPress={() => router.back()}
          haptic
        >
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </ScalePressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Layout.tabBarHeight + Layout.miniPlayerHeight + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Album Artwork & Gradient Header */}
        <LinearGradient
          colors={['#381e4a', '#1a1824', '#121212']}
          style={[styles.headerGradient, { paddingTop: insets.top + 48 }]}
        >
          <Image
            source={{ uri: album?.artwork }}
            style={styles.artwork}
            contentFit="cover"
            transition={300}
          />

          <Text style={styles.albumTitle} numberOfLines={2}>
            {album?.title || 'Loading Album…'}
          </Text>

          <Pressable
            onPress={() => {
              if (album?.artistId) {
                router.push(`/artist/${album.artistId}` as any);
              }
            }}
          >
            <Text style={styles.artistName}>
              {album?.artist || 'Various Artists'}
            </Text>
          </Pressable>

          <Text style={styles.metaText}>
            Album • {album?.releaseDate ? album.releaseDate.slice(0, 4) : '2024'} •{' '}
            {album?.tracks?.length || 0} tracks
          </Text>
        </LinearGradient>

        {/* Action Controls Row */}
        <View style={styles.actionRow}>
          <View style={styles.actionLeft}>
            <ScalePressable
              style={styles.iconBtn}
              onPress={() => {
                if (album) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleSaveAlbum(album.id);
                }
              }}
              haptic
            >
              <Heart
                size={26}
                color={isSaved ? Colors.primary : Colors.textSecondary}
                weight={isSaved ? 'fill' : 'regular'}
              />
            </ScalePressable>

            <ScalePressable
              style={styles.iconBtn}
              onPress={() => handlePlayAll(true)}
              haptic
            >
              <Shuffle size={24} color={Colors.textSecondary} weight="regular" />
            </ScalePressable>
          </View>

          <ScalePressable
            style={styles.playBtn}
            onPress={() => handlePlayAll(false)}
            haptic
          >
            <Play size={26} color="#000000" weight="fill" style={{ marginLeft: 3 }} />
          </ScalePressable>
        </View>

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {/* Tracks List */}
        <View style={styles.tracksList}>
          {album?.tracks?.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <TrackItem
                key={`${track.id}-${index}`}
                track={track}
                index={index + 1}
                isPlaying={isCurrent && isPlaying}
                onPress={() => handleTrackPress(track, index)}
              />
            );
          })}
        </View>

        {/* Copyright info */}
        {album?.copyright && (
          <View style={styles.copyrightContainer}>
            <Text style={styles.copyrightText}>{album.copyright}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    zIndex: 50,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerGradient: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  artwork: {
    width: 220,
    height: 220,
    borderRadius: Shape.radiusMd,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
  },
  albumTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.headlineSmall,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  artistName: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  metaText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 8,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  tracksList: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  copyrightContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  copyrightText: {
    fontFamily: Typography.fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
