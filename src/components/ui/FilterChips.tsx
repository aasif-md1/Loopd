/**
 * Filter chips row — horizontal scrolling pill buttons
 */
import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Shape } from '../../theme';
import { ScalePressable } from './ScalePressable';

interface FilterChipsProps {
  chips: string[];
  activeChip: string;
  onSelect: (chip: string) => void;
}

export function FilterChips({ chips, activeChip, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => {
        const isActive = chip === activeChip;
        return (
          <ScalePressable
            key={chip}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(chip)}
            haptic
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {chip}
            </Text>
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    maxHeight: 48,
  },
  container: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.caption,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: '#000000',
    fontFamily: Typography.fonts.bold,
  },
});
