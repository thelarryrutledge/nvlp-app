import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { Payee } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  PayeeHistory: { payeeId: string };
  PayeeDetail: { payeeId: string };
};

type PayeeHistoryScreenNavigationProp = NavigationProp<RootStackParamList, 'PayeeHistory'>;
type PayeeHistoryScreenRouteProp = RouteProp<RootStackParamList, 'PayeeHistory'>;

// Mock transaction type until API is available
interface MockTransaction {
  id: string;
  date: string;
  amount: number;
  envelope: string;
  description?: string;
  type: 'expense' | 'income';
}

// Mock data generator
const generateMockTransactions = (payeeId: string): MockTransaction[] => {
  const envelopes = ['Groceries', 'Utilities', 'Entertainment', 'Transport', 'Healthcare'];
  const transactions: MockTransaction[] = [];
  
  // Generate 20 mock transactions over the past 6 months
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    transactions.push({
      id: `mock-${payeeId}-${i}`,
      date: date.toISOString(),
      amount: Math.round((Math.random() * 200 + 10) * 100) / 100,
      envelope: envelopes[Math.floor(Math.random() * envelopes.length)],
      description: i % 3 === 0 ? 'Regular payment' : undefined,
      type: 'expense',
    });
  }
  
  return transactions.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const PayeeHistoryScreen: React.FC = () => {
  const navigation = useNavigation<PayeeHistoryScreenNavigationProp>();
  const route = useRoute<PayeeHistoryScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const payeeId = route.params.payeeId;

  const [payee, setPayee] = useState<Payee | null>(null);
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      
      // Load payee details
      const payeeData = await client.getPayee(payeeId);
      setPayee(payeeData);
      
      // Load mock transactions for now
      const mockTxns = generateMockTransactions(payeeId);
      setTransactions(mockTxns);
    } catch (err) {
      console.error('Failed to load payee history:', err);
      setError('Failed to load spending history. Please try again.');
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

  // Filter transactions by period
  const filteredTransactions = React.useMemo(() => {
    if (selectedPeriod === 'all') return transactions;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return transactions.filter(t => new Date(t.date) >= cutoffDate);
  }, [transactions, selectedPeriod]);

  // Calculate spending summary
  const spendingSummary = React.useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const average = filteredTransactions.length > 0 ? total / filteredTransactions.length : 0;
    const count = filteredTransactions.length;
    
    // Group by envelope
    const byEnvelope = filteredTransactions.reduce((acc, t) => {
      if (!acc[t.envelope]) {
        acc[t.envelope] = { total: 0, count: 0 };
      }
      acc[t.envelope].total += t.amount;
      acc[t.envelope].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    return { total, average, count, byEnvelope };
  }, [filteredTransactions]);

  const renderPeriodSelector = () => {
    const periods: Array<{ key: typeof selectedPeriod; label: string }> = [
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' },
      { key: 'all', label: 'All' },
    ];

    return (
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              {
                backgroundColor: selectedPeriod === period.key ? '#10B981' : theme.surface,
              },
            ]}
            onPress={() => setSelectedPeriod(period.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodButtonText,
                {
                  color: selectedPeriod === period.key ? 'white' : theme.textPrimary,
                },
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSummaryCard = () => (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
      <View style={styles.summaryHeader}>
        <Icon name="analytics" size={24} color="#10B981" />
        <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>
          Spending Summary
        </Text>
      </View>
      
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            ${spendingSummary.total.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Spent
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            ${spendingSummary.average.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Average
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {spendingSummary.count}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Transactions
          </Text>
        </View>
      </View>

      {Object.keys(spendingSummary.byEnvelope).length > 0 && (
        <View style={styles.envelopeBreakdown}>
          <Text style={[styles.breakdownTitle, { color: theme.textSecondary }]}>
            By Envelope
          </Text>
          {Object.entries(spendingSummary.byEnvelope)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 3)
            .map(([envelope, data]) => (
              <View key={envelope} style={styles.envelopeItem}>
                <Text style={[styles.envelopeName, { color: theme.textPrimary }]}>
                  {envelope}
                </Text>
                <Text style={[styles.envelopeAmount, { color: theme.textSecondary }]}>
                  ${data.total.toFixed(2)} ({data.count})
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const renderTransaction = ({ item }: { item: MockTransaction }) => {
    const date = new Date(item.date);
    const isToday = new Date().toDateString() === date.toDateString();
    const dateStr = isToday 
      ? 'Today' 
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return (
      <View style={[styles.transactionItem, { backgroundColor: theme.surface }]}>
        <View style={styles.transactionLeft}>
          <View style={[styles.envelopeIcon, { backgroundColor: '#10B98120' }]}>
            <Icon name="folder" size={16} color="#10B981" />
          </View>
          <View style={styles.transactionDetails}>
            <Text style={[styles.transactionEnvelope, { color: theme.textPrimary }]}>
              {item.envelope}
            </Text>
            {item.description && (
              <Text style={[styles.transactionDescription, { color: theme.textSecondary }]}>
                {item.description}
              </Text>
            )}
            <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
              {dateStr}
            </Text>
          </View>
        </View>
        <Text style={[styles.transactionAmount, { color: '#DC2626' }]}>
          -${item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <LoadingState message="Loading spending history..." />;
  }

  if (error || !payee) {
    return <ErrorState message={error || 'Payee not found'} onRetry={loadData} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          <Text style={[styles.payeeName, { color: theme.textPrimary }]}>
            {payee.name}
          </Text>
        </View>
        {renderPeriodSelector()}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderSummaryCard}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title="No transactions yet"
            message={`No spending history found for the selected period.`}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <Icon name="info-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Transaction history will be available once transaction management is implemented
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
  },
  payeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  payeeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payeeName: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  envelopeBreakdown: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  envelopeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  envelopeName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  envelopeAmount: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  envelopeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionEnvelope: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '400' as const,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  separator: {
    height: 8,
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