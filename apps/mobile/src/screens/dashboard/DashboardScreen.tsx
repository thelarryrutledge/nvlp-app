/**
 * Dashboard Screen
 * 
 * Main dashboard showing budget overview, envelope summaries, and recent activity
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
import { useFocusEffect } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Card } from '../../components/ui';
import { useBudget } from '../../context';
import { dashboardService } from '../../services/api/dashboardService';
import type { Theme } from '../../theme';
import type { DashboardData } from '@nvlp/types';

export const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget, isLoading: budgetLoading, budgets } = useBudget();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedBudget) {
      setDashboardData(null);
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

      const data = await dashboardService.getDashboardData(selectedBudget.id);
      setDashboardData(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBudget]);

  // Load dashboard data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Reload when selected budget changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (budgetLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state while budgets are being loaded initially
  if (budgetLoading && !selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading budgets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {budgets.length === 0 ? 'No Budgets Found' : 'No Budget Selected'}
          </Text>
          <Text style={styles.emptyDescription}>
            {budgets.length === 0 
              ? 'Go to the Budgets tab to create your first budget.'
              : 'Please select a budget using the switcher above to view your dashboard.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyDescription}>
            Dashboard data is not available yet. Pull down to refresh.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { budget_overview, envelopes_summary, recent_transactions, spending_by_category, income_vs_expenses } = dashboardData;

  return (
    <SafeAreaView style={styles.container}>
      {/* Quick Action Buttons */}
      <View style={styles.quickActionsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContent}
        >
          <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>➕</Text>
            </View>
            <Text style={styles.quickActionLabel}>Add Transaction</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>💸</Text>
            </View>
            <Text style={styles.quickActionLabel}>Quick Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>📊</Text>
            </View>
            <Text style={styles.quickActionLabel}>View Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>✉️</Text>
            </View>
            <Text style={styles.quickActionLabel}>Envelopes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>🏦</Text>
            </View>
            <Text style={styles.quickActionLabel}>Add Income</Text>
          </TouchableOpacity>
        </ScrollView>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Budget Overview */}
        <Card variant="elevated" padding="large" style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Budget Overview</Text>
            <Text style={styles.budgetName}>{budget_overview.budget?.name || selectedBudget.name}</Text>
          </View>
          
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available</Text>
              <Text style={[styles.balanceAmount, styles.availableAmount]}>
                {formatCurrency(budget_overview.available_amount)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Allocated</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(budget_overview.total_allocated)}
              </Text>
            </View>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Budget</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(budget_overview.total_budget)}
            </Text>
          </View>
        </Card>

        {/* Income vs Expenses */}
        <Card variant="elevated" padding="large" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Last 30 Days</Text>
          <View style={styles.incomeExpenseRow}>
            <View style={styles.incomeExpenseItem}>
              <Text style={styles.incomeExpenseLabel}>Income</Text>
              <Text style={[styles.incomeExpenseAmount, styles.incomeAmount]}>
                {formatCurrency(income_vs_expenses.total_income)}
              </Text>
            </View>
            <View style={styles.incomeExpenseItem}>
              <Text style={styles.incomeExpenseLabel}>Expenses</Text>
              <Text style={[styles.incomeExpenseAmount, styles.expenseAmount]}>
                {formatCurrency(income_vs_expenses.total_expenses)}
              </Text>
            </View>
          </View>
          <View style={styles.netFlowRow}>
            <Text style={styles.netFlowLabel}>Net Flow</Text>
            <Text style={[
              styles.netFlowAmount,
              income_vs_expenses.net_flow >= 0 ? styles.positiveFlow : styles.negativeFlow
            ]}>
              {formatCurrency(income_vs_expenses.net_flow)}
            </Text>
          </View>
        </Card>

        {/* Top Envelopes */}
        {envelopes_summary.length > 0 && (
          <Card variant="elevated" padding="large" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Top Envelopes</Text>
            {envelopes_summary.slice(0, 5).map((envelope) => (
              <View key={envelope.id} style={styles.envelopeRow}>
                <View style={styles.envelopeInfo}>
                  <Text style={styles.envelopeName}>{envelope.name}</Text>
                  {envelope.category && (
                    <Text style={styles.envelopeCategory}>{envelope.category}</Text>
                  )}
                </View>
                <Text style={styles.envelopeBalance}>
                  {formatCurrency(envelope.balance)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Spending by Category */}
        {spending_by_category.length > 0 && (
          <Card variant="elevated" padding="large" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            {spending_by_category.slice(0, 5).map((category) => (
              <View key={category.category_id} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{category.category_name}</Text>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.amount)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recent Transactions */}
        {recent_transactions.length > 0 && (
          <Card variant="elevated" padding="large" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {recent_transactions.slice(0, 8).map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description || `${transaction.type} transaction`}
                  </Text>
                  <Text style={styles.transactionDetail}>
                    {formatDate(transaction.date)}
                    {transaction.payee && ` • ${transaction.payee}`}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            ))}
          </Card>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
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
    },
    overviewCard: {
      marginBottom: spacing.lg,
    },
    overviewHeader: {
      marginBottom: spacing.lg,
    },
    overviewTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    budgetName: {
      ...typography.body,
      color: theme.textSecondary,
    },
    balanceRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.lg,
    },
    balanceItem: {
      flex: 1,
      alignItems: 'center' as const,
    },
    balanceLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    balanceAmount: {
      ...typography.h2,
      color: theme.textPrimary,
    },
    availableAmount: {
      color: theme.primary,
    },
    totalRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    totalLabel: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '600' as const,
    },
    totalAmount: {
      ...typography.h3,
      color: theme.textPrimary,
      fontWeight: '700' as const,
    },
    sectionCard: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    incomeExpenseRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.md,
    },
    incomeExpenseItem: {
      flex: 1,
      alignItems: 'center' as const,
    },
    incomeExpenseLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    incomeExpenseAmount: {
      ...typography.h3,
      color: theme.textPrimary,
    },
    incomeAmount: {
      color: theme.success,
    },
    expenseAmount: {
      color: theme.error,
    },
    netFlowRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    netFlowLabel: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '600' as const,
    },
    netFlowAmount: {
      ...typography.h3,
      fontWeight: '700' as const,
    },
    positiveFlow: {
      color: theme.success,
    },
    negativeFlow: {
      color: theme.error,
    },
    envelopeRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    envelopeInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    envelopeName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    envelopeCategory: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    envelopeBalance: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    categoryRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    categoryName: {
      ...typography.body,
      color: theme.textPrimary,
      flex: 1,
      marginRight: spacing.md,
    },
    categoryAmount: {
      ...typography.body,
      color: theme.error,
      fontWeight: '600' as const,
    },
    transactionRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    transactionInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    transactionDescription: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    transactionDetail: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    transactionAmount: {
      ...typography.body,
      fontWeight: '600' as const,
    },
    // Quick Actions Styles
    quickActionsContainer: {
      backgroundColor: theme.surface,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    quickActionsContent: {
      paddingHorizontal: spacing.lg,
    },
    quickActionButton: {
      alignItems: 'center' as const,
      marginRight: spacing.lg,
      width: 72,
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.xs,
    },
    quickActionIconText: {
      fontSize: 20,
    },
    quickActionLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center' as const,
      fontSize: 11,
    },
  });
}

export default DashboardScreen;