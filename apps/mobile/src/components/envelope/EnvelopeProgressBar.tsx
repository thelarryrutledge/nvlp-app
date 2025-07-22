/**
 * Envelope Progress Bar Component
 * 
 * Displays visual progress indicators for envelope balances
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';

import type { Envelope } from '@nvlp/types';

interface EnvelopeProgressBarProps {
  envelope: Envelope;
  showLabels?: boolean;
  height?: number;
  style?: ViewStyle;
}

export const EnvelopeProgressBar: React.FC<EnvelopeProgressBarProps> = ({
  envelope,
  showLabels = true,
  height = 8,
  style,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgressData = () => {
    switch (envelope.envelope_type) {
      case 'savings': {
        if (!envelope.notify_above_amount || envelope.notify_above_amount <= 0) {
          return null;
        }
        const progress = (envelope.current_balance / envelope.notify_above_amount) * 100;
        const capped = Math.min(progress, 100);
        
        return {
          progress: capped,
          label: `${capped.toFixed(0)}% of goal`,
          sublabel: `${formatCurrency(envelope.current_balance)} / ${formatCurrency(envelope.notify_above_amount)}`,
          color: capped >= 100 ? theme.success : theme.primary,
          icon: capped >= 100 ? 'trophy' : 'trending-up',
          showOverflow: progress > 100,
          overflowAmount: progress > 100 ? envelope.current_balance - envelope.notify_above_amount : 0,
        };
      }

      case 'debt': {
        if (!envelope.debt_balance || envelope.debt_balance <= 0) {
          return null;
        }
        
        // For debt, current_balance represents money saved to pay debt (positive) or debt remaining (negative)
        // Progress bar shows debt remaining: 100% = full debt, 0% = paid off
        const totalDebt = envelope.debt_balance;
        const moneySaved = Math.max(0, envelope.current_balance); // Money saved to pay debt
        const debtRemaining = totalDebt - moneySaved;
        const remainingPercent = Math.max(0, (debtRemaining / totalDebt) * 100);
        const paidOffPercent = 100 - remainingPercent;
        
        return {
          progress: Math.max(0, Math.min(remainingPercent, 100)),
          label: `${paidOffPercent.toFixed(0)}% paid off`,
          sublabel: `${formatCurrency(debtRemaining)} remaining of ${formatCurrency(totalDebt)}`,
          color: theme.error, // Red for debt
          icon: remainingPercent <= 0 ? 'checkmark-circle' : 'trending-down',
          showOverflow: false,
        };
      }

      case 'regular':
      default: {
        // For regular envelopes, show balance vs notification thresholds
        if (envelope.notify_below_amount && envelope.current_balance < envelope.notify_below_amount) {
          // Low balance warning
          const progress = (envelope.current_balance / envelope.notify_below_amount) * 100;
          return {
            progress: Math.max(0, progress),
            label: 'Low balance',
            sublabel: `${formatCurrency(envelope.current_balance)} / ${formatCurrency(envelope.notify_below_amount)} minimum`,
            color: theme.error,
            icon: 'warning',
            showOverflow: false,
          };
        }
        
        if (envelope.notify_above_amount && envelope.current_balance > 0) {
          // Show progress towards upper limit
          const progress = (envelope.current_balance / envelope.notify_above_amount) * 100;
          const capped = Math.min(progress, 100);
          
          return {
            progress: capped,
            label: progress > 100 ? 'Over budget' : `${capped.toFixed(0)}% of budget`,
            sublabel: `${formatCurrency(envelope.current_balance)} / ${formatCurrency(envelope.notify_above_amount)}`,
            color: progress > 100 ? theme.warning : theme.primary,
            icon: progress > 100 ? 'alert-circle' : 'wallet',
            showOverflow: progress > 100,
            overflowAmount: progress > 100 ? envelope.current_balance - envelope.notify_above_amount : 0,
          };
        }
        
        // No thresholds set, just show balance
        return null;
      }
    }
  };

  const progressData = getProgressData();
  
  if (!progressData) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {showLabels && (
        <View style={styles.labelsContainer}>
          <View style={styles.labelRow}>
            <View style={styles.labelLeft}>
              <Icon name={progressData.icon} size={16} color={progressData.color} />
              <Text style={[styles.label, { color: progressData.color }]}>
                {progressData.label}
              </Text>
            </View>
            {progressData.showOverflow && progressData.overflowAmount && progressData.overflowAmount > 0 && (
              <Text style={[styles.overflowLabel, { color: progressData.color }]}>
                +{formatCurrency(progressData.overflowAmount)}
              </Text>
            )}
          </View>
          {progressData.sublabel && (
            <Text style={styles.sublabel}>{progressData.sublabel}</Text>
          )}
        </View>
      )}
      
      <View style={[styles.progressContainer, { height }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${progressData.progress}%`,
              backgroundColor: progressData.color,
            },
          ]}
        />
        {progressData.showOverflow && progressData.progress >= 100 && (
          <View style={[styles.overflowIndicator, { backgroundColor: progressData.color }]} />
        )}
      </View>
    </View>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    labelsContainer: {
      marginBottom: spacing.sm,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    labelLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    label: {
      ...typography.body,
      fontWeight: '500',
    },
    sublabel: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    overflowLabel: {
      ...typography.caption,
      fontWeight: '600',
    },
    progressContainer: {
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'visible',
      position: 'relative',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
      position: 'relative',
    },
    overflowIndicator: {
      position: 'absolute',
      right: -4,
      top: '50%',
      transform: [{ translateY: -4 }],
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.surface,
    },
  });
}

export default EnvelopeProgressBar;