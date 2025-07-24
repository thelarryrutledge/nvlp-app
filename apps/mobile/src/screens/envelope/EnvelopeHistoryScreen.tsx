/**
 * Envelope History Screen
 * 
 * Displays transaction history for a specific envelope with filtering and search
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
  TextInput,
  SectionList,
  SectionListData,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { format, parseISO, startOfDay, isToday, isYesterday, subDays } from 'date-fns';

import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { transactionService } from '../../services/api/transactionService';
import { envelopeService } from '../../services/api/envelopeService';
import type { Transaction, Envelope } from '@nvlp/types';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

type EnvelopeHistoryRouteProp = RouteProp<MainStackParamList, 'EnvelopeHistory'>;

interface TransactionGroup {
  title: string;
  data: Transaction[];
}

type FilterType = 'all' | 'income' | 'expense' | 'transfer' | 'allocation';
type SortOrder = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

export const EnvelopeHistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<EnvelopeHistoryRouteProp>();
  const { envelopeId } = route.params;

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<TransactionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Load envelope and transactions in parallel
      const [envelopeData, transactionData] = await Promise.all([
        envelopeService.getEnvelope(envelopeId),
        transactionService.getEnvelopeTransactions(envelopeId, 500), // Get up to 500 transactions
      ]);

      setEnvelope(envelopeData);
      setTransactions(transactionData.transactions);
      filterAndSortTransactions(transactionData.transactions, searchQuery, filterType, sortOrder);
    } catch (error: any) {
      setError(error.message || 'Failed to load transaction history');
      console.error('EnvelopeHistory error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [envelopeId, searchQuery, filterType, sortOrder]);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filterAndSortTransactions = (
    trans: Transaction[],
    query: string,
    filter: FilterType,
    sort: SortOrder
  ) => {
    let filtered = [...trans];

    // Apply search filter
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(query)
      );
    }

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(t => {
        switch (filter) {
          case 'income':
            return t.transaction_type === 'income' && t.to_envelope_id === envelopeId;
          case 'expense':
            return t.transaction_type === 'expense' && t.from_envelope_id === envelopeId;
          case 'transfer':
            return t.transaction_type === 'transfer' && 
              (t.from_envelope_id === envelopeId || t.to_envelope_id === envelopeId);
          case 'allocation':
            return t.transaction_type === 'allocation' && t.to_envelope_id === envelopeId;
          default:
            return true;
        }
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        case 'oldest':
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        case 'amount_high':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount_low':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);
    groupTransactionsByDate(filtered);
  };

  const groupTransactionsByDate = (trans: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};

    trans.forEach(transaction => {
      const date = parseISO(transaction.transaction_date);
      const startOfDayDate = startOfDay(date);
      
      let groupKey: string;
      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else {
        groupKey = format(date, 'MMMM d, yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
    });

    const groupedData: TransactionGroup[] = Object.entries(groups).map(([title, data]) => ({
      title,
      data,
    }));

    setGroupedTransactions(groupedData);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterAndSortTransactions(transactions, query, filterType, sortOrder);
  };

  const handleFilterChange = (filter: FilterType) => {
    setFilterType(filter);
    filterAndSortTransactions(transactions, searchQuery, filter, sortOrder);
  };

  const handleSortChange = (sort: SortOrder) => {
    setSortOrder(sort);
    filterAndSortTransactions(transactions, searchQuery, filterType, sort);
    setShowFilters(false);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const getTransactionIcon = (transaction: Transaction): string => {
    switch (transaction.transaction_type) {
      case 'income':
        return 'arrow-down-circle-outline';
      case 'expense':
        return 'arrow-up-circle-outline';
      case 'transfer':
        return 'swap-horizontal-outline';
      case 'allocation':
        return 'add-circle-outline';
      default:
        return 'cash-outline';
    }
  };

  const getTransactionColor = (transaction: Transaction): string => {
    const isInflow = transaction.to_envelope_id === envelopeId;
    
    if (transaction.transaction_type === 'transfer') {
      return theme.primary;
    }
    
    return isInflow ? theme.success : theme.error;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatTransactionAmount = (transaction: Transaction): string => {
    const isInflow = transaction.to_envelope_id === envelopeId;
    const prefix = isInflow ? '+' : '-';
    return prefix + formatCurrency(Math.abs(transaction.amount));
  };

  const getTransactionDescription = (transaction: Transaction): string => {
    if (transaction.description) {
      return transaction.description;
    }

    switch (transaction.transaction_type) {
      case 'allocation':
        return 'Budget Allocation';
      case 'transfer':
        return transaction.to_envelope_id === envelopeId ? 'Transfer In' : 'Transfer Out';
      case 'income':
        return 'Income';
      case 'expense':
        return 'Expense';
      default:
        return 'Transaction';
    }
  };

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const isInflow = transaction.to_envelope_id === envelopeId;
    const transactionColor = getTransactionColor(transaction);

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        activeOpacity={0.7}
        onPress={() => {
          // TODO: Navigate to transaction detail when implemented
        }}
      >
        <View style={[styles.transactionIcon, { backgroundColor: transactionColor + '20' }]}>
          <Icon 
            name={getTransactionIcon(transaction)} 
            size={24} 
            color={transactionColor}
          />
        </View>
        
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {getTransactionDescription(transaction)}
          </Text>
          <Text style={styles.transactionTime}>
            {format(parseISO(transaction.transaction_date), 'h:mm a')}
          </Text>
        </View>

        <View style={styles.transactionAmountContainer}>
          <Text style={[styles.transactionAmount, { color: transactionColor }]}>
            {formatTransactionAmount(transaction)}
          </Text>
          {transaction.is_cleared && (
            <Icon name="checkmark-circle" size={16} color={theme.success} style={styles.clearedIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionListData<Transaction, TransactionGroup> }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} transactions</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="receipt-outline" size={64} color={theme.textTertiary} />
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery || filterType !== 'all' 
          ? 'No transactions match your search criteria'
          : 'No transactions have been recorded for this envelope yet'}
      </Text>
    </View>
  );

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.filterScroll}
      contentContainerStyle={styles.filterScrollContent}
    >
      {[
        { key: 'all', label: 'All', icon: 'grid-outline' },
        { key: 'income', label: 'Income', icon: 'arrow-down-circle-outline' },
        { key: 'expense', label: 'Expenses', icon: 'arrow-up-circle-outline' },
        { key: 'transfer', label: 'Transfers', icon: 'swap-horizontal-outline' },
        { key: 'allocation', label: 'Allocations', icon: 'add-circle-outline' },
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            filterType === filter.key && styles.activeFilterButton,
          ]}
          onPress={() => handleFilterChange(filter.key as FilterType)}
        >
          <Icon 
            name={filter.icon} 
            size={16} 
            color={filterType === filter.key ? theme.textOnPrimary : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterType === filter.key && styles.activeFilterButtonText,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading transaction history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !envelope) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={styles.errorTitle}>Unable to Load History</Text>
          <Text style={styles.errorText}>{error || 'Envelope not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{envelope.name} History</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTransactions.length} of {transactions.length} transactions
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="options-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearch('')}
            style={styles.clearButton}
          >
            <Icon name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Sort Options (shown when filter button is pressed) */}
      {showFilters && (
        <Card variant="elevated" padding="medium" style={styles.sortCard}>
          <Text style={styles.sortTitle}>Sort by</Text>
          {[
            { key: 'newest', label: 'Newest First' },
            { key: 'oldest', label: 'Oldest First' },
            { key: 'amount_high', label: 'Amount (High to Low)' },
            { key: 'amount_low', label: 'Amount (Low to High)' },
          ].map(sort => (
            <TouchableOpacity
              key={sort.key}
              style={styles.sortOption}
              onPress={() => handleSortChange(sort.key as SortOrder)}
            >
              <Text style={styles.sortOptionText}>{sort.label}</Text>
              {sortOrder === sort.key && (
                <Icon name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Transaction List */}
      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
      />
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
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    errorTitle: {
      ...typography.h3,
      color: theme.error,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    errorText: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    headerSubtitle: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    sortButton: {
      padding: spacing.sm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      height: 44,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: theme.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      padding: spacing.xs,
    },
    filterScroll: {
      maxHeight: 44,
      marginBottom: spacing.md,
    },
    filterScrollContent: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: theme.surface,
      gap: spacing.xs,
    },
    activeFilterButton: {
      backgroundColor: theme.primary,
    },
    filterButtonText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    activeFilterButtonText: {
      color: theme.textOnPrimary,
    },
    sortCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    sortTitle: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    sortOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    sortOptionText: {
      ...typography.body,
      color: theme.textPrimary,
    },
    listContent: {
      paddingBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    sectionCount: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDescription: {
      ...typography.body,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    transactionTime: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    transactionAmountContainer: {
      alignItems: 'flex-end',
    },
    transactionAmount: {
      ...typography.body,
      fontWeight: '600',
    },
    clearedIcon: {
      marginTop: spacing.xs,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
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
      textAlign: 'center',
    },
  });
}

export default EnvelopeHistoryScreen;