import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import { ErrorState, LoadingState } from '../../components/ui';
import { Payee } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  PayeeList: undefined;
  PayeeMerge: { payeeId: string };
  PayeeDetail: { payeeId: string };
};

type PayeeMergeScreenNavigationProp = NavigationProp<RootStackParamList, 'PayeeMerge'>;
type PayeeMergeScreenRouteProp = RouteProp<RootStackParamList, 'PayeeMerge'>;

export const PayeeMergeScreen: React.FC = () => {
  const navigation = useNavigation<PayeeMergeScreenNavigationProp>();
  const route = useRoute<PayeeMergeScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const sourcePayeeId = route.params.payeeId;

  const [sourcePayee, setSourcePayee] = useState<Payee | null>(null);
  const [targetPayee, setTargetPayee] = useState<Payee | null>(null);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayeeList, setShowPayeeList] = useState(false);
  const transactionCount = 0; // Transaction API not yet available

  // Load source payee and all payees
  const loadData = useCallback(async () => {
    if (!selectedBudget?.id) return;

    try {
      setError(null);
      setLoading(true);

      // Load source payee
      const payeeData = await client.getPayee(sourcePayeeId);
      setSourcePayee(payeeData);

      // Load all payees except the source
      const allPayees = await client.getPayees(selectedBudget.id);
      setPayees(allPayees.filter(p => p.id !== sourcePayeeId));

      // Note: Transaction API not yet available
      // Will need to implement once transaction endpoints are ready
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load payee data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedBudget?.id, sourcePayeeId, client]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectTargetPayee = (payee: Payee) => {
    setTargetPayee(payee);
    setShowPayeeList(false);
  };

  const handleMerge = async () => {
    if (!targetPayee || !sourcePayee) return;

    Alert.alert(
      'Merge Payees - Coming Soon',
      'Payee merge functionality will be available once transaction management is implemented.\n\n' +
      'This feature will allow you to:\n' +
      '• Merge all transactions from one payee to another\n' +
      '• Automatically delete the source payee\n' +
      '• Consolidate duplicate payees',
      [{ text: 'OK', style: 'default' }]
    );
  };

  // This will be implemented once transaction API is available
  const performMerge = async () => {
    // Placeholder for future implementation
  };

  const renderPayeeCard = (payee: Payee, isSource: boolean = false) => {
    return (
      <View style={[styles.payeeCard, { backgroundColor: theme.surface }]}>
        <View style={styles.payeeHeader}>
          <View
            style={[
              styles.payeeIcon,
              { backgroundColor: payee.color || '#10B981' },
            ]}
          >
            <Icon name={payee.icon || 'person'} size={24} color="white" />
          </View>
          <View style={styles.payeeInfo}>
            <Text style={[styles.payeeName, { color: theme.textPrimary }]}>
              {payee.name}
            </Text>
            {payee.last_payment_date && (
              <Text style={[styles.payeeDetail, { color: theme.textSecondary }]}>
                Last payment: {new Date(payee.last_payment_date).toLocaleDateString()}
              </Text>
            )}
            <Text style={[styles.payeeDetail, { color: theme.textSecondary }]}>
              Total paid: ${payee.total_paid.toFixed(2)}
            </Text>
          </View>
        </View>
        {isSource && (
          <View style={styles.transactionCount}>
            <Icon name="info" size={16} color={theme.textSecondary} />
            <Text style={[styles.transactionCountText, { color: theme.textSecondary }]}>
              Transaction count will be shown once API is available
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <LoadingState message="Loading payee data..." />;
  }

  if (error || !sourcePayee) {
    return <ErrorState message={error || 'Payee not found'} onRetry={loadData} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Source Payee (to be deleted)
          </Text>
          {renderPayeeCard(sourcePayee, true)}
        </View>

        <View style={styles.arrowContainer}>
          <Icon name="arrow-downward" size={32} color={theme.textSecondary} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Target Payee (merge into)
          </Text>
          
          {targetPayee ? (
            <>
              {renderPayeeCard(targetPayee)}
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setShowPayeeList(true)}
              >
                <Text style={[styles.changeButtonText, { color: '#10B981' }]}>
                  Change Target Payee
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: theme.surface }]}
              onPress={() => setShowPayeeList(true)}
            >
              <Icon name="add-circle-outline" size={24} color="#10B981" />
              <Text style={[styles.selectButtonText, { color: theme.textPrimary }]}>
                Select Target Payee
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showPayeeList && (
          <View style={[styles.payeeListSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.listTitle, { color: theme.textPrimary }]}>
              Select a payee to merge into:
            </Text>
            <ScrollView style={styles.payeeList}>
              {payees.map((payee) => (
                <TouchableOpacity
                  key={payee.id}
                  style={styles.payeeListItem}
                  onPress={() => handleSelectTargetPayee(payee)}
                >
                  <View style={styles.payeeListItemContent}>
                    <View
                      style={[
                        styles.payeeListIcon,
                        { backgroundColor: payee.color || '#10B981' },
                      ]}
                    >
                      <Icon name={payee.icon || 'person'} size={16} color="white" />
                    </View>
                    <Text style={[styles.payeeListName, { color: theme.textPrimary }]}>
                      {payee.name}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {targetPayee && (
          <TouchableOpacity
            style={[
              styles.mergeButton,
              merging && styles.mergeButtonDisabled,
            ]}
            onPress={handleMerge}
            disabled={merging}
          >
            {merging ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="merge-type" size={20} color="white" />
                <Text style={styles.mergeButtonText}>Merge Payees</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  payeeCard: {
    borderRadius: 12,
    padding: 16,
  },
  payeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 4,
  },
  payeeDetail: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  transactionCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  transactionCountText: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 6,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  changeButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  payeeListSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxHeight: 300,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  payeeList: {
    maxHeight: 250,
  },
  payeeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  payeeListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payeeListIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  payeeListName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  mergeButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  mergeButtonDisabled: {
    opacity: 0.6,
  },
  mergeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
});