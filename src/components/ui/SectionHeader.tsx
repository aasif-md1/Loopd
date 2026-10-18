/**
 * SectionHeader — "Section Title" with optional "Show all" link
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface SectionHeaderProps {
  title: string;
  onShowAll?: () => void;
}

export function SectionHeader({ title, onShowAll }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onShowAll && (
        <Pressable onPress={onShowAll} hitSlop={8}>
          <Text style={styles.showAll}>Show all</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sectionHeader,
    color: Colors.textPrimary,
  },
  showAll: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
