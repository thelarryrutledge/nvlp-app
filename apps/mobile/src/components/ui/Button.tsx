/**
 * Button Component
 * 
 * Reusable button with consistent styling and theming
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { useThemedStyles, useTheme, spacing, borderRadius, layout, typography } from '../../theme';
import type { Theme } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme(); // Get access to theme for gradients

  const isDisabled = disabled || loading;

  const baseButtonStyle = [
    styles.base,
    styles[size],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ];

  const ButtonContent = () => (
    <>
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? theme.textOnPrimary : theme.textPrimary} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon 
              name={icon} 
              size={size === 'small' ? 16 : 20} 
              color={
                variant === 'primary' ? theme.textOnPrimary :
                variant === 'secondary' ? theme.textPrimary :
                variant === 'outline' || variant === 'ghost' ? theme.primary :
                variant === 'destructive' ? theme.textOnPrimary :
                theme.textPrimary
              }
              style={styles.iconLeft}
            />
          )}
          <Text style={textStyleCombined}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon 
              name={icon} 
              size={size === 'small' ? 16 : 20} 
              color={
                variant === 'primary' ? theme.textOnPrimary :
                variant === 'secondary' ? theme.textPrimary :
                variant === 'outline' || variant === 'ghost' ? theme.primary :
                variant === 'destructive' ? theme.textOnPrimary :
                theme.textPrimary
              }
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </>
  );

  if (variant === 'primary' && !isDisabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        hitSlop={layout.hitSlop}
        style={[baseButtonStyle, { backgroundColor: 'transparent' }]}
      >
        <LinearGradient
          colors={[...theme.primaryGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: borderRadius.lg }
          ]}
        />
        <ButtonContent />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[baseButtonStyle, styles[variant]]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      hitSlop={layout.hitSlop}
    >
      <ButtonContent />
    </TouchableOpacity>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: 0,
      borderColor: 'transparent',
      // Subtle depth for all buttons
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    
    // Gradient container for primary buttons
    gradientContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      // Enhanced shadow for primary buttons
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    
    // Variants
    primary: {
      backgroundColor: theme.primary,
      // Backup for non-gradient fallback
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    secondary: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderSecondary,
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    ghost: {
      backgroundColor: 'transparent',
      shadowOpacity: 0, // No shadow for ghost buttons
      elevation: 0,
    },
    destructive: {
      backgroundColor: theme.error,
      shadowColor: theme.error,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    
    // Sizes with refined proportions
    small: {
      height: layout.buttonHeightSmall,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
    },
    medium: {
      height: layout.buttonHeight,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.lg,
    },
    large: {
      height: layout.buttonHeight + spacing.sm,
      paddingHorizontal: spacing['2xl'],
      borderRadius: borderRadius.xl,
    },
    
    // States
    disabled: {
      backgroundColor: theme.interactiveDisabled,
      borderColor: theme.interactiveDisabled,
      shadowOpacity: 0,
      elevation: 0,
    },
    fullWidth: {
      width: '100%',
    },
    
    // Text styles with improved typography
    text: {
      ...typography.button,
      color: theme.textOnPrimary,
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    primaryText: {
      color: theme.textOnPrimary,
      fontWeight: '600',
    },
    secondaryText: {
      color: theme.textPrimary,
      fontWeight: '600',
    },
    outlineText: {
      color: theme.primary,
      fontWeight: '600',
    },
    ghostText: {
      color: theme.primary,
      fontWeight: '500',
    },
    destructiveText: {
      color: theme.textOnPrimary,
      fontWeight: '600',
    },
    disabledText: {
      color: theme.textDisabled,
      fontWeight: '500',
    },
    
    // Size text with better scaling
    smallText: {
      ...typography.buttonSmall,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    mediumText: {
      ...typography.button,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    largeText: {
      ...typography.button,
      fontSize: typography.button.fontSize + 1,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    
    // Icons with better spacing
    iconLeft: {
      marginRight: spacing.sm,
    },
    iconRight: {
      marginLeft: spacing.sm,
    },
  });
}