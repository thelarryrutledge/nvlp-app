/**
 * Card Component
 * 
 * Container component for grouping related content
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

import { useThemedStyles, spacing, borderRadius, shadows } from '../../theme';
import type { Theme } from '../../theme';

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardPadding = 'none' | 'small' | 'medium' | 'large';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  padding = 'medium',
  style,
}: CardProps) {
  const styles = useThemedStyles(createStyles);

  const cardStyle = [
    styles.base,
    styles[variant],
    styles[`${padding}Padding`],
    style,
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      borderRadius: borderRadius.xl,
      backgroundColor: theme.surface,
      overflow: 'hidden', // Ensures content respects border radius
    },
    
    // Variants
    default: {
      backgroundColor: theme.surface,
      // Subtle shadow for depth
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    outlined: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
      // Softer shadow for outlined cards
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 0.5,
    },
    elevated: {
      backgroundColor: theme.surface,
      // Financial shadow preset for elevated cards
      ...shadows.financial,
      shadowColor: theme.textPrimary,
      // Enhanced depth for elevated cards
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    
    // Padding variants with better proportions
    nonePadding: {
      padding: 0,
    },
    smallPadding: {
      padding: spacing.lg,
    },
    mediumPadding: {
      padding: spacing.xl,
    },
    largePadding: {
      padding: spacing['2xl'],
    },
  });
}