/**
 * Income Source List Screen
 * 
 * Displays and manages income sources for the selected budget
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
import { incomeSourceService } from '../../services/api/incomeSourceService';
import type { IncomeSource } from '@nvlp/types';

export const IncomeSourceListScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { selectedBudget, isLoading: budgetLoading } = useBudget();
  
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIncomeSources = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedBudget) {
      setIncomeSources([]);
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

      const fetchedIncomeSources = await incomeSourceService.getIncomeSources(selectedBudget.id);
      setIncomeSources(fetchedIncomeSources);
    } catch (error: any) {
      setError(error.message || 'Failed to load income sources');
      console.error('Income sources error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBudget]);

  // Load income sources when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadIncomeSources();
    }, [loadIncomeSources])
  );

  // Reload when selected budget changes
  useEffect(() => {
    loadIncomeSources();
  }, [loadIncomeSources]);

  const handleRefresh = () => {
    loadIncomeSources(true);
  };

  const handleAddIncomeSource = () => {
    (navigation as any).navigate('IncomeSourceForm');
  };

  const handleEditIncomeSource = (incomeSource: IncomeSource) => {
    (navigation as any).navigate('IncomeSourceForm', { 
      incomeSourceId: incomeSource.id 
    });
  };

  const handleDeleteIncomeSource = async (incomeSource: IncomeSource) => {
    Alert.alert(
      'Delete Income Source',
      `Are you sure you want to delete "${incomeSource.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await incomeSourceService.deleteIncomeSource(incomeSource.id);
              await loadIncomeSources();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete income source');
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

  const formatFrequency = (frequency: string): string => {
    const frequencyMap: Record<string, string> = {
      weekly: 'Weekly',
      bi_weekly: 'Bi-weekly',
      twice_monthly: 'Twice Monthly',
      monthly: 'Monthly',
      annually: 'Annually',
      custom: 'Custom',
      one_time: 'One Time',
    };
    return frequencyMap[frequency] || frequency;
  };

  const formatNextExpectedDate = (date: string | null): string => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderIncomeSource = (incomeSource: IncomeSource) => (
    <Card
      key={incomeSource.id}
      variant="elevated"
      padding="large"
      style={[
        styles.incomeSourceCard,
        !incomeSource.is_active && styles.inactiveIncomeSourceCard
      ]}
    >
      <View style={styles.incomeSourceHeader}>
        <View style={styles.incomeSourceTitleRow}>
          <Text style={styles.incomeSourceName}>{incomeSource.name}</Text>
          {!incomeSource.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        <View style={styles.incomeSourceActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditIncomeSource(incomeSource)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="pencil" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteIncomeSource(incomeSource)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="trash-outline" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      {incomeSource.description && (
        <Text style={styles.incomeSourceDescription}>{incomeSource.description}</Text>
      )}
      
      <View style={styles.incomeSourceDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expected Monthly:</Text>
          <Text style={styles.detailValue}>
            {incomeSource.expected_monthly_amount 
              ? formatCurrency(incomeSource.expected_monthly_amount)
              : 'Not set'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Frequency:</Text>
          <Text style={styles.detailValue}>
            {formatFrequency(incomeSource.frequency)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Next Expected:</Text>
          <Text style={styles.detailValue}>
            {formatNextExpectedDate(incomeSource.next_expected_date)}
          </Text>
        </View>
        
        {incomeSource.should_notify && (
          <View style={styles.notificationIndicator}>
            <Text style={styles.notificationText}>🔔 Notifications enabled</Text>
          </View>
        )}
      </View>
    </Card>
  );

  // Sort income sources: active first, then inactive (like budget list)
  const sortedIncomeSources = [...incomeSources].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return a.name.localeCompare(b.name); // Alphabetical within each group
  });

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
            Please select a budget to manage income sources.
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
          <Text style={styles.loadingText}>Loading income sources...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Income Sources</Text>
          <Text style={styles.errorText}>{error}</Text>
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
        {incomeSources.length === 0 ? (
          <Card variant="elevated" padding="large" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Income Sources</Text>
            <Text style={styles.emptyDescription}>
              Tap the + button to add your first income source to track expected income.
            </Text>
          </Card>
        ) : (
          <>
            {sortedIncomeSources.map(renderIncomeSource)}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddIncomeSource}
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
    incomeSourceCard: {
      marginBottom: spacing.md,
    },
    inactiveIncomeSourceCard: {
      opacity: 0.7,
      backgroundColor: theme.border, // Light gray distinct from screen background
    },
    incomeSourceHeader: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.xs,
    },
    incomeSourceTitleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
      marginRight: spacing.sm,
    },
    incomeSourceName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      marginRight: spacing.sm,
    },
    incomeSourceActions: {
      flexDirection: 'row' as const,
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
    incomeSourceDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.sm,
    },
    incomeSourceDetails: {
      gap: spacing.xs,
    },
    detailRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    detailLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      flex: 1,
    },
    detailValue: {
      ...typography.caption,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      flex: 1,
      textAlign: 'right' as const,
    },
    inactiveBadge: {
      backgroundColor: theme.warning,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    inactiveBadgeText: {
      ...typography.caption,
      color: theme.textPrimary,
      fontSize: 10,
    },
    notificationIndicator: {
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    notificationText: {
      ...typography.caption,
      color: theme.success,
      fontSize: 11,
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

export default IncomeSourceListScreen;