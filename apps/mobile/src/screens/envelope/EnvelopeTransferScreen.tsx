/**
 * Envelope Transfer Screen
 * 
 * Interface for transferring money between envelopes
 */

import type { Envelope } from '@nvlp/types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { Button, Card, TextInput } from '../../components/ui';
import { useBudget } from '../../context';
import type { MainStackParamList } from '../../navigation/types';
import { envelopeService } from '../../services/api/envelopeService';
import { transactionService } from '../../services/api/transactionService';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';


type EnvelopeTransferRouteProp = RouteProp<MainStackParamList, 'EnvelopeTransfer'>;

interface TransferFormData {
  amount: string;
  description: string;
  toEnvelopeId: string;
}

export const EnvelopeTransferScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EnvelopeTransferRouteProp>();
  const { envelopeId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget } = useBudget();

  const [fromEnvelope, setFromEnvelope] = useState<Envelope | null>(null);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [formData, setFormData] = useState<TransferFormData>({
    amount: '',
    description: '',
    toEnvelopeId: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEnvelopePicker, setShowEnvelopePicker] = useState(false);

  // Load envelope data
  const loadData = useCallback(async () => {
    if (!selectedBudget || !envelopeId) return;

    try {
      setIsLoading(true);
      
      // Load source envelope and all envelopes concurrently
      const [sourceEnvelope, allEnvelopes] = await Promise.all([
        envelopeService.getEnvelope(envelopeId),
        envelopeService.getEnvelopes(selectedBudget.id),
      ]);

      setFromEnvelope(sourceEnvelope);
      // Filter out the source envelope from the list of possible destinations
      setEnvelopes(allEnvelopes.filter(e => e.id !== envelopeId && e.is_active));

      // Set default description
      setFormData(prev => ({
        ...prev,
        description: `Transfer from ${sourceEnvelope.name}`,
      }));

    } catch (error: any) {
      Alert.alert(
        'Error Loading Data',
        error.message || 'Failed to load envelope data. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: loadData },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedBudget, envelopeId, navigation]);

  // Load data on mount
  useEffect(() => {
    if (selectedBudget && envelopeId) {
      loadData();
    }
  }, [selectedBudget, envelopeId, loadData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const amount = parseFloat(formData.amount);

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(amount)) {
      newErrors.amount = 'Amount must be a valid number';
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    } else if (fromEnvelope && amount > fromEnvelope.current_balance) {
      newErrors.amount = `Amount cannot exceed available balance ($${fromEnvelope.current_balance.toFixed(2)})`;
    }

    if (!formData.toEnvelopeId) {
      newErrors.toEnvelopeId = 'Please select a destination envelope';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (!selectedBudget || !fromEnvelope || !validateForm()) {
      return;
    }

    setIsTransferring(true);
    try {
      const amount = parseFloat(formData.amount);
      const toEnvelope = envelopes.find(e => e.id === formData.toEnvelopeId);
      
      if (!toEnvelope) {
        throw new Error('Destination envelope not found');
      }
      
      // Create transfer transaction
      await transactionService.createTransferTransaction({
        budget_id: selectedBudget.id,
        amount: amount,
        description: formData.description.trim(),
        from_envelope_id: fromEnvelope.id,
        to_envelope_id: formData.toEnvelopeId,
      });

      Alert.alert(
        'Transfer Successful',
        `$${amount.toFixed(2)} has been transferred from ${fromEnvelope.name} to ${toEnvelope.name}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );

    } catch (error: any) {
      Alert.alert(
        'Transfer Failed',
        error.message || 'Failed to transfer funds. Please try again.'
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const updateFormData = (field: keyof TransferFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getSelectedEnvelope = () => {
    return envelopes.find(e => e.id === formData.toEnvelopeId);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading transfer interface...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fromEnvelope) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={styles.errorText}>Envelope not found</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  const selectedEnvelope = getSelectedEnvelope();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Source Envelope */}
        <Card variant="elevated" padding="large" style={styles.envelopeCard}>
          <Text style={styles.sectionTitle}>From Envelope</Text>
          <View style={styles.envelopeHeader}>
            <View style={[styles.envelopeIcon, { backgroundColor: (fromEnvelope.color || theme.primary) + '20' }]}>
              <Icon
                name={fromEnvelope.icon || 'wallet-outline'}
                size={32}
                color={fromEnvelope.color || theme.primary}
              />
            </View>
            <View style={styles.envelopeInfo}>
              <Text style={styles.envelopeName}>{fromEnvelope.name}</Text>
              <Text style={styles.envelopeBalance}>
                Available: {formatCurrency(fromEnvelope.current_balance)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Transfer Arrow */}
        <View style={styles.arrowContainer}>
          <Icon name="arrow-down-circle" size={32} color={theme.primary} />
        </View>

        {/* Destination Envelope */}
        <Card variant="elevated" padding="large" style={styles.envelopeCard}>
          <Text style={styles.sectionTitle}>To Envelope</Text>
          <TouchableOpacity
            style={styles.envelopePicker}
            onPress={() => setShowEnvelopePicker(true)}
          >
            {selectedEnvelope ? (
              <View style={styles.envelopeHeader}>
                <View style={[styles.envelopeIcon, { backgroundColor: (selectedEnvelope.color || theme.primary) + '20' }]}>
                  <Icon
                    name={selectedEnvelope.icon || 'wallet-outline'}
                    size={32}
                    color={selectedEnvelope.color || theme.primary}
                  />
                </View>
                <View style={styles.envelopeInfo}>
                  <Text style={styles.envelopeName}>{selectedEnvelope.name}</Text>
                  <Text style={styles.envelopeBalance}>
                    Current: {formatCurrency(selectedEnvelope.current_balance)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="add-circle-outline" size={32} color={theme.textTertiary} />
                <Text style={styles.placeholderText}>Select destination envelope</Text>
              </View>
            )}
            <Icon name="chevron-forward" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          {errors.toEnvelopeId && (
            <Text style={styles.errorText}>{errors.toEnvelopeId}</Text>
          )}
        </Card>

        {/* Transfer Form */}
        <Card variant="elevated" padding="large" style={styles.formCard}>
          <Text style={styles.formTitle}>Transfer Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Amount *</Text>
            <TextInput
              value={formData.amount}
              onChangeText={(value) => updateFormData('amount', value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.amount || undefined}
            />
            <Text style={styles.helperText}>
              Maximum: {formatCurrency(fromEnvelope.current_balance)}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Enter transfer description"
              error={errors.description || undefined}
              maxLength={100}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </View>
        </Card>

        {/* Quick Amount Buttons */}
        <Card variant="elevated" padding="large" style={styles.quickAmountCard}>
          <Text style={styles.quickAmountTitle}>Quick Amounts</Text>
          <View style={styles.quickAmountGrid}>
            {[25, 50, 100, 200].map((amount) => (
              <Button
                key={amount}
                title={`$${amount}`}
                onPress={() => updateFormData('amount', amount.toString())}
                variant="outline"
                style={styles.quickAmountButton}
                disabled={amount > fromEnvelope.current_balance}
              />
            ))}
            <Button
              title="All Available"
              onPress={() => updateFormData('amount', fromEnvelope.current_balance.toFixed(2))}
              variant="outline"
              style={styles.quickAmountButton}
              disabled={fromEnvelope.current_balance <= 0}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Transfer Button */}
      <View style={styles.transferButtonContainer}>
        <Button
          title={`Transfer ${formatCurrency(parseFloat(formData.amount) || 0)}`}
          onPress={handleTransfer}
          disabled={isTransferring || !formData.amount || !formData.description || !formData.toEnvelopeId}
          loading={isTransferring}
          variant="primary"
        />
      </View>

      {/* Envelope Picker Modal */}
      {showEnvelopePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Card variant="elevated" padding="large" style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Destination Envelope</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowEnvelopePicker(false)}
                >
                  <Icon name="close" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {envelopes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="folder-open-outline" size={48} color={theme.textTertiary} />
                    <Text style={styles.emptyStateText}>No other envelopes available</Text>
                    <Text style={styles.emptyStateDescription}>
                      Create more envelopes to enable transfers
                    </Text>
                  </View>
                ) : (
                  envelopes.map((envelope) => (
                    <TouchableOpacity
                      key={envelope.id}
                      style={[
                        styles.envelopeItem,
                        formData.toEnvelopeId === envelope.id && styles.selectedEnvelopeItem,
                      ]}
                      onPress={() => {
                        updateFormData('toEnvelopeId', envelope.id);
                        setShowEnvelopePicker(false);
                      }}
                    >
                      <View style={styles.envelopeItemContent}>
                        <View style={[styles.envelopeItemIcon, { backgroundColor: (envelope.color || theme.primary) + '20' }]}>
                          <Icon
                            name={envelope.icon || 'wallet-outline'}
                            size={24}
                            color={envelope.color || theme.primary}
                          />
                        </View>
                        <View style={styles.envelopeItemInfo}>
                          <Text style={styles.envelopeItemName}>{envelope.name}</Text>
                          <Text style={styles.envelopeItemBalance}>
                            Balance: {formatCurrency(envelope.current_balance)}
                          </Text>
                        </View>
                      </View>
                      {formData.toEnvelopeId === envelope.id && (
                        <Icon name="checkmark-circle" size={24} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </Card>
          </View>
        </View>
      )}
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
    errorText: {
      ...typography.caption,
      color: theme.error,
      marginTop: spacing.xs,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 120, // Space for transfer button
    },
    envelopeCard: {
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
      fontWeight: '600',
    },
    envelopeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    envelopeIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.lg,
    },
    envelopeInfo: {
      flex: 1,
    },
    envelopeName: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    envelopeBalance: {
      ...typography.body,
      color: theme.textSecondary,
    },
    arrowContainer: {
      alignItems: 'center',
      marginVertical: spacing.sm,
    },
    envelopePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    placeholderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    placeholderText: {
      ...typography.body,
      color: theme.textTertiary,
    },
    formCard: {
      marginBottom: spacing.lg,
    },
    formTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.lg,
      fontWeight: '600',
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    inputLabel: {
      ...typography.body,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    helperText: {
      ...typography.caption,
      color: theme.textTertiary,
      marginTop: spacing.xs,
    },
    quickAmountCard: {
      marginBottom: spacing.lg,
    },
    quickAmountTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
      fontWeight: '500',
    },
    quickAmountGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    quickAmountButton: {
      flex: 0,
      minWidth: 80,
    },
    transferButtonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      maxHeight: '70%',
    },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      fontWeight: '600',
    },
    closeButton: {
      padding: spacing.sm,
      marginRight: -spacing.sm,
    },
    modalContent: {
      maxHeight: 400,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyStateText: {
      ...typography.h4,
      color: theme.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptyStateDescription: {
      ...typography.body,
      color: theme.textTertiary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    envelopeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectedEnvelopeItem: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    envelopeItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    envelopeItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    envelopeItemInfo: {
      flex: 1,
    },
    envelopeItemName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500',
    },
    envelopeItemBalance: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
  });
}

export default EnvelopeTransferScreen;