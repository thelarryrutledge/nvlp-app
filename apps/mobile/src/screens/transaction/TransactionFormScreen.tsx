/**
 * Transaction Form Screen
 * 
 * Detailed transaction creation and editing interface
 */

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
  Switch,
} from 'react-native';
import {
  NavigationProp,
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useBudget } from '../../context/BudgetContext';
import { useApiClient } from '../../hooks/useApiClient';
import { LoadingState } from '../../components/ui';
import { EnvelopePickerBottomSheet, PayeePickerBottomSheet, IncomeSourcePickerBottomSheet, AmountCalculator } from '../../components/transaction';
import { TransactionType } from '@nvlp/types';
import { useTheme } from '../../theme';
import type { MainStackParamList } from '../../navigation/types';
import { dashboardService } from '../../services/api/dashboardService';

type TransactionFormRouteProp = RouteProp<MainStackParamList, 'TransactionForm'>;
type TransactionFormNavigationProp = NavigationProp<MainStackParamList, 'TransactionForm'>;

interface TransactionFormData {
  amount: string;
  description: string;
  transaction_type: TransactionType;
  envelope_id: string;
  payee_id: string;
  transaction_date: Date;
  is_cleared: boolean;
  notes: string;
  reference_number: string;
  category_id: string;
}

interface Envelope {
  id: string;
  name: string;
  current_balance: number;
  color?: string;
  category_id?: string;
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

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
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
  { 
    value: 'allocation', 
    label: 'Allocation', 
    icon: 'account-balance', 
    description: 'Money allocated to an envelope' 
  },
  { 
    value: 'transfer', 
    label: 'Transfer', 
    icon: 'swap-horiz', 
    description: 'Money moved between envelopes' 
  },
];

export const TransactionFormScreen: React.FC = () => {
  const navigation = useNavigation<TransactionFormNavigationProp>();
  const route = useRoute<TransactionFormRouteProp>();
  const insets = useSafeAreaInsets();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const { transactionId } = route.params || {};
  const isEditing = Boolean(transactionId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableAmount, setAvailableAmount] = useState<number>(0);
  
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    description: '',
    transaction_type: 'expense',
    envelope_id: '',
    payee_id: '',
    transaction_date: new Date(),
    is_cleared: true,
    notes: '',
    reference_number: '',
    category_id: '',
  });

  // UI state
  const [showEnvelopeBottomSheet, setShowEnvelopeBottomSheet] = useState(false);
  const [showPayeeBottomSheet, setShowPayeeBottomSheet] = useState(false);
  const [showIncomeSourceBottomSheet, setShowIncomeSourceBottomSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [selectedBudget, transactionId])
  );

  const loadInitialData = async () => {
    if (!selectedBudget?.id) return;

    try {
      setLoading(true);
      
      // Load all required data in parallel
      const [envelopesData, payeesData, incomeSourcesData, categoriesData, dashboardData] = await Promise.all([
        client.getEnvelopes(selectedBudget.id),
        client.getPayees(selectedBudget.id),
        client.getIncomeSources(selectedBudget.id),
        client.getCategories(selectedBudget.id),
        dashboardService.getDashboardData(selectedBudget.id),
      ]);

      setEnvelopes(envelopesData || []);
      setPayees(payeesData || []);
      setIncomeSources(incomeSourcesData || []);
      setCategories(categoriesData || []);
      setAvailableAmount(dashboardData?.budget_overview?.available_amount || 0);

      // If editing, load transaction data
      if (isEditing && transactionId) {
        await loadTransactionData(transactionId);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionData = async (id: string) => {
    try {
      const authState = client.getAuthState();
      if (!authState?.accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/transactions?id=eq.${id}&select=*`,
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

      const transaction = data[0];
      
      // Map transaction data to form data
      setFormData({
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        transaction_type: transaction.transaction_type,
        envelope_id: transaction.from_envelope_id || transaction.to_envelope_id || '',
        payee_id: transaction.payee_id || transaction.income_source_id || '',
        transaction_date: new Date(transaction.transaction_date),
        is_cleared: transaction.is_cleared || false,
        notes: transaction.notes || '',
        reference_number: transaction.reference_number || '',
        category_id: transaction.category_id || '',
      });

      // Show advanced fields if any advanced data exists
      if (transaction.notes || transaction.reference_number || transaction.category_id) {
        setShowAdvancedFields(true);
      }
    } catch (err) {
      console.error('Failed to load transaction:', err);
      Alert.alert('Error', 'Failed to load transaction data.');
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
      
      // Prepare transaction data
      const transactionData = {
        budget_id: selectedBudget.id,
        transaction_type: formData.transaction_type,
        amount: amount,
        description: formData.description.trim() || `${formData.transaction_type} transaction`,
        transaction_date: formData.transaction_date.toISOString().split('T')[0],
        is_cleared: formData.is_cleared,
        notes: formData.notes.trim() || null,
        reference_number: formData.reference_number.trim() || null,
        ...(formData.transaction_type === 'expense' && {
          from_envelope_id: formData.envelope_id,
          payee_id: formData.payee_id,
        }),
        ...(formData.transaction_type === 'income' && {
          income_source_id: formData.payee_id,
        }),
        ...(formData.transaction_type === 'allocation' && {
          to_envelope_id: formData.envelope_id,
        }),
        ...(formData.transaction_type === 'transfer' && {
          from_envelope_id: formData.envelope_id,
          // TODO: Add to_envelope_id selection for transfers
        }),
      };
      
      // Create or update transaction
      if (isEditing) {
        await updateTransaction(transactionId!, transactionData);
      } else {
        // Create new transaction using the same logic as QuickTransactionEntry
        await createTransaction(transactionData);
      }

      Alert.alert('Success', `Transaction ${isEditing ? 'updated' : 'created'} successfully!`, [
        { 
          text: 'OK', 
          onPress: () => {
            navigation.goBack();
          }
        }
      ]);
    } catch (err) {
      console.error('Failed to save transaction:', err);
      Alert.alert('Error', `Failed to save transaction: ${(err as any)?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const createTransaction = async (transactionData: any) => {
    const authState = client.getAuthState();
    if (!authState?.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.accessToken}`,
      },
      body: JSON.stringify(transactionData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Transaction creation error:', responseData);
      throw new Error(responseData.error || responseData.message || 'Failed to create transaction');
    }

    return responseData;
  };

  const updateTransaction = async (transactionId: string, transactionData: any) => {
    const authState = client.getAuthState();
    if (!authState?.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/transactions?id=eq.${transactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.accessToken}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
        },
        body: JSON.stringify(transactionData),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Transaction update error:', responseData);
      throw new Error(responseData.error || responseData.message || 'Failed to update transaction');
    }

    return responseData;
  };

  const validateForm = (): boolean => {
    if (!formData.amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount.');
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0.');
      return false;
    }

    if (formData.transaction_type === 'expense') {
      if (!formData.envelope_id) {
        Alert.alert('Validation Error', 'Please select an envelope for the expense.');
        return false;
      }
      if (!formData.payee_id) {
        Alert.alert('Validation Error', 'Please select a payee for the expense.');
        return false;
      }
    }

    if (formData.transaction_type === 'income' && !formData.payee_id) {
      Alert.alert('Validation Error', 'Please select an income source.');
      return false;
    }

    if (formData.transaction_type === 'allocation' && !formData.envelope_id) {
      Alert.alert('Validation Error', 'Please select a destination envelope for the allocation.');
      return false;
    }

    if (formData.transaction_type === 'transfer') {
      if (!formData.envelope_id) {
        Alert.alert('Validation Error', 'Please select a source envelope for the transfer.');
        return false;
      }
      // TODO: Add validation for to_envelope_id when implemented
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
    setFormData({ ...formData, envelope_id: envelope.id, category_id: envelope.category_id || '' });
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

  const updateFormData = (field: keyof TransactionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
        {/* Transaction Type Selector */}
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
                  onPress={() => updateFormData('transaction_type', type.value)}
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

        {/* Main Form Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Transaction Details
          </Text>

          {/* Available Amount Display (for allocation) */}
          {formData.transaction_type === 'allocation' && (
            <View style={styles.inputGroup}>
              <View style={[styles.availableAmountContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.availableAmountLabel, { color: theme.textSecondary }]}>
                  Available to Allocate
                </Text>
                <Text style={[styles.availableAmountValue, { color: '#10B981' }]}>
                  {formatCurrency(availableAmount)}
                </Text>
              </View>
            </View>
          )}
          
          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Amount *</Text>
            <View style={[styles.amountInputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.textPrimary }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.textPrimary }]}
                value={formData.amount}
                onChangeText={(text) => {
                  // Only allow numbers and one decimal point
                  const cleanedText = text.replace(/[^0-9.]/g, '');
                  const parts = cleanedText.split('.');
                  if (parts.length <= 2) {
                    // Limit to 2 decimal places
                    const finalText = parts.length === 2 
                      ? parts[0] + '.' + parts[1].slice(0, 2)
                      : cleanedText;
                    updateFormData('amount', finalText);
                  }
                }}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => setShowCalculator(true)}
                style={styles.calculatorButton}
                activeOpacity={0.7}
              >
                <Icon name="calculate" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="What was this transaction for?"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Payee/Income Source Selection (only for expense and income) */}
          {(formData.transaction_type === 'expense' || formData.transaction_type === 'income') && (
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
          )}

          {/* Envelope Selection (for expenses and allocations) */}
          {(formData.transaction_type === 'expense' || formData.transaction_type === 'allocation') && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {formData.transaction_type === 'allocation' ? 'Destination Envelope *' : 'Envelope *'}
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

          {/* Transfer Envelope Selection (from and to) */}
          {formData.transaction_type === 'transfer' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  From Envelope *
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
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  To Envelope *
                </Text>
                <TouchableOpacity
                  style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => {
                    // TODO: Add separate to_envelope_id selection for transfers
                    Alert.alert('Coming Soon', 'Transfer to envelope selection will be implemented in the next phase.');
                  }}
                >
                  <Text style={[styles.selectorButtonText, { color: theme.textSecondary }]}>
                    Select Destination Envelope
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Date Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Date
            </Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.selectorButtonText, { color: theme.textPrimary }]}>
                {formatDate(formData.transaction_date)}
              </Text>
              <Icon name="calendar-today" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Cleared Status */}
          <View style={styles.inputGroup}>
            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Cleared
                </Text>
                <Text style={[styles.helperText, { color: theme.textTertiary }]}>
                  Mark as cleared if transaction has been processed
                </Text>
              </View>
              <Switch
                value={formData.is_cleared}
                onValueChange={(value) => updateFormData('is_cleared', value)}
                trackColor={{ false: theme.border, true: '#10B981' }}
                thumbColor={formData.is_cleared ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Advanced Fields Toggle */}
        <TouchableOpacity
          style={[styles.advancedToggle, { backgroundColor: theme.surface }]}
          onPress={() => setShowAdvancedFields(!showAdvancedFields)}
        >
          <Text style={[styles.advancedToggleText, { color: theme.textPrimary }]}>
            Advanced Fields
          </Text>
          <Icon 
            name={showAdvancedFields ? "expand-less" : "expand-more"} 
            size={24} 
            color={theme.textSecondary} 
          />
        </TouchableOpacity>

        {/* Advanced Fields Section */}
        {showAdvancedFields && (
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Additional Details
            </Text>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Notes
              </Text>
              <TextInput
                style={[styles.input, styles.notesInput, { color: theme.textPrimary, borderColor: theme.border }]}
                value={formData.notes}
                onChangeText={(text) => updateFormData('notes', text)}
                placeholder="Additional notes or details..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Reference Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Reference Number
              </Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                value={formData.reference_number}
                onChangeText={(text) => updateFormData('reference_number', text)}
                placeholder="Check number, transaction ID, etc."
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        )}

        {/* Save Button */}
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
              {isEditing ? 'Update Transaction' : 'Create Transaction'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.transaction_date}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              updateFormData('transaction_date', selectedDate);
            }
          }}
        />
      )}

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

      {/* Amount Calculator */}
      <AmountCalculator
        isVisible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onConfirm={(amount) => {
          updateFormData('amount', amount);
          setShowCalculator(false);
        }}
        initialValue={formData.amount}
        title="Enter Transaction Amount"
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
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
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
  notesInput: {
    minHeight: 80,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
    marginTop: 2,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  advancedToggleText: {
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
  availableAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  availableAmountLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  availableAmountValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  calculatorButton: {
    padding: 4,
  },
});

export default TransactionFormScreen;