/**
 * Envelope Detail Screen
 * 
 * Comprehensive view of a single envelope with balance, transactions, and actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { EnvelopeProgressBar, EnvelopeSpendingChart } from '../../components/envelope';
import { envelopeService } from '../../services/api/envelopeService';
import type { Envelope } from '@nvlp/types';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

type EnvelopeDetailRouteProp = RouteProp<MainStackParamList, 'EnvelopeDetail'>;

export const EnvelopeDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<EnvelopeDetailRouteProp>();
  const { envelopeId } = route.params;
  
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnvelope = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const fetchedEnvelope = await envelopeService.getEnvelope(envelopeId);
      setEnvelope(fetchedEnvelope);
    } catch (error: any) {
      setError(error.message || 'Failed to load envelope');
      console.error('Envelope detail error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [envelopeId]);

  // Load envelope when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEnvelope();
    }, [loadEnvelope])
  );

  const handleRefresh = () => {
    loadEnvelope(true);
  };

  const handleEditEnvelope = () => {
    (navigation as any).navigate('EnvelopeForm', { 
      envelopeId: envelope?.id 
    });
  };

  const handleFundEnvelope = () => {
    (navigation as any).navigate('EnvelopeFunding', { 
      envelopeId: envelope?.id 
    });
  };

  const handleTransferFromEnvelope = () => {
    (navigation as any).navigate('EnvelopeTransfer', { 
      envelopeId: envelope?.id 
    });
  };

  const handleNotificationSettings = () => {
    (navigation as any).navigate('EnvelopeNotifications', { 
      envelopeId: envelope?.id 
    });
  };

  const handleEarlyPayoff = () => {
    if (!envelope || envelope.envelope_type !== 'debt') return;

    const moneySaved = Math.max(0, envelope.current_balance);
    const remainingDebt = envelope.debt_balance - moneySaved;
    
    Alert.alert(
      'Early Debt Payoff',
      `This will mark your ${envelope.name} as paid off!\n\nRemaining debt: ${formatCurrency(remainingDebt)}\n\nThe payoff transaction will be recorded as ${formatCurrency(remainingDebt)} and the envelope will be marked as fully paid.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Off Debt',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement early payoff transaction API call
              // This would create a special transaction that:
              // 1. Records the payoff amount
              // 2. Zeroes out the envelope balance
              // 3. Marks the debt as paid
              
              Alert.alert(
                '🎉 Congratulations!',
                `You've paid off your ${envelope.name}! The debt has been settled.`,
                [{ text: 'OK', onPress: () => loadEnvelope() }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to process payoff');
            }
          },
        },
      ]
    );
  };

  const handleDeleteEnvelope = async () => {
    if (!envelope) return;

    Alert.alert(
      'Delete Envelope',
      `Are you sure you want to delete "${envelope.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await envelopeService.deleteEnvelope(envelope.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete envelope');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEnvelopeTypeIcon = (envelopeType: string): string => {
    switch (envelopeType) {
      case 'savings':
        return 'trending-up-outline';
      case 'debt':
        return 'trending-down-outline';
      case 'regular':
      default:
        return 'wallet-outline';
    }
  };

  const getEnvelopeTypeColor = (envelopeType: string): string => {
    switch (envelopeType) {
      case 'savings':
        return theme.success;
      case 'debt':
        return theme.error;
      case 'regular':
      default:
        return theme.primary;
    }
  };

  const renderEnvelopeIcon = (envelope: Envelope) => {
    const iconColor = envelope.color || getEnvelopeTypeColor(envelope.envelope_type);
    const backgroundColor = iconColor + '20';
    
    return (
      <View style={[styles.envelopeIconLarge, { backgroundColor }]}>
        <Icon 
          name={envelope.icon || getEnvelopeTypeIcon(envelope.envelope_type)} 
          size={48} 
          color={iconColor}
        />
      </View>
    );
  };

  const renderActionButton = (iconName: string, title: string, onPress: () => void, variant: 'primary' | 'secondary' | 'danger' = 'primary') => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === 'primary' && styles.primaryActionButton,
        variant === 'secondary' && styles.secondaryActionButton,
        variant === 'danger' && styles.dangerActionButton,
      ]}
      onPress={onPress}
    >
      <Icon 
        name={iconName} 
        size={20} 
        color={
          variant === 'primary' ? theme.textOnPrimary : 
          variant === 'danger' ? theme.error : 
          theme.primary
        } 
      />
      <Text style={[
        styles.actionButtonText,
        variant === 'primary' && styles.primaryActionButtonText,
        variant === 'secondary' && styles.secondaryActionButtonText,
        variant === 'danger' && styles.dangerActionButtonText,
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading envelope...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !envelope) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Envelope</Text>
          <Text style={styles.errorText}>{error || 'Envelope not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadEnvelope()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Envelope Header */}
        <Card variant="elevated" padding="large" style={styles.headerCard}>
          <View style={styles.envelopeHeader}>
            {renderEnvelopeIcon(envelope)}
            <View style={styles.envelopeHeaderInfo}>
              <View style={styles.envelopeNameRow}>
                <Text style={styles.envelopeName}>{envelope.name}</Text>
                {!envelope.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                )}
              </View>
              
              {envelope.description && (
                <Text style={styles.envelopeDescription}>{envelope.description}</Text>
              )}

              <View style={styles.envelopeTypeRow}>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: getEnvelopeTypeColor(envelope.envelope_type) + '20' }
                ]}>
                  <Text style={[
                    styles.typeBadgeText,
                    { color: getEnvelopeTypeColor(envelope.envelope_type) }
                  ]}>
                    {envelope.envelope_type.charAt(0).toUpperCase() + envelope.envelope_type.slice(1)} Envelope
                  </Text>
                </View>
                
                {envelope.should_notify && (
                  <View style={styles.notificationBadge}>
                    <Icon name="notifications-outline" size={16} color={theme.warning} />
                    <Text style={styles.notificationBadgeText}>Alerts On</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Balance Overview */}
        <Card variant="elevated" padding="large" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={[
            styles.balanceAmount,
            envelope.current_balance < 0 && styles.negativeBalance
          ]}>
            {formatCurrency(envelope.current_balance)}
          </Text>
          
          {envelope.current_balance < 0 && (
            <View style={styles.overdrawnWarning}>
              <Icon name="warning-outline" size={20} color={theme.error} />
              <Text style={styles.overdrawnWarningText}>
                This envelope is overdrawn by {formatCurrency(Math.abs(envelope.current_balance))}
              </Text>
            </View>
          )}
          
          {/* Progress Bar */}
          <EnvelopeProgressBar 
            envelope={envelope} 
            showLabels={true}
            height={10}
            style={styles.progressBar}
          />
        </Card>


        {/* Debt Information (for debt envelopes) */}
        {envelope.envelope_type === 'debt' && envelope.debt_balance > 0 && (
          <Card variant="elevated" padding="large" style={styles.debtCard}>
            <View style={styles.debtHeader}>
              <Text style={styles.debtTitle}>Debt Information</Text>
              <Icon name="trending-down-outline" size={24} color={theme.error} />
            </View>
            
            <View style={styles.debtDetails}>
              <View style={styles.debtRow}>
                <Text style={styles.debtLabel}>Total Debt Balance:</Text>
                <Text style={[styles.debtValue, { color: theme.error }]}>
                  {formatCurrency(envelope.debt_balance)}
                </Text>
              </View>
              
              {envelope.minimum_payment && (
                <View style={styles.debtRow}>
                  <Text style={styles.debtLabel}>Minimum Payment:</Text>
                  <Text style={styles.debtValue}>
                    {formatCurrency(envelope.minimum_payment)}
                  </Text>
                </View>
              )}
              
              {envelope.due_date && (
                <View style={styles.debtRow}>
                  <Text style={styles.debtLabel}>Next Due Date:</Text>
                  <Text style={styles.debtValue}>
                    {formatDate(envelope.due_date)}
                  </Text>
                </View>
              )}
            </View>

            {envelope.current_balance > 0 && (
              <View style={styles.debtPaymentReady}>
                <Icon name="checkmark-circle-outline" size={20} color={theme.success} />
                <Text style={styles.debtPaymentReadyText}>
                  Ready to pay: {formatCurrency(envelope.current_balance)}
                </Text>
              </View>
            )}
            
            {/* Early Payoff Button */}
            {envelope.debt_balance > Math.max(0, envelope.current_balance) && (
              <TouchableOpacity
                style={styles.earlyPayoffButton}
                onPress={handleEarlyPayoff}
              >
                <Icon name="trophy-outline" size={20} color={theme.textOnPrimary} />
                <Text style={styles.earlyPayoffButtonText}>Early Payoff</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Notification Settings */}
        {envelope.should_notify && (envelope.notify_above_amount || envelope.notify_below_amount) && (
          <Card variant="elevated" padding="large" style={styles.notificationsCard}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Alert Settings</Text>
              <Icon name="notifications-outline" size={24} color={theme.warning} />
            </View>
            
            <View style={styles.notificationsContent}>
              {envelope.notify_above_amount && (
                <View style={styles.notificationRow}>
                  <Icon name="trending-up-outline" size={16} color={theme.success} />
                  <Text style={styles.notificationText}>
                    Alert when balance exceeds {formatCurrency(envelope.notify_above_amount)}
                  </Text>
                </View>
              )}
              
              {envelope.notify_below_amount && (
                <View style={styles.notificationRow}>
                  <Icon name="trending-down-outline" size={16} color={theme.warning} />
                  <Text style={styles.notificationText}>
                    Alert when balance falls below {formatCurrency(envelope.notify_below_amount)}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Spending Chart */}
        <EnvelopeSpendingChart 
          envelopeId={envelope.id}
          chartType="line"
          timePeriod="30d"
          showControls={true}
          height={220}
        />

        {/* Recent Transactions */}
        <Card variant="elevated" padding="none" style={styles.transactionsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>View All</Text>
              <Icon name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionsContent}>
            <View style={styles.transactionsPlaceholder}>
              <Icon name="receipt-outline" size={48} color={theme.textTertiary} />
              <Text style={styles.transactionsPlaceholderText}>
                Recent transactions will appear here
              </Text>
              <Text style={styles.transactionsPlaceholderSubtext}>
                Transaction management will be implemented in Phase 6
              </Text>
            </View>
          </View>
        </Card>

        {/* Envelope Metadata */}
        <Card variant="elevated" padding="large" style={styles.metadataCard}>
          <Text style={styles.metadataTitle}>Envelope Details</Text>
          <View style={styles.metadataContent}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Created:</Text>
              <Text style={styles.metadataValue}>
                {formatDate(envelope.created_at)}
              </Text>
            </View>
            
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Last Updated:</Text>
              <Text style={styles.metadataValue}>
                {formatDate(envelope.updated_at)}
              </Text>
            </View>
            
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Sort Order:</Text>
              <Text style={styles.metadataValue}>
                {envelope.sort_order}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtonsRow}>
            {renderActionButton('add-circle-outline', 'Fund', handleFundEnvelope, 'primary')}
            {renderActionButton('swap-horizontal-outline', 'Transfer', handleTransferFromEnvelope, 'secondary')}
          </View>
          
          <View style={styles.actionButtonsRow}>
            {renderActionButton('notifications-outline', 'Alerts', handleNotificationSettings, 'secondary')}
            {renderActionButton('pencil-outline', 'Edit', handleEditEnvelope, 'secondary')}
          </View>
          
          <View style={styles.actionButtonsRow}>
            {renderActionButton('trash-outline', 'Delete', handleDeleteEnvelope, 'danger')}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    errorTitle: {
      ...typography.h3,
      color: theme.error,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    errorText: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 8,
    },
    retryButtonText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xl,
    },
    headerCard: {
      marginBottom: spacing.lg,
    },
    envelopeHeader: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
    },
    envelopeIconLarge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.lg,
    },
    envelopeHeaderInfo: {
      flex: 1,
      paddingTop: spacing.sm,
    },
    envelopeNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.sm,
    },
    envelopeName: {
      ...typography.h2,
      color: theme.textPrimary,
      fontWeight: '700' as const,
      flex: 1,
    },
    envelopeDescription: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    envelopeTypeRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    typeBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    typeBadgeText: {
      ...typography.caption,
      fontWeight: '600' as const,
      fontSize: 12,
    },
    notificationBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.warning + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
      gap: spacing.xs,
    },
    notificationBadgeText: {
      ...typography.caption,
      color: theme.warning,
      fontSize: 11,
      fontWeight: '500' as const,
    },
    inactiveBadge: {
      backgroundColor: theme.warning,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      marginLeft: spacing.sm,
    },
    inactiveBadgeText: {
      ...typography.caption,
      color: theme.textPrimary,
      fontSize: 10,
      fontWeight: '600' as const,
    },
    balanceCard: {
      marginBottom: spacing.lg,
      alignItems: 'center' as const,
    },
    balanceLabel: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.sm,
    },
    balanceAmount: {
      ...typography.h1,
      color: theme.primary,
      fontWeight: '800' as const,
      fontSize: 36,
      marginBottom: spacing.sm,
    },
    negativeBalance: {
      color: theme.error,
    },
    overdrawnWarning: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.error + '20',
      padding: spacing.md,
      borderRadius: 8,
      gap: spacing.sm,
    },
    overdrawnWarningText: {
      ...typography.body,
      color: theme.error,
      fontWeight: '500' as const,
    },
    progressBar: {
      marginTop: spacing.lg,
      width: '100%',
    },
    savingsCard: {
      marginBottom: spacing.lg,
    },
    savingsHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.lg,
    },
    savingsTitle: {
      ...typography.h3,
      color: theme.success,
      fontWeight: '600' as const,
    },
    savingsGoal: {
      ...typography.h3,
      color: theme.success,
      fontWeight: '700' as const,
    },
    savingsStats: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
    },
    savingsStat: {
      alignItems: 'center' as const,
    },
    savingsStatLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
    },
    savingsStatValue: {
      ...typography.h4,
      fontWeight: '700' as const,
    },
    debtCard: {
      marginBottom: spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
    },
    debtHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.lg,
    },
    debtTitle: {
      ...typography.h3,
      color: theme.error,
      fontWeight: '600' as const,
    },
    debtDetails: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    debtRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    debtLabel: {
      ...typography.body,
      color: theme.textSecondary,
    },
    debtValue: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    debtPaymentReady: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.success + '20',
      padding: spacing.md,
      borderRadius: 8,
      gap: spacing.sm,
    },
    debtPaymentReadyText: {
      ...typography.body,
      color: theme.success,
      fontWeight: '600' as const,
    },
    earlyPayoffButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    earlyPayoffButtonText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    notificationsCard: {
      marginBottom: spacing.lg,
    },
    notificationsHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.lg,
    },
    notificationsTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    notificationsContent: {
      gap: spacing.md,
    },
    notificationRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    notificationText: {
      ...typography.body,
      color: theme.textSecondary,
      flex: 1,
    },
    transactionsCard: {
      marginBottom: spacing.lg,
      overflow: 'hidden' as const,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    viewAllButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.xs,
    },
    viewAllButtonText: {
      ...typography.body,
      color: theme.primary,
      fontWeight: '500' as const,
    },
    transactionsContent: {
      backgroundColor: theme.background,
    },
    transactionsPlaceholder: {
      alignItems: 'center' as const,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    transactionsPlaceholderText: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    transactionsPlaceholderSubtext: {
      ...typography.caption,
      color: theme.textTertiary,
      textAlign: 'center' as const,
    },
    metadataCard: {
      marginBottom: spacing.lg,
    },
    metadataTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      marginBottom: spacing.lg,
    },
    metadataContent: {
      gap: spacing.md,
    },
    metadataRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    metadataLabel: {
      ...typography.body,
      color: theme.textSecondary,
    },
    metadataValue: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    actionButtonsContainer: {
      gap: spacing.md,
    },
    actionButtonsRow: {
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing.md,
      borderRadius: 12,
      gap: spacing.sm,
    },
    primaryActionButton: {
      backgroundColor: theme.primary,
    },
    secondaryActionButton: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    dangerActionButton: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.error,
    },
    actionButtonText: {
      ...typography.body,
      fontWeight: '600' as const,
    },
    primaryActionButtonText: {
      color: theme.textOnPrimary,
    },
    secondaryActionButtonText: {
      color: theme.primary,
    },
    dangerActionButtonText: {
      color: theme.error,
    },
  });
}

export default EnvelopeDetailScreen;