/**
 * Envelope List Screen
 * 
 * Displays and manages envelopes with their balances for the selected budget
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { useBudget } from '../../context';
import { envelopeService } from '../../services/api/envelopeService';
import type { Envelope } from '@nvlp/types';

export const EnvelopeListScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { selectedBudget, isLoading: budgetLoading } = useBudget();
  
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnvelopes = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedBudget) {
      setEnvelopes([]);
      setIsLoading(false);
      return;
    }

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const fetchedEnvelopes = await envelopeService.getEnvelopes(selectedBudget.id);
      setEnvelopes(fetchedEnvelopes);
    } catch (error: any) {
      setError(error.message || 'Failed to load envelopes');
      console.error('Envelopes error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBudget]);

  // Load envelopes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEnvelopes();
    }, [loadEnvelopes])
  );

  // Reload when selected budget changes
  useEffect(() => {
    loadEnvelopes();
  }, [loadEnvelopes]);

  const handleRefresh = () => {
    loadEnvelopes(true);
  };

  const handleAddEnvelope = () => {
    (navigation as any).navigate('EnvelopeForm');
  };

  const handleEditEnvelope = (envelope: Envelope) => {
    (navigation as any).navigate('EnvelopeForm', { 
      envelopeId: envelope.id 
    });
  };

  const handleViewEnvelope = (envelope: Envelope) => {
    (navigation as any).navigate('EnvelopeDetail', { 
      envelopeId: envelope.id 
    });
  };

  const handleFundEnvelope = (envelope: Envelope) => {
    (navigation as any).navigate('EnvelopeFunding', { 
      envelopeId: envelope.id 
    });
  };

  const handleTransferEnvelope = (envelope: Envelope) => {
    (navigation as any).navigate('EnvelopeTransfer', { 
      envelopeId: envelope.id 
    });
  };

  const handleDeleteEnvelope = async (envelope: Envelope) => {
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
              await loadEnvelopes();
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
    const backgroundColor = iconColor + '20'; // Add transparency
    
    return (
      <View style={[styles.envelopeIcon, { backgroundColor }]}>
        <Icon 
          name={envelope.icon || getEnvelopeTypeIcon(envelope.envelope_type)} 
          size={24} 
          color={iconColor}
        />
      </View>
    );
  };

  const renderEnvelope = (envelope: Envelope) => (
    <Card
      key={envelope.id}
      variant="elevated"
      padding="large"
      style={[
        styles.envelopeCard,
        !envelope.is_active && styles.inactiveEnvelopeCard
      ]}
    >
      <TouchableOpacity
        style={styles.envelopeContent}
        onPress={() => handleViewEnvelope(envelope)}
        activeOpacity={0.7}
      >
        <View style={styles.envelopeHeader}>
          {renderEnvelopeIcon(envelope)}
          <View style={styles.envelopeInfo}>
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
            
            {/* Balance Display */}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance:</Text>
              <Text style={[
                styles.balanceValue,
                envelope.current_balance < 0 && styles.negativeBalance
              ]}>
                {formatCurrency(envelope.current_balance)}
              </Text>
            </View>

            {/* Envelope Type Badge */}
            <View style={styles.typeRow}>
              <View style={[
                styles.typeBadge,
                { backgroundColor: getEnvelopeTypeColor(envelope.envelope_type) + '20' }
              ]}>
                <Text style={[
                  styles.typeBadgeText,
                  { color: getEnvelopeTypeColor(envelope.envelope_type) }
                ]}>
                  {envelope.envelope_type.charAt(0).toUpperCase() + envelope.envelope_type.slice(1)}
                </Text>
              </View>
              
              {/* Notifications indicator */}
              {envelope.should_notify && (
                <View style={styles.notificationIndicator}>
                  <Icon name="notifications-outline" size={16} color={theme.warning} />
                </View>
              )}
            </View>

            {/* Debt-specific info */}
            {envelope.envelope_type === 'debt' && envelope.debt_balance > 0 && (
              <View style={styles.debtInfo}>
                <Text style={styles.debtLabel}>Debt Balance: {formatCurrency(envelope.debt_balance)}</Text>
                {envelope.minimum_payment && (
                  <Text style={styles.debtLabel}>Min Payment: {formatCurrency(envelope.minimum_payment)}</Text>
                )}
              </View>
            )}

            {/* Savings goal info */}
            {envelope.envelope_type === 'savings' && envelope.notify_above_amount && (
              <View style={styles.savingsInfo}>
                <Text style={styles.savingsLabel}>
                  Goal: {formatCurrency(envelope.notify_above_amount)}
                </Text>
                <View style={styles.progressContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { 
                        width: `${Math.min((envelope.current_balance / envelope.notify_above_amount) * 100, 100)}%`,
                        backgroundColor: theme.success
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.envelopeActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleFundEnvelope(envelope);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="add-circle-outline" size={18} color={theme.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleTransferEnvelope(envelope);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="swap-horizontal" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditEnvelope(envelope);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="pencil" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteEnvelope(envelope);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="trash-outline" size={18} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  // Group envelopes by type and sort them
  const groupedEnvelopes = React.useMemo(() => {
    const activeEnvelopes = envelopes.filter(e => e.is_active);
    const inactiveEnvelopes = envelopes.filter(e => !e.is_active);
    
    const groupByType = (envs: Envelope[]) => {
      const groups = {
        regular: envs.filter(e => e.envelope_type === 'regular'),
        savings: envs.filter(e => e.envelope_type === 'savings'),
        debt: envs.filter(e => e.envelope_type === 'debt'),
      };
      
      // Sort each group by sort_order, then by name
      Object.keys(groups).forEach(key => {
        groups[key as keyof typeof groups].sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.name.localeCompare(b.name);
        });
      });
      
      return groups;
    };
    
    return {
      active: groupByType(activeEnvelopes),
      inactive: groupByType(inactiveEnvelopes),
    };
  }, [envelopes]);

  // Calculate summary statistics
  const totalBalance = envelopes
    .filter(e => e.is_active)
    .reduce((sum, e) => sum + e.current_balance, 0);
  
  const totalDebt = envelopes
    .filter(e => e.is_active && e.envelope_type === 'debt')
    .reduce((sum, e) => sum + e.debt_balance, 0);

  if (budgetLoading && !selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Budget Selected</Text>
          <Text style={styles.emptyDescription}>
            Please select a budget to manage envelopes.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading envelopes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Envelopes</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasActiveEnvelopes = Object.values(groupedEnvelopes.active).some(group => group.length > 0);
  const hasInactiveEnvelopes = Object.values(groupedEnvelopes.inactive).some(group => group.length > 0);

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
        {envelopes.length === 0 ? (
          <Card variant="elevated" padding="large" style={styles.emptyCard}>
            <Icon name="wallet-outline" size={64} color={theme.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Envelopes</Text>
            <Text style={styles.emptyDescription}>
              Create your first envelope to start managing your money with the envelope budgeting method.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={handleAddEnvelope}
            >
              <Icon name="add" size={20} color={theme.textOnPrimary} />
              <Text style={styles.emptyActionText}>Add Envelope</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            {/* Summary Statistics */}
            <Card variant="elevated" padding="large" style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[
                    styles.summaryValue,
                    totalBalance < 0 && styles.negativeBalance
                  ]}>
                    {formatCurrency(totalBalance)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Balance</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{envelopes.filter(e => e.is_active).length}</Text>
                  <Text style={styles.summaryLabel}>Active</Text>
                </View>
                {totalDebt > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, styles.debtValue]}>
                      {formatCurrency(totalDebt)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Debt</Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Active Envelopes */}
            {hasActiveEnvelopes && (
              <>
                {/* Regular Envelopes */}
                {groupedEnvelopes.active.regular.length > 0 && (
                  <Card variant="elevated" padding="none" style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Regular Envelopes</Text>
                      <Text style={styles.sectionCount}>{groupedEnvelopes.active.regular.length}</Text>
                    </View>
                    <View style={styles.sectionContent}>
                      {groupedEnvelopes.active.regular.map(renderEnvelope)}
                    </View>
                  </Card>
                )}

                {/* Savings Envelopes */}
                {groupedEnvelopes.active.savings.length > 0 && (
                  <Card variant="elevated" padding="none" style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Savings Envelopes</Text>
                      <Text style={styles.sectionCount}>{groupedEnvelopes.active.savings.length}</Text>
                    </View>
                    <View style={styles.sectionContent}>
                      {groupedEnvelopes.active.savings.map(renderEnvelope)}
                    </View>
                  </Card>
                )}

                {/* Debt Envelopes */}
                {groupedEnvelopes.active.debt.length > 0 && (
                  <Card variant="elevated" padding="none" style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Debt Envelopes</Text>
                      <Text style={styles.sectionCount}>{groupedEnvelopes.active.debt.length}</Text>
                    </View>
                    <View style={styles.sectionContent}>
                      {groupedEnvelopes.active.debt.map(renderEnvelope)}
                    </View>
                  </Card>
                )}
              </>
            )}

            {/* Inactive Envelopes */}
            {hasInactiveEnvelopes && (
              <Card variant="elevated" padding="none" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Inactive Envelopes</Text>
                  <Text style={styles.sectionCount}>
                    {Object.values(groupedEnvelopes.inactive).reduce((sum, group) => sum + group.length, 0)}
                  </Text>
                </View>
                <View style={styles.sectionContent}>
                  {[
                    ...groupedEnvelopes.inactive.regular,
                    ...groupedEnvelopes.inactive.savings,
                    ...groupedEnvelopes.inactive.debt,
                  ].map(renderEnvelope)}
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddEnvelope}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    emptyDescription: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
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
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 80, // Space for FAB
    },
    emptyCard: {
      alignItems: 'center' as const,
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      marginBottom: spacing.lg,
    },
    emptyActionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    emptyActionText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    summaryCard: {
      marginBottom: spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
    },
    summaryItem: {
      alignItems: 'center' as const,
      flex: 1,
    },
    summaryValue: {
      ...typography.h3,
      color: theme.primary,
      fontWeight: '700' as const,
      marginBottom: spacing.xs,
    },
    summaryLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    negativeBalance: {
      color: theme.error,
    },
    debtValue: {
      color: theme.error,
    },
    sectionCard: {
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
    sectionCount: {
      ...typography.caption,
      color: theme.textSecondary,
      backgroundColor: theme.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      minWidth: 24,
      textAlign: 'center' as const,
    },
    sectionContent: {
      backgroundColor: theme.background,
    },
    envelopeCard: {
      marginBottom: spacing.xs,
    },
    inactiveEnvelopeCard: {
      opacity: 0.7,
      backgroundColor: theme.border,
    },
    envelopeContent: {
      padding: 0,
    },
    envelopeHeader: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
    },
    envelopeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.md,
    },
    envelopeInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    envelopeNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.xs,
    },
    envelopeName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      flex: 1,
    },
    envelopeDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.sm,
      lineHeight: 16,
    },
    balanceRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    balanceLabel: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '500' as const,
    },
    balanceValue: {
      ...typography.h4,
      color: theme.primary,
      fontWeight: '700' as const,
    },
    typeRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.sm,
    },
    typeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    typeBadgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600' as const,
    },
    notificationIndicator: {
      padding: spacing.xs,
    },
    debtInfo: {
      backgroundColor: theme.error + '10',
      padding: spacing.sm,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    debtLabel: {
      ...typography.caption,
      color: theme.error,
      fontWeight: '500' as const,
    },
    savingsInfo: {
      backgroundColor: theme.success + '10',
      padding: spacing.sm,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    savingsLabel: {
      ...typography.caption,
      color: theme.success,
      fontWeight: '500' as const,
      marginBottom: spacing.xs,
    },
    progressContainer: {
      height: 6,
      backgroundColor: theme.success + '30',
      borderRadius: 3,
      overflow: 'hidden' as const,
    },
    progressBar: {
      height: '100%',
      borderRadius: 3,
    },
    envelopeActions: {
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    actionButton: {
      padding: spacing.xs,
      borderRadius: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minWidth: 32,
      minHeight: 32,
    },
    inactiveBadge: {
      backgroundColor: theme.warning,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      marginLeft: spacing.xs,
    },
    inactiveBadgeText: {
      ...typography.caption,
      color: theme.textPrimary,
      fontSize: 10,
      fontWeight: '600' as const,
    },
    fab: {
      position: 'absolute' as const,
      right: spacing.lg,
      bottom: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    fabText: {
      fontSize: 28,
      color: theme.textOnPrimary,
      fontWeight: '300' as const,
    },
  });
}

export default EnvelopeListScreen;