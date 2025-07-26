import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  NavigationProp,
  useNavigation,
  useRoute,
  useFocusEffect,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApiClient } from '../../hooks/useApiClient';
import { LoadingState, Card } from '../../components/ui';
import { useTheme } from '../../theme';
import type { Transaction } from '@nvlp/types';

type RootStackParamList = {
  TransactionDetail: { transactionId: string };
  TransactionForm: { transactionId?: string };
  TransactionList: undefined;
};

type TransactionDetailNavigationProp = NavigationProp<RootStackParamList, 'TransactionDetail'>;
type TransactionDetailRouteProp = RouteProp<RootStackParamList, 'TransactionDetail'>;

interface TransactionWithDetails extends Transaction {
  envelope_name?: string;
  payee_name?: string;
  income_source_name?: string;
  from_envelope_name?: string;
  to_envelope_name?: string;
  category_name?: string;
}

export const TransactionDetailScreen: React.FC = () => {
  const navigation = useNavigation<TransactionDetailNavigationProp>();
  const route = useRoute<TransactionDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { client } = useApiClient();
  const { theme } = useTheme();
  const { transactionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTransaction();
    }, [transactionId])
  );

  const loadTransaction = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const authState = client.getAuthState();
      if (!authState?.accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/transactions?id=eq.${transactionId}&select=*,envelopes!from_envelope_id(name),to_envelopes:envelopes!to_envelope_id(name),payees(name),income_sources(name),categories(name)`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.accessToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Transaction not found');
      }

      const transactionData = data[0];
      const transformedTransaction: TransactionWithDetails = {
        ...transactionData,
        envelope_name: transactionData.envelopes?.name,
        from_envelope_name: transactionData.envelopes?.name,
        to_envelope_name: transactionData.to_envelopes?.name,
        payee_name: transactionData.payees?.name,
        income_source_name: transactionData.income_sources?.name,
        category_name: transactionData.categories?.name,
      };

      setTransaction(transformedTransaction);
    } catch (err) {
      console.error('Failed to load transaction:', err);
      Alert.alert('Error', 'Failed to load transaction details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTransaction(true);
  };

  const handleEdit = () => {
    navigation.navigate('TransactionForm', { transactionId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      const authState = client.getAuthState();
      if (!authState?.accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/transactions?id=eq.${transactionId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.accessToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      Alert.alert('Success', 'Transaction deleted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (): string => {
    if (!transaction) return 'attach-money';
    
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

  const getTransactionColor = (): string => {
    if (!transaction) return theme.textSecondary;
    
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

  const getTransactionTypeLabel = (): string => {
    if (!transaction) return '';
    
    switch (transaction.transaction_type) {
      case 'income':
        return 'Income';
      case 'expense':
        return 'Expense';
      case 'transfer':
        return 'Transfer';
      case 'allocation':
        return 'Allocation';
      default:
        return 'Transaction';
    }
  };

  if (loading) {
    return <LoadingState message="Loading transaction details..." />;
  }

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textPrimary }]}>
          Transaction not found
        </Text>
      </View>
    );
  }

  const transactionColor = getTransactionColor();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { backgroundColor: `${transactionColor}20` }]}>
              <Icon name={getTransactionIcon()} size={32} color={transactionColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.typeLabel, { color: transactionColor }]}>
                {getTransactionTypeLabel()}
              </Text>
              <Text style={[styles.amount, { color: theme.textPrimary }]}>
                {transaction.transaction_type === 'expense' ? '-' : '+'}$
                {transaction.amount.toFixed(2)}
              </Text>
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                {formatDate(transaction.transaction_date)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Description */}
        {transaction.description && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Description
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {transaction.description}
            </Text>
          </Card>
        )}

        {/* Transaction Details */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Details
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Type</Text>
            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
              {getTransactionTypeLabel()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Amount</Text>
            <Text style={[styles.detailValue, { color: transactionColor }]}>
              {transaction.transaction_type === 'expense' ? '-' : '+'}$
              {transaction.amount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
              {formatDate(transaction.transaction_date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Time</Text>
            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
              {formatTime(transaction.created_at)}
            </Text>
          </View>

          {transaction.transaction_type === 'expense' && transaction.payee_name && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Payee</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {transaction.payee_name}
              </Text>
            </View>
          )}

          {transaction.transaction_type === 'income' && transaction.income_source_name && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Source</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {transaction.income_source_name}
              </Text>
            </View>
          )}

          {transaction.transaction_type === 'expense' && transaction.envelope_name && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Envelope</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {transaction.envelope_name}
              </Text>
            </View>
          )}

          {transaction.transaction_type === 'transfer' && (
            <>
              {transaction.from_envelope_name && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>From</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                    {transaction.from_envelope_name}
                  </Text>
                </View>
              )}
              {transaction.to_envelope_name && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>To</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                    {transaction.to_envelope_name}
                  </Text>
                </View>
              )}
            </>
          )}

          {transaction.transaction_type === 'allocation' && transaction.to_envelope_name && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>To Envelope</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {transaction.to_envelope_name}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: transaction.is_cleared ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {transaction.is_cleared ? 'Cleared' : 'Pending'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Transaction ID for debugging */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            System Information
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Transaction ID</Text>
            <Text style={[styles.detailValue, { color: theme.textTertiary, fontSize: 12 }]}>
              {transaction.id}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <Icon name="edit" size={20} color="white" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Icon name="delete" size={20} color="white" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 4,
  },
  date: {
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
    maxWidth: '60%',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});