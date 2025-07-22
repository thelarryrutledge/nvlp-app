/**
 * Income History Screen
 * 
 * Displays historical income transactions and compares with expected income
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  SectionList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { useBudget } from '../../context';
import { incomeSourceService } from '../../services/api/incomeSourceService';
import type { IncomeSource, Transaction } from '@nvlp/types';

interface IncomeHistoryItem {
  id: string;
  date: Date;
  sourceName: string;
  sourceId?: string;
  expectedAmount: number | null;
  actualAmount: number | null;
  variance: number;
  isReceived: boolean;
  transaction?: Transaction;
  incomeSource?: IncomeSource;
}

interface IncomeHistorySection {
  title: string;
  data: IncomeHistoryItem[];
  totalExpected: number;
  totalActual: number;
}

type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export const IncomeHistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { selectedBudget, isLoading: budgetLoading } = useBudget();
  
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historySections, setHistorySections] = useState<IncomeHistorySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [totalStats, setTotalStats] = useState({
    expectedTotal: 0,
    actualTotal: 0,
    variance: 0,
    variancePercent: 0,
  });

  const loadIncomeData = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedBudget) {
      setIncomeSources([]);
      setTransactions([]);
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

      // Load income sources
      const fetchedIncomeSources = await incomeSourceService.getIncomeSources(selectedBudget.id);
      setIncomeSources(fetchedIncomeSources);

      // TODO: Load actual income transactions when transaction service is available
      // For now, we'll simulate with mock data
      const mockTransactions = generateMockIncomeTransactions(selectedBudget.id);
      setTransactions(mockTransactions);

      // Process history data
      processIncomeHistory(fetchedIncomeSources, mockTransactions);
    } catch (error: any) {
      setError(error.message || 'Failed to load income history');
      console.error('Income history error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBudget, selectedTimeRange]);

  // Load income data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadIncomeData();
    }, [loadIncomeData])
  );

  const processIncomeHistory = (sources: IncomeSource[], transactions: Transaction[]) => {
    const now = new Date();
    const startDate = getStartDateForRange(selectedTimeRange);
    
    // Create expected income entries based on sources and their frequencies
    const expectedIncomeEntries = generateExpectedIncomeEntries(sources, startDate, now);
    
    // Match transactions with expected income
    const historyItems = matchTransactionsWithExpected(expectedIncomeEntries, transactions);
    
    // Group by month
    const sections = groupHistoryByMonth(historyItems);
    setHistorySections(sections);
    
    // Calculate totals
    const totals = calculateTotals(historyItems);
    setTotalStats(totals);
  };

  const getStartDateForRange = (range: TimeRange): Date => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case 'all':
        return new Date(2020, 0, 1); // Arbitrary old date
      default:
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  };

  const generateExpectedIncomeEntries = (
    sources: IncomeSource[],
    startDate: Date,
    endDate: Date
  ): IncomeHistoryItem[] => {
    const entries: IncomeHistoryItem[] = [];
    
    sources.forEach(source => {
      if (!source.is_active) return;
      
      // Generate expected dates based on frequency
      const expectedDates = calculateExpectedDates(source, startDate, endDate);
      
      expectedDates.forEach(date => {
        entries.push({
          id: `expected_${source.id}_${date.getTime()}`,
          date,
          sourceName: source.name,
          sourceId: source.id,
          expectedAmount: source.expected_amount,
          actualAmount: null,
          variance: 0,
          isReceived: false,
          incomeSource: source,
        });
      });
    });
    
    return entries;
  };

  const calculateExpectedDates = (
    source: IncomeSource,
    startDate: Date,
    endDate: Date
  ): Date[] => {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    
    // Simple implementation - would need to be enhanced based on frequency
    while (currentDate <= endDate) {
      switch (source.frequency) {
        case 'monthly':
          if (source.monthly_day) {
            const monthlyDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              source.monthly_day === -1 ? 0 : source.monthly_day
            );
            if (source.monthly_day === -1) {
              // Last day of month
              monthlyDate.setMonth(monthlyDate.getMonth() + 1);
              monthlyDate.setDate(0);
            }
            if (monthlyDate >= startDate && monthlyDate <= endDate) {
              dates.push(monthlyDate);
            }
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
          
        case 'weekly':
          // Add weekly dates
          const weekDay = source.weekly_day ?? 1;
          const daysUntilNext = (weekDay + 7 - currentDate.getDay()) % 7;
          currentDate.setDate(currentDate.getDate() + daysUntilNext);
          if (currentDate >= startDate && currentDate <= endDate) {
            dates.push(new Date(currentDate));
          }
          currentDate.setDate(currentDate.getDate() + 7);
          break;
          
        // Add other frequencies as needed
        default:
          currentDate = new Date(endDate.getTime() + 1); // Exit loop
      }
    }
    
    return dates;
  };

  const matchTransactionsWithExpected = (
    expectedEntries: IncomeHistoryItem[],
    transactions: Transaction[]
  ): IncomeHistoryItem[] => {
    const incomeTransactions = transactions.filter(t => t.transaction_type === 'income');
    const matchedEntries = [...expectedEntries];
    
    // Try to match transactions with expected entries
    incomeTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      
      // Find closest expected entry within 3 days
      let closestEntry: IncomeHistoryItem | null = null;
      let closestDiff = Infinity;
      
      matchedEntries.forEach(entry => {
        if (entry.isReceived) return; // Already matched
        
        const diff = Math.abs(entry.date.getTime() - transactionDate.getTime());
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 3 && diff < closestDiff) {
          closestDiff = diff;
          closestEntry = entry;
        }
      });
      
      if (closestEntry) {
        // Update the matched entry
        closestEntry.actualAmount = transaction.amount;
        closestEntry.variance = transaction.amount - (closestEntry.expectedAmount || 0);
        closestEntry.isReceived = true;
        closestEntry.transaction = transaction;
      } else {
        // Add as unexpected income
        matchedEntries.push({
          id: `transaction_${transaction.id}`,
          date: transactionDate,
          sourceName: transaction.description || 'Unknown Income',
          expectedAmount: null,
          actualAmount: transaction.amount,
          variance: transaction.amount,
          isReceived: true,
          transaction,
        });
      }
    });
    
    return matchedEntries;
  };

  const groupHistoryByMonth = (items: IncomeHistoryItem[]): IncomeHistorySection[] => {
    const sections: Record<string, IncomeHistorySection> = {};
    
    items.forEach(item => {
      const monthKey = `${item.date.getFullYear()}-${item.date.getMonth()}`;
      const monthName = item.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!sections[monthKey]) {
        sections[monthKey] = {
          title: monthName,
          data: [],
          totalExpected: 0,
          totalActual: 0,
        };
      }
      
      sections[monthKey].data.push(item);
      sections[monthKey].totalExpected += item.expectedAmount || 0;
      sections[monthKey].totalActual += item.actualAmount || 0;
    });
    
    // Sort sections by date (newest first) and sort items within sections
    return Object.values(sections)
      .sort((a, b) => {
        const [yearA, monthA] = a.title.split(' ');
        const [yearB, monthB] = b.title.split(' ');
        return new Date(`${monthB} 1, ${yearB}`).getTime() - new Date(`${monthA} 1, ${yearA}`).getTime();
      })
      .map(section => ({
        ...section,
        data: section.data.sort((a, b) => b.date.getTime() - a.date.getTime()),
      }));
  };

  const calculateTotals = (items: IncomeHistoryItem[]) => {
    const expectedTotal = items.reduce((sum, item) => sum + (item.expectedAmount || 0), 0);
    const actualTotal = items.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
    const variance = actualTotal - expectedTotal;
    const variancePercent = expectedTotal > 0 ? (variance / expectedTotal) * 100 : 0;
    
    return {
      expectedTotal,
      actualTotal,
      variance,
      variancePercent,
    };
  };

  const handleRefresh = () => {
    loadIncomeData(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getVarianceColor = (variance: number): string => {
    if (variance > 0) return theme.success;
    if (variance < 0) return theme.error;
    return theme.textSecondary;
  };

  const renderHistoryItem = ({ item }: { item: IncomeHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        if (item.transaction) {
          Alert.alert('Transaction Details', `Amount: ${formatCurrency(item.actualAmount || 0)}\nDate: ${item.date.toLocaleDateString()}\nDescription: ${item.transaction.description}`);
        } else {
          Alert.alert('Expected Income', `Expected: ${formatCurrency(item.expectedAmount || 0)}\nDate: ${item.date.toLocaleDateString()}\nStatus: Not yet received`);
        }
      }}
    >
      <View style={styles.historyItemLeft}>
        <Icon 
          name={item.isReceived ? 'checkmark-circle' : 'time-outline'} 
          size={24} 
          color={item.isReceived ? theme.success : theme.textTertiary} 
        />
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemName}>{item.sourceName}</Text>
          <Text style={styles.historyItemDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      
      <View style={styles.historyItemRight}>
        {item.expectedAmount && (
          <Text style={styles.expectedAmount}>
            Expected: {formatCurrency(item.expectedAmount)}
          </Text>
        )}
        {item.actualAmount && (
          <Text style={styles.actualAmount}>
            Actual: {formatCurrency(item.actualAmount)}
          </Text>
        )}
        {item.isReceived && item.variance !== 0 && (
          <Text style={[styles.variance, { color: getVarianceColor(item.variance) }]}>
            {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: IncomeHistorySection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionTotals}>
        <Text style={styles.sectionTotal}>
          Expected: {formatCurrency(section.totalExpected)}
        </Text>
        <Text style={styles.sectionTotal}>
          Actual: {formatCurrency(section.totalActual)}
        </Text>
      </View>
    </View>
  );

  const renderTimeRangeSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.timeRangeContainer}
    >
      {(['week', 'month', 'quarter', 'year', 'all'] as TimeRange[]).map(range => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            selectedTimeRange === range && styles.selectedTimeRange,
          ]}
          onPress={() => setSelectedTimeRange(range)}
        >
          <Text style={[
            styles.timeRangeText,
            selectedTimeRange === range && styles.selectedTimeRangeText,
          ]}>
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

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
            Please select a budget to view income history.
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
          <Text style={styles.loadingText}>Loading income history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Income History</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary Card */}
      <Card variant="elevated" padding="large" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryTitle}>Income Summary</Text>
            <Text style={styles.budgetName}>{selectedBudget.name}</Text>
          </View>
          <Text style={styles.timeRangeLabel}>
            {selectedTimeRange.charAt(0).toUpperCase() + selectedTimeRange.slice(1)}
          </Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Expected</Text>
            <Text style={styles.statValue}>{formatCurrency(totalStats.expectedTotal)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Actual</Text>
            <Text style={styles.statValue}>{formatCurrency(totalStats.actualTotal)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Variance</Text>
            <Text style={[styles.statValue, { color: getVarianceColor(totalStats.variance) }]}>
              {totalStats.variance > 0 ? '+' : ''}{formatCurrency(totalStats.variance)}
            </Text>
            <Text style={[styles.statPercent, { color: getVarianceColor(totalStats.variance) }]}>
              ({totalStats.variancePercent > 0 ? '+' : ''}{totalStats.variancePercent.toFixed(1)}%)
            </Text>
          </View>
        </View>
      </Card>

      {/* Time Range Selector */}
      {renderTimeRangeSelector()}

      {/* History List */}
      <SectionList
        sections={historySections}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>No income history for this period</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// Mock data generator for testing - generates limited realistic data
function generateMockIncomeTransactions(budgetId: string): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Generate fewer mock income transactions for the last 2 months only
  for (let i = 0; i < 8; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7)); // Weekly transactions
    
    // Only add transactions if the date is in the last 2 months
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    if (date > twoMonthsAgo && Math.random() > 0.3) { // 70% chance of having received income
      transactions.push({
        id: `mock_${budgetId}_${i}`, // Include budget ID to make it unique per budget
        budget_id: budgetId,
        transaction_type: 'income',
        amount: 1000 + (Math.random() * 100 - 50), // $950-$1050 (smaller variance)
        description: i % 2 === 0 ? 'Salary Payment' : 'Bonus Payment',
        transaction_date: date.toISOString(),
        is_cleared: true,
        from_envelope_id: null,
        to_envelope_id: null,
        payee_id: null,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
      });
    }
  }
  
  return transactions;
}

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
    summaryCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    summaryHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginBottom: spacing.md,
    },
    summaryTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    budgetName: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    timeRangeLabel: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '500' as const,
      backgroundColor: theme.primaryLight + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    summaryStats: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    statItem: {
      alignItems: 'center' as const,
      flex: 1,
    },
    statLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
    },
    statValue: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '700' as const,
    },
    statPercent: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
    timeRangeContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      maxHeight: 50,
    },
    timeRangeButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 36,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    selectedTimeRange: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    timeRangeText: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      fontSize: 14,
    },
    selectedTimeRangeText: {
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    listContent: {
      paddingBottom: spacing.xl,
    },
    sectionHeader: {
      backgroundColor: theme.background,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    sectionTotals: {
      alignItems: 'flex-end' as const,
    },
    sectionTotal: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    historyItem: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    historyItemLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    historyItemInfo: {
      marginLeft: spacing.md,
      flex: 1,
    },
    historyItemName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    historyItemDate: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    historyItemRight: {
      alignItems: 'flex-end' as const,
    },
    expectedAmount: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    actualAmount: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    variance: {
      ...typography.caption,
      fontWeight: '600' as const,
      marginTop: spacing.xs,
    },
    emptyListContainer: {
      paddingVertical: spacing.xl,
      alignItems: 'center' as const,
    },
    emptyListText: {
      ...typography.body,
      color: theme.textTertiary,
    },
  });
}

export default IncomeHistoryScreen;