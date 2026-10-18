/**
 * ArtistAvatar — Loopd V2
 * Multi-layer fallback chain per Section 5.3:
 * 1. Provider Image
 * 2. Secondary/album art fallback
 * 3. Hash-derived gradient circle with artist initials
 * Never renders a blank gray circle.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../../theme';

interface ArtistAvatarProps {
  name: string;
  image?: string;
  fallbackImage?: string;
  size: number;
  isSelected?: boolean;
}

const GRADIENT_PALETTES = [
  ['#833AB4', '#FD1D1D'],
  ['#2193B0', '#6DD5ED'],
  ['#CC2B5E', '#753A88'],
  ['#EE9CA7', '#FFDDE1'],
  ['#42275A', '#734B6D'],
  ['#11998E', '#38EF7D'],
  ['#FC4A1A', '#F7B733'],
  ['#1D2B64', '#F8CDDA'],
  ['#000428', '#004E92'],
  ['#E55D87', '#5FC3E4'],
];

function getHashPalette(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index] as [string, string];
}

function getInitials(name: string): string {
  if (!name) return 'L';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ArtistAvatar({
  name,
  image,
  fallbackImage,
  size,
  isSelected = false,
}: ArtistAvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const initials = useMemo(() => getInitials(name), [name]);
  const palette = useMemo(() => getHashPalette(name), [name]);

  const activeImageUri = useMemo(() => {
    if (!loadFailed && image) return image;
    if (!fallbackFailed && fallbackImage) return fallbackImage;
    return null;
  }, [image, fallbackImage, loadFailed, fallbackFailed]);

  const renderContent = () => {
    if (activeImageUri) {
      return (
        <Image
          source={{ uri: activeImageUri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={200}
          onError={() => {
            if (!loadFailed && image) {
              setLoadFailed(true);
            } else {
              setFallbackFailed(true);
            }
          }}
        />
      );
    }

    // Generated initials gradient avatar (Level 3 fallback)
    return (
      <LinearGradient
        colors={palette}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={[styles.initials, { fontSize: Math.floor(size * 0.38) }]}>
          {initials}
        </Text>
      </LinearGradient>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: '#1E1E1E',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Typography.fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
