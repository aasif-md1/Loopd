/**
 * Genre Screen — Loopd
 * Shows tracks and playlists matching the chosen genre/mood.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Play } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shape, Layout } from '@/src/theme';
import { useGenreTracks } from '@/src/hooks';
import { usePlayerStore } from '@/src/store/playerStore';
import { ScalePressable } from '@/src/components/ui/ScalePressable';
import { TrackItem } from '@/src/components/ui/TrackItem';
import type { Track } from '@/src/types';

export default function GenreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const genreName = typeof id === 'string' ? id.charAt(0).toUpperCase() + id.slice(1) : 'Genre';
  const { data: tracks, isLoading } = useGenreTracks(id as string, 30);
  const { playFromContext, currentTrack, isPlaying } = usePlayerStore();

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playFromContext(tracks, 0, `Genre • ${genreName}`);
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
          colors={['#8C67AC', '#2C1B3D', Colors.background]}
          style={[styles.headerGradient, { paddingTop: insets.top + 48 }]}
        >
          <Text style={styles.genreTitle}>{genreName}</Text>
          <Text style={styles.genreSubtitle}>The best of {genreName} on Loopd</Text>
        </LinearGradient>

        <View style={styles.actionRow}>
          <Text style={styles.trackCount}>{tracks?.length || 0} tracks</Text>
          <ScalePressable
            style={styles.playBtn}
            onPress={handlePlayAll}
            haptic
          >
            <Play size={24} color="#000000" weight="fill" style={{ marginLeft: 3 }} />
          </ScalePressable>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.tracksList}>
            {tracks?.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <TrackItem
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx + 1}
                  isPlaying={isCurrent && isPlaying}
                  onPress={() => playFromContext(tracks, idx, `Genre • ${genreName}`)}
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
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  genreTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.headlineLarge,
    color: Colors.textPrimary,
  },
  genreSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  trackCount: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tracksList: {
    paddingHorizontal: 16,
  },
});
