/**
 * Budget Settings Screen
 * 
 * Configuration and management screen for an individual budget
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, Card, TextInput } from '../../components/ui';
import { budgetService } from '../../services/api/budgetService';
import { useBudget } from '../../context';
import type { Theme } from '../../theme';
import type { Budget, UpdateBudgetInput } from '@nvlp/types';
import type { MainStackParamList } from '../../navigation/types';

type BudgetSettingsRouteProp = RouteProp<MainStackParamList, 'BudgetSettings'>;

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'navigation' | 'switch' | 'action' | 'destructive';
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  icon?: string;
  disabled?: boolean;
}

export const BudgetSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BudgetSettingsRouteProp>();
  const { budgetId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { budgets, refreshBudgets, selectBudget, selectedBudget } = useBudget();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load budget data on mount
  useEffect(() => {
    loadBudgetData();
  }, [budgetId]);

  const loadBudgetData = async () => {
    try {
      setIsLoading(true);
      const budgetData = await budgetService.getBudget(budgetId);
      setBudget(budgetData);
    } catch (error: any) {
      Alert.alert(
        'Error Loading Budget',
        error.message || 'Failed to load budget data. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: loadBudgetData },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBudget = async (updates: UpdateBudgetInput) => {
    if (!budget) return;

    setIsUpdating(true);
    try {
      const updatedBudget = await budgetService.updateBudget(budgetId, updates);
      setBudget(updatedBudget);
      await refreshBudgets();
      
      // If this was the selected budget and we changed its status, handle selection
      if (selectedBudget?.id === budgetId) {
        if (!updatedBudget.is_active) {
          // Budget was deactivated, need to select a different active budget
          const activeBudgets = budgets.filter(b => b.is_active && b.id !== budgetId);
          if (activeBudgets.length > 0) {
            const defaultBudget = activeBudgets.find(b => b.is_default) || activeBudgets[0];
            selectBudget(defaultBudget);
          }
        } else {
          // Update the selected budget with new data
          selectBudget(updatedBudget);
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to update budget. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditBudget = () => {
    (navigation as any).navigate('BudgetEdit', { budgetId });
  };

  const handleDuplicateBudget = () => {
    if (!budget) return;
    
    Alert.alert(
      'Duplicate Budget',
      `Create a copy of "${budget.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const duplicateData = {
                name: `${budget.name} (Copy)`,
                description: budget.description,
                is_active: true,
                is_default: false,
              };
              
              await budgetService.createBudget(duplicateData);
              await refreshBudgets();
              
              Alert.alert(
                'Success',
                'Budget duplicated successfully.',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              Alert.alert(
                'Duplication Failed',
                error.message || 'Failed to duplicate budget. Please try again.'
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBudget = () => {
    if (!budget) return;

    // Check if this is the only budget
    if (budgets.length <= 1) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one budget. Create another budget before deleting this one.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budget.name}"? This action cannot be undone and will delete all associated envelopes and transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdating(true);
              await budgetService.deleteBudget(budgetId);
              await refreshBudgets();
              
              // If this was the selected budget, select a different one
              if (selectedBudget?.id === budgetId) {
                const remainingBudgets = budgets.filter(b => b.id !== budgetId);
                const activeBudgets = remainingBudgets.filter(b => b.is_active);
                if (activeBudgets.length > 0) {
                  const defaultBudget = activeBudgets.find(b => b.is_default) || activeBudgets[0];
                  selectBudget(defaultBudget);
                }
              }
              
              Alert.alert(
                'Success',
                'Budget deleted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                'Delete Failed',
                error.message || 'Failed to delete budget. Please try again.'
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading budget settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load budget data</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const canSetDefault = budget.is_active;
  const isCurrentlySelected = selectedBudget?.id === budgetId;

  const settingsSections: SettingsSection[] = [
    {
      title: 'Budget Information',
      items: [
        {
          id: 'edit',
          title: 'Edit Details',
          subtitle: 'Change name and description',
          type: 'navigation',
          icon: 'pencil',
          onPress: handleEditBudget,
        },
        {
          id: 'categories',
          title: 'Categories',
          subtitle: 'Manage expense and income categories',
          type: 'navigation',
          icon: 'folder',
          onPress: () => (navigation as any).navigate('CategoryList'),
        },
        {
          id: 'income-sources',
          title: 'Income Sources',
          subtitle: 'Manage expected income and sources',
          type: 'navigation',
          icon: 'cash-outline',
          onPress: () => (navigation as any).navigate('IncomeSourceList'),
        },
        {
          id: 'income-calendar',
          title: 'Income Calendar',
          subtitle: 'View expected income in calendar format',
          type: 'navigation',
          icon: 'calendar-outline',
          onPress: () => (navigation as any).navigate('IncomeCalendar'),
        },
        {
          id: 'income-history',
          title: 'Income History',
          subtitle: 'Track actual vs expected income',
          type: 'navigation',
          icon: 'analytics-outline',
          onPress: () => (navigation as any).navigate('IncomeHistory'),
        },
      ],
    },
    {
      title: 'Budget Status',
      items: [
        {
          id: 'active',
          title: 'Active',
          subtitle: budget.is_active 
            ? 'Budget is available for selection' 
            : 'Budget is hidden from selection',
          type: 'switch',
          value: budget.is_active,
          onValueChange: (value) => handleUpdateBudget({ is_active: value }),
        },
        {
          id: 'default',
          title: 'Set as Default',
          subtitle: canSetDefault 
            ? 'Use this budget when the app starts' 
            : 'Only active budgets can be set as default',
          type: 'switch',
          value: budget.is_default,
          disabled: !canSetDefault,
          onValueChange: (value) => handleUpdateBudget({ is_default: value }),
        },
      ],
    },
    {
      title: 'Actions',
      items: [
        {
          id: 'duplicate',
          title: 'Duplicate Budget',
          subtitle: 'Create a copy of this budget',
          type: 'action',
          icon: 'copy',
          onPress: handleDuplicateBudget,
        },
        {
          id: 'delete',
          title: 'Delete Budget',
          subtitle: 'Permanently delete this budget and all its data',
          type: 'destructive',
          icon: 'trash',
          onPress: handleDeleteBudget,
        },
      ],
    },
  ];

  const renderSettingsItem = (item: SettingsItem) => {
    const isDisabled = item.disabled || isUpdating;
    
    switch (item.type) {
      case 'switch':
        return (
          <View key={item.id} style={styles.settingsItem}>
            <View style={styles.settingsItemContent}>
              <Text style={[styles.settingsItemTitle, isDisabled && styles.disabledText]}>
                {item.title}
              </Text>
              {item.subtitle && (
                <Text style={[styles.settingsItemSubtitle, isDisabled && styles.disabledText]}>
                  {item.subtitle}
                </Text>
              )}
            </View>
            <Switch
              value={item.value || false}
              onValueChange={item.onValueChange}
              disabled={isDisabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={item.value ? theme.textOnPrimary : theme.textSecondary}
            />
          </View>
        );

      case 'navigation':
      case 'action':
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.settingsItem}
            onPress={item.onPress}
            disabled={isDisabled}
          >
            <View style={styles.settingsItemContent}>
              <Text style={[styles.settingsItemTitle, isDisabled && styles.disabledText]}>
                {item.title}
              </Text>
              {item.subtitle && (
                <Text style={[styles.settingsItemSubtitle, isDisabled && styles.disabledText]}>
                  {item.subtitle}
                </Text>
              )}
            </View>
            <View style={styles.settingsItemAction}>
              {item.icon && (
                <Icon 
                  name={item.icon} 
                  size={20} 
                  color={isDisabled ? theme.textTertiary : theme.textSecondary} 
                />
              )}
              <Icon 
                name="chevron-forward" 
                size={20} 
                color={isDisabled ? theme.textTertiary : theme.textSecondary} 
              />
            </View>
          </TouchableOpacity>
        );

      case 'destructive':
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.settingsItem}
            onPress={item.onPress}
            disabled={isDisabled}
          >
            <View style={styles.settingsItemContent}>
              <Text style={[
                styles.settingsItemTitle, 
                styles.destructiveText,
                isDisabled && styles.disabledText
              ]}>
                {item.title}
              </Text>
              {item.subtitle && (
                <Text style={[styles.settingsItemSubtitle, isDisabled && styles.disabledText]}>
                  {item.subtitle}
                </Text>
              )}
            </View>
            <View style={styles.settingsItemAction}>
              {item.icon && (
                <Icon 
                  name={item.icon} 
                  size={20} 
                  color={isDisabled ? theme.textTertiary : theme.error} 
                />
              )}
              <Icon 
                name="chevron-forward" 
                size={20} 
                color={isDisabled ? theme.textTertiary : theme.textSecondary} 
              />
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Budget Header */}
        <Card variant="elevated" padding="large" style={styles.headerCard}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetInfo}>
              <Text style={styles.budgetName}>{budget.name}</Text>
              {budget.description && (
                <Text style={styles.budgetDescription}>{budget.description}</Text>
              )}
              <View style={styles.budgetMeta}>
                <View style={styles.budgetBadges}>
                  {budget.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  {isCurrentlySelected && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                  <View style={[styles.statusBadge, budget.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusBadgeText, budget.is_active ? styles.activeText : styles.inactiveText]}>
                      {budget.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.budgetDate}>
                  Created {new Date(budget.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card variant="elevated" padding="none" style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {renderSettingsItem(item)}
                  {index < section.items.length - 1 && <View style={styles.itemSeparator} />}
                </View>
              ))}
            </Card>
          </View>
        ))}
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
      marginBottom: spacing.lg,
    },
    errorText: {
      ...typography.body,
      color: theme.error,
      marginBottom: spacing.lg,
      textAlign: 'center' as const,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerCard: {
      marginBottom: spacing.lg,
    },
    budgetHeader: {
      marginBottom: spacing.sm,
    },
    budgetInfo: {
      flex: 1,
    },
    budgetName: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    budgetDescription: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.md,
    },
    budgetMeta: {
      gap: spacing.sm,
    },
    budgetBadges: {
      flexDirection: 'row' as const,
      gap: spacing.xs,
      flexWrap: 'wrap' as const,
    },
    defaultBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    defaultBadgeText: {
      ...typography.caption,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    currentBadge: {
      backgroundColor: theme.success,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    currentBadgeText: {
      ...typography.caption,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
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
    budgetDate: {
      ...typography.caption,
      color: theme.textTertiary,
    },
    settingsSection: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    sectionCard: {
      backgroundColor: theme.surface,
    },
    settingsItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 60,
    },
    settingsItemContent: {
      flex: 1,
      marginRight: spacing.md,
    },
    settingsItemTitle: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      marginBottom: spacing.xs,
    },
    settingsItemSubtitle: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    settingsItemAction: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.xs,
    },
    destructiveText: {
      color: theme.error,
    },
    disabledText: {
      color: theme.textTertiary,
      opacity: 0.6,
    },
    itemSeparator: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: spacing.lg,
    },
  });
}

export default BudgetSettingsScreen;