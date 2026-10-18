/**
 * Liked Songs Screen — Loopd
 * Spotify-styled Liked Songs collection with big Play/Shuffle, search, and instant playback.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Heart,
  MagnifyingGlass,
  MusicNotes,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shape, Layout } from '@/src/theme';
import { useLibraryStore } from '@/src/store/libraryStore';
import { usePlayerStore } from '@/src/store/playerStore';
import { ScalePressable } from '@/src/components/ui/ScalePressable';
import { TrackItem } from '@/src/components/ui/TrackItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import type { Track } from '@/src/types';

export default function LikedSongsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const { likedTracks, likedSongIds, recentlyPlayed } = useLibraryStore();
  const { playFromContext, currentTrack, isPlaying } = usePlayerStore();

  // Combine likedTracks with any recentlyPlayed that are liked
  const allLikedTracks: Track[] = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of likedTracks) {
      if (likedSongIds.has(t.id)) map.set(t.id, t);
    }
    for (const t of recentlyPlayed) {
      if (likedSongIds.has(t.id) && !map.has(t.id)) {
        map.set(t.id, t);
      }
    }
    return Array.from(map.values());
  }, [likedTracks, likedSongIds, recentlyPlayed]);

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return allLikedTracks;
    const q = searchQuery.toLowerCase();
    return allLikedTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [allLikedTracks, searchQuery]);

  const handlePlayAll = (shuffle = false) => {
    if (filteredTracks.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const list = [...filteredTracks];
    if (shuffle) list.sort(() => Math.random() - 0.5);
    playFromContext(list, 0, 'Liked Songs');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Atmospheric Header Gradient */}
      <LinearGradient
        colors={['#4c1d95', '#1e1b4b', '#121212']}
        style={[styles.headerGradient, { height: 260 + insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Layout.tabBarHeight + Layout.miniPlayerHeight + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation row */}
        <View style={styles.navBar}>
          <ScalePressable
            style={styles.backBtn}
            onPress={() => router.back()}
            haptic
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </ScalePressable>
        </View>

        {/* Big Liked Songs Card */}
        <View style={styles.heroRow}>
          <LinearGradient
            colors={['#5b21b6', '#3b82f6', '#7c3aed']}
            style={styles.heroArt}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Heart size={44} color="#FFFFFF" weight="fill" />
          </LinearGradient>
          <View style={styles.heroDetails}>
            <Text style={styles.heroSubtitle}>PLAYLIST</Text>
            <Text style={styles.heroTitle}>Liked Songs</Text>
            <Text style={styles.heroMeta}>
              {allLikedTracks.length} song{allLikedTracks.length !== 1 ? 's' : ''} • Loopd
            </Text>
          </View>
        </View>

        {/* Action Controls (Play & Shuffle) */}
        {allLikedTracks.length > 0 && (
          <View style={styles.actionsRow}>
            <ScalePressable
              style={styles.shuffleBtn}
              onPress={() => handlePlayAll(true)}
              haptic
            >
              <Shuffle size={24} color={Colors.textSecondary} weight="regular" />
            </ScalePressable>

            <ScalePressable
              style={styles.playFab}
              onPress={() => handlePlayAll(false)}
              haptic
            >
              <Play size={26} color="#000000" weight="fill" style={{ marginLeft: 3 }} />
            </ScalePressable>
          </View>
        )}

        {/* Search bar inside liked songs */}
        {allLikedTracks.length > 5 && (
          <View style={styles.searchBar}>
            <MagnifyingGlass size={18} color={Colors.textMuted} weight="regular" />
            <TextInput
              style={styles.searchInput}
              placeholder="Find in liked songs"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {/* Tracks List */}
        {allLikedTracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MusicNotes size={56} color={Colors.textMuted} weight="regular" />
            <Text style={styles.emptyTitle}>Songs you like will appear here</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any song to save it to your library.
            </Text>
            <ScalePressable
              style={styles.exploreBtn}
              onPress={() => router.push('/(tabs)/search' as any)}
              haptic
            >
              <Text style={styles.exploreBtnText}>Find Music</Text>
            </ScalePressable>
          </View>
        ) : (
          filteredTracks.map((track, index) => (
            <TrackItem
              key={track.id}
              track={track}
              index={index + 1}
              isPlaying={currentTrack?.id === track.id && isPlaying}
              onPress={() => playFromContext(filteredTracks, index, 'Liked Songs')}
            />
          ))
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
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  heroArt: {
    width: 96,
    height: 96,
    borderRadius: Shape.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  heroDetails: {
    flex: 1,
  },
  heroSubtitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.textMuted,
  },
  heroTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.headlineSmall,
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  heroMeta: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  shuffleBtn: {
    padding: 10,
  },
  playFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Shape.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  exploreBtn: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Shape.buttonRadius,
  },
  exploreBtnText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: '#000000',
  },
});
