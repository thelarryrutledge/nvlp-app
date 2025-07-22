/**
 * Envelope Form Screen
 * 
 * Form for creating and editing envelopes with type-specific configurations
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
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Button, Card } from '../../components/ui';
import { useBudget } from '../../context';
import { envelopeService } from '../../services/api/envelopeService';
import { categoryService } from '../../services/api/categoryService';
import type { Envelope, EnvelopeType, Category, CreateEnvelopeInput, UpdateEnvelopeInput } from '@nvlp/types';
import type { MainStackParamList } from '../../navigation/types';

type EnvelopeFormRouteProp = RouteProp<MainStackParamList, 'EnvelopeForm'>;

interface EnvelopeFormData {
  name: string;
  description: string;
  envelope_type: EnvelopeType;
  category_id: string;
  color: string;
  icon: string;
  is_active: boolean;
  // Notification fields
  should_notify: boolean;
  notify_above_amount: string; // String for form input, converted to number
  notify_below_amount: string;
  // Debt-specific fields
  debt_balance: string;
  minimum_payment: string;
  due_date: string;
}

const DEFAULT_COLORS = [
  '#059669', // Primary green
  '#DC2626', // Red
  '#2563EB', // Blue  
  '#7C3AED', // Purple
  '#EA580C', // Orange
  '#0891B2', // Cyan
  '#65A30D', // Lime
  '#BE185D', // Pink
  '#374151', // Gray
  '#0F766E', // Teal
];

const ENVELOPE_ICONS = [
  // Regular Envelope Icons
  'wallet-outline',         // Money/Wallet
  'home-outline',          // Housing
  'restaurant-outline',    // Food & Dining
  'car-outline',          // Transportation
  'storefront-outline',   // Shopping
  'flash-outline',        // Utilities
  'medical-outline',      // Healthcare
  'shirt-outline',        // Clothing
  'tv-outline',          // Entertainment
  'school-outline',       // Education
  'fitness-outline',      // Fitness
  'gift-outline',         // Gifts
  'construct-outline',    // Maintenance
  'refresh-outline',      // Subscriptions
  
  // Savings Envelope Icons
  'trending-up-outline',  // Savings/Investment
  'trophy-outline',       // Goals
  'airplane-outline',     // Travel
  'diamond-outline',      // Luxury/Special Purchase
  'library-outline',      // Education/Books
  'musical-notes-outline', // Hobbies
  'camera-outline',       // Photography/Hobbies
  'bicycle-outline',      // Recreation
  'umbrella-outline',     // Emergency Fund
  'shield-outline',       // Security/Insurance
  
  // Debt Envelope Icons
  'trending-down-outline', // Debt Reduction
  'card-outline',         // Credit Cards
  'business-outline',     // Loans
  'school-outline',       // Student Loans
  'home-outline',         // Mortgage
  'car-outline',         // Car Loan
  'medical-outline',     // Medical Debt
];

const ENVELOPE_TYPE_OPTIONS: { value: EnvelopeType; label: string; description: string; icon: string }[] = [
  { 
    value: 'regular', 
    label: 'Regular Envelope', 
    description: 'For everyday expenses and budgeting',
    icon: 'wallet-outline'
  },
  { 
    value: 'savings', 
    label: 'Savings Envelope', 
    description: 'For saving towards goals with progress tracking',
    icon: 'trending-up-outline'
  },
  { 
    value: 'debt', 
    label: 'Debt Envelope', 
    description: 'For tracking debt payments and balances',
    icon: 'trending-down-outline'
  },
];

export const EnvelopeFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EnvelopeFormRouteProp>();
  const { envelopeId } = route.params || {};
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget } = useBudget();

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<EnvelopeFormData>({
    name: '',
    description: '',
    envelope_type: 'regular',
    category_id: '',
    color: DEFAULT_COLORS[0],
    icon: ENVELOPE_ICONS[0],
    is_active: true,
    should_notify: false,
    notify_above_amount: '',
    notify_below_amount: '',
    debt_balance: '',
    minimum_payment: '',
    due_date: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const isEditing = !!envelopeId;

  // Load envelope and category data
  useEffect(() => {
    loadInitialData();
  }, [selectedBudget]);

  const loadInitialData = async () => {
    if (!selectedBudget) return;

    try {
      setIsLoading(true);
      
      // Load categories
      const categoriesData = await categoryService.getCategories(selectedBudget.id);
      setCategories(categoriesData);

      // Set default category if available
      if (categoriesData.length > 0 && !formData.category_id && !isEditing) {
        setFormData(prev => ({
          ...prev,
          category_id: categoriesData[0].id
        }));
      }

      // Load envelope data if editing
      if (isEditing && envelopeId) {
        const envelopeData = await envelopeService.getEnvelope(envelopeId);
        setEnvelope(envelopeData);
        setFormData({
          name: envelopeData.name,
          description: envelopeData.description || '',
          envelope_type: envelopeData.envelope_type,
          category_id: envelopeData.category_id || (categoriesData[0]?.id || ''),
          color: envelopeData.color || DEFAULT_COLORS[0],
          icon: envelopeData.icon || ENVELOPE_ICONS[0],
          is_active: envelopeData.is_active,
          should_notify: envelopeData.should_notify,
          notify_above_amount: envelopeData.notify_above_amount?.toString() || '',
          notify_below_amount: envelopeData.notify_below_amount?.toString() || '',
          debt_balance: envelopeData.debt_balance?.toString() || '',
          minimum_payment: envelopeData.minimum_payment?.toString() || '',
          due_date: envelopeData.due_date || '',
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Error Loading Data',
        error.message || 'Failed to load data. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: loadInitialData },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Envelope name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Envelope name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Envelope name must be less than 50 characters';
    }

    // Description validation
    if (formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    // Category validation
    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category';
    }

    // Notification amount validation
    if (formData.should_notify) {
      if (formData.notify_above_amount && isNaN(Number(formData.notify_above_amount))) {
        newErrors.notify_above_amount = 'Please enter a valid amount';
      }
      if (formData.notify_below_amount && isNaN(Number(formData.notify_below_amount))) {
        newErrors.notify_below_amount = 'Please enter a valid amount';
      }
    }

    // Debt-specific validation
    if (formData.envelope_type === 'debt') {
      if (formData.debt_balance && isNaN(Number(formData.debt_balance))) {
        newErrors.debt_balance = 'Please enter a valid debt amount';
      }
      if (formData.minimum_payment && isNaN(Number(formData.minimum_payment))) {
        newErrors.minimum_payment = 'Please enter a valid payment amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!selectedBudget) {
      Alert.alert('Error', 'No budget selected');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    try {
      setIsSaving(true);

      const envelopeData = {
        budget_id: selectedBudget.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        envelope_type: formData.envelope_type,
        category_id: formData.category_id || undefined,
        color: formData.color,
        icon: formData.icon,
        should_notify: formData.should_notify,
        notify_above_amount: formData.notify_above_amount ? Number(formData.notify_above_amount) : undefined,
        notify_below_amount: formData.notify_below_amount ? Number(formData.notify_below_amount) : undefined,
        debt_balance: formData.debt_balance ? Number(formData.debt_balance) : undefined,
        minimum_payment: formData.minimum_payment ? Number(formData.minimum_payment) : undefined,
        due_date: formData.due_date || undefined,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await envelopeService.updateEnvelope(envelopeId!, envelopeData as UpdateEnvelopeInput);
      } else {
        await envelopeService.createEnvelope(envelopeData as CreateEnvelopeInput);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Save Failed',
        error.message || `Failed to ${isEditing ? 'update' : 'create'} envelope. Please try again.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const updateFormData = (field: keyof EnvelopeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTypeChange = (newType: EnvelopeType) => {
    updateFormData('envelope_type', newType);
    
    // Reset type-specific fields when changing type
    if (newType !== 'debt') {
      updateFormData('debt_balance', '');
      updateFormData('minimum_payment', '');
      updateFormData('due_date', '');
    }
    
    // Update icon to match type if still using default
    const typeOption = ENVELOPE_TYPE_OPTIONS.find(opt => opt.value === newType);
    if (typeOption) {
      updateFormData('icon', typeOption.icon);
    }
    
    setShowTypePicker(false);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Select Category';
  };

  const renderFormField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric';
      error?: string;
      maxLength?: number;
    }
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          options?.multiline && styles.textInputMultiline,
          options?.error && styles.textInputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor={theme.textTertiary}
        multiline={options?.multiline}
        keyboardType={options?.keyboardType}
        maxLength={options?.maxLength}
      />
      {options?.error && (
        <Text style={styles.errorText}>{options.error}</Text>
      )}
      {options?.maxLength && (
        <Text style={styles.characterCount}>
          {value.length}/{options.maxLength}
        </Text>
      )}
    </View>
  );

  const renderPicker = (
    label: string,
    value: string,
    onPress: () => void,
    icon?: string,
    error?: string
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerButton, error && styles.pickerButtonError]}
        onPress={onPress}
      >
        {icon && (
          <Icon name={icon} size={20} color={theme.textSecondary} style={styles.pickerIcon} />
        )}
        <Text style={[styles.pickerButtonText, !value && styles.placeholderText]}>
          {value || `Select ${label}`}
        </Text>
        <Icon name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );

  const renderSwitch = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    description?: string
  ) => (
    <View style={styles.switchContainer}>
      <View style={styles.switchLabelContainer}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && (
          <Text style={styles.switchDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary + '40' }}
        thumbColor={value ? theme.primary : theme.textSecondary}
      />
    </View>
  );

  if (!selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Budget Selected</Text>
          <Text style={styles.emptyDescription}>
            Please select a budget to create envelopes.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>
            {isEditing ? 'Loading envelope...' : 'Loading data...'}
          </Text>
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
        {/* Basic Information */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {renderFormField(
            'Envelope Name *',
            formData.name,
            (text) => updateFormData('name', text),
            {
              placeholder: 'Enter envelope name',
              error: errors.name,
              maxLength: 50,
            }
          )}

          {renderFormField(
            'Description',
            formData.description,
            (text) => updateFormData('description', text),
            {
              placeholder: 'Optional description',
              multiline: true,
              error: errors.description,
              maxLength: 200,
            }
          )}

          {renderPicker(
            'Envelope Type',
            ENVELOPE_TYPE_OPTIONS.find(opt => opt.value === formData.envelope_type)?.label || '',
            () => setShowTypePicker(true),
            ENVELOPE_TYPE_OPTIONS.find(opt => opt.value === formData.envelope_type)?.icon
          )}

          {renderPicker(
            'Category',
            getCategoryName(formData.category_id),
            () => setShowCategoryPicker(true),
            'folder-outline',
            errors.category_id
          )}
        </Card>

        {/* Appearance */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.appearanceContainer}>
            <TouchableOpacity
              style={styles.colorPreviewButton}
              onPress={() => setShowColorPicker(true)}
            >
              <View style={[styles.colorPreview, { backgroundColor: formData.color }]} />
              <Text style={styles.colorPreviewLabel}>Color</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconPreviewButton}
              onPress={() => setShowIconPicker(true)}
            >
              <View style={[styles.iconPreview, { backgroundColor: formData.color + '20' }]}>
                <Icon name={formData.icon} size={24} color={formData.color} />
              </View>
              <Text style={styles.iconPreviewLabel}>Icon</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Debt-specific fields */}
        {formData.envelope_type === 'debt' && (
          <Card variant="elevated" padding="large" style={styles.card}>
            <Text style={styles.sectionTitle}>Debt Information</Text>
            
            {renderFormField(
              'Current Debt Balance',
              formData.debt_balance,
              (text) => updateFormData('debt_balance', text),
              {
                placeholder: '0.00',
                keyboardType: 'numeric',
                error: errors.debt_balance,
              }
            )}

            {renderFormField(
              'Minimum Payment',
              formData.minimum_payment,
              (text) => updateFormData('minimum_payment', text),
              {
                placeholder: '0.00',
                keyboardType: 'numeric',
                error: errors.minimum_payment,
              }
            )}

            {renderFormField(
              'Due Date',
              formData.due_date,
              (text) => updateFormData('due_date', text),
              {
                placeholder: 'YYYY-MM-DD (optional)',
              }
            )}
          </Card>
        )}

        {/* Notifications */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {renderSwitch(
            'Enable Notifications',
            formData.should_notify,
            (value) => updateFormData('should_notify', value),
            'Get alerts when envelope balance reaches certain thresholds'
          )}

          {formData.should_notify && (
            <>
              {renderFormField(
                formData.envelope_type === 'savings' ? 'Savings Goal Amount' : 'Alert Above Amount',
                formData.notify_above_amount,
                (text) => updateFormData('notify_above_amount', text),
                {
                  placeholder: '0.00',
                  keyboardType: 'numeric',
                  error: errors.notify_above_amount,
                }
              )}

              {renderFormField(
                'Alert Below Amount',
                formData.notify_below_amount,
                (text) => updateFormData('notify_below_amount', text),
                {
                  placeholder: '0.00',
                  keyboardType: 'numeric',
                  error: errors.notify_below_amount,
                }
              )}
            </>
          )}
        </Card>

        {/* Settings */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {renderSwitch(
            'Active Envelope',
            formData.is_active,
            (value) => updateFormData('is_active', value),
            'Inactive envelopes are hidden from most views'
          )}
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="secondary"
          style={styles.actionButton}
        />
        <Button
          title={isEditing ? 'Update' : 'Create'}
          onPress={handleSave}
          loading={isSaving}
          style={styles.actionButton}
        />
      </View>

      {/* Modals */}
      
      {/* Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Envelope Type</Text>
            <View style={styles.modalSpacer} />
          </View>
          <ScrollView style={styles.modalContent}>
            {ENVELOPE_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  formData.envelope_type === option.value && styles.optionButtonSelected
                ]}
                onPress={() => handleTypeChange(option.value)}
              >
                <Icon name={option.icon} size={24} color={theme.primary} style={styles.optionIcon} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {formData.envelope_type === option.value && (
                  <Icon name="checkmark" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={styles.modalSpacer} />
          </View>
          <ScrollView style={styles.modalContent}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.optionButton,
                  formData.category_id === category.id && styles.optionButtonSelected
                ]}
                onPress={() => {
                  updateFormData('category_id', category.id);
                  setShowCategoryPicker(false);
                }}
              >
                <View style={[styles.categoryColorIndicator, { backgroundColor: category.color || theme.primary }]} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{category.name}</Text>
                  {category.description && (
                    <Text style={styles.optionDescription}>{category.description}</Text>
                  )}
                </View>
                {formData.category_id === category.id && (
                  <Icon name="checkmark" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowColorPicker(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Color</Text>
            <TouchableOpacity onPress={() => setShowColorPicker(false)}>
              <Text style={styles.modalDoneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorGrid}>
            {DEFAULT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  formData.color === color && styles.colorOptionSelected
                ]}
                onPress={() => updateFormData('color', color)}
              >
                {formData.color === color && (
                  <Icon name="checkmark" size={24} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Icon Picker Modal */}
      <Modal
        visible={showIconPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIconPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Icon</Text>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <Text style={styles.modalDoneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.iconGrid}>
            <View style={styles.iconGridContainer}>
              {ENVELOPE_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    formData.icon === icon && styles.iconOptionSelected
                  ]}
                  onPress={() => updateFormData('icon', icon)}
                >
                  <Icon name={icon} size={24} color={formData.color} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    emptyDescription: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 100, // Space for action buttons
    },
    card: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      marginBottom: spacing.lg,
    },
    fieldContainer: {
      marginBottom: spacing.lg,
    },
    fieldLabel: {
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
    textInputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top' as const,
      paddingTop: spacing.sm,
    },
    textInputError: {
      borderColor: theme.error,
    },
    errorText: {
      ...typography.caption,
      color: theme.error,
      marginTop: spacing.xs,
    },
    characterCount: {
      ...typography.caption,
      color: theme.textTertiary,
      textAlign: 'right' as const,
      marginTop: spacing.xs,
    },
    pickerButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
    },
    pickerButtonError: {
      borderColor: theme.error,
    },
    pickerIcon: {
      marginRight: spacing.sm,
    },
    pickerButtonText: {
      ...typography.body,
      color: theme.textPrimary,
      flex: 1,
    },
    placeholderText: {
      color: theme.textTertiary,
    },
    switchContainer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.md,
    },
    switchLabelContainer: {
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
    appearanceContainer: {
      flexDirection: 'row' as const,
      gap: spacing.lg,
    },
    colorPreviewButton: {
      alignItems: 'center' as const,
    },
    colorPreview: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: theme.border,
    },
    colorPreviewLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    iconPreviewButton: {
      alignItems: 'center' as const,
    },
    iconPreview: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginBottom: spacing.sm,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: theme.border,
    },
    iconPreviewLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    actionContainer: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: spacing.md,
    },
    actionButton: {
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    modalCancelButton: {
      ...typography.body,
      color: theme.textSecondary,
    },
    modalDoneButton: {
      ...typography.body,
      color: theme.primary,
      fontWeight: '600' as const,
    },
    modalSpacer: {
      width: 50, // Same width as Done button to center title
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    optionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: 8,
      marginVertical: spacing.xs,
    },
    optionButtonSelected: {
      backgroundColor: theme.primary + '20',
    },
    optionIcon: {
      marginRight: spacing.md,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    optionDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    categoryColorIndicator: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: spacing.md,
    },
    colorGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    colorOption: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: theme.textPrimary,
    },
    iconGrid: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    iconGridContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    iconOption: {
      width: 50,
      height: 50,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    iconOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
  });
}

export default EnvelopeFormScreen;