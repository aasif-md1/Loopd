import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  House,
  MagnifyingGlass,
  Books,
  Heart,
  GearSix,
  MusicNotes,
  Waveform,
  SquaresFour,
} from 'phosphor-react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing } from '../../theme';
import { useLibraryStore } from '../../store/libraryStore';

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { likedTracks, playlists } = useLibraryStore();
  const likedCount = (likedTracks || []).length;
  const playlistList = playlists || [];

  const isHome = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  const isSearch = pathname === '/search' || pathname === '/(tabs)/search';
  const isLibrary = pathname === '/library' || pathname === '/(tabs)/library';
  const isLiked = pathname === '/likedSongs';
  const isSettings = pathname === '/settings';

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandRow}>
        <Image
          source={require('../../../assets/images/loopd-icon.png')}
          style={styles.brandLogo}
          contentFit="contain"
        />
        <View>
          <Text style={styles.brandTitle}>Loopd</Text>
          <Text style={styles.brandSubtitle}>Music for Desktop</Text>
        </View>
      </View>

      {/* Primary Navigation */}
      <View style={styles.navSection}>
        <Pressable
          style={[styles.navItem, isHome && styles.navItemActive]}
          onPress={() => router.push('/(tabs)' as any)}
        >
          <House
            size={22}
            color={isHome ? '#1ED760' : Colors.textSecondary}
            weight={isHome ? 'fill' : 'bold'}
          />
          <Text style={[styles.navText, isHome && styles.navTextActive]}>Home</Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, isSearch && styles.navItemActive]}
          onPress={() => router.push('/(tabs)/search' as any)}
        >
          <MagnifyingGlass
            size={22}
            color={isSearch ? '#1ED760' : Colors.textSecondary}
            weight={isSearch ? 'bold' : 'regular'}
          />
          <Text style={[styles.navText, isSearch && styles.navTextActive]}>Search</Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, isLibrary && styles.navItemActive]}
          onPress={() => router.push('/(tabs)/library' as any)}
        >
          <Books
            size={22}
            color={isLibrary ? '#1ED760' : Colors.textSecondary}
            weight={isLibrary ? 'fill' : 'bold'}
          />
          <Text style={[styles.navText, isLibrary && styles.navTextActive]}>Your Library</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Secondary Navigation / Shortcuts */}
      <View style={styles.navSection}>
        <Pressable
          style={[styles.navItem, isLiked && styles.navItemActive]}
          onPress={() => router.push('/likedSongs' as any)}
        >
          <View style={styles.likedIconBox}>
            <Heart size={14} color="#FFFFFF" weight="fill" />
          </View>
          <Text style={[styles.navText, isLiked && styles.navTextActive]}>Liked Songs</Text>
          {likedCount > 0 && (
            <Text style={styles.badgeCount}>{likedCount}</Text>
          )}
        </Pressable>



        <Pressable
          style={[styles.navItem, isSettings && styles.navItemActive]}
          onPress={() => router.push('/settings' as any)}
        >
          <GearSix
            size={22}
            color={isSettings ? '#1ED760' : Colors.textSecondary}
            weight={isSettings ? 'fill' : 'bold'}
          />
          <Text style={[styles.navText, isSettings && styles.navTextActive]}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Playlists Quick List */}
      <View style={styles.playlistSectionHeader}>
        <Text style={styles.playlistSectionTitle}>PLAYLISTS</Text>
      </View>

      <ScrollView style={styles.playlistScroll} showsVerticalScrollIndicator={false}>
        {playlistList.map((pl) => (
          <Pressable
            key={pl.id}
            style={styles.playlistItem}
            onPress={() => router.push(`/playlist/${pl.id}` as any)}
          >
            <MusicNotes size={16} color={Colors.textMuted} weight="regular" />
            <Text style={styles.playlistItemText} numberOfLines={1}>
              {pl.title || 'Untitled Playlist'}
            </Text>
          </Pressable>
        ))}
        {playlistList.length === 0 && (
          <Text style={styles.noPlaylistsText}>Create playlists in Your Library</Text>
        )}
      </ScrollView>

      {/* Pro / Quality Badge */}
      <View style={styles.footerBox}>
        <Waveform size={16} color="#1ED760" weight="bold" />
        <Text style={styles.footerText}>Hi-Res 320kbps Audio</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#0c0d10',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 24,
    paddingHorizontal: 16,
    flexDirection: 'column',
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brandTitle: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  navSection: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  navText: {
    fontFamily: Typography.fonts.bold,
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  navTextActive: {
    color: '#FFFFFF',
  },
  likedIconBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'linear-gradient(135deg, #450af5, #c4efd9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
    marginHorizontal: 8,
  },
  playlistSectionHeader: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  playlistSectionTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  playlistScroll: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  playlistItemText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  noPlaylistsText: {
    fontFamily: Typography.fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  footerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 11,
    color: '#1ED760',
  },
});
