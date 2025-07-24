import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudget } from '../../context/BudgetContext';
import { useApiClient } from '../../hooks/useApiClient';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { Payee, PayeeType } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  PayeeList: undefined;
  PayeeForm: { payeeId?: string };
  PayeeDetail: { payeeId: string };
};

type PayeeListScreenNavigationProp = NavigationProp<RootStackParamList, 'PayeeList'>;
type PayeeListScreenRouteProp = RouteProp<RootStackParamList, 'PayeeList'>;

const payeeTypeIcons: Record<PayeeType, string> = {
  business: 'business',
  person: 'person',
  organization: 'domain',
  utility: 'flash-on',
  service: 'build',
  other: 'more-horiz',
};

const payeeTypeLabels: Record<PayeeType, string> = {
  business: 'Business',
  person: 'Person',
  organization: 'Organization',
  utility: 'Utility',
  service: 'Service',
  other: 'Other',
};


export const PayeeListScreen: React.FC = () => {
  const navigation = useNavigation<PayeeListScreenNavigationProp>();
  const route = useRoute<PayeeListScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PayeeType | null>(null);

  const loadPayees = useCallback(async () => {
    if (!selectedBudget?.id) return;

    try {
      setError(null);
      const data = await client.getPayees(selectedBudget.id);
      setPayees(data);
    } catch (err) {
      console.error('Failed to load payees:', err);
      setError('Failed to load payees. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBudget?.id, client]);

  useEffect(() => {
    loadPayees();
  }, [loadPayees]);

  const filteredPayees = useMemo(() => {
    let filtered = payees;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payee) =>
          payee.name.toLowerCase().includes(query) ||
          payee.description?.toLowerCase().includes(query) ||
          payee.email?.toLowerCase().includes(query) ||
          payee.phone?.includes(query)
      );
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter((payee) => payee.payee_type === selectedType);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [payees, searchQuery, selectedType]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayees();
  }, [loadPayees]);

  const handlePayeePress = useCallback(
    (payee: Payee) => {
      navigation.navigate('PayeeDetail', { payeeId: payee.id });
    },
    [navigation]
  );

  const handleAddPress = useCallback(() => {
    navigation.navigate('PayeeForm', {});
  }, [navigation]);

  const renderPayeeItem = useCallback(
    ({ item }: { item: Payee }) => {
      const iconName = item.icon || payeeTypeIcons[item.payee_type];
      const recentTransaction = item.last_payment_date && item.last_payment_amount !== null;

      return (
        <TouchableOpacity
          style={[styles.payeeCard, { backgroundColor: theme.surface }]}
          onPress={() => handlePayeePress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.payeeHeader}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: item.color || '#10B981' },
              ]}
            >
              <Icon name={iconName} size={24} color="white" />
            </View>
            <View style={styles.payeeInfo}>
              <Text style={[styles.payeeName, { color: theme.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.payeeType, { color: theme.textSecondary }]}>
                {payeeTypeLabels[item.payee_type]}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={theme.textSecondary} />
          </View>
          {recentTransaction && (
            <View style={styles.recentTransaction}>
              <Text style={[styles.transactionLabel, { color: theme.textSecondary }]}>
                Last payment:
              </Text>
              <Text style={[styles.transactionAmount, { color: theme.textPrimary }]}>
                ${item.last_payment_amount?.toFixed(2) || '0.00'}
              </Text>
              <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                on {new Date(item.last_payment_date!).toLocaleDateString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [theme, handlePayeePress]
  );

  const renderTypeFilter = () => {
    const types: (PayeeType | null)[] = [
      null,
      'business',
      'person',
      'organization',
      'utility',
      'service',
      'other',
    ];

    return (
      <View style={styles.typeFilterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={types}
          keyExtractor={(item) => item || 'all'}
          renderItem={({ item }) => {
            const isSelected = selectedType === item;
            const label = item ? payeeTypeLabels[item] : 'All';
            const iconName = item ? payeeTypeIcons[item] : 'filter-list';

            return (
              <TouchableOpacity
                style={[
                  styles.typeFilterChip,
                  {
                    backgroundColor: isSelected ? '#10B981' : theme.surface,
                    borderColor: isSelected ? '#10B981' : theme.border,
                  },
                ]}
                onPress={() => setSelectedType(item)}
                activeOpacity={0.7}
              >
                <Icon
                  name={iconName}
                  size={16}
                  color={isSelected ? 'white' : theme.textPrimarySecondary}
                />
                <Text
                  style={[
                    styles.typeFilterLabel,
                    {
                      color: isSelected ? 'white' : theme.textPrimarySecondary,
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };


  if (loading) {
    return <LoadingState message="Loading payees..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPayees} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={theme.textPrimarySecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search payees..."
            placeholderTextColor={theme.textPrimarySecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color={theme.textPrimarySecondary} />
            </TouchableOpacity>
          )}
        </View>
        {renderTypeFilter()}
      </View>

      <FlatList
        data={filteredPayees}
        renderItem={renderPayeeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title={searchQuery || selectedType ? 'No payees found' : 'No payees yet'}
            message={
              searchQuery || selectedType
                ? 'Try adjusting your filters'
                : 'Add your first payee to start tracking payments'
            }
            actionLabel="Add Payee"
            onAction={handleAddPress}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <Icon name="add" size={24} color="white" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  typeFilterContainer: {
    marginBottom: 10,
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  typeFilterLabel: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  payeeCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  payeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
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
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  payeeType: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  recentTransaction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  transactionLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    marginRight: 4,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginRight: 4,
  },
  transactionDate: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  separator: {
    height: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});