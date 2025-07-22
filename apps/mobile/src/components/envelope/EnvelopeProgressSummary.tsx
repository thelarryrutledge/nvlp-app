/**
 * Envelope Progress Summary Component
 * 
 * Displays a visual summary of multiple envelopes with progress indicators
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { Card } from '../ui';
import { EnvelopeProgressBar } from './EnvelopeProgressBar';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';

import type { Envelope } from '@nvlp/types';

interface EnvelopeProgressSummaryProps {
  envelopes: Envelope[];
  title?: string;
  onEnvelopePress?: (envelope: Envelope) => void;
  showEmptyState?: boolean;
  maxEnvelopes?: number;
}

export const EnvelopeProgressSummary: React.FC<EnvelopeProgressSummaryProps> = ({
  envelopes,
  title = 'Envelope Progress',
  onEnvelopePress,
  showEmptyState = true,
  maxEnvelopes = 5,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Filter envelopes that have progress to show
  const envelopesWithProgress = envelopes.filter(envelope => {
    switch (envelope.envelope_type) {
      case 'savings':
        return envelope.notify_above_amount && envelope.notify_above_amount > 0;
      case 'debt':
        return envelope.debt_balance && envelope.debt_balance > 0;
      case 'regular':
      default:
        return envelope.notify_below_amount || envelope.notify_above_amount;
    }
  });

  const displayEnvelopes = envelopesWithProgress.slice(0, maxEnvelopes);
  const remainingCount = envelopesWithProgress.length - displayEnvelopes.length;

  if (envelopesWithProgress.length === 0 && !showEmptyState) {
    return null;
  }

  return (
    <Card variant="elevated" padding="large" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {remainingCount > 0 && (
          <Text style={styles.moreText}>+{remainingCount} more</Text>
        )}
      </View>

      {envelopesWithProgress.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="analytics-outline" size={48} color={theme.textTertiary} />
          <Text style={styles.emptyStateText}>No envelope goals set</Text>
          <Text style={styles.emptyStateDescription}>
            Set savings goals or budget limits to track progress
          </Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {displayEnvelopes.map((envelope) => (
            <TouchableOpacity
              key={envelope.id}
              style={styles.envelopeCard}
              onPress={() => onEnvelopePress?.(envelope)}
              activeOpacity={onEnvelopePress ? 0.7 : 1}
            >
              <View style={styles.envelopeHeader}>
                <View style={[
                  styles.envelopeIcon,
                  { backgroundColor: (envelope.color || theme.primary) + '20' }
                ]}>
                  <Icon
                    name={envelope.icon || 'wallet-outline'}
                    size={20}
                    color={envelope.color || theme.primary}
                  />
                </View>
                <View style={styles.envelopeInfo}>
                  <Text style={styles.envelopeName} numberOfLines={1}>
                    {envelope.name}
                  </Text>
                  <Text style={styles.envelopeBalance}>
                    {formatCurrency(envelope.current_balance)}
                  </Text>
                </View>
              </View>
              
              <EnvelopeProgressBar
                envelope={envelope}
                showLabels={false}
                height={4}
                style={styles.progressBar}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Card>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    moreText: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    scrollContent: {
      gap: spacing.md,
    },
    envelopeCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: spacing.md,
      width: 160,
      borderWidth: 1,
      borderColor: theme.border,
    },
    envelopeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    envelopeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    envelopeInfo: {
      flex: 1,
    },
    envelopeName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500',
      marginBottom: spacing.xs,
    },
    envelopeBalance: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    progressBar: {
      marginTop: spacing.xs,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyStateText: {
      ...typography.h4,
      color: theme.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptyStateDescription: {
      ...typography.body,
      color: theme.textTertiary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  });
}

export default EnvelopeProgressSummary;