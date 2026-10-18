/**
 * Artist Profile Screen — Loopd
 * Hero banner, verified badge, listener count, Follow toggle,
 * Top Tracks list, and Albums discography.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Play,
  Shuffle,
  CheckCircle,
  DotsThree,
} from 'phosphor-react-native';
import { Colors, Typography, Spacing, Shape, Layout } from '@/src/theme';
import {
  useArtist,
  useArtistTracks,
  useArtistAlbums,
} from '@/src/hooks';
import { usePlayerStore } from '@/src/store/playerStore';
import { useLibraryStore } from '@/src/store/libraryStore';
import { ScalePressable } from '@/src/components/ui/ScalePressable';
import { TrackItem } from '@/src/components/ui/TrackItem';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { HorizontalCarousel } from '@/src/components/ui/HorizontalCarousel';
import type { Track } from '@/src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatListeners(num?: number): string {
  if (!num) return '1,420,890 monthly listeners';
  return `${num.toLocaleString()} monthly listeners`;
}

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: artist, isLoading: artistLoading } = useArtist(id as string);
  const { data: tracks, isLoading: tracksLoading } = useArtistTracks(id as string, 10);
  const { data: albums, isLoading: albumsLoading } = useArtistAlbums(id as string, 10);

  const { playFromContext, currentTrack, isPlaying } = usePlayerStore();
  const { followedArtistIds, toggleFollowArtist } = useLibraryStore();

  const isFollowing = artist ? followedArtistIds.has(artist.id) : false;

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playFromContext(tracks, 0, `Artist • ${artist?.name || 'Artist'}`);
    router.push('/nowPlaying' as any);
  };

  const albumItems = (albums || []).map((alb) => ({
    id: alb.id,
    title: alb.title,
    subtitle: alb.releaseDate ? alb.releaseDate.slice(0, 4) : 'Album',
    artwork: alb.artwork,
  }));

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
        {/* Hero Banner */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: artist?.image }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.7)', Colors.background]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
          />

          <View style={styles.heroContent}>
            <View style={styles.verifiedRow}>
              <CheckCircle size={16} color={Colors.primary} weight="fill" />
              <Text style={styles.verifiedText}>Verified Artist</Text>
            </View>

            <Text style={styles.artistName} numberOfLines={2}>
              {artist?.name || 'Artist'}
            </Text>

            <Text style={styles.listenerCount}>
              {formatListeners(artist?.monthlyListeners)}
            </Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <ScalePressable
            style={[
              styles.followBtn,
              isFollowing && styles.followingBtn,
            ]}
            onPress={() => {
              if (artist) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFollowArtist(artist.id);
              }
            }}
            haptic
          >
            <Text
              style={[
                styles.followBtnText,
                isFollowing && styles.followingBtnText,
              ]}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </ScalePressable>

          <ScalePressable
            style={styles.playBtn}
            onPress={handlePlayAll}
            haptic
          >
            <Play size={26} color="#000000" weight="fill" style={{ marginLeft: 3 }} />
          </ScalePressable>
        </View>

        {/* Popular Tracks Section */}
        <SectionHeader title="Popular" />
        <View style={styles.tracksList}>
          {tracksLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} />
          ) : (
            tracks?.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <TrackItem
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx + 1}
                  isPlaying={isCurrent && isPlaying}
                  onPress={() => {
                    playFromContext(tracks, idx, `Artist • ${artist?.name || 'Artist'}`);
                    router.push('/nowPlaying' as any);
                  }}
                />
              );
            })
          )}
        </View>

        {/* Discography / Albums */}
        {albumItems.length > 0 && (
          <>
            <SectionHeader title="Discography" />
            <HorizontalCarousel
              data={albumItems}
              isLoading={albumsLoading}
              onPress={(item) => router.push(`/album/${item.id}` as any)}
            />
          </>
        )}

        {/* About Section */}
        {artist?.bio && (
          <View style={styles.aboutContainer}>
            <SectionHeader title="About" />
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>{artist.bio}</Text>
            </View>
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
  heroContainer: {
    height: 320,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.card,
  },
  heroContent: {
    padding: 20,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  verifiedText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  artistName: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.headlineMedium,
    color: Colors.textPrimary,
  },
  listenerCount: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Shape.buttonRadius,
  },
  followingBtn: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(30,215,96,0.1)',
  },
  followBtnText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
  },
  followingBtnText: {
    color: Colors.primary,
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
  aboutContainer: {
    marginTop: 20,
  },
  aboutCard: {
    backgroundColor: Colors.card,
    borderRadius: Shape.radiusMd,
    padding: 16,
    marginHorizontal: 16,
  },
  aboutText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
