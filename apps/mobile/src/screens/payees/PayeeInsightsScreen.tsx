import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApiClient } from '../../hooks/useApiClient';
import { ErrorState, LoadingState } from '../../components/ui';
import { Payee } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  PayeeInsights: { payeeId: string };
  PayeeDetail: { payeeId: string };
  PayeeHistory: { payeeId: string };
};

type PayeeInsightsScreenNavigationProp = NavigationProp<RootStackParamList, 'PayeeInsights'>;
type PayeeInsightsScreenRouteProp = RouteProp<RootStackParamList, 'PayeeInsights'>;

// Mock insights data structure
interface PayeeInsights {
  averageTransaction: number;
  monthlyAverage: number;
  yearlyProjection: number;
  frequencyDays: number;
  mostCommonDay: string;
  mostCommonAmount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  categoryBreakdown: Array<{
    name: string;
    percentage: number;
    amount: number;
  }>;
  monthlySpending: Array<{
    month: string;
    amount: number;
  }>;
}

// Generate mock insights
const generateMockInsights = (payee: Payee): PayeeInsights => {
  const avgTransaction = 45.67;
  const monthlyAvg = 182.68;
  
  return {
    averageTransaction: avgTransaction,
    monthlyAverage: monthlyAvg,
    yearlyProjection: monthlyAvg * 12,
    frequencyDays: 7,
    mostCommonDay: 'Friday',
    mostCommonAmount: 35.00,
    trend: Math.random() > 0.5 ? 'increasing' : Math.random() > 0.5 ? 'decreasing' : 'stable',
    trendPercentage: Math.round(Math.random() * 20),
    categoryBreakdown: [
      { name: 'Groceries', percentage: 45, amount: 82.21 },
      { name: 'Dining', percentage: 30, amount: 54.80 },
      { name: 'Other', percentage: 25, amount: 45.67 },
    ],
    monthlySpending: [
      { month: 'Jan', amount: 156.78 },
      { month: 'Feb', amount: 189.45 },
      { month: 'Mar', amount: 145.23 },
      { month: 'Apr', amount: 201.56 },
      { month: 'May', amount: 178.90 },
      { month: 'Jun', amount: 195.12 },
    ],
  };
};

export const PayeeInsightsScreen: React.FC = () => {
  const navigation = useNavigation<PayeeInsightsScreenNavigationProp>();
  const route = useRoute<PayeeInsightsScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const payeeId = route.params.payeeId;

  const [payee, setPayee] = useState<Payee | null>(null);
  const [insights, setInsights] = useState<PayeeInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      
      // Load payee details
      const payeeData = await client.getPayee(payeeId);
      setPayee(payeeData);
      
      // Generate mock insights
      const mockInsights = generateMockInsights(payeeData);
      setInsights(mockInsights);
    } catch (err) {
      console.error('Failed to load payee insights:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [payeeId, client]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const renderTrendCard = () => {
    if (!insights) return null;

    const trendIcon = insights.trend === 'increasing' ? 'trending-up' : 
                     insights.trend === 'decreasing' ? 'trending-down' : 'trending-flat';
    const trendColor = insights.trend === 'increasing' ? '#DC2626' : 
                      insights.trend === 'decreasing' ? '#059669' : '#F59E0B';

    return (
      <View style={[styles.trendCard, { backgroundColor: theme.surface }]}>
        <View style={styles.trendHeader}>
          <Icon name={trendIcon} size={32} color={trendColor} />
          <View style={styles.trendInfo}>
            <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>
              Spending Trend
            </Text>
            <View style={styles.trendDetails}>
              <Text style={[styles.trendValue, { color: trendColor }]}>
                {insights.trend === 'stable' ? 'Stable' : 
                 `${insights.trend === 'increasing' ? '+' : '-'}${insights.trendPercentage}%`}
              </Text>
              <Text style={[styles.trendPeriod, { color: theme.textSecondary }]}>
                vs last 3 months
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.trendDescription, { color: theme.textSecondary }]}>
          {insights.trend === 'increasing' 
            ? 'You\'re spending more with this payee recently'
            : insights.trend === 'decreasing'
            ? 'Your spending with this payee is decreasing'
            : 'Your spending pattern is consistent'}
        </Text>
      </View>
    );
  };

  const renderKeyMetrics = () => {
    if (!insights) return null;

    return (
      <View style={[styles.metricsGrid]}>
        <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
          <Icon name="attach-money" size={24} color="#10B981" />
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
            ${insights.averageTransaction.toFixed(2)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Avg Transaction
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
          <Icon name="calendar-today" size={24} color="#3B82F6" />
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
            Every {insights.frequencyDays} days
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Frequency
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
          <Icon name="event" size={24} color="#8B5CF6" />
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
            {insights.mostCommonDay}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Most Common Day
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
          <Icon name="trending-up" size={24} color="#F59E0B" />
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
            ${insights.yearlyProjection.toFixed(0)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Yearly Projection
          </Text>
        </View>
      </View>
    );
  };

  const renderMonthlyChart = () => {
    if (!insights) return null;

    const maxAmount = Math.max(...insights.monthlySpending.map(m => m.amount));

    return (
      <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
          Monthly Spending Trend
        </Text>
        <View style={styles.chart}>
          {insights.monthlySpending.map((month, index) => {
            const height = (month.amount / maxAmount) * 120;
            return (
              <View key={month.month} style={styles.chartBar}>
                <Text style={[styles.chartAmount, { color: theme.textSecondary }]}>
                  ${Math.round(month.amount)}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: '#10B981',
                    },
                  ]}
                />
                <Text style={[styles.chartMonth, { color: theme.textSecondary }]}>
                  {month.month}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => {
    if (!insights) return null;

    return (
      <View style={[styles.breakdownCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.breakdownTitle, { color: theme.textPrimary }]}>
          Spending by Category
        </Text>
        {insights.categoryBreakdown.map((category, index) => (
          <View key={category.name} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, { color: theme.textPrimary }]}>
                {category.name}
              </Text>
              <Text style={[styles.categoryAmount, { color: theme.textSecondary }]}>
                ${category.amount.toFixed(2)}/mo
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${category.percentage}%`,
                      backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6'][index],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.categoryPercentage, { color: theme.textSecondary }]}>
                {category.percentage}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderInsightTips = () => (
    <View style={[styles.tipsCard, { backgroundColor: '#10B98110' }]}>
      <View style={styles.tipsHeader}>
        <Icon name="lightbulb" size={20} color="#10B981" />
        <Text style={[styles.tipsTitle, { color: '#047857' }]}>
          Smart Insights
        </Text>
      </View>
      <Text style={[styles.tipText, { color: '#047857' }]}>
        • Consider setting up a recurring budget for this regular expense
      </Text>
      <Text style={[styles.tipText, { color: '#047857' }]}>
        • Your spending peaks on {insights?.mostCommonDay}s - plan accordingly
      </Text>
      <Text style={[styles.tipText, { color: '#047857' }]}>
        • Average transaction of ${insights?.averageTransaction.toFixed(2)} is within typical range
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingState message="Analyzing spending patterns..." />;
  }

  if (error || !payee || !insights) {
    return <ErrorState message={error || 'Unable to load insights'} onRetry={loadData} />;
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 20 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.payeeHeader, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.payeeIcon,
              { backgroundColor: payee.color || '#10B981' },
            ]}
          >
            <Icon name={payee.icon || 'person'} size={20} color="white" />
          </View>
          <View style={styles.payeeInfo}>
            <Text style={[styles.payeeName, { color: theme.textPrimary }]}>
              {payee.name} Insights
            </Text>
            <Text style={[styles.insightsPeriod, { color: theme.textSecondary }]}>
              Based on last 6 months
            </Text>
          </View>
        </View>
      </View>

      {renderTrendCard()}
      {renderKeyMetrics()}
      {renderMonthlyChart()}
      {renderCategoryBreakdown()}
      {renderInsightTips()}

      <TouchableOpacity
        style={[styles.historyButton, { backgroundColor: theme.surface }]}
        onPress={() => navigation.navigate('PayeeHistory', { payeeId })}
        activeOpacity={0.7}
      >
        <Icon name="history" size={20} color="#10B981" />
        <Text style={[styles.historyButtonText, { color: theme.textPrimary }]}>
          View Full Transaction History
        </Text>
        <Icon name="chevron-right" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <Icon name="info-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Insights based on mock data. Real analytics coming soon!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 20,
  },
  payeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  payeeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payeeInfo: {
    flex: 1,
  },
  payeeName: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  insightsPeriod: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  trendCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '400' as const,
    marginBottom: 4,
  },
  trendDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  trendValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginRight: 8,
  },
  trendPeriod: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  trendDescription: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '60%',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartAmount: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  chartMonth: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  breakdownCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercentage: {
    fontSize: 13,
    fontWeight: '500' as const,
    width: 35,
    textAlign: 'right',
  },
  tipsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    marginBottom: 6,
  },
  historyButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  historyButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '400' as const,
    textAlign: 'center',
  },
});