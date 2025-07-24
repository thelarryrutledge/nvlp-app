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
import { useApiClient } from '../../hooks/useApiClient';
import { ErrorState, LoadingState } from '../../components/ui';
import { Payee, PayeeType } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  PayeeList: undefined;
  PayeeForm: { payeeId?: string };
  PayeeDetail: { payeeId: string };
  PayeeMerge: { payeeId: string };
  PayeeHistory: { payeeId: string };
  PayeeInsights: { payeeId: string };
};

type PayeeDetailScreenNavigationProp = NavigationProp<RootStackParamList, 'PayeeDetail'>;
type PayeeDetailScreenRouteProp = RouteProp<RootStackParamList, 'PayeeDetail'>;

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


export const PayeeDetailScreen: React.FC = () => {
  const navigation = useNavigation<PayeeDetailScreenNavigationProp>();
  const route = useRoute<PayeeDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const [payee, setPayee] = useState<Payee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const payeeId = route.params.payeeId;

  const loadPayee = useCallback(async () => {
    try {
      setError(null);
      const data = await client.getPayee(payeeId);
      setPayee(data);
    } catch (err) {
      console.error('Failed to load payee:', err);
      setError('Failed to load payee details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [payeeId, client]);

  useEffect(() => {
    loadPayee();
  }, [loadPayee]);

  const handleEdit = useCallback(() => {
    navigation.navigate('PayeeForm', { payeeId });
  }, [navigation, payeeId]);

  const handleMerge = useCallback(() => {
    navigation.navigate('PayeeMerge', { payeeId });
  }, [navigation, payeeId]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Payee',
      `Are you sure you want to delete "${payee?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await client.deletePayee(payeeId);
              navigation.goBack();
            } catch (err) {
              console.error('Failed to delete payee:', err);
              Alert.alert('Error', 'Failed to delete payee. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [payee?.name, payeeId, client, navigation]);

  const renderContactInfo = () => {
    if (!payee) return null;

    const contactFields = [
      { icon: 'email', label: 'Email', value: payee.email },
      { icon: 'phone', label: 'Phone', value: payee.phone },
      { icon: 'language', label: 'Website', value: payee.website },
      { icon: 'location-on', label: 'Address', value: payee.address },
    ];

    const hasContactInfo = contactFields.some((field) => field.value);

    if (!hasContactInfo) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Contact Information
        </Text>
        {contactFields.map((field) => {
          if (!field.value) return null;

          return (
            <View key={field.label} style={styles.infoRow}>
              <Icon name={field.icon} size={20} color={theme.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {field.label}
                </Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {field.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderPaymentInfo = () => {
    if (!payee) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Payment Information
        </Text>
        {payee.preferred_payment_method && (
          <View style={styles.infoRow}>
            <Icon name="payment" size={20} color={theme.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Preferred Payment Method
              </Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                {payee.preferred_payment_method}
              </Text>
            </View>
          </View>
        )}
        {payee.account_number && (
          <View style={styles.infoRow}>
            <Icon name="account-balance" size={20} color={theme.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Account Number
              </Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                {payee.account_number}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              ${payee.total_paid.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total Paid
            </Text>
          </View>
          {payee.last_payment_date && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                ${payee.last_payment_amount?.toFixed(2) || '0.00'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Last Payment
              </Text>
              <Text style={[styles.statDate, { color: theme.textSecondary }]}>
                {new Date(payee.last_payment_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.historyButton, { backgroundColor: '#10B98110' }]}
          onPress={() => navigation.navigate('PayeeHistory', { payeeId })}
          activeOpacity={0.7}
        >
          <Icon name="timeline" size={20} color="#10B981" />
          <Text style={[styles.historyButtonText, { color: '#10B981' }]}>
            View Spending History
          </Text>
          <Icon name="chevron-right" size={20} color="#10B981" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.historyButton, { backgroundColor: '#3B82F610' }]}
          onPress={() => navigation.navigate('PayeeInsights', { payeeId })}
          activeOpacity={0.7}
        >
          <Icon name="analytics" size={20} color="#3B82F6" />
          <Text style={[styles.historyButtonText, { color: '#3B82F6' }]}>
            View Spending Insights
          </Text>
          <Icon name="chevron-right" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <LoadingState message="Loading payee details..." />;
  }

  if (error || !payee) {
    return <ErrorState message={error || 'Payee not found'} onRetry={loadPayee} />;
  }

  const iconName = payee.icon || payeeTypeIcons[payee.payee_type];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: payee.color || '#10B981' },
            ]}
          >
            <Icon name={iconName} size={32} color={'white'} />
          </View>
          <Text style={[styles.payeeName, { color: theme.textPrimary }]}>
            {payee.name}
          </Text>
          <View style={styles.typeChip}>
            <Icon
              name={payeeTypeIcons[payee.payee_type]}
              size={16}
              color={'#047857'}
            />
            <Text style={styles.typeLabel}>
              {payeeTypeLabels[payee.payee_type]}
            </Text>
          </View>
          {payee.description && (
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {payee.description}
            </Text>
          )}
        </View>

        {renderContactInfo()}
        {renderPaymentInfo()}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Icon name="edit" size={20} color={'#059669'} />
            <Text style={[styles.actionButtonText, { color: '#059669' }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FFF7ED' }]}
            onPress={handleMerge}
            activeOpacity={0.7}
          >
            <Icon name="merge-type" size={20} color={'#F97316'} />
            <Text style={[styles.actionButtonText, { color: '#F97316' }]}>
              Merge
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: '#FEF2F2' },
              deleting && styles.actionButtonDisabled,
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={'#DC2626'} />
            ) : (
              <>
                <Icon name="delete" size={20} color={'#DC2626'} />
                <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>
                  Delete
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  payeeName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  typeLabel: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#047857',
  },
  description: {
    fontSize: 16,
    fontWeight: '400' as const,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EAED',
  },
  statItem: {
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
  statDate: {
    fontSize: 12,
    fontWeight: '400' as const,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  historyButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 12,
  },
});