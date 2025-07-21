/**
 * Income Source Form Screen
 * 
 * Form for creating and editing income sources
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card, Button } from '../../components/ui';
import { useBudget } from '../../context';
import { incomeSourceService } from '../../services/api/incomeSourceService';
import type { IncomeSource, IncomeFrequency } from '@nvlp/types';
import type { MainStackParamList } from '../../navigation/types';

type IncomeSourceFormRouteProp = RouteProp<MainStackParamList, 'IncomeSourceForm'>;

interface FormData {
  name: string;
  description: string;
  expectedAmount: string;
  frequency: IncomeFrequency;
  customDay: string;
  weeklyDay: string; // 0 = Sunday, 1 = Monday, etc.
  biWeeklyStartDate: string;
  monthlyDay: string; // 1-31 for monthly
  annualMonth: string; // 1-12 for annually
  annualDay: string; // 1-31 for annually
  shouldNotify: boolean;
  isActive: boolean;
}

const frequencyOptions: { value: IncomeFrequency; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'bi_weekly', label: 'Bi-weekly', description: 'Every two weeks' },
  { value: 'twice_monthly', label: 'Twice Monthly', description: '15th and last day of month' },
  { value: 'monthly', label: 'Monthly', description: 'Every month' },
  { value: 'annually', label: 'Annually', description: 'Once per year' },
  { value: 'custom', label: 'Custom', description: 'Custom frequency' },
  { value: 'one_time', label: 'One Time', description: 'Single occurrence' },
];

const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const IncomeSourceFormScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<IncomeSourceFormRouteProp>();
  const { selectedBudget } = useBudget();
  
  const incomeSourceId = route.params?.incomeSourceId;
  const isEditing = !!incomeSourceId;
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    expectedAmount: '',
    frequency: 'monthly',
    customDay: '',
    weeklyDay: '1', // Default to Monday
    biWeeklyStartDate: '',
    monthlyDay: '1', // Default to 1st of month
    annualMonth: '1', // Default to January
    annualDay: '1', // Default to 1st
    shouldNotify: false,
    isActive: true,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  // Load existing income source data if editing
  useEffect(() => {
    if (isEditing && incomeSourceId) {
      loadIncomeSource();
    }
  }, [isEditing, incomeSourceId]);

  const loadIncomeSource = async () => {
    if (!incomeSourceId) return;
    
    setIsLoading(true);
    try {
      const incomeSource = await incomeSourceService.getIncomeSource(incomeSourceId);
      setFormData({
        name: incomeSource.name,
        description: incomeSource.description || '',
        expectedAmount: incomeSource.expected_amount?.toString() || '',
        frequency: incomeSource.frequency,
        customDay: incomeSource.custom_day?.toString() || '',
        weeklyDay: incomeSource.weekly_day?.toString() || '1',
        biWeeklyStartDate: '', // bi_weekly_start_date doesn't exist in schema
        monthlyDay: incomeSource.monthly_day?.toString() || '1',
        annualMonth: '1', // annual fields don't exist in schema
        annualDay: '1', // annual fields don't exist in schema
        shouldNotify: incomeSource.should_notify,
        isActive: incomeSource.is_active,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load income source');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.expectedAmount && isNaN(Number(formData.expectedAmount))) {
      newErrors.expectedAmount = 'Must be a valid number';
    }
    
    if (formData.frequency === 'custom' && (!formData.customDay || isNaN(Number(formData.customDay)))) {
      newErrors.customDay = 'Custom day is required for custom frequency';
    }
    
    if (formData.frequency === 'weekly' && (!formData.weeklyDay || isNaN(Number(formData.weeklyDay)))) {
      newErrors.weeklyDay = 'Day of week is required for weekly frequency';
    }
    
    if (formData.frequency === 'bi_weekly' && !formData.biWeeklyStartDate.trim()) {
      newErrors.biWeeklyStartDate = 'Start date is required for bi-weekly frequency';
    }
    
    // No validation needed for twice_monthly - uses automatic 15th/last day schedule
    
    if (formData.frequency === 'monthly') {
      const monthlyDay = Number(formData.monthlyDay);
      if (!formData.monthlyDay || isNaN(monthlyDay) || (monthlyDay !== -1 && (monthlyDay < 1 || monthlyDay > 31))) {
        newErrors.monthlyDay = 'Day must be between 1 and 31, or "Last Day"';
      }
    }
    
    if (formData.frequency === 'annually') {
      if (!formData.annualMonth || isNaN(Number(formData.annualMonth)) || Number(formData.annualMonth) < 1 || Number(formData.annualMonth) > 12) {
        newErrors.annualMonth = 'Month is required for annual frequency';
      }
      if (!formData.annualDay || isNaN(Number(formData.annualDay)) || Number(formData.annualDay) < 1 || Number(formData.annualDay) > 31) {
        newErrors.annualDay = 'Day must be between 1 and 31';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Amount calculations are now handled by the database trigger

  const handleSave = async () => {
    if (!validateForm() || !selectedBudget) return;
    
    setIsSaving(true);
    try {
      const amount = formData.expectedAmount ? Number(formData.expectedAmount) : null;

      const incomeSourceData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        expected_amount: amount, // Store the original frequency amount
        frequency: formData.frequency,
        should_notify: formData.shouldNotify,
        is_active: formData.isActive,
      };

      // Add frequency-specific fields
      if (formData.frequency === 'custom' && formData.customDay) {
        incomeSourceData.custom_day = Number(formData.customDay);
      }
      
      if (formData.frequency === 'weekly' && formData.weeklyDay) {
        incomeSourceData.weekly_day = Number(formData.weeklyDay);
      }
      
      // No additional data needed for twice_monthly - uses automatic 15th/last day schedule
      
      if (formData.frequency === 'monthly' && formData.monthlyDay) {
        incomeSourceData.monthly_day = Number(formData.monthlyDay);
      }

      if (isEditing && incomeSourceId) {
        await incomeSourceService.updateIncomeSource(incomeSourceId, incomeSourceData);
      } else {
        await incomeSourceService.createIncomeSource(selectedBudget.id, incomeSourceData);
      }
      
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error', 
        error.message || `Failed to ${isEditing ? 'update' : 'create'} income source`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handleActiveToggle = (value: boolean) => {
    // If turning off active, also turn off notifications
    if (!value) {
      setFormData(prev => ({ 
        ...prev, 
        isActive: value,
        shouldNotify: false // Auto-disable notifications when inactive
      }));
    } else {
      setFormData(prev => ({ ...prev, isActive: value }));
    }
  };

  const getAmountLabel = (frequency: IncomeFrequency): string => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly Amount';
      case 'bi_weekly':
        return 'Bi-weekly Amount';
      case 'twice_monthly':
        return 'Amount per Payment';
      case 'monthly':
        return 'Monthly Amount';
      case 'annually':
        return 'Annual Amount';
      case 'custom':
        return 'Amount per Period';
      case 'one_time':
        return 'One-time Amount';
      default:
        return 'Expected Amount';
    }
  };

  const getAmountPlaceholder = (frequency: IncomeFrequency): string => {
    switch (frequency) {
      case 'weekly':
        return 'e.g., 1000 (per week)';
      case 'bi_weekly':
        return 'e.g., 2000 (every 2 weeks)';
      case 'twice_monthly':
        return 'e.g., 1500 (per payment)';
      case 'monthly':
        return 'e.g., 3000 (per month)';
      case 'annually':
        return 'e.g., 50000 (per year)';
      case 'custom':
        return 'e.g., 500 (per period)';
      case 'one_time':
        return 'e.g., 5000 (one time)';
      default:
        return '0.00';
    }
  };

  const renderFrequencyDropdown = () => {
    const selectedOption = frequencyOptions.find(option => option.value === formData.frequency);
    
    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>Frequency *</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowFrequencyModal(true)}
        >
          <View style={styles.dropdownContent}>
            <View>
              <Text style={styles.dropdownText}>{selectedOption?.label}</Text>
              <Text style={styles.dropdownSubtext}>{selectedOption?.description}</Text>
            </View>
            <Text style={styles.dropdownArrow}>▼</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFrequencyModal = () => (
    <Modal
      visible={showFrequencyModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFrequencyModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFrequencyModal(false)}>
            <Text style={styles.modalCancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Frequency</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          {frequencyOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                formData.frequency === option.value && styles.selectedModalOption,
              ]}
              onPress={() => {
                updateFormData('frequency', option.value);
                setShowFrequencyModal(false);
              }}
            >
              <View style={styles.modalOptionContent}>
                <Text style={[
                  styles.modalOptionLabel,
                  formData.frequency === option.value && styles.selectedModalOptionText,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.modalOptionDescription,
                  formData.frequency === option.value && styles.selectedModalOptionText,
                ]}>
                  {option.description}
                </Text>
              </View>
              {formData.frequency === option.value && (
                <Text style={styles.selectedCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (!selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No budget selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading income source...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="elevated" padding="large" style={styles.formCard}>
          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.textInput, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              placeholder="e.g., Primary Job, Freelance, etc."
              placeholderTextColor={theme.textTertiary}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="Optional description or notes"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Frequency Dropdown */}
          {renderFrequencyDropdown()}

          {/* Expected Amount (Dynamic based on frequency) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{getAmountLabel(formData.frequency)}</Text>
            <TextInput
              style={[styles.textInput, errors.expectedAmount && styles.inputError]}
              value={formData.expectedAmount}
              onChangeText={(text) => updateFormData('expectedAmount', text)}
              placeholder={getAmountPlaceholder(formData.frequency)}
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
            />
            {errors.expectedAmount && (
              <Text style={styles.errorText}>{errors.expectedAmount}</Text>
            )}
          </View>

          {/* Weekly Day (only show for weekly frequency) */}
          {formData.frequency === 'weekly' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Day of Week *</Text>
              <View style={styles.dayOfWeekContainer}>
                {dayOfWeekOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dayOption,
                      formData.weeklyDay === option.value && styles.selectedDay,
                    ]}
                    onPress={() => updateFormData('weeklyDay', option.value)}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      formData.weeklyDay === option.value && styles.selectedDayText,
                    ]}>
                      {option.label.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.weeklyDay && <Text style={styles.errorText}>{errors.weeklyDay}</Text>}
            </View>
          )}

          {/* Bi-weekly Start Date (only show for bi-weekly frequency) */}
          {formData.frequency === 'bi_weekly' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date *</Text>
              <TextInput
                style={[styles.textInput, errors.biWeeklyStartDate && styles.inputError]}
                value={formData.biWeeklyStartDate}
                onChangeText={(text) => updateFormData('biWeeklyStartDate', text)}
                placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                placeholderTextColor={theme.textTertiary}
              />
              {errors.biWeeklyStartDate && <Text style={styles.errorText}>{errors.biWeeklyStartDate}</Text>}
            </View>
          )}

          {/* Twice Monthly - No configuration needed (automatic 15th & last day) */}

          {/* Monthly Day (only show for monthly frequency) */}
          {formData.frequency === 'monthly' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Day of Month *</Text>
              <View style={styles.dayInputContainer}>
                <TextInput
                  style={[styles.dayInput, errors.monthlyDay && styles.inputError]}
                  value={formData.monthlyDay === '-1' ? '' : formData.monthlyDay}
                  onChangeText={(text) => updateFormData('monthlyDay', text)}
                  placeholder="1-31"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.lastDayButton,
                    formData.monthlyDay === '-1' && styles.selectedLastDay,
                  ]}
                  onPress={() => updateFormData('monthlyDay', formData.monthlyDay === '-1' ? '1' : '-1')}
                >
                  <Text style={[
                    styles.lastDayText,
                    formData.monthlyDay === '-1' && styles.selectedLastDayText,
                  ]}>
                    Last Day
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.monthlyDay && <Text style={styles.errorText}>{errors.monthlyDay}</Text>}
            </View>
          )}

          {/* Annual Date (only show for annual frequency) */}
          {formData.frequency === 'annually' && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Month *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthPickerContainer}>
                  {monthOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.monthOption,
                        formData.annualMonth === option.value && styles.selectedMonth,
                      ]}
                      onPress={() => updateFormData('annualMonth', option.value)}
                    >
                      <Text style={[
                        styles.monthOptionText,
                        formData.annualMonth === option.value && styles.selectedMonthText,
                      ]}>
                        {option.label.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.annualMonth && <Text style={styles.errorText}>{errors.annualMonth}</Text>}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Day of Month *</Text>
                <TextInput
                  style={[styles.textInput, errors.annualDay && styles.inputError]}
                  value={formData.annualDay}
                  onChangeText={(text) => updateFormData('annualDay', text)}
                  placeholder="1-31 (e.g., 1 for January 1st)"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                />
                {errors.annualDay && <Text style={styles.errorText}>{errors.annualDay}</Text>}
              </View>
            </>
          )}

          {/* Custom Day (only show for custom frequency) */}
          {formData.frequency === 'custom' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Custom Day *</Text>
              <TextInput
                style={[styles.textInput, errors.customDay && styles.inputError]}
                value={formData.customDay}
                onChangeText={(text) => updateFormData('customDay', text)}
                placeholder="Day of month (1-31)"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
              />
              {errors.customDay && <Text style={styles.errorText}>{errors.customDay}</Text>}
            </View>
          )}

          {/* Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Enable Notifications</Text>
                <Text style={[
                  styles.switchDescription,
                  !formData.isActive && styles.disabledText
                ]}>
                  {formData.isActive 
                    ? 'Get notified about expected income'
                    : 'Notifications disabled for inactive sources'
                  }
                </Text>
              </View>
              <Switch
                value={formData.shouldNotify}
                onValueChange={(value) => updateFormData('shouldNotify', value)}
                disabled={!formData.isActive}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={formData.shouldNotify ? theme.primary : theme.textTertiary}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Active</Text>
                <Text style={styles.switchDescription}>
                  Include in income tracking and reports
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={handleActiveToggle}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={formData.isActive ? theme.primary : theme.textTertiary}
              />
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          variant="secondary"
          title="Cancel"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={isSaving}
        />
        <Button
          variant="primary"
          title={isEditing ? 'Update Income Source' : 'Create Income Source'}
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        />
      </View>

      {/* Frequency Selection Modal */}
      {renderFrequencyModal()}
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
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 100, // Space for action buttons
    },
    formCard: {
      marginBottom: spacing.lg,
    },
    formGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      marginBottom: spacing.sm,
    },
    textInput: {
      ...typography.body,
      color: theme.textPrimary,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
    inputError: {
      borderColor: theme.error,
    },
    errorText: {
      ...typography.caption,
      color: theme.error,
      marginTop: spacing.xs,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    frequencyContainer: {
      marginBottom: spacing.lg,
    },
    frequencyOption: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: spacing.sm,
      backgroundColor: theme.surface,
    },
    selectedFrequency: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight + '20',
    },
    frequencyInfo: {
      flex: 1,
    },
    frequencyLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    frequencyDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    selectedFrequencyText: {
      color: theme.primary,
    },
    selectedIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    settingsSection: {
      marginTop: spacing.lg,
    },
    switchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
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
      opacity: 0.7,
    },
    actionButtons: {
      flexDirection: 'row' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xl,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: spacing.md,
    },
    cancelButton: {
      flex: 1,
    },
    saveButton: {
      flex: 2,
    },
    // Day of week picker styles
    dayOfWeekContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    dayOption: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      minWidth: 50,
      alignItems: 'center' as const,
    },
    selectedDay: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    dayOptionText: {
      ...typography.body,
      color: theme.textPrimary,
      fontSize: 12,
      fontWeight: '500' as const,
    },
    selectedDayText: {
      color: theme.primary,
      fontWeight: '600' as const,
    },
    // Month picker styles
    monthPickerContainer: {
      marginBottom: spacing.sm,
    },
    monthOption: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      marginRight: spacing.sm,
      minWidth: 65,
      alignItems: 'center' as const,
    },
    selectedMonth: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    monthOptionText: {
      ...typography.body,
      color: theme.textPrimary,
      fontSize: 12,
      fontWeight: '500' as const,
    },
    selectedMonthText: {
      color: theme.primary,
      fontWeight: '600' as const,
    },
    // Dropdown styles
    dropdownButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
    },
    dropdownContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    dropdownText: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    dropdownSubtext: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    dropdownArrow: {
      ...typography.body,
      color: theme.textSecondary,
      fontSize: 12,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalCancelButton: {
      ...typography.body,
      color: theme.primary,
      fontWeight: '500' as const,
    },
    modalTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    modalHeaderSpacer: {
      width: 50, // Same width as cancel button for centering
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    modalOption: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      marginVertical: spacing.xs,
    },
    selectedModalOption: {
      backgroundColor: theme.primary + '10',
      borderWidth: 1,
      borderColor: theme.primary + '30',
    },
    modalOptionContent: {
      flex: 1,
    },
    modalOptionLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    modalOptionDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    selectedModalOptionText: {
      color: theme.primary,
    },
    selectedCheckmark: {
      ...typography.body,
      color: theme.primary,
      fontWeight: '600' as const,
      fontSize: 18,
    },
    // Twice monthly day input styles
    dayInputContainer: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    dayInput: {
      ...typography.body,
      color: theme.textPrimary,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
      flex: 1,
    },
    lastDayButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      minHeight: 44,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    selectedLastDay: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    lastDayText: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '500' as const,
      fontSize: 12,
    },
    selectedLastDayText: {
      color: theme.primary,
      fontWeight: '600' as const,
    },
  });
}

export default IncomeSourceFormScreen;