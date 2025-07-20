/**
 * BottomSheet Component
 * 
 * Slide-up modal alternative using @gorhom/bottom-sheet
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import BottomSheetComponent, { 
  BottomSheetView, 
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetProps as GorhomBottomSheetProps 
} from '@gorhom/bottom-sheet';

import { useThemedStyles, spacing, borderRadius } from '../../theme';
import type { Theme } from '../../theme';

interface BottomSheetProps extends Omit<GorhomBottomSheetProps, 'snapPoints'> {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onClose?: () => void;
  showBackdrop?: boolean;
  enablePanDownToClose?: boolean;
}

export const BottomSheet = forwardRef<BottomSheetComponent, BottomSheetProps>(
  ({
    children,
    snapPoints = ['50%', '90%'],
    onClose,
    showBackdrop = true,
    enablePanDownToClose = true,
    ...bottomSheetProps
  }, ref) => {
    const styles = useThemedStyles(createStyles);
    
    const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

    const handleSheetChanges = useCallback((index: number) => {
      if (index === -1 && onClose) {
        onClose();
      }
      bottomSheetProps.onChange?.(index);
    }, [onClose, bottomSheetProps]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheetComponent
        ref={ref}
        snapPoints={snapPointsMemo}
        onChange={handleSheetChanges}
        backdropComponent={showBackdrop ? renderBackdrop : null}
        enablePanDownToClose={enablePanDownToClose}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        {...bottomSheetProps}
      >
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      </BottomSheetComponent>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

/**
 * Simple bottom sheet wrapper for basic usage
 */
interface SimpleBottomSheetProps {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  title?: string;
}

export function SimpleBottomSheet({
  children,
  isVisible,
  onClose,
  snapPoints = ['50%'],
  title,
}: SimpleBottomSheetProps) {
  const styles = useThemedStyles(createStyles);
  const bottomSheetRef = React.useRef<BottomSheetComponent>(null);

  React.useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onClose={onClose}
      index={-1} // Start closed
    >
      {title && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={styles.closeIcon.color} />
          </Pressable>
        </View>
      )}
      <View style={styles.body}>
        {children}
      </View>
    </BottomSheet>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    background: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: borderRadius['2xl'],
      borderTopRightRadius: borderRadius['2xl'],
      shadowColor: theme.textPrimary,
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    
    handle: {
      backgroundColor: theme.borderSecondary,
      width: 40,
      height: 4,
      borderRadius: borderRadius.full,
    },
    
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: spacing.lg,
    },
    
    titleContainer: {
      flex: 1,
    },
    
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    
    closeButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.md,
    },
    
    closeIcon: {
      color: theme.textSecondary,
    },
    
    body: {
      flex: 1,
    },
  });
}