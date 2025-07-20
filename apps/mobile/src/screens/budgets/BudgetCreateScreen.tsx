/**
 * Budget Create Screen
 * 
 * Form for creating a new budget with name, description, and settings
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, Card, TextInput } from '../../components/ui';
import { budgetService } from '../../services/api/budgetService';
import type { Theme } from '../../theme';
import type { CreateBudgetInput } from '@nvlp/types';

export const BudgetCreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  // Automatically disable default when active is turned off
  useEffect(() => {
    if (!isActive && isDefault) {
      setIsDefault(false);
    }
  }, [isActive, isDefault]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Budget name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Budget name must be at least 3 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Budget name must be less than 50 characters';
    }

    if (description.trim().length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Always create as non-default first to avoid constraint issues
      const input: CreateBudgetInput = {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        is_active: isActive,
        is_default: false, // Always create as non-default first
      };

      const newBudget = await budgetService.createBudget(input);
      
      // If user wants this as default AND it's active, update it after creation
      if (isDefault && isActive) {
        await budgetService.updateBudget(newBudget.id, { is_default: true });
      }
      
      Alert.alert(
        'Success',
        `Budget "${newBudget.name}" has been created successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Create Failed',
        error.message || 'Failed to create budget. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (name.trim() || description.trim()) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Budget</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="elevated" padding="large" style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Budget Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) {
                      const { name: _, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="e.g., Monthly Budget, Vacation Fund"
                  error={errors.name}
                  autoCapitalize="words"
                  maxLength={50}
                />
                <Text style={styles.helperText}>
                  {name.length}/50 characters
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    if (errors.description) {
                      const { description: _, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="Optional description for your budget"
                  error={errors.description || undefined}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                <Text style={styles.helperText}>
                  {description.length}/200 characters
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[
                    styles.switchLabel,
                    !isActive && styles.disabledText
                  ]}>
                    Set as Default
                  </Text>
                  <Text style={[
                    styles.switchDescription,
                    !isActive && styles.disabledText
                  ]}>
                    {isActive 
                      ? 'Make this your primary budget'
                      : 'Only active budgets can be set as default'
                    }
                  </Text>
                </View>
                <Switch
                  value={isDefault && isActive}
                  onValueChange={isActive ? setIsDefault : undefined}
                  disabled={!isActive}
                  trackColor={{ 
                    false: theme.border, 
                    true: isActive ? theme.primary : theme.border 
                  }}
                  thumbColor={
                    isDefault && isActive 
                      ? theme.textOnPrimary 
                      : theme.textSecondary
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Active</Text>
                  <Text style={styles.switchDescription}>
                    Enable this budget for use
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={isActive ? theme.textOnPrimary : theme.textSecondary}
                />
              </View>
            </View>

          </Card>

          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="outline"
              style={styles.button}
              disabled={isLoading}
            />
            <Button
              title="Create Budget"
              onPress={handleCreate}
              loading={isLoading}
              style={styles.button}
            />
          </View>
        </ScrollView>
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
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      ...typography.h2,
      color: theme.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    formCard: {
      marginBottom: spacing.lg,
    },
    formSection: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    inputGroup: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '600' as const,
    },
    helperText: {
      ...typography.caption,
      color: theme.textTertiary,
      marginTop: spacing.xs,
    },
    switchRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    switchInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    switchLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    switchDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    disabledText: {
      color: theme.textTertiary,
      opacity: 0.6,
    },
    buttonContainer: {
      flexDirection: 'row' as const,
      gap: spacing.md,
      marginTop: spacing.md,
    },
    button: {
      flex: 1,
    },
  });
}

export default BudgetCreateScreen;