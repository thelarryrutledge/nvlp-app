/**
 * Budget List Screen
 * 
 * Displays all budgets for the current user with options to create, edit, and manage budgets
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, Card } from '../../components/ui';
import { budgetService } from '../../services/api/budgetService';
import type { Budget } from '@nvlp/types';
import type { Theme } from '../../theme';

interface BudgetCardProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onSetDefault: (budget: Budget) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onEdit, onDelete, onSetDefault }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card 
      variant="elevated" 
      padding="large" 
      style={[
        styles.budgetCard, 
        !budget.is_active && styles.inactiveBudgetCard
      ]}
    >
      <View style={styles.budgetHeader}>
        <View style={styles.budgetInfo}>
          <View style={styles.budgetTitleRow}>
            <Text style={[
              styles.budgetName,
              !budget.is_active && styles.inactiveBudgetText
            ]}>
              {budget.name}
            </Text>
            {budget.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          {budget.description && (
            <Text style={[
              styles.budgetDescription,
              !budget.is_active && styles.inactiveBudgetText
            ]}>
              {budget.description}
            </Text>
          )}
          <View style={styles.budgetMeta}>
            <Text style={[
              styles.budgetMetaText,
              !budget.is_active && styles.inactiveBudgetText
            ]}>
              Created: {formatDate(budget.created_at)}
            </Text>
            <View style={[styles.statusBadge, budget.is_active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusBadgeText, budget.is_active ? styles.activeText : styles.inactiveText]}>
                {budget.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.budgetActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(budget)}
        >
          <Icon name="pencil" size={16} color={theme.primary} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        {!budget.is_default && budget.is_active && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onSetDefault(budget)}
          >
            <Icon name="star-outline" size={16} color={theme.warning} />
            <Text style={styles.actionButtonText}>Set Default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(budget)}
        >
          <Icon name="trash-outline" size={16} color={theme.error} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export const BudgetListScreen: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const loadBudgets = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const fetchedBudgets = await budgetService.getBudgets();
      
      // Sort budgets: default first, then active, then inactive
      const sortedBudgets = fetchedBudgets.sort((a, b) => {
        // Default budget always first
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        
        // Then by active status
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        
        // Finally by name alphabetically
        return a.name.localeCompare(b.name);
      });
      
      setBudgets(sortedBudgets);
    } catch (error: any) {
      Alert.alert(
        'Error Loading Budgets',
        error.message || 'Failed to load budgets. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Reload budgets when screen comes into focus (e.g., returning from create screen)
  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [loadBudgets])
  );

  const handleCreateBudget = () => {
    // Navigate to budget creation screen
    (navigation as any).navigate('BudgetCreate');
  };

  const handleEditBudget = (budget: Budget) => {
    (navigation as any).navigate('BudgetEdit', { budgetId: budget.id });
  };

  const handleDeleteBudget = (budget: Budget) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetService.deleteBudget(budget.id);
              await loadBudgets();
              Alert.alert('Success', `Budget "${budget.name}" has been deleted.`);
            } catch (error: any) {
              Alert.alert(
                'Delete Failed',
                error.message || 'Failed to delete budget. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleSetDefaultBudget = async (budget: Budget) => {
    try {
      await budgetService.updateBudget(budget.id, { is_default: true });
      await loadBudgets();
      Alert.alert('Success', `"${budget.name}" is now your default budget.`);
    } catch (error: any) {
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to set default budget. Please try again.'
      );
    }
  };

  const handleRefresh = () => {
    loadBudgets(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading budgets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Budgets</Text>
        <Button
          title="Create Budget"
          onPress={handleCreateBudget}
          icon="add"
          size="small"
        />
      </View>

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
      >
        {budgets.length === 0 ? (
          <Card variant="elevated" padding="large" style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={64} color={theme.textTertiary} />
              <Text style={styles.emptyTitle}>No Budgets Yet</Text>
              <Text style={styles.emptyDescription}>
                Create your first budget to start managing your finances with the envelope method.
              </Text>
              <Button
                title="Create Your First Budget"
                onPress={handleCreateBudget}
                icon="add"
                style={styles.emptyButton}
              />
            </View>
          </Card>
        ) : (
          <View style={styles.budgetList}>
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={handleEditBudget}
                onDelete={handleDeleteBudget}
                onSetDefault={handleSetDefaultBudget}
              />
            ))}
          </View>
        )}
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
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      ...typography.h2,
      color: theme.textPrimary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    budgetList: {
      gap: spacing.md,
    },
    budgetCard: {
      marginBottom: spacing.md,
    },
    inactiveBudgetCard: {
      opacity: 0.7,
      backgroundColor: theme.border, // Light gray distinct from screen background
    },
    inactiveBudgetText: {
      color: theme.textTertiary,
    },
    budgetHeader: {
      marginBottom: spacing.md,
    },
    budgetInfo: {
      flex: 1,
    },
    budgetTitleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.xs,
    },
    budgetName: {
      ...typography.h4,
      color: theme.textPrimary,
      flex: 1,
    },
    defaultBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      marginLeft: spacing.sm,
    },
    defaultBadgeText: {
      ...typography.caption,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    budgetDescription: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.sm,
    },
    budgetMeta: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    budgetMetaText: {
      ...typography.caption,
      color: theme.textTertiary,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    activeBadge: {
      backgroundColor: theme.success + '20',
    },
    inactiveBadge: {
      backgroundColor: theme.error + '20',
    },
    statusBadgeText: {
      ...typography.caption,
      fontWeight: '600' as const,
    },
    activeText: {
      color: theme.success,
    },
    inactiveText: {
      color: theme.error,
    },
    budgetActions: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      backgroundColor: theme.surface,
    },
    actionButtonText: {
      ...typography.bodySmall,
      color: theme.textPrimary,
      marginLeft: spacing.xs,
      fontWeight: '500' as const,
    },
    emptyCard: {
      marginTop: spacing['3xl'],
    },
    emptyState: {
      alignItems: 'center' as const,
      paddingVertical: spacing['2xl'],
    },
    emptyTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    emptyButton: {
      marginTop: spacing.md,
    },
  });
}

export default BudgetListScreen;