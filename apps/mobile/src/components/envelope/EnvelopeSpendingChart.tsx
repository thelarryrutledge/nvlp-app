/**
 * Envelope Spending Chart Component
 * 
 * Displays spending patterns and trends for a specific envelope
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../ui';
import { transactionService } from '../../services/api/transactionService';
import type { Transaction } from '@nvlp/types';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - (spacing.lg * 2) - (spacing.lg * 2); // Account for card padding

export type ChartType = 'line' | 'bar' | 'pie';
export type TimePeriod = '7d' | '30d' | '3m' | '6m' | '1y';

interface EnvelopeSpendingChartProps {
  envelopeId: string;
  chartType?: ChartType;
  timePeriod?: TimePeriod;
  showControls?: boolean;
  height?: number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity?: number) => string;
    strokeWidth?: number;
  }>;
}

interface PieChartData {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

export const EnvelopeSpendingChart: React.FC<EnvelopeSpendingChartProps> = ({
  envelopeId,
  chartType = 'line',
  timePeriod = '30d',
  showControls = true,
  height = 220,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(chartType);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>(timePeriod);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await transactionService.getEnvelopeTransactions(envelopeId, 1000);
      setTransactions(response.transactions);
    } catch (error: any) {
      setError(error.message || 'Failed to load transaction data');
      console.error('EnvelopeSpendingChart error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (envelopeId) {
      loadTransactions();
    }
  }, [envelopeId]);

  const getDateRange = (period: TimePeriod): { start: Date; end: Date } => {
    const end = new Date();
    let start: Date;

    switch (period) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '3m':
        start = subMonths(end, 3);
        break;
      case '6m':
        start = subMonths(end, 6);
        break;
      case '1y':
        start = subMonths(end, 12);
        break;
      default:
        start = subDays(end, 30);
    }

    return { start, end };
  };

  const filterTransactionsByPeriod = (transactions: Transaction[], period: TimePeriod): Transaction[] => {
    const { start, end } = getDateRange(period);
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      return transactionDate >= start && transactionDate <= end;
    });
  };

  const prepareLineChartData = (transactions: Transaction[], period: TimePeriod): ChartData => {
    const { start, end } = getDateRange(period);
    const filteredTransactions = filterTransactionsByPeriod(transactions, period);
    
    // Group transactions by date for daily view or by month for longer periods
    const isMonthlyView = period === '6m' || period === '1y';
    const timeIntervals = isMonthlyView 
      ? eachMonthOfInterval({ start, end })
      : eachDayOfInterval({ start, end });

    const spendingByInterval = timeIntervals.map(interval => {
      const intervalStart = isMonthlyView ? startOfMonth(interval) : interval;
      const intervalEnd = isMonthlyView ? endOfMonth(interval) : interval;
      
      const intervalTransactions = filteredTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_date);
        return transactionDate >= intervalStart && transactionDate <= intervalEnd;
      });

      // Calculate spending (outflows from envelope)
      const spending = intervalTransactions
        .filter(transaction => transaction.from_envelope_id === envelopeId && transaction.transaction_type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        date: interval,
        spending: Math.abs(spending), // Make positive for display
      };
    });

    const labels = spendingByInterval.map(item => 
      isMonthlyView 
        ? format(item.date, 'MMM')
        : format(item.date, period === '7d' ? 'EEE' : 'M/d')
    );

    const data = spendingByInterval.map(item => item.spending);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(${hexToRgb(theme.primary)}, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const prepareBarChartData = (transactions: Transaction[], period: TimePeriod): ChartData => {
    return prepareLineChartData(transactions, period); // Same data structure
  };

  const preparePieChartData = (transactions: Transaction[], period: TimePeriod): PieChartData[] => {
    const filteredTransactions = filterTransactionsByPeriod(transactions, period);
    
    // Group by transaction type for pie chart
    const groupedData = filteredTransactions.reduce((acc, transaction) => {
      const isInflow = transaction.to_envelope_id === envelopeId;
      const isOutflow = transaction.from_envelope_id === envelopeId;
      
      if (isInflow) {
        const type = transaction.transaction_type === 'allocation' ? 'Funding' : 'Transfer In';
        acc[type] = (acc[type] || 0) + transaction.amount;
      } else if (isOutflow) {
        const type = transaction.transaction_type === 'expense' ? 'Spending' : 'Transfer Out';
        acc[type] = (acc[type] || 0) + Math.abs(transaction.amount);
      }
      
      return acc;
    }, {} as Record<string, number>);

    const colors = [theme.primary, theme.success, theme.warning, theme.error];
    
    return Object.entries(groupedData).map(([name, amount], index) => ({
      name,
      amount,
      color: colors[index % colors.length] || theme.primary,
      legendFontColor: theme.textSecondary,
      legendFontSize: 12,
    }));
  };

  const hexToRgb = (hex: string | undefined): string => {
    if (!hex) return '0, 0, 0';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const chartConfig = {
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    color: (opacity = 1) => `rgba(${hexToRgb(theme.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${hexToRgb(theme.textSecondary)}, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 12,
    },
  };

  const renderChart = () => {
    if (transactions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="analytics-outline" size={48} color={theme.textTertiary} />
          <Text style={styles.emptyStateText}>No transaction data available</Text>
          <Text style={styles.emptyStateSubtext}>
            Transactions will appear here once you start using this envelope
          </Text>
        </View>
      );
    }

    // Temporary fallback: Show simple data instead of charts
    const filteredTransactions = filterTransactionsByPeriod(transactions, selectedTimePeriod);
    const totalSpending = filteredTransactions
      .filter(transaction => transaction.from_envelope_id === envelopeId && transaction.transaction_type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    const totalFunding = filteredTransactions
      .filter(transaction => transaction.to_envelope_id === envelopeId)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return (
      <View style={styles.fallbackChart}>
        <Text style={styles.fallbackTitle}>Spending Analysis</Text>
        <Text style={styles.fallbackSubtitle}>({selectedTimePeriod.toUpperCase()} period)</Text>
        
        <View style={styles.fallbackStats}>
          <View style={styles.fallbackStat}>
            <Text style={styles.fallbackStatLabel}>Total Spending</Text>
            <Text style={[styles.fallbackStatValue, { color: theme.error }]}>
              {formatCurrency(Math.abs(totalSpending))}
            </Text>
          </View>
          
          <View style={styles.fallbackStat}>
            <Text style={styles.fallbackStatLabel}>Total Funding</Text>
            <Text style={[styles.fallbackStatValue, { color: theme.success }]}>
              {formatCurrency(totalFunding)}
            </Text>
          </View>
          
          <View style={styles.fallbackStat}>
            <Text style={styles.fallbackStatLabel}>Net Flow</Text>
            <Text style={[styles.fallbackStatValue, { 
              color: (totalFunding - Math.abs(totalSpending)) >= 0 ? theme.success : theme.error 
            }]}>
              {formatCurrency(totalFunding - Math.abs(totalSpending))}
            </Text>
          </View>
        </View>
        
        <Text style={styles.fallbackNote}>
          📊 Chart visualization coming soon - SVG support needed
        </Text>
      </View>
    );
  };

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <View style={styles.controls}>
        {/* Chart Type Controls */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Chart Type</Text>
          <View style={styles.buttonGroup}>
            {(['line', 'bar', 'pie'] as ChartType[]).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.controlButton,
                  selectedChartType === type && styles.controlButtonActive
                ]}
                onPress={() => setSelectedChartType(type)}
              >
                <Text style={[
                  styles.controlButtonText,
                  selectedChartType === type && styles.controlButtonTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Period Controls */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Time Period</Text>
          <View style={styles.buttonGroup}>
            {([
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: '3m', label: '3M' },
              { key: '6m', label: '6M' },
              { key: '1y', label: '1Y' },
            ] as Array<{ key: TimePeriod; label: string }>).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.controlButton,
                  selectedTimePeriod === key && styles.controlButtonActive
                ]}
                onPress={() => setSelectedTimePeriod(key)}
              >
                <Text style={[
                  styles.controlButtonText,
                  selectedTimePeriod === key && styles.controlButtonTextActive
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <Card variant="elevated" padding="large">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading chart data...</Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" padding="large">
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTransactions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="large">
      <View style={styles.header}>
        <Text style={styles.title}>Spending Analysis</Text>
        <Icon name="analytics-outline" size={24} color={theme.primary} />
      </View>
      
      {renderControls()}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>
      </ScrollView>
    </Card>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.md,
    },
    errorContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    errorText: {
      ...typography.body,
      color: theme.error,
      textAlign: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    retryButtonText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '600',
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
    controls: {
      marginBottom: spacing.lg,
    },
    controlSection: {
      marginBottom: spacing.md,
    },
    controlLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    controlButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    controlButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    controlButtonText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    controlButtonTextActive: {
      color: theme.textOnPrimary,
    },
    chartContainer: {
      alignItems: 'center',
    },
    chart: {
      borderRadius: 8,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      width: chartWidth,
    },
    emptyStateText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      ...typography.caption,
      color: theme.textTertiary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    fallbackChart: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      width: chartWidth,
    },
    fallbackTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    fallbackSubtitle: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.lg,
    },
    fallbackStats: {
      width: '100%',
      marginBottom: spacing.lg,
    },
    fallbackStat: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    fallbackStatLabel: {
      ...typography.body,
      color: theme.textSecondary,
    },
    fallbackStatValue: {
      ...typography.h4,
      fontWeight: '600',
    },
    fallbackNote: {
      ...typography.caption,
      color: theme.textTertiary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
}

export default EnvelopeSpendingChart;