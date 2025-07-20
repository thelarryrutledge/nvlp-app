/**
 * TextInput Component
 * 
 * Reusable text input with consistent styling and theming
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useThemedStyles, spacing, borderRadius, layout, typography } from '../../theme';
import type { Theme } from '../../theme';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled';
  size?: 'medium' | 'large';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    variant = 'default',
    size = 'medium',
    containerStyle,
    inputStyle,
    labelStyle,
    ...textInputProps
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const styles = useThemedStyles(createStyles);

    const hasError = !!error;

    const containerStyles = [
      styles.container,
      containerStyle,
    ];

    const inputContainerStyles = [
      styles.inputContainer,
      styles[variant],
      styles[size],
      isFocused && styles.focused,
      hasError && styles.error,
    ];

    const textInputStyles = [
      styles.input,
      leftIcon && styles.inputWithLeftIcon,
      rightIcon && styles.inputWithRightIcon,
      inputStyle,
    ];

    const labelStyles = [
      styles.label,
      hasError && styles.labelError,
      labelStyle,
    ];

    return (
      <View style={containerStyles}>
        {label && (
          <Text style={labelStyles}>{label}</Text>
        )}
        
        <View style={inputContainerStyles}>
          {leftIcon && (
            <Icon 
              name={leftIcon} 
              size={layout.iconSize} 
              color={hasError ? styles.iconError.color : styles.icon.color}
              style={styles.leftIcon}
            />
          )}
          
          <RNTextInput
            ref={ref}
            style={textInputStyles}
            placeholderTextColor={styles.placeholder.color}
            onFocus={(e) => {
              setIsFocused(true);
              textInputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              textInputProps.onBlur?.(e);
            }}
            {...textInputProps}
          />
          
          {rightIcon && (
            <TouchableOpacity 
              onPress={onRightIconPress}
              hitSlop={layout.hitSlop}
              style={styles.rightIconContainer}
            >
              <Icon 
                name={rightIcon} 
                size={layout.iconSize} 
                color={hasError ? styles.iconError.color : styles.icon.color}
              />
            </TouchableOpacity>
          )}
        </View>
        
        {(error || hint) && (
          <Text style={hasError ? styles.errorText : styles.hintText}>
            {error || hint}
          </Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    
    label: {
      ...typography.label,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    labelError: {
      color: theme.error,
    },
    
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.xl,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      // Subtle shadow for depth
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
      elevation: 1,
      // Smooth transitions for micro-interactions
      overflow: 'hidden',
    },
    
    // Variants
    default: {
      backgroundColor: theme.surface,
    },
    filled: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 0,
      // Slightly different shadow for filled variant
      shadowOpacity: 0.02,
    },
    
    // Sizes with refined proportions
    medium: {
      height: layout.inputHeight,
      paddingHorizontal: spacing.xl,
    },
    large: {
      height: layout.inputHeight + spacing.md,
      paddingHorizontal: spacing.xl,
    },
    
    // States with enhanced visual feedback
    focused: {
      borderColor: theme.borderFocus,
      borderWidth: 2,
      // Enhanced shadow on focus
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    error: {
      borderColor: theme.error,
      borderWidth: 2,
      // Error state shadow
      shadowColor: theme.error,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    
    input: {
      flex: 1,
      ...typography.body,
      color: theme.textPrimary,
      paddingVertical: 0, // Remove default padding
      fontSize: 16, // Slightly larger for better readability
      fontWeight: '500',
    },
    inputWithLeftIcon: {
      marginLeft: spacing.sm,
    },
    inputWithRightIcon: {
      marginRight: spacing.sm,
    },
    
    placeholder: {
      color: theme.textTertiary,
    },
    
    // Icons with better styling
    icon: {
      color: theme.textSecondary,
    },
    iconError: {
      color: theme.error,
    },
    leftIcon: {
      marginRight: spacing.md,
    },
    rightIconContainer: {
      padding: spacing.sm,
      marginLeft: spacing.sm,
      borderRadius: borderRadius.md,
      // Subtle hover effect area
    },
    
    // Helper text with better typography
    errorText: {
      ...typography.caption,
      color: theme.error,
      marginTop: spacing.sm,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    hintText: {
      ...typography.caption,
      color: theme.textTertiary,
      marginTop: spacing.sm,
      letterSpacing: 0.1,
    },
  });
}