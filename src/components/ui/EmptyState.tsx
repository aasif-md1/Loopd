/**
 * Empty state component
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MusicNotes } from 'phosphor-react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'Nothing here yet',
  message = 'Find and play tracks from Search or Home.',
  icon,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon || <MusicNotes size={48} color={Colors.textMuted} weight="regular" />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    minHeight: 200,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.trackTitle,
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
