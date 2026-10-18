/**
 * Your Library Screen — Loopd
 * Filter chips, sort menu, list/grid toggle, liked songs tile, playlists,
 * custom playlist creation modal, and offline downloads view.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  SquaresFour,
  List,
  Heart,
  MagnifyingGlass,
  CaretDown,
  MusicNotes,
  X,
} from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Shape, Layout } from '../../theme';
import { FilterChips, ScalePressable, EmptyState } from '../ui';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayerStore } from '../../store/playerStore';
import type { Track } from '../../types';

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState('Playlists');
  const [isGridView, setIsGridView] = useState(false);
  const [sortBy, setSortBy] = useState('Recents');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  const {
    likedSongIds,
    likedTracks,
    playlists,
    recentlyPlayed,
    followedArtistIds,
    savedAlbumIds,
    downloadedTrackIds,
    createPlaylist,
  } = useLibraryStore();

  const { playFromContext, currentTrack, isPlaying } = usePlayerStore();

  const likedCount = likedSongIds.size;

  const downloadedTracks: Track[] = useMemo(() => {
    const list: Track[] = [];
    const seen = new Set<string>();
    for (const t of [...likedTracks, ...recentlyPlayed]) {
      if (downloadedTrackIds.has(t.id) && !seen.has(t.id)) {
        seen.add(t.id);
        list.push(t);
      }
    }
    return list;
  }, [likedTracks, recentlyPlayed, downloadedTrackIds]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistTitle.trim()) {
      Alert.alert('Playlist Name', 'Please enter a name for your playlist.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const p = createPlaylist(newPlaylistTitle.trim());
    setNewPlaylistTitle('');
    setCreateModalVisible(false);
    router.push(`/playlist/${p.id}` as any);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/logo-transparent.png')}
            style={styles.avatar}
            contentFit="contain"
          />
          <Text style={styles.headerTitle}>Your Library</Text>
        </View>
        <View style={styles.headerRight}>
          <ScalePressable
            style={styles.headerIcon}
            onPress={() => router.push('/(tabs)/search' as any)}
            haptic
          >
            <MagnifyingGlass size={22} color={Colors.textPrimary} weight="regular" />
          </ScalePressable>
          <ScalePressable
            style={styles.headerIcon}
            onPress={() => setCreateModalVisible(true)}
            haptic
          >
            <Plus size={24} color={Colors.textPrimary} weight="bold" />
          </ScalePressable>
        </View>
      </View>

      {/* Filter chips */}
      <FilterChips
        chips={['Playlists', 'Artists', 'Albums']}
        activeChip={filter}
        onSelect={setFilter}
      />

      {/* Sort/View toggle row */}
      <View style={styles.sortRow}>
        <ScalePressable style={styles.sortBtn}>
          <CaretDown size={16} color={Colors.textSecondary} weight="bold" />
          <Text style={styles.sortText}>{sortBy}</Text>
        </ScalePressable>
        <ScalePressable
          style={styles.viewToggle}
          onPress={() => setIsGridView(!isGridView)}
        >
          {isGridView ? (
            <List size={20} color={Colors.textSecondary} weight="regular" />
          ) : (
            <SquaresFour size={20} color={Colors.textSecondary} weight="regular" />
          )}
        </ScalePressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Layout.tabBarHeight + Layout.miniPlayerHeight + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Liked Songs tile (always pinned at top when in Playlists or All) */}
        {(filter === 'Playlists' || filter === 'All') && (
          <ScalePressable
            style={styles.likedSongsTile}
            onPress={() => router.push('/likedSongs' as any)}
            haptic
          >
            <LinearGradient
              colors={['#5b21b6', '#3b82f6', '#7c3aed']}
              style={styles.likedSongsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Heart
                size={22}
                color={Colors.textPrimary}
                weight="fill"
              />
            </LinearGradient>
            <View style={styles.likedSongsInfo}>
              <Text style={styles.likedSongsTitle}>Liked Songs</Text>
              <View style={styles.likedSongsRow}>
                <View style={styles.pinDot} />
                <Text style={styles.likedSongsCount}>
                  {likedCount} song{likedCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </ScalePressable>
        )}

        {/* Playlists view */}
        {filter === 'Playlists' && playlists.length === 0 && (
          <EmptyState
            title="No playlists yet"
            message="Tap the + button to create one"
          />
        )}

        {filter === 'Playlists' &&
          playlists.map((playlist) => (
            <ScalePressable
              key={playlist.id}
              style={styles.listItem}
              onPress={() => router.push(`/playlist/${playlist.id}` as any)}
              haptic
            >
              <Image
                source={{ uri: playlist.artwork }}
                style={styles.listArt}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.listInfo}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {playlist.title}
                </Text>
                <Text style={styles.listSubtitle} numberOfLines={1}>
                  Playlist • {playlist.trackCount || 0} songs
                </Text>
              </View>
            </ScalePressable>
          ))}


        {/* Artists view */}
        {filter === 'Artists' && followedArtistIds.size === 0 && (
          <EmptyState
            title="No followed artists"
            message="Follow artists from search or home to see them here"
          />
        )}

        {/* Albums view */}
        {filter === 'Albums' && savedAlbumIds.size === 0 && (
          <EmptyState
            title="No saved albums"
            message="Save albums to quickly access them in your library"
          />
        )}

        {/* Recently played section at bottom */}
        {recentlyPlayed.length > 0 && filter === 'Playlists' && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recently Played</Text>
            {recentlyPlayed.slice(0, 10).map((track) => (
              <ScalePressable
                key={track.id}
                style={styles.listItem}
                onPress={() => {
                  const idx = recentlyPlayed.findIndex((t) => t.id === track.id);
                  playFromContext(recentlyPlayed, idx >= 0 ? idx : 0, 'Recently Played');
                }}
                haptic
              >
                <Image
                  source={{ uri: track.artwork }}
                  style={styles.listArt}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.listSubtitle} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
              </ScalePressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal
        visible={createModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Give your playlist a name</Text>
              <ScalePressable onPress={() => setCreateModalVisible(false)}>
                <X size={20} color={Colors.textSecondary} />
              </ScalePressable>
            </View>

            <TextInput
              style={styles.nameInput}
              placeholder="My Playlist #1"
              placeholderTextColor={Colors.textMuted}
              value={newPlaylistTitle}
              onChangeText={setNewPlaylistTitle}
              autoFocus
              selectionColor={Colors.primary}
            />

            <View style={styles.modalActions}>
              <ScalePressable
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </ScalePressable>
              <ScalePressable
                style={styles.createBtn}
                onPress={handleCreatePlaylist}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </ScalePressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.sizes.sectionHeader,
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  headerIcon: {
    padding: 8,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
  },
  viewToggle: {
    padding: 4,
  },
  likedSongsTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    gap: 12,
  },
  likedSongsGradient: {
    width: 56,
    height: 56,
    borderRadius: Shape.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedSongsInfo: {
    flex: 1,
  },
  likedSongsTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.trackTitle,
    color: Colors.textPrimary,
  },
  likedSongsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  likedSongsCount: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 8,
    gap: 12,
  },
  listArt: {
    width: 56,
    height: 56,
    borderRadius: Shape.cardRadius,
    backgroundColor: Colors.card,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.trackTitle,
    color: Colors.textPrimary,
  },
  listSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentSection: {
    marginTop: 24,
    paddingHorizontal: Spacing.screenPadding,
  },
  recentTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sectionHeader,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Shape.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleMedium,
    color: Colors.textPrimary,
  },
  nameInput: {
    backgroundColor: Colors.card,
    borderRadius: Shape.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: Shape.buttonRadius,
  },
  createBtnText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: '#000000',
  },
});
