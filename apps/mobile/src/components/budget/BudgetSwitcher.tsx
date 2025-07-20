/**
 * Budget Switcher Component
 * 
 * Dropdown/picker for switching between available budgets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Card } from '../ui';
import { useBudget } from '../../context';
import type { Budget } from '@nvlp/types';
import type { Theme } from '../../theme';

export interface BudgetSwitcherProps {
  variant?: 'header' | 'standalone';
  showLabel?: boolean;
}

export const BudgetSwitcher: React.FC<BudgetSwitcherProps> = ({
  variant = 'standalone',
  showLabel = true,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { budgets, selectedBudget, selectBudget, isLoading, error } = useBudget();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const activeBudgets = budgets.filter(budget => budget.is_active);
  const inactiveBudgets = budgets.filter(budget => !budget.is_active);

  const handleBudgetSelect = (budget: Budget) => {
    // Only allow selection of active budgets
    if (!budget.is_active) {
      Alert.alert(
        'Cannot Select Budget',
        'This budget is inactive. Please activate it first to use it.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    selectBudget(budget);
    setIsModalVisible(false);
  };

  const handlePress = () => {
    if (budgets.length === 0 && !isLoading) {
      Alert.alert(
        'No Budgets Available',
        'Create a budget first to start using the app.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsModalVisible(true);
  };

  if (error) {
    return (
      <TouchableOpacity 
        style={[styles.container, variant === 'header' && styles.headerContainer]}
        onPress={handlePress}
      >
        <View style={styles.content}>
          <Text style={[styles.errorText, variant === 'header' && styles.headerText]}>
            Error loading budgets
          </Text>
          <Icon 
            name="refresh" 
            size={16} 
            color={variant === 'header' ? theme.textOnPrimary : theme.error} 
          />
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, variant === 'header' && styles.headerContainer]}>
        <View style={styles.content}>
          <Text style={[styles.loadingText, variant === 'header' && styles.headerText]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  if (!selectedBudget) {
    return (
      <TouchableOpacity 
        style={[styles.container, variant === 'header' && styles.headerContainer]}
        onPress={handlePress}
      >
        <View style={styles.content}>
          <Text style={[styles.emptyText, variant === 'header' && styles.headerText]}>
            No Budget Selected
          </Text>
          <Icon 
            name="chevron-down" 
            size={16} 
            color={variant === 'header' ? theme.textOnPrimary : theme.textSecondary} 
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, variant === 'header' && styles.headerContainer]}
        onPress={handlePress}
      >
        <View style={styles.content}>
          <View style={styles.budgetInfo}>
            {showLabel && variant !== 'header' && (
              <Text style={styles.label}>Current Budget</Text>
            )}
            <View style={styles.budgetDetails}>
              <Text style={[
                styles.budgetName, 
                variant === 'header' && styles.headerText
              ]}>
                {selectedBudget.name}
              </Text>
              <View style={styles.budgetBadges}>
                {selectedBudget.is_default && (
                  <View style={[
                    styles.defaultBadge,
                    variant === 'header' && styles.headerDefaultBadge
                  ]}>
                    <Text style={[
                      styles.defaultBadgeText,
                      variant === 'header' && styles.headerDefaultBadgeText
                    ]}>
                      Default
                    </Text>
                  </View>
                )}
                <View style={[
                  styles.currentBadge,
                  variant === 'header' && styles.headerCurrentBadge
                ]}>
                  <Text style={[
                    styles.currentBadgeText,
                    variant === 'header' && styles.headerCurrentBadgeText
                  ]}>
                    Current
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Icon 
            name="chevron-down" 
            size={16} 
            color={variant === 'header' ? theme.textOnPrimary : theme.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Card variant="elevated" padding="none" style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Budget</Text>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {activeBudgets.length > 0 && (
                  <View style={styles.budgetSection}>
                    <Text style={styles.sectionTitle}>Active Budgets</Text>
                    {activeBudgets.map((budget) => (
                      <TouchableOpacity
                        key={budget.id}
                        style={[
                          styles.budgetItem,
                          selectedBudget?.id === budget.id && styles.selectedBudgetItem
                        ]}
                        onPress={() => handleBudgetSelect(budget)}
                      >
                        <View style={styles.budgetItemContent}>
                          <Text style={[
                            styles.budgetItemName,
                            selectedBudget?.id === budget.id && styles.selectedBudgetText
                          ]}>
                            {budget.name}
                          </Text>
                          {budget.is_default && (
                            <View style={styles.modalDefaultBadge}>
                              <Text style={styles.modalDefaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        {budget.description && (
                          <Text style={[
                            styles.budgetItemDescription,
                            selectedBudget?.id === budget.id && styles.selectedBudgetText
                          ]}>
                            {budget.description}
                          </Text>
                        )}
                        {selectedBudget?.id === budget.id && (
                          <Icon name="checkmark" size={20} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {inactiveBudgets.length > 0 && (
                  <View style={styles.budgetSection}>
                    <Text style={styles.sectionTitle}>Inactive Budgets</Text>
                    <Text style={styles.inactiveNote}>
                      Inactive budgets cannot be selected. Activate them first to use.
                    </Text>
                    {inactiveBudgets.map((budget) => (
                      <View
                        key={budget.id}
                        style={[styles.budgetItem, styles.inactiveBudgetItem]}
                      >
                        <View style={styles.budgetItemContent}>
                          <Text style={styles.inactiveBudgetText}>
                            {budget.name}
                          </Text>
                          {budget.is_default && (
                            <View style={styles.inactiveDefaultBadge}>
                              <Text style={styles.inactiveDefaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        {budget.description && (
                          <Text style={styles.inactiveBudgetDescription}>
                            {budget.description}
                          </Text>
                        )}
                        {selectedBudget?.id === budget.id && (
                          <Icon name="checkmark" size={20} color={theme.textTertiary} />
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {budgets.length === 0 && (
                  <View style={styles.emptyState}>
                    <Icon name="wallet-outline" size={48} color={theme.textTertiary} />
                    <Text style={styles.emptyStateText}>No budgets available</Text>
                    <Text style={styles.emptyStateDescription}>
                      Create a budget to get started
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Card>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerContainer: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
    },
    content: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
    },
    budgetInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    label: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '500' as const,
    },
    budgetDetails: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    budgetBadges: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.xs,
    },
    budgetName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      flex: 1,
    },
    headerText: {
      color: theme.textOnPrimary,
    },
    defaultBadge: {
      backgroundColor: theme.primary + '20',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 6,
    },
    headerDefaultBadge: {
      backgroundColor: theme.textOnPrimary + '20',
    },
    defaultBadgeText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '600' as const,
      fontSize: 10,
    },
    headerDefaultBadgeText: {
      color: theme.textOnPrimary,
    },
    currentBadge: {
      backgroundColor: theme.success + '20',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 6,
    },
    headerCurrentBadge: {
      backgroundColor: theme.textOnPrimary + '20',
    },
    currentBadgeText: {
      ...typography.caption,
      color: theme.success,
      fontWeight: '600' as const,
      fontSize: 10,
    },
    headerCurrentBadgeText: {
      color: theme.textOnPrimary,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
    },
    errorText: {
      ...typography.body,
      color: theme.error,
    },
    emptyText: {
      ...typography.body,
      color: theme.textTertiary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalCard: {
      backgroundColor: theme.surface,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      ...typography.h3,
      color: theme.textPrimary,
    },
    closeButton: {
      padding: spacing.xs,
    },
    modalContent: {
      maxHeight: 400,
    },
    budgetSection: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    sectionTitle: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      fontWeight: '600' as const,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    budgetItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.xs,
      backgroundColor: theme.background,
    },
    selectedBudgetItem: {
      backgroundColor: theme.primary + '10',
      borderWidth: 1,
      borderColor: theme.primary + '30',
    },
    inactiveBudgetItem: {
      opacity: 0.6,
      backgroundColor: theme.border + '30',
    },
    budgetItemContent: {
      flex: 1,
      marginRight: spacing.sm,
    },
    budgetItemName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      marginBottom: spacing.xs,
    },
    budgetItemDescription: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    selectedBudgetText: {
      color: theme.primary,
    },
    inactiveBudgetText: {
      ...typography.body,
      color: theme.textTertiary,
      fontWeight: '500' as const,
    },
    inactiveBudgetDescription: {
      ...typography.caption,
      color: theme.textTertiary,
    },
    modalDefaultBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      alignSelf: 'flex-start' as const,
      marginTop: spacing.xs,
    },
    modalDefaultBadgeText: {
      ...typography.caption,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    emptyState: {
      alignItems: 'center' as const,
      paddingVertical: spacing['2xl'],
      paddingHorizontal: spacing.lg,
    },
    emptyStateText: {
      ...typography.h4,
      color: theme.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptyStateDescription: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    inactiveNote: {
      ...typography.caption,
      color: theme.textTertiary,
      fontStyle: 'italic' as const,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    inactiveDefaultBadge: {
      backgroundColor: theme.textTertiary + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      alignSelf: 'flex-start' as const,
      marginTop: spacing.xs,
    },
    inactiveDefaultBadgeText: {
      ...typography.caption,
      color: theme.textTertiary,
      fontWeight: '600' as const,
    },
  });
}

export default BudgetSwitcher;