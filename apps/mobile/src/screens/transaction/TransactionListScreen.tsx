import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  NavigationProp,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudget } from '../../context/BudgetContext';
import { useApiClient } from '../../hooks/useApiClient';
import { LoadingState, EmptyState } from '../../components/ui';
import { TransactionFilterBottomSheet, TransactionFilters } from '../../components/transaction';
import { useTheme } from '../../theme';
import type { Transaction } from '@nvlp/types';

type RootStackParamList = {
  TransactionList: undefined;
  TransactionForm: { transactionId?: string };
  TransactionDetail: { transactionId: string };
  QuickTransactionEntry: undefined;
};

type TransactionListNavigationProp = NavigationProp<RootStackParamList, 'TransactionList'>;

interface TransactionWithDetails extends Transaction {
  envelope_name?: string;
  payee_name?: string;
  income_source_name?: string;
  from_envelope_name?: string;
  to_envelope_name?: string;
}

export const TransactionListScreen: React.FC = () => {
  const navigation = useNavigation<TransactionListNavigationProp>();
  const insets = useSafeAreaInsets();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [envelopes, setEnvelopes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    startDate: null,
    endDate: null,
    transactionTypes: [],
    envelopeIds: [],
  });

  const ITEMS_PER_PAGE = 20;

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [selectedBudget])
  );

  // Reload transactions when filters change (skip initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (selectedBudget?.id) {
      loadTransactions(false, 1);
    }
  }, [filters]);

  const loadInitialData = async () => {
    if (!selectedBudget?.id) return;

    try {
      // Load envelopes for filter
      const envelopesData = await client.getEnvelopes(selectedBudget.id);
      setEnvelopes(envelopesData || []);
      
      // Load transactions
      await loadTransactions();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadTransactions = async (isRefresh = false, pageNum = 1) => {
    if (!selectedBudget?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const authState = client.getAuthState();
      if (!authState?.accessToken) {
        throw new Error('Not authenticated');
      }

      // Calculate offset
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;

      // Build filter query
      let filterQuery = `budget_id=eq.${selectedBudget.id}`;
      
      // Add date filters
      if (filters.startDate) {
        const startDateStr = filters.startDate.toISOString().split('T')[0];
        filterQuery += `&transaction_date=gte.${startDateStr}`;
      }
      if (filters.endDate) {
        const endDateStr = filters.endDate.toISOString().split('T')[0];
        filterQuery += `&transaction_date=lte.${endDateStr}`;
      }
      
      // Add transaction type filter
      if (filters.transactionTypes.length > 0) {
        const typeFilter = filters.transactionTypes.map(t => `transaction_type.eq.${t}`).join(',');
        filterQuery += `&or=(${typeFilter})`;
      }
      
      // Add envelope filter
      if (filters.envelopeIds.length > 0) {
        const envelopeFilter = filters.envelopeIds.map(id => 
          `from_envelope_id.eq.${id},to_envelope_id.eq.${id}`
        ).join(',');
        filterQuery += `&or=(${envelopeFilter})`;
      }

      // Fetch transactions with pagination and filters
      const response = await fetch(
        `https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/transactions?${filterQuery}&order=transaction_date.desc,created_at.desc&limit=${ITEMS_PER_PAGE}&offset=${offset}&select=*,envelopes!from_envelope_id(name),to_envelopes:envelopes!to_envelope_id(name),payees(name),income_sources(name)`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.accessToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
            'Prefer': 'count=exact',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();
      const totalCount = parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
      
      // Transform the data to include names
      const transformedTransactions: TransactionWithDetails[] = data.map((t: any) => ({
        ...t,
        envelope_name: t.envelopes?.name,
        from_envelope_name: t.envelopes?.name,
        to_envelope_name: t.to_envelopes?.name,
        payee_name: t.payees?.name,
        income_source_name: t.income_sources?.name,
      }));

      if (pageNum === 1) {
        setTransactions(transformedTransactions);
      } else {
        setTransactions(prev => [...prev, ...transformedTransactions]);
      }

      setPage(pageNum);
      setHasMore(offset + data.length < totalCount);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    loadTransactions(true, 1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(false, page + 1);
    }
  };

  const handleApplyFilters = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const hasActiveFilters = () => {
    return (
      filters.startDate !== null ||
      filters.endDate !== null ||
      filters.transactionTypes.length > 0 ||
      filters.envelopeIds.length > 0
    );
  };

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;

    const query = searchQuery.toLowerCase();
    return transactions.filter(transaction => {
      const description = transaction.description?.toLowerCase() || '';
      const payeeName = transaction.payee_name?.toLowerCase() || '';
      const incomeSourceName = transaction.income_source_name?.toLowerCase() || '';
      const envelopeName = transaction.envelope_name?.toLowerCase() || '';
      const fromEnvelopeName = transaction.from_envelope_name?.toLowerCase() || '';
      const toEnvelopeName = transaction.to_envelope_name?.toLowerCase() || '';
      const amount = transaction.amount.toString();

      return (
        description.includes(query) ||
        payeeName.includes(query) ||
        incomeSourceName.includes(query) ||
        envelopeName.includes(query) ||
        fromEnvelopeName.includes(query) ||
        toEnvelopeName.includes(query) ||
        amount.includes(query)
      );
    });
  }, [transactions, searchQuery]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getTransactionIcon = (transaction: TransactionWithDetails): string => {
    switch (transaction.transaction_type) {
      case 'income':
        return 'add-circle';
      case 'expense':
        return 'remove-circle';
      case 'transfer':
        return 'swap-horiz';
      case 'allocation':
        return 'account-balance-wallet';
      default:
        return 'attach-money';
    }
  };

  const getTransactionColor = (transaction: TransactionWithDetails): string => {
    switch (transaction.transaction_type) {
      case 'income':
        return '#10B981';
      case 'expense':
        return '#EF4444';
      case 'transfer':
        return '#3B82F6';
      case 'allocation':
        return '#8B5CF6';
      default:
        return theme.textSecondary;
    }
  };

  const getTransactionSubtext = (transaction: TransactionWithDetails): string => {
    switch (transaction.transaction_type) {
      case 'income':
        return transaction.income_source_name || 'Income';
      case 'expense':
        return `${transaction.payee_name || 'Unknown'} • ${transaction.envelope_name || 'Unknown'}`;
      case 'transfer':
        return `${transaction.from_envelope_name || 'Unknown'} → ${transaction.to_envelope_name || 'Unknown'}`;
      case 'allocation':
        return `To ${transaction.to_envelope_name || 'Unknown'}`;
      default:
        return '';
    }
  };

  const renderTransaction = ({ item }: { item: TransactionWithDetails }) => {
    const transactionColor = getTransactionColor(item);
    
    return (
      <TouchableOpacity
        style={[styles.transactionItem, { backgroundColor: theme.surface }]}
        onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.transactionLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${transactionColor}20` }]}>
            <Icon name={getTransactionIcon(item)} size={24} color={transactionColor} />
          </View>
          <View style={styles.transactionDetails}>
            <Text style={[styles.transactionDescription, { color: theme.textPrimary }]} numberOfLines={1}>
              {item.description || getTransactionSubtext(item)}
            </Text>
            <Text style={[styles.transactionSubtext, { color: theme.textSecondary }]} numberOfLines={1}>
              {getTransactionSubtext(item)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: transactionColor }]}>
            {item.transaction_type === 'expense' ? '-' : '+'}${item.amount.toFixed(2)}
          </Text>
          <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
            {formatDate(item.transaction_date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Icon name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search transactions..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilterSheet(true)}
        >
          <Icon 
            name="filter-list" 
            size={20} 
            color={hasActiveFilters() ? '#10B981' : theme.textSecondary} 
          />
          {hasActiveFilters() && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {filters.transactionTypes.length + filters.envelopeIds.length + (filters.startDate ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  };

  if (loading) {
    return <LoadingState message="Loading transactions..." />;
  }

  if (transactions.length === 0 && !searchQuery) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          icon="receipt-long"
          title="No transactions yet"
          subtitle="Add your first transaction to get started"
          actionLabel="Add Transaction"
          onAction={() => navigation.navigate('QuickTransactionEntry')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon="search-off"
          title="No transactions found"
          subtitle={`No transactions match "${searchQuery}"`}
        />
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.textSecondary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('QuickTransactionEntry')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Filter Bottom Sheet */}
      <TransactionFilterBottomSheet
        isVisible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        envelopes={envelopes}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginHorizontal: 12,
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionSubtext: {
    fontSize: 14,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});