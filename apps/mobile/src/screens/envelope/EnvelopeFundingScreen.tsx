/**
 * Envelope Funding Screen
 * 
 * Interface for adding money to envelopes from available budget balance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import { Button, Card, TextInput } from '../../components/ui';
import { useBudget } from '../../context';
import { envelopeService } from '../../services/api/envelopeService';
import { dashboardService } from '../../services/api/dashboardService';
import { transactionService } from '../../services/api/transactionService';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';

import type { Envelope } from '@nvlp/types';
import type { MainStackParamList } from '../../navigation/types';

type EnvelopeFundingRouteProp = RouteProp<MainStackParamList, 'EnvelopeFunding'>;

interface FundingFormData {
  amount: string;
  description: string;
}

export const EnvelopeFundingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EnvelopeFundingRouteProp>();
  const { envelopeId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget } = useBudget();

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [formData, setFormData] = useState<FundingFormData>({
    amount: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFunding, setIsFunding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!selectedBudget) return;

    try {
      setIsLoading(true);
      
      // Load envelope data and dashboard data concurrently
      const [envelopeData, dashboardData] = await Promise.all([
        envelopeService.getEnvelope(envelopeId),
        dashboardService.getDashboardData(selectedBudget.id),
      ]);

      setEnvelope(envelopeData);
      setAvailableBalance(dashboardData.budget_overview.available_amount);

      // Set default description
      setFormData(prev => ({
        ...prev,
        description: `Fund ${envelopeData.name} envelope`,
      }));

    } catch (error: any) {
      Alert.alert(
        'Error Loading Data',
        error.message || 'Failed to load envelope or budget data. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: loadData },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedBudget, envelopeId, navigation]);

  // Load envelope and budget data
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
    } else if (amount > availableBalance) {
      newErrors.amount = `Amount cannot exceed available balance ($${availableBalance.toFixed(2)})`;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFund = async () => {
    if (!selectedBudget || !envelope || !validateForm()) {
      return;
    }

    setIsFunding(true);
    try {
      const amount = parseFloat(formData.amount);
      
      // Create allocation transaction via transaction service
      await transactionService.createAllocationTransaction({
        budget_id: selectedBudget.id,
        amount: amount,
        description: formData.description.trim(),
        to_envelope_id: envelope.id,
      });

      Alert.alert(
        'Funding Successful',
        `$${amount.toFixed(2)} has been added to ${envelope.name}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to envelope detail or list
              navigation.goBack();
            },
          },
        ]
      );

    } catch (error: any) {
      Alert.alert(
        'Funding Failed',
        error.message || 'Failed to fund envelope. Please try again.'
      );
    } finally {
      setIsFunding(false);
    }
  };

  const updateFormData = (field: keyof FundingFormData, value: string) => {
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading funding interface...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!envelope) {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Envelope Preview */}
        <Card variant="elevated" padding="large" style={styles.envelopeCard}>
          <View style={styles.envelopeHeader}>
            <View style={[styles.envelopeIcon, { backgroundColor: (envelope.color || theme.primary) + '20' }]}>
              <Icon
                name={envelope.icon || 'wallet-outline'}
                size={32}
                color={envelope.color || theme.primary}
              />
            </View>
            <View style={styles.envelopeInfo}>
              <Text style={styles.envelopeName}>{envelope.name}</Text>
              <Text style={styles.envelopeBalance}>
                Current Balance: {formatCurrency(envelope.current_balance)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Available Balance */}
        <Card variant="elevated" padding="large" style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="wallet-outline" size={24} color={theme.primary} />
            <Text style={styles.balanceLabel}>Available to Allocate</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(availableBalance)}
          </Text>
        </Card>

        {/* Funding Form */}
        <Card variant="elevated" padding="large" style={styles.formCard}>
          <Text style={styles.formTitle}>Fund Envelope</Text>
          
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
              Maximum: {formatCurrency(availableBalance)}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Enter funding description"
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
                disabled={amount > availableBalance}
              />
            ))}
            <Button
              title="All Available"
              onPress={() => updateFormData('amount', availableBalance.toFixed(2))}
              variant="outline"
              style={styles.quickAmountButton}
              disabled={availableBalance <= 0}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Fund Button */}
      <View style={styles.fundButtonContainer}>
        <Button
          title={`Fund ${formatCurrency(parseFloat(formData.amount) || 0)}`}
          onPress={handleFund}
          disabled={isFunding || !formData.amount || !formData.description}
          loading={isFunding}
          variant="primary"
        />
      </View>
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
      ...typography.h3,
      color: theme.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 120, // Space for fund button
    },
    envelopeCard: {
      marginBottom: spacing.lg,
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
    balanceCard: {
      marginBottom: spacing.lg,
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    balanceLabel: {
      ...typography.body,
      color: theme.textPrimary,
      marginLeft: spacing.sm,
      fontWeight: '500',
    },
    balanceAmount: {
      ...typography.h2,
      color: theme.primary,
      fontWeight: '600',
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
    fundButtonContainer: {
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
  });
}

export default EnvelopeFundingScreen;