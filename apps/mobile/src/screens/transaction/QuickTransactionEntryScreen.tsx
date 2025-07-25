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
import { EnvelopePickerBottomSheet, PayeePickerBottomSheet, IncomeSourcePickerBottomSheet } from '../../components/transaction';
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

interface IncomeSource {
  id: string;
  name: string;
  source_type: string;
  color?: string;
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
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    description: '',
    transaction_type: 'expense',
    envelope_id: '',
    payee_id: '',
    transaction_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });

  const [showEnvelopeBottomSheet, setShowEnvelopeBottomSheet] = useState(false);
  const [showPayeeBottomSheet, setShowPayeeBottomSheet] = useState(false);
  const [showIncomeSourceBottomSheet, setShowIncomeSourceBottomSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [selectedBudget])
  );

  const loadInitialData = async () => {
    if (!selectedBudget?.id) return;

    try {
      setLoading(true);
      
      // Load envelopes, payees, and income sources in parallel
      const [envelopesData, payeesData, incomeSourcesData] = await Promise.all([
        client.getEnvelopes(selectedBudget.id),
        client.getPayees(selectedBudget.id),
        client.getIncomeSources(selectedBudget.id),
      ]);

      setEnvelopes(envelopesData || []);
      setPayees(payeesData || []);
      setIncomeSources(incomeSourcesData || []);
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
        { 
          text: 'OK', 
          onPress: () => {
            // Reset form
            setFormData({
              amount: '',
              description: '',
              transaction_type: 'expense',
              envelope_id: '',
              payee_id: '',
              transaction_date: new Date().toISOString().split('T')[0],
            });
            navigation.goBack();
          }
        }
      ]);
    } catch (err) {
      console.error('Failed to create transaction:', err);
      console.error('Error details:', {
        message: (err as any)?.message,
        code: (err as any)?.code,
        details: (err as any)?.details,
        stack: (err as any)?.stack
      });
      Alert.alert('Error', `Failed to create transaction: ${(err as any)?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const createExpenseTransaction = async (amount: number) => {
    // For expenses, we need to reduce the envelope balance
    const edgeFunctionTransport = client.getEdgeFunctionTransport();
    
    const transactionData = {
      budget_id: selectedBudget!.id,
      transaction_type: 'expense',
      amount: amount,
      description: formData.description.trim() || `Expense - ${new Date().toISOString()}`,
      transaction_date: formData.transaction_date,
      from_envelope_id: formData.envelope_id,
      payee_id: formData.payee_id,
      is_cleared: true, // Quick transactions are marked as cleared by default
    };
    
    console.log('Creating expense transaction with data:', transactionData);
    const response = await edgeFunctionTransport.callFunction('transactions', transactionData);

    if (response.error) {
      console.error('Expense transaction error:', response.error);
      const errorMessage = response.error.message || response.error.error || 'Failed to create expense transaction';
      const errorDetails = response.error.details;
      if (errorDetails && errorDetails.errors) {
        console.error('Validation errors:', errorDetails.errors);
        throw new Error(`${errorMessage}: ${errorDetails.errors.join(', ')}`);
      }
      throw new Error(errorMessage);
    }

    return response.data;
  };

  const createIncomeTransaction = async (amount: number) => {
    // For income, we add to available budget (no envelope specified)
    const edgeFunctionTransport = client.getEdgeFunctionTransport();
    
    const transactionData = {
      budget_id: selectedBudget!.id,
      transaction_type: 'income',
      amount: amount,
      description: formData.description.trim() || 'Income transaction',
      transaction_date: formData.transaction_date,
      income_source_id: formData.payee_id || null, // Using payee_id to store income_source_id for now
      is_cleared: true,
    };
    
    console.log('Creating income transaction with data:', transactionData);
    const response = await edgeFunctionTransport.callFunction('transactions', transactionData);

    if (response.error) {
      console.error('Income transaction error:', response.error);
      const errorMessage = response.error.message || response.error.error || 'Failed to create income transaction';
      const errorDetails = response.error.details;
      if (errorDetails && errorDetails.errors) {
        console.error('Validation errors:', errorDetails.errors);
        throw new Error(`${errorMessage}: ${errorDetails.errors.join(', ')}`);
      }
      throw new Error(errorMessage);
    }

    return response.data;
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

    if (formData.transaction_type === 'expense' && !formData.envelope_id) {
      Alert.alert('Validation Error', 'Please select an envelope for the expense.');
      return false;
    }

    if (formData.transaction_type === 'expense' && !formData.payee_id) {
      Alert.alert('Validation Error', 'Please select a payee for the expense.');
      return false;
    }

    if (formData.transaction_type === 'expense' && !formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description for the expense.');
      return false;
    }

    if (formData.transaction_type === 'income' && !formData.payee_id) {
      Alert.alert('Validation Error', 'Please select an income source.');
      return false;
    }

    if (formData.transaction_type === 'income' && !formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description for the income.');
      return false;
    }

    return true;
  };

  const getEnvelopeName = (envelopeId: string): string => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope?.name || 'Select Envelope';
  };

  const getPayeeName = (payeeId: string): string => {
    if (formData.transaction_type === 'income') {
      const incomeSource = incomeSources.find(s => s.id === payeeId);
      return incomeSource?.name || 'Select Income Source';
    }
    const payee = payees.find(p => p.id === payeeId);
    return payee?.name || 'Select Payee';
  };

  const handleEnvelopeSelect = (envelope: Envelope) => {
    setFormData({ ...formData, envelope_id: envelope.id });
  };

  const handlePayeeSelect = (payee: Payee | null) => {
    setFormData({ ...formData, payee_id: payee?.id || '' });
  };

  const handlePayeeCreated = (newPayee: Payee) => {
    setPayees(prev => [...prev, newPayee]);
  };

  const handleIncomeSourceSelect = (incomeSource: IncomeSource) => {
    setFormData({ ...formData, payee_id: incomeSource.id });
  };

  const handleIncomeSourceCreated = (newIncomeSource: IncomeSource) => {
    setIncomeSources(prev => [...prev, newIncomeSource]);
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
              onPress={() => setFormData({ ...formData, transaction_type: type.value, payee_id: '' })}
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {formData.transaction_type === 'income' ? 'Income Source *' : 'Payee *'}
            </Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => formData.transaction_type === 'income' ? setShowIncomeSourceBottomSheet(true) : setShowPayeeBottomSheet(true)}
            >
              <Text style={[styles.selectorButtonText, { color: theme.textPrimary }]}>
                {getPayeeName(formData.payee_id)}
              </Text>
              <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {formData.transaction_type === 'expense' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Envelope *
              </Text>
              <TouchableOpacity
                style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={() => setShowEnvelopeBottomSheet(true)}
              >
                <Text style={[styles.selectorButtonText, { color: theme.textPrimary }]}>
                  {getEnvelopeName(formData.envelope_id)}
                </Text>
                <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

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

      {/* Bottom Sheets */}
      <EnvelopePickerBottomSheet
        isVisible={showEnvelopeBottomSheet}
        onClose={() => setShowEnvelopeBottomSheet(false)}
        onSelect={handleEnvelopeSelect}
        envelopes={envelopes}
        selectedEnvelopeId={formData.envelope_id}
      />

      <PayeePickerBottomSheet
        isVisible={showPayeeBottomSheet}
        onClose={() => setShowPayeeBottomSheet(false)}
        onSelect={handlePayeeSelect}
        payees={payees}
        selectedPayeeId={formData.payee_id}
        onPayeeCreated={handlePayeeCreated}
      />

      <IncomeSourcePickerBottomSheet
        isVisible={showIncomeSourceBottomSheet}
        onClose={() => setShowIncomeSourceBottomSheet(false)}
        onSelect={handleIncomeSourceSelect}
        incomeSources={incomeSources}
        selectedIncomeSourceId={formData.payee_id}
        onIncomeSourceCreated={handleIncomeSourceCreated}
      />
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