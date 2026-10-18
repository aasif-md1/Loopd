/**
 * TrackActionModal — Loopd
 * Standard Spotify-style 3-dot bottom sheet for tracks across Search, Home, Playlists.
 * Features:
 * - Play Now
 * - Play Next
 * - Add to Queue
 * - Add to Liked Songs
 * - Share Track
 * - Go to Album / Artist
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Play,
  SkipForward,
  ListPlus,
  Heart,
  ShareNetwork,
  Disc,
  User,
  X,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Shape } from '../../theme';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import type { Track } from '../../types';

interface TrackActionModalProps {
  track: Track | null;
  visible: boolean;
  onClose: () => void;
}

export function TrackActionModal({ track, visible, onClose }: TrackActionModalProps) {
  const router = useRouter();
  const { playFromContext, playNext, addToQueue } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();

  if (!track) return null;

  const liked = isLiked(track.id);

  const handlePlayNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playFromContext([track], 0, 'Search Action');
    onClose();
  };

  const handlePlayNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playNext(track);
    onClose();
    Alert.alert('Queue', `"${track.title}" will play next.`);
  };

  const handleAddToQueue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToQueue(track);
    onClose();
    Alert.alert('Queue', `Added "${track.title}" to queue.`);
  };

  const handleToggleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLike(track);
    onClose();
  };

  const handleShare = async () => {
    onClose();
    try {
      await Share.share({
        title: track.title,
        message: `Listen to "${track.title}" by ${track.artist} on Loopd!\nhttps://loopd.music/track/${track.id}`,
      });
    } catch (_) {}
  };

  const handleGoToAlbum = () => {
    onClose();
    if (track.albumId) {
      router.push(`/album/${track.albumId}` as any);
    }
  };

  const handleGoToArtist = () => {
    onClose();
    if (track.artistId) {
      router.push(`/artist/${track.artistId}` as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header Preview */}
          <View style={styles.header}>
            <Image
              source={{ uri: track.artwork }}
              style={styles.artwork}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={Colors.textSecondary} weight="bold" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Action List */}
          <Pressable style={styles.actionItem} onPress={handlePlayNow}>
            <Play size={22} color={Colors.primary} weight="fill" />
            <Text style={[styles.actionText, { color: Colors.primary, fontWeight: '700' }]}>
              Play Now
            </Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={handlePlayNext}>
            <SkipForward size={22} color={Colors.textPrimary} weight="regular" />
            <Text style={styles.actionText}>Play Next</Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={handleAddToQueue}>
            <ListPlus size={22} color={Colors.textPrimary} weight="regular" />
            <Text style={styles.actionText}>Add to Queue</Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={handleToggleLike}>
            <Heart
              size={22}
              color={liked ? Colors.primary : Colors.textPrimary}
              weight={liked ? 'fill' : 'regular'}
            />
            <Text style={styles.actionText}>
              {liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            </Text>
          </Pressable>

          <Pressable style={styles.actionItem} onPress={handleShare}>
            <ShareNetwork size={22} color={Colors.textPrimary} weight="regular" />
            <Text style={styles.actionText}>Share Track</Text>
          </Pressable>

          {track.albumId ? (
            <Pressable style={styles.actionItem} onPress={handleGoToAlbum}>
              <Disc size={22} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.actionText}>Go to Album</Text>
            </Pressable>
          ) : null}

          {track.artistId ? (
            <Pressable style={styles.actionItem} onPress={handleGoToArtist}>
              <User size={22} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.actionText}>Go to Artist</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#181A20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
  },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  artist: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E0E0',
  },
});
