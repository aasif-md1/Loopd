/**
 * Playlist Detail Screen — Loopd
 * Shows custom playlists and 'Liked Songs' collection with quick shuffle and play.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Play, Shuffle, Heart } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shape, Layout } from '@/src/theme';
import { useLibraryStore } from '@/src/store/libraryStore';
import { usePlayerStore } from '@/src/store/playerStore';
import { ScalePressable } from '@/src/components/ui/ScalePressable';
import { TrackItem } from '@/src/components/ui/TrackItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import type { Track } from '@/src/types';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { likedSongIds, playlists, recentlyPlayed } = useLibraryStore();
  const { playFromContext, currentTrack, isPlaying } = usePlayerStore();

  const isLikedSongs = id === 'liked';
  const playlist = isLikedSongs
    ? null
    : playlists.find((p) => p.id === id);

  // If Liked Songs, show liked tracks from recentlyPlayed or sample
  const tracks: Track[] = isLikedSongs
    ? recentlyPlayed.filter((t) => likedSongIds.has(t.id))
    : playlist?.tracks || [];

  const title = isLikedSongs ? 'Liked Songs' : playlist?.title || 'Playlist';
  const description = isLikedSongs
    ? `${likedSongIds.size} tracks saved`
    : playlist?.description || 'Curated vibe on Loopd';

  const handlePlayAll = (shuffle = false) => {
    if (tracks.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const list = [...tracks];
    if (shuffle) list.sort(() => Math.random() - 0.5);
    playFromContext(list, 0, `Playlist • ${title}`);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Floating Back Button */}
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
        <LinearGradient
          colors={isLikedSongs ? ['#4A154B', '#250E28', Colors.background] : ['#1E3264', '#0E172E', Colors.background]}
          style={[styles.headerGradient, { paddingTop: insets.top + 52 }]}
        >
          <View style={[styles.coverBox, isLikedSongs && styles.likedBox]}>
            <Heart size={44} color="#FFFFFF" weight="fill" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{description}</Text>
        </LinearGradient>

        <View style={styles.actionRow}>
          <ScalePressable
            style={styles.iconBtn}
            onPress={() => handlePlayAll(true)}
            haptic
          >
            <Shuffle size={24} color={Colors.textSecondary} weight="regular" />
          </ScalePressable>

          <ScalePressable
            style={styles.playBtn}
            onPress={() => handlePlayAll(false)}
            haptic
          >
            <Play size={26} color="#000000" weight="fill" style={{ marginLeft: 3 }} />
          </ScalePressable>
        </View>

        {tracks.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message={
              isLikedSongs
                ? 'Tracks you like will show up here.'
                : 'Add tracks to this playlist to get started.'
            }
          />
        ) : (
          <View style={styles.tracksList}>
            {tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <TrackItem
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx + 1}
                  isPlaying={isCurrent && isPlaying}
                  onPress={() => playFromContext(tracks, idx, `Playlist • ${title}`)}
                />
              );
            })}
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
  coverBox: {
    width: 140,
    height: 140,
    borderRadius: Shape.radiusMd,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  likedBox: {
    backgroundColor: '#4A154B',
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.headlineMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  tracksList: {
    paddingHorizontal: 16,
  },
});
