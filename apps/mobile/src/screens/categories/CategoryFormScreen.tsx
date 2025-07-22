/**
 * Category Form Screen
 * 
 * Create and edit categories for the selected budget
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Button, Card, TextInput } from '../../components/ui';
import { useBudget } from '../../context';
import { categoryService } from '../../services/api/categoryService';
import type { Category, CategoryType, CreateCategoryInput, UpdateCategoryInput } from '@nvlp/types';
import type { MainStackParamList } from '../../navigation/types';

type CategoryFormRouteProp = RouteProp<MainStackParamList, 'CategoryForm'>;

interface CategoryFormData {
  name: string;
  description: string;
  category_type: CategoryType;
  color: string;
  icon: string;
  is_active: boolean;
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

const CATEGORY_ICONS = [
  // Essential Categories
  'home-outline',           // Housing
  'restaurant-outline',     // Food & Dining
  'car-outline',           // Transportation
  'storefront-outline',    // Shopping
  'cart-outline',          // Shopping Cart
  'flash-outline',         // Utilities
  'medical-outline',       // Healthcare
  
  // Lifestyle Categories  
  'shirt-outline',         // Clothing
  'tv-outline',           // Entertainment (keeping existing)
  'phone-portrait-outline', // Technology
  'airplane-outline',      // Travel
  'train-outline',         // Transportation/Travel
  'school-outline',        // Education
  'fitness-outline',       // Fitness
  'trophy-outline',        // Achievement/Goals
  'tennisball-outline',    // Sports
  'musical-notes-outline', // Music/Entertainment
  
  // Financial Categories
  'cash-outline',          // Money
  'trending-up-outline',   // Investments
  'card-outline',          // Banking
  'shield-outline',        // Insurance
  'umbrella-outline',      // Insurance/Protection
  'ticket-outline',        // Events/Entertainment
  'time-outline',          // Time-based/Scheduling
  
  // Personal & Misc
  'gift-outline',          // Gifts
  'library-outline',       // Books/Learning
  'cafe-outline',          // Coffee/Dining (keeping existing)
  'beer-outline',          // Dining/Social
  'pizza-outline',         // Fast Food/Dining
  'bed-outline',           // Accommodation/Rest
  'diamond-outline',       // Luxury/Jewelry
  'construct-outline',     // Maintenance
  'refresh-outline',       // Subscriptions
  'bag-outline',           // Shopping/Misc
  'triangle-outline',      // Creative/Design
  'trail-sign-outline',    // Travel/Adventure
];

export const CategoryFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CategoryFormRouteProp>();
  const { categoryId, categoryType } = route.params || {};
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget } = useBudget();

  const [category, setCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    category_type: (categoryType as CategoryType) || 'expense',
    color: DEFAULT_COLORS[0],
    icon: CATEGORY_ICONS[0], // This will now be 'home-outline'
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!categoryId;

  // Load category data if editing
  useEffect(() => {
    if (isEditing && categoryId) {
      loadCategoryData();
    }
  }, [categoryId]);

  const loadCategoryData = async () => {
    try {
      setIsLoading(true);
      const categoryData = await categoryService.getCategory(categoryId!);
      setCategory(categoryData);
      setFormData({
        name: categoryData.name,
        description: categoryData.description || '',
        category_type: categoryData.category_type,
        color: categoryData.color || DEFAULT_COLORS[0],
        icon: categoryData.icon || CATEGORY_ICONS[0], // This will now be 'home-outline'
        is_active: categoryData.is_active,
      });
    } catch (error: any) {
      Alert.alert(
        'Error Loading Category',
        error.message || 'Failed to load category data. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: loadCategoryData },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Category name must be less than 50 characters';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
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
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && categoryId) {
        // Update existing category
        const updateData: UpdateCategoryInput = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color,
          icon: formData.icon,
          is_active: formData.is_active,
        };
        await categoryService.updateCategory(categoryId, updateData);
        Alert.alert('Success', 'Category updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new category
        const createData: Omit<CreateCategoryInput, 'budget_id'> = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category_type: formData.category_type,
          color: formData.color,
          icon: formData.icon,
          is_active: formData.is_active,
        };
        await categoryService.createCategory(selectedBudget.id, createData);
        Alert.alert('Success', 'Category created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        'Save Failed',
        error.message || `Failed to ${isEditing ? 'update' : 'create'} category. Please try again.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderColorPicker = () => (
    <View style={styles.colorPickerContainer}>
      <Text style={styles.sectionLabel}>Color</Text>
      <View style={styles.colorGrid}>
        {DEFAULT_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.color === color && styles.selectedColorOption,
            ]}
            onPress={() => updateFormData('color', color)}
          >
            {formData.color === color && (
              <Icon name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderIconPicker = () => (
    <View style={styles.iconPickerContainer}>
      <Text style={styles.sectionLabel}>Icon</Text>
      <View style={styles.iconGrid}>
        {CATEGORY_ICONS.map((iconName) => (
          <TouchableOpacity
            key={iconName}
            style={[
              styles.iconOption,
              formData.icon === iconName && styles.selectedIconOption,
            ]}
            onPress={() => updateFormData('icon', iconName)}
          >
            <Icon 
              name={iconName} 
              size={24} 
              color={formData.icon === iconName ? theme.primary : theme.textSecondary} 
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategoryTypePicker = () => (
    <View style={styles.typePickerContainer}>
      <Text style={styles.sectionLabel}>Category Type</Text>
      <View style={styles.typeOptions}>
        {(['expense', 'income', 'transfer'] as CategoryType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeOption,
              formData.category_type === type && styles.selectedTypeOption,
            ]}
            onPress={() => updateFormData('category_type', type)}
            disabled={isEditing} // Can't change type when editing
          >
            <Text style={[
              styles.typeOptionText,
              formData.category_type === type && styles.selectedTypeOptionText,
              isEditing && styles.disabledText,
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isEditing && (
        <Text style={styles.helperText}>Category type cannot be changed when editing</Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading category...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Form Header */}
        <Card variant="elevated" padding="large" style={styles.headerCard}>
          <View style={styles.previewContainer}>
            <View style={[styles.previewIcon, { backgroundColor: formData.color + '20' }]}>
              <Icon 
                name={formData.icon} 
                size={32} 
                color={formData.color} 
              />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>
                {formData.name.trim() || 'Category Name'}
              </Text>
              <Text style={styles.previewType}>
                {formData.category_type.charAt(0).toUpperCase() + formData.category_type.slice(1)} Category
              </Text>
            </View>
          </View>
        </Card>

        {/* Basic Information */}
        <Card variant="elevated" padding="large" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholder="Enter category name"
              error={errors.name || undefined}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Enter category description"
              error={errors.description || undefined}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Category Type */}
        <Card variant="elevated" padding="large" style={styles.sectionCard}>
          {renderCategoryTypePicker()}
        </Card>

        {/* Visual Customization */}
        <Card variant="elevated" padding="large" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Visual Customization</Text>
          {renderColorPicker()}
          {renderIconPicker()}
        </Card>

        {/* Category Status */}
        {isEditing && (
          <Card variant="elevated" padding="large" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Category Status</Text>
            <TouchableOpacity
              style={styles.statusToggle}
              onPress={() => updateFormData('is_active', !formData.is_active)}
            >
              <View style={styles.statusToggleContent}>
                <Text style={styles.statusToggleLabel}>Active Category</Text>
                <Text style={styles.statusToggleDescription}>
                  {formData.is_active 
                    ? 'Category is available for use' 
                    : 'Category is hidden and disabled'}
                </Text>
              </View>
              <View style={[
                styles.statusToggleSwitch,
                formData.is_active && styles.statusToggleSwitchActive
              ]}>
                <Icon 
                  name={formData.is_active ? "checkmark" : "close"} 
                  size={16} 
                  color={formData.is_active ? theme.textOnPrimary : theme.textSecondary} 
                />
              </View>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <Button
          title={isEditing ? 'Update Category' : 'Create Category'}
          onPress={handleSave}
          disabled={isSaving}
          loading={isSaving}
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
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.md,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 100, // Space for save button
    },
    headerCard: {
      marginBottom: spacing.lg,
    },
    previewContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    previewIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.lg,
    },
    previewInfo: {
      flex: 1,
    },
    previewName: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    previewType: {
      ...typography.body,
      color: theme.textSecondary,
    },
    sectionCard: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.lg,
      fontWeight: '600' as const,
    },
    sectionLabel: {
      ...typography.body,
      color: theme.textPrimary,
      marginBottom: spacing.md,
      fontWeight: '500' as const,
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    inputLabel: {
      ...typography.body,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      fontWeight: '500' as const,
    },
    typePickerContainer: {
      marginBottom: spacing.md,
    },
    typeOptions: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    typeOption: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: 'center' as const,
    },
    selectedTypeOption: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    typeOptionText: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '500' as const,
    },
    selectedTypeOptionText: {
      color: theme.primary,
      fontWeight: '600' as const,
    },
    disabledText: {
      color: theme.textTertiary,
      opacity: 0.6,
    },
    helperText: {
      ...typography.caption,
      color: theme.textTertiary,
      marginTop: spacing.sm,
      fontStyle: 'italic' as const,
    },
    colorPickerContainer: {
      marginBottom: spacing.xl,
    },
    colorGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    selectedColorOption: {
      borderColor: theme.textPrimary,
    },
    iconPickerContainer: {
      marginBottom: spacing.md,
    },
    iconGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    iconOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.border,
    },
    selectedIconOption: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    statusToggle: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: spacing.sm,
    },
    statusToggleContent: {
      flex: 1,
      marginRight: spacing.md,
    },
    statusToggleLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      marginBottom: spacing.xs,
    },
    statusToggleDescription: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    statusToggleSwitch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.border,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    statusToggleSwitchActive: {
      backgroundColor: theme.primary,
    },
    saveButtonContainer: {
      position: 'absolute' as const,
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

export default CategoryFormScreen;