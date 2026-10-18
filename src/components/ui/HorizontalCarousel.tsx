/**
 * Horizontal card carousel for albums, playlists, etc.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Shape } from '../../theme';
import { ScalePressable } from './ScalePressable';
import { CardSkeleton } from './Skeleton';

interface CardItem {
  id: string;
  title: string;
  subtitle?: string;
  artwork?: string;
  isCircular?: boolean;
}

interface HorizontalCarouselProps {
  data: CardItem[];
  isLoading?: boolean;
  itemSize?: number;
  circular?: boolean;
  onPress?: (item: CardItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function HorizontalCarousel({
  data,
  isLoading = false,
  itemSize = 150,
  circular = false,
  onPress,
}: HorizontalCarouselProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} size={itemSize} />
        ))}
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ScalePressable
          style={[styles.card, { width: itemSize }]}
          onPress={() => onPress?.(item)}
          haptic
        >
          <Image
            source={{ uri: item.artwork }}
            style={[
              styles.artwork,
              {
                width: itemSize,
                height: itemSize,
                borderRadius: circular ? itemSize / 2 : Shape.cardRadius,
              },
            ]}
            contentFit="cover"
            transition={300}
          />
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </ScalePressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
  },
  card: {
    marginBottom: 8,
  },
  artwork: {
    backgroundColor: Colors.card,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
