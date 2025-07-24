import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
import { LoadingState } from '../../components/ui';
import { TransactionType } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  QuickTransactionEntry: undefined;
  PayeeList: undefined;
  PayeeForm: { payeeId?: string };
};

type QuickTransactionEntryNavigationProp = NavigationProp<RootStackParamList, 'QuickTransactionEntry'>;

interface TransactionFormData {
  amount: string;
  description: string;
  transaction_type: TransactionType;
  envelope_id: string;
  payee_id: string;
  transaction_date: string;
}

interface Envelope {
  id: string;
  name: string;
  current_balance: number;
  color?: string;
}

interface Payee {
  id: string;
  name: string;
  payee_type: string;
}

const transactionTypes: { value: TransactionType; label: string; icon: string; description: string }[] = [
  { 
    value: 'expense', 
    label: 'Expense', 
    icon: 'remove', 
    description: 'Money spent from an envelope' 
  },
  { 
    value: 'income', 
    label: 'Income', 
    icon: 'add', 
    description: 'Money received' 
  },
];

export const QuickTransactionEntryScreen: React.FC = () => {
  const navigation = useNavigation<QuickTransactionEntryNavigationProp>();
  const insets = useSafeAreaInsets();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    description: '',
    transaction_type: 'expense',
    envelope_id: '',
    payee_id: '',
    transaction_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showEnvelopeSelector, setShowEnvelopeSelector] = useState(false);
  const [showPayeeSelector, setShowPayeeSelector] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [selectedBudget])
  );

  const loadInitialData = async () => {
    if (!selectedBudget?.id) return;

    try {
      setLoading(true);
      
      // Load envelopes and payees in parallel
      const [envelopesData, payeesData] = await Promise.all([
        client.getEnvelopes(selectedBudget.id),
        client.getPayees(selectedBudget.id),
      ]);

      setEnvelopes(envelopesData || []);
      setPayees(payeesData || []);

      // Set default envelope if available
      if (envelopesData && envelopesData.length > 0 && !formData.envelope_id) {
        setFormData(prev => ({
          ...prev,
          envelope_id: envelopesData[0].id
        }));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!selectedBudget?.id) {
      Alert.alert('Error', 'No budget selected.');
      return;
    }

    setSaving(true);
    try {
      const amount = parseFloat(formData.amount);
      
      // Create transaction based on type
      if (formData.transaction_type === 'expense') {
        await createExpenseTransaction(amount);
      } else if (formData.transaction_type === 'income') {
        await createIncomeTransaction(amount);
      }

      Alert.alert('Success', 'Transaction created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Failed to create transaction:', err);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const createExpenseTransaction = async (amount: number) => {
    // For expenses, we need to reduce the envelope balance
    const response = await fetch('https://edge-api.nvlp.app/api/functions/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await client.auth.getSession().then(s => s?.access_token)}`,
      },
      body: JSON.stringify({
        budget_id: selectedBudget!.id,
        transaction_type: 'expense',
        amount: amount,
        description: formData.description.trim(),
        transaction_date: formData.transaction_date,
        from_envelope_id: formData.envelope_id,
        payee_id: formData.payee_id || null,
        is_cleared: true, // Quick transactions are marked as cleared by default
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create expense transaction');
    }
  };

  const createIncomeTransaction = async (amount: number) => {
    // For income, we add to available budget (no envelope specified)
    const response = await fetch('https://edge-api.nvlp.app/api/functions/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await client.auth.getSession().then(s => s?.access_token)}`,
      },
      body: JSON.stringify({
        budget_id: selectedBudget!.id,
        transaction_type: 'income',
        amount: amount,
        description: formData.description.trim(),
        transaction_date: formData.transaction_date,
        to_envelope_id: null, // Income goes to available budget
        payee_id: formData.payee_id || null,
        is_cleared: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create income transaction');
    }
  };

  const validateForm = () => {
    if (!formData.amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount.');
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0.');
      return false;
    }

    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description.');
      return false;
    }

    if (formData.transaction_type === 'expense' && !formData.envelope_id) {
      Alert.alert('Validation Error', 'Please select an envelope for the expense.');
      return false;
    }

    return true;
  };

  const getEnvelopeName = (envelopeId: string): string => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope?.name || 'Select Envelope';
  };

  const getPayeeName = (payeeId: string): string => {
    const payee = payees.find(p => p.id === payeeId);
    return payee?.name || 'Select Payee (Optional)';
  };

  const getSelectedTypeData = () => {
    return transactionTypes.find(t => t.value === formData.transaction_type);
  };

  const renderTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Transaction Type</Text>
      <View style={styles.typeButtons}>
        {transactionTypes.map((type) => {
          const isSelected = formData.transaction_type === type.value;
          return (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                {
                  backgroundColor: isSelected ? '#D1FAE5' : theme.surface,
                  borderColor: isSelected ? '#10B981' : theme.border,
                },
              ]}
              onPress={() => setFormData({ ...formData, transaction_type: type.value })}
              activeOpacity={0.7}
            >
              <Icon
                name={type.icon}
                size={20}
                color={isSelected ? '#059669' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  {
                    color: isSelected ? '#047857' : theme.textSecondary,
                  },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderAmountInput = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Amount *</Text>
      <View style={styles.amountInputContainer}>
        <Text style={[styles.currencySymbol, { color: theme.textPrimary }]}>$</Text>
        <TextInput
          style={[styles.amountInput, { color: theme.textPrimary, borderColor: theme.border }]}
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          autoFocus
        />
      </View>
    </View>
  );

  if (loading) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {renderTypeSelector()}

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Transaction Details
          </Text>
          
          {renderAmountInput()}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Description *
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="What was this transaction for?"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {formData.transaction_type === 'expense' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Envelope *
              </Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={() => setShowEnvelopeSelector(!showEnvelopeSelector)}
              >
                <Text style={[styles.selectorButtonText, { color: theme.textPrimary }]}>
                  {getEnvelopeName(formData.envelope_id)}
                </Text>
                <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
              
              {showEnvelopeSelector && (
                <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {envelopes
                    .filter(e => e.current_balance > 0) // Only show envelopes with positive balance
                    .map((envelope) => (
                      <TouchableOpacity
                        key={envelope.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, envelope_id: envelope.id });
                          setShowEnvelopeSelector(false);
                        }}
                      >
                        <View style={styles.envelopeItem}>
                          <Text style={[styles.envelopeName, { color: theme.textPrimary }]}>
                            {envelope.name}
                          </Text>
                          <Text style={[styles.envelopeBalance, { color: theme.textSecondary }]}>
                            ${envelope.current_balance.toFixed(2)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Payee (Optional)
            </Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => setShowPayeeSelector(!showPayeeSelector)}
            >
              <Text style={[styles.selectorButtonText, { color: theme.textPrimary }]}>
                {getPayeeName(formData.payee_id)}
              </Text>
              <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            
            {showPayeeSelector && (
              <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFormData({ ...formData, payee_id: '' });
                    setShowPayeeSelector(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: theme.textSecondary }]}>
                    No Payee
                  </Text>
                </TouchableOpacity>
                {payees.map((payee) => (
                  <TouchableOpacity
                    key={payee.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData({ ...formData, payee_id: payee.id });
                      setShowPayeeSelector(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                      {payee.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.dropdownItem, styles.addPayeeItem]}
                  onPress={() => {
                    setShowPayeeSelector(false);
                    navigation.navigate('PayeeForm', {});
                  }}
                >
                  <Icon name="add" size={20} color="#10B981" />
                  <Text style={[styles.addPayeeText, { color: '#10B981' }]}>
                    Add New Payee
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Date
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.transaction_date}
              onChangeText={(text) => setFormData({ ...formData, transaction_date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={'white'} />
          ) : (
            <Text style={styles.saveButtonText}>
              Create Transaction
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  selectorContainer: {
    marginBottom: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '400' as const,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    borderWidth: 0,
    padding: 0,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  envelopeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  envelopeBalance: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  addPayeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 0,
  },
  addPayeeText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600' as const,
  },
});