/**
 * Tooltip Component
 * 
 * Simple tooltip that appears on long press for better accessibility
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const showTooltip = (event: any) => {
    if (disabled) return;
    
    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      const screenWidth = Dimensions.get('window').width;
      const tooltipWidth = 200; // Approximate tooltip width
      
      // Calculate horizontal position (center the tooltip on the button)
      let tooltipX = pageX + (width / 2) - (tooltipWidth / 2);
      
      // Ensure tooltip doesn't go off screen
      if (tooltipX < 10) {
        tooltipX = 10;
      } else if (tooltipX + tooltipWidth > screenWidth - 10) {
        tooltipX = screenWidth - tooltipWidth - 10;
      }
      
      setPosition({
        x: tooltipX,
        y: pageY - 50, // Show above the button
      });
      setVisible(true);
    });
  };

  const hideTooltip = () => {
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onLongPress={showTooltip}
        delayLongPress={500}
        activeOpacity={1}
        style={{ alignSelf: 'flex-start' }}
      >
        {children}
      </TouchableOpacity>
      {visible && (
        <Modal
          transparent
          visible={visible}
          onRequestClose={hideTooltip}
          animationType="fade"
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={hideTooltip}
          >
            <View
              style={[
                styles.tooltip,
                {
                  left: position.x,
                  top: position.y,
                },
              ]}
            >
              <Text style={styles.tooltipText}>{content}</Text>
              <View style={styles.arrow} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    tooltip: {
      position: 'absolute',
      backgroundColor: theme.textPrimary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      maxWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    tooltipText: {
      ...typography.caption,
      color: theme.background,
      textAlign: 'center',
      fontSize: 12,
    },
    arrow: {
      position: 'absolute',
      bottom: -5,
      left: '50%',
      marginLeft: -5,
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderTopWidth: 5,
      borderRightWidth: 5,
      borderBottomWidth: 0,
      borderLeftWidth: 5,
      borderTopColor: theme.textPrimary,
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
  });
}

export default Tooltip;