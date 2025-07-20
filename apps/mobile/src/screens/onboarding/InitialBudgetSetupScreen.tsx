/**
 * Initial Budget Setup Screen
 * 
 * Helps users configure their automatically created budget with:
 * - Budget name and description
 * - Monthly income amount
 * - Basic envelope categories
 * - Initial envelope allocations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, TextInput, Card } from '../../components/ui';
import type { Theme } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type InitialBudgetSetupNavigationProp = NativeStackNavigationProp<MainStackParamList, 'InitialBudgetSetup'>;

interface Props {
  navigation: InitialBudgetSetupNavigationProp;
}

interface EnvelopeSetup {
  name: string;
  amount: string;
  color: string;
}

const DEFAULT_ENVELOPES: EnvelopeSetup[] = [
  { name: 'Groceries', amount: '', color: '#10B981' },
  { name: 'Transportation', amount: '', color: '#F59E0B' },
  { name: 'Entertainment', amount: '', color: '#8B5CF6' },
  { name: 'Dining Out', amount: '', color: '#EF4444' },
  { name: 'Emergency Fund', amount: '', color: '#059669' },
];

export const InitialBudgetSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  const [budgetName, setBudgetName] = useState('My Budget');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [envelopes, setEnvelopes] = useState<EnvelopeSetup[]>(DEFAULT_ENVELOPES);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const totalAllocated = envelopes.reduce((sum, envelope) => {
    const amount = parseFloat(envelope.amount) || 0;
    return sum + amount;
  }, 0);

  const monthlyIncomeNumber = parseFloat(monthlyIncome) || 0;
  const remainingAmount = monthlyIncomeNumber - totalAllocated;

  const handleEnvelopeAmountChange = (index: number, amount: string) => {
    const newEnvelopes = [...envelopes];
    newEnvelopes[index].amount = amount;
    setEnvelopes(newEnvelopes);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate budget info
      if (!budgetName.trim()) {
        Alert.alert('Validation Error', 'Please enter a budget name');
        return;
      }
      if (!monthlyIncome.trim() || isNaN(parseFloat(monthlyIncome))) {
        Alert.alert('Validation Error', 'Please enter a valid monthly income amount');
        return;
      }
      setCurrentStep(2);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Implement API calls to:
      // 1. Update budget name and description
      // 2. Create initial income source
      // 3. Create envelope categories
      // 4. Create initial envelopes with allocations
      
      // For now, just simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Budget Setup Complete!',
        'Your budget has been configured successfully. You can modify it anytime from the budget screen.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to main app (this will be handled by navigation state)
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Setup Error', 'Failed to complete budget setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderBudgetInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Budget Information</Text>
      <Text style={styles.stepDescription}>
        Let's start by setting up your budget basics
      </Text>

      <Card variant="elevated" padding="large" style={styles.formCard}>
        <TextInput
          label="Budget Name"
          value={budgetName}
          onChangeText={setBudgetName}
          placeholder="e.g., My Monthly Budget"
          leftIcon="wallet"
        />

        <TextInput
          label="Description (Optional)"
          value={budgetDescription}
          onChangeText={setBudgetDescription}
          placeholder="Brief description of your budget"
          leftIcon="document-text"
          multiline
        />

        <TextInput
          label="Monthly Income"
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
          placeholder="Enter your total monthly income"
          keyboardType="numeric"
          leftIcon="cash"
        />
      </Card>
    </View>
  );

  const renderEnvelopeSetupStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Envelope Setup</Text>
      <Text style={styles.stepDescription}>
        Allocate your monthly income to different spending categories
      </Text>

      <Card variant="elevated" padding="medium" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monthly Income:</Text>
          <Text style={styles.summaryAmount}>${monthlyIncomeNumber.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Allocated:</Text>
          <Text style={styles.summaryAmount}>${totalAllocated.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining:</Text>
          <Text style={[
            styles.summaryAmount,
            { color: remainingAmount >= 0 ? theme.success : theme.error }
          ]}>
            ${remainingAmount.toFixed(2)}
          </Text>
        </View>
      </Card>

      <View style={styles.envelopesContainer}>
        {envelopes.map((envelope, index) => (
          <Card key={index} variant="outlined" padding="medium" style={styles.envelopeCard}>
            <View style={styles.envelopeHeader}>
              <View style={[styles.colorIndicator, { backgroundColor: envelope.color }]} />
              <Text style={styles.envelopeName}>{envelope.name}</Text>
            </View>
            <TextInput
              value={envelope.amount}
              onChangeText={(amount) => handleEnvelopeAmountChange(index, amount)}
              placeholder="0.00"
              keyboardType="numeric"
              containerStyle={styles.envelopeInput}
            />
          </Card>
        ))}
      </View>

      {remainingAmount < 0 && (
        <Card variant="outlined" padding="medium" style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ You've allocated more than your monthly income. Please adjust your envelope amounts.
          </Text>
        </Card>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Budget</Text>
            <Text style={styles.subtitle}>Step {currentStep} of 2</Text>
          </View>

          {currentStep === 1 ? renderBudgetInfoStep() : renderEnvelopeSetupStep()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep === 2 && (
            <Button
              title="Back"
              variant="outline"
              onPress={() => setCurrentStep(1)}
              style={styles.backButton}
            />
          )}
          <Button
            title={currentStep === 1 ? 'Next' : 'Complete Setup'}
            onPress={handleNextStep}
            loading={isLoading}
            disabled={isLoading || (currentStep === 2 && remainingAmount < 0)}
            style={styles.nextButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    header: {
      alignItems: 'center' as const,
      marginBottom: spacing['3xl'],
    },
    title: {
      ...typography.h1,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    stepContainer: {
      marginBottom: spacing.xl,
    },
    stepTitle: {
      ...typography.h2,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
    },
    stepDescription: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.lg,
    },
    formCard: {
      marginBottom: spacing.lg,
    },
    summaryCard: {
      marginBottom: spacing.lg,
      backgroundColor: theme.backgroundSecondary,
    },
    summaryRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    summaryLabel: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
    },
    summaryAmount: {
      ...typography.currency,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    envelopesContainer: {
      gap: spacing.md,
    },
    envelopeCard: {
      marginBottom: spacing.sm,
    },
    envelopeHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    colorIndicator: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: spacing.sm,
    },
    envelopeName: {
      ...typography.bodyMedium,
      color: theme.textPrimary,
      flex: 1,
    },
    envelopeInput: {
      marginBottom: 0,
    },
    warningCard: {
      borderColor: theme.error,
      backgroundColor: theme.errorLight + '20',
      marginTop: spacing.md,
    },
    warningText: {
      ...typography.bodySmall,
      color: theme.error,
      textAlign: 'center' as const,
    },
    footer: {
      flexDirection: 'row' as const,
      padding: spacing.lg,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    backButton: {
      flex: 1,
    },
    nextButton: {
      flex: 2,
    },
  });
}

export default InitialBudgetSetupScreen;