/**
 * Home Screen — Loopd V2
 * Dark Glass aesthetic, Jump back in card, Mood row, Daily Mix 1-3,
 * "Because you like [Artist]", and time-based greeting.
 * Fully compliant with Sections 3 & 7 of LOOPD_V2.md
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  StatusBar,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ClockCounterClockwise, GearSix, Play, ArrowRight, SquaresFour } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Shape, Layout, Glass } from '../../theme';
import {
  SectionHeader,
  HorizontalCarousel,
  FilterChips,
  ScalePressable,
  QuickAccessSkeleton,
} from '../ui';
import {
  useTrending,
  useCharts,
  useNewReleases,
  usePopularArtists,
  useGenres,
} from '../../hooks';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import {
  OnboardingModal,
  ONBOARDING_COMPLETED_KEY,
  USER_ARTISTS_KEY,
  CURATED_ARTISTS_V2,
} from '../onboarding/OnboardingModal';
import { MusicService } from '../../api/musicService';
import type { Track } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_WIDTH = (SCREEN_WIDTH - 48) / 2;

const MOODS = [
  { id: 'chill', label: 'Chill', color: '#11998E' },
  { id: 'focus', label: 'Focus', color: '#2C3E50' },
  { id: 'workout', label: 'Workout', color: '#E74C3C' },
  { id: 'party', label: 'Party', color: '#8E44AD' },
  { id: 'romantic', label: 'Romantic', color: '#E8115B' },
  { id: 'sad', label: 'Sad', color: '#2980B9' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const tileWidth = isDesktop ? (Math.min(width, 1200) - 72) / 3 : (width - 48) / 2;

  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userPickedArtist, setUserPickedArtist] = useState<string | null>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY).then((val) => {
      if (!val) {
        setShowOnboarding(true);
      }
    });

    AsyncStorage.getItem(USER_ARTISTS_KEY).then(async (val) => {
      if (val) {
        try {
          const ids: string[] = JSON.parse(val);
          if (ids.length > 0) {
            const firstId = ids[0];
            const match = CURATED_ARTISTS_V2.find((a) => a.id === firstId);
            const name = match ? match.name : 'Arijit Singh';
            setUserPickedArtist(name);
            const res = await MusicService.search(name, 10);
            if (res.tracks.length > 0) {
              setArtistTracks(res.tracks);
            }
          }
        } catch (_) {}
      }
    });
  }, []);

  const { playFromContext, currentTrack } = usePlayerStore();
  const { recentlyPlayed, userName } = useLibraryStore();

  const trending = useTrending(20);
  const charts = useCharts(20);
  const newReleases = useNewReleases(20);
  const popularArtists = usePopularArtists(20);
  const genres = useGenres();

  const greeting = useMemo(() => {
    const base = getGreeting();
    if (userName && userName.trim() && userName !== 'Guest Listener') {
      const firstName = userName.trim().split(/\s+/)[0];
      return `${base}, ${firstName}`;
    }
    return base;
  }, [userName]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      trending.refetch(),
      charts.refetch(),
      newReleases.refetch(),
      popularArtists.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  const handleTrackPress = useCallback(
    (track: Track, queue?: Track[]) => {
      const list = queue && queue.length > 0 ? queue : [track];
      const idx = list.findIndex((t) => t.id === track.id);
      playFromContext(list, idx >= 0 ? idx : 0, 'Home');
    },
    [playFromContext]
  );

  // Jump back in track (last played or trending top)
  const jumpBackTrack = useMemo(() => {
    if (recentlyPlayed.length > 0) return recentlyPlayed[0];
    if (trending.data && trending.data.length > 0) return trending.data[0];
    return null;
  }, [recentlyPlayed, trending.data]);

  // Quick access tiles
  const quickTiles = useMemo(() => {
    const tiles: Track[] = [];
    if (recentlyPlayed.length > 0) {
      tiles.push(...recentlyPlayed.slice(0, 6));
    }
    if (tiles.length < 6 && trending.data) {
      const needed = 6 - tiles.length;
      const existing = new Set(tiles.map((t) => t.id));
      const more = trending.data.filter((t) => !existing.has(t.id)).slice(0, needed);
      tiles.push(...more);
    }
    return tiles;
  }, [recentlyPlayed, trending.data]);

  // Carousels
  const trendingItems = useMemo(
    () =>
      (trending.data || []).map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.artist,
        artwork: t.artwork,
      })),
    [trending.data]
  );

  const chartItems = useMemo(
    () =>
      (charts.data || []).map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.artist,
        artwork: t.artwork,
      })),
    [charts.data]
  );

  const newReleaseItems = useMemo(
    () =>
      (newReleases.data || []).map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: a.artist,
        artwork: a.artwork,
      })),
    [newReleases.data]
  );

  const artistItems = useMemo(
    () =>
      (popularArtists.data || []).map((a) => ({
        id: a.id,
        title: a.name,
        artwork: a.image,
        isCircular: true,
      })),
    [popularArtists.data]
  );

  const pickedArtistItems = useMemo(
    () =>
      artistTracks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.artist,
        artwork: t.artwork,
      })),
    [artistTracks]
  );

  // Daily Mix cards per Section 7
  const dailyMixes = useMemo(() => {
    const list = trending.data || [];
    return [
      {
        id: 'mix-1',
        title: 'Daily Mix 1',
        subtitle: 'Arijit, Diljit, Pritam and more',
        gradient: ['#1B4F72', '#117A65'] as [string, string],
        tracks: list.slice(0, 8),
      },
      {
        id: 'mix-2',
        title: 'Daily Mix 2',
        subtitle: 'AP Dhillon, Karan Aujla, Badshah',
        gradient: ['#6C3483', '#B03A2E'] as [string, string],
        tracks: list.slice(4, 12),
      },
      {
        id: 'mix-3',
        title: 'Daily Mix 3',
        subtitle: 'Chill, Lo-Fi & Romantic Vibes',
        gradient: ['#1E8449', '#1C2833'] as [string, string],
        tracks: list.slice(8, 16),
      },
    ];
  }, [trending.data]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 24 },
          { paddingBottom: isDesktop ? 120 : Layout.tabBarHeight + Layout.miniPlayerHeight + 30 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Top Profile & Header Actions */}
        <View style={styles.topProfileRow}>
          <Pressable
            style={styles.profileBadge}
            onPress={() => router.push('/settings' as any)}
            hitSlop={8}
          >
            <Image
              source={require('@/assets/images/logo-transparent.png')}
              style={styles.profileAvatar}
              contentFit="contain"
            />
            {userName && userName.trim() && userName !== 'Guest Listener' ? (
              <Text style={styles.profileName} numberOfLines={1}>
                {userName}
              </Text>
            ) : (
              <Text style={styles.profileName}>Loopd</Text>
            )}
          </Pressable>

          <View style={styles.headerIcons}>
            <ScalePressable style={styles.headerBtn} onPress={() => {}} hitSlop={8}>
              <Bell size={22} color={Colors.textPrimary} weight="regular" />
            </ScalePressable>
            <ScalePressable
              style={styles.headerBtn}
              onPress={() => router.push('/library')}
              hitSlop={8}
            >
              <ClockCounterClockwise size={22} color={Colors.textPrimary} weight="regular" />
            </ScalePressable>
            <ScalePressable
              style={styles.headerBtn}
              onPress={() => router.push('/settings' as any)}
              hitSlop={8}
            >
              <GearSix size={22} color={Colors.textPrimary} weight="regular" />
            </ScalePressable>
          </View>
        </View>

        {/* Big Greeting Headline */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
        </View>

        {/* Filter Chips */}
        <FilterChips
          chips={['All', 'Music']}
          activeChip={filter}
          onSelect={setFilter}
        />

        {/* JUMP BACK IN CARD (Section 7) */}
        {jumpBackTrack && (
          <ScalePressable
            style={styles.jumpBackCard}
            onPress={() => handleTrackPress(jumpBackTrack)}
            haptic
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.jumpBackGradient}
            >
              <Image
                source={{ uri: jumpBackTrack.artwork }}
                style={styles.jumpBackArt}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.jumpBackInfo}>
                <Text style={styles.jumpBackTag}>JUMP BACK IN</Text>
                <Text style={styles.jumpBackTitle} numberOfLines={1}>
                  {jumpBackTrack.title}
                </Text>
                <Text style={styles.jumpBackSubtitle} numberOfLines={1}>
                  {jumpBackTrack.artist}
                </Text>
              </View>
              <View style={styles.jumpBackPlayBtn}>
                <Play size={18} color="#000000" weight="fill" />
              </View>
            </LinearGradient>
          </ScalePressable>
        )}

        {/* MOOD ROW (Section 7) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodRow}
        >
          {MOODS.map((mood) => (
            <ScalePressable
              key={mood.id}
              style={[styles.moodChip, { borderColor: `${mood.color}40` }]}
              onPress={async () => {
                const res = await MusicService.search(mood.label, 15);
                if (res.tracks.length > 0) {
                  handleTrackPress(res.tracks[0], res.tracks);
                }
              }}
              haptic
            >
              <View style={[styles.moodDot, { backgroundColor: mood.color }]} />
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </ScalePressable>
          ))}
        </ScrollView>

        {/* 2-Column Quick Access Grid */}
        <View style={styles.quickGrid}>
          {quickTiles.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <QuickAccessSkeleton key={i} />
              ))
            : quickTiles.map((track) => (
                <ScalePressable
                  key={track.id}
                  style={[styles.quickTile, { width: tileWidth }]}
                  onPress={() => handleTrackPress(track, quickTiles)}
                  haptic
                >
                  <Image
                    source={{ uri: track.artwork }}
                    style={styles.quickArt}
                    contentFit="cover"
                    transition={200}
                  />
                  <Text style={styles.quickTitle} numberOfLines={2}>
                    {track.title}
                  </Text>
                </ScalePressable>
              ))}
        </View>

        {/* Dynamic Section: "Because you picked [Artist]" (Section 5.4 & 7) */}
        {userPickedArtist && pickedArtistItems.length > 0 && (
          <>
            <SectionHeader title={`Because you like ${userPickedArtist}`} />
            <HorizontalCarousel
              data={pickedArtistItems}
              isLoading={false}
              onPress={(item) => {
                const track = artistTracks.find((t) => t.id === item.id);
                if (track) handleTrackPress(track, artistTracks);
              }}
            />
          </>
        )}

        {/* DAILY MIX 1, 2, 3 CARDS (Section 7) */}
        <SectionHeader title="Your Daily Mixes" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dailyMixRow}
        >
          {dailyMixes.map((mix) => (
            <ScalePressable
              key={mix.id}
              style={styles.dailyMixCard}
              onPress={() => {
                if (mix.tracks.length > 0) {
                  handleTrackPress(mix.tracks[0], mix.tracks);
                }
              }}
              haptic
            >
              <LinearGradient
                colors={mix.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dailyMixGradient}
              >
                <View style={styles.collageGrid}>
                  {mix.tracks.slice(0, 4).map((t, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: t.artwork }}
                      style={styles.collageArt}
                      contentFit="cover"
                    />
                  ))}
                </View>
                <Text style={styles.dailyMixTitle}>{mix.title}</Text>
                <Text style={styles.dailyMixSub} numberOfLines={2}>
                  {mix.subtitle}
                </Text>
              </LinearGradient>
            </ScalePressable>
          ))}
        </ScrollView>

        {/* Trending Now */}
        <SectionHeader title="Trending Now" />
        <HorizontalCarousel
          data={trendingItems}
          isLoading={trending.isLoading}
          onPress={(item) => {
            const track = trending.data?.find((t) => t.id === item.id);
            if (track) handleTrackPress(track, trending.data);
          }}
        />

        {/* Charts */}
        <SectionHeader title="Charts" />
        <HorizontalCarousel
          data={chartItems}
          isLoading={charts.isLoading}
          onPress={(item) => {
            const track = charts.data?.find((t) => t.id === item.id);
            if (track) handleTrackPress(track, charts.data);
          }}
        />

        {/* Popular Artists */}
        <SectionHeader title="Popular Artists" />
        <HorizontalCarousel
          data={artistItems}
          isLoading={popularArtists.isLoading}
          circular
          itemSize={120}
          onPress={(item) => {
            router.push(`/artist/${item.id}` as any);
          }}
        />

        {/* New Releases */}
        <SectionHeader title="New Releases" />
        <HorizontalCarousel
          data={newReleaseItems}
          isLoading={newReleases.isLoading}
          onPress={(item) => {
            router.push(`/album/${item.id}` as any);
          }}
        />
      </ScrollView>

      {/* Onboarding Preferences Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          onRefresh();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  topProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 6,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    maxWidth: '65%',
  },
  profileAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  profileName: {
    fontFamily: Typography.fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  greetingRow: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 4,
  },
  greetingText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  headerBtn: {
    padding: 4,
  },

  /* Jump Back In Card */
  jumpBackCard: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  jumpBackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  jumpBackArt: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#202020',
  },
  jumpBackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  jumpBackTag: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  jumpBackTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  jumpBackSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  jumpBackPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Mood Row */
  moodRow: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 10,
    paddingVertical: 10,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodLabel: {
    fontFamily: Typography.fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Quick Access 2-Column Grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  quickTile: {
    width: TILE_WIDTH,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Shape.radiusSm,
    overflow: 'hidden',
  },
  quickArt: {
    width: 56,
    height: 56,
    backgroundColor: Colors.card,
  },
  quickTitle: {
    flex: 1,
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    lineHeight: 16,
  },

  /* Daily Mix Cards */
  dailyMixRow: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 14,
    paddingBottom: 8,
  },
  dailyMixCard: {
    width: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dailyMixGradient: {
    padding: 12,
  },
  collageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 136,
    height: 136,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  collageArt: {
    width: 68,
    height: 68,
  },
  dailyMixTitle: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  dailyMixSub: {
    fontFamily: Typography.fonts.regular,
    fontSize: 11,
    color: '#CCCCCC',
    marginTop: 4,
    lineHeight: 15,
  },
});
