import React, { useCallback, useEffect, useState } from 'react';
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
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudget } from '../../context/BudgetContext';
import { useApiClient } from '../../hooks/useApiClient';
import { LoadingState } from '../../components/ui';
import { CreatePayeeInput, Payee, PayeeType, UpdatePayeeInput } from '@nvlp/types';
import { useTheme } from '../../theme';

type RootStackParamList = {
  PayeeList: undefined;
  PayeeForm: { payeeId?: string };
  PayeeDetail: { payeeId: string };
};

type PayeeFormScreenNavigationProp = NavigationProp<RootStackParamList, 'PayeeForm'>;
type PayeeFormScreenRouteProp = RouteProp<RootStackParamList, 'PayeeForm'>;

const payeeTypes: PayeeType[] = ['business', 'person', 'organization', 'utility', 'service', 'other'];

const payeeTypeIcons: Record<PayeeType, string> = {
  business: 'business',
  person: 'person',
  organization: 'domain',
  utility: 'flash-on',
  service: 'build',
  other: 'more-horiz',
};

const payeeTypeLabels: Record<PayeeType, string> = {
  business: 'Business',
  person: 'Person',
  organization: 'Organization',
  utility: 'Utility',
  service: 'Service',
  other: 'Other',
};

const colorOptions = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F97316',
  '#EF4444',
  '#D97706',
  '#6366F1',
  '#EC4899',
];

// Payee categories for better organization
const payeeCategories = [
  { id: 'essential', name: 'Essential', color: '#DC2626', icon: 'local-grocery-store' },
  { id: 'utilities', name: 'Utilities', color: '#F59E0B', icon: 'flash-on' },
  { id: 'healthcare', name: 'Healthcare', color: '#EF4444', icon: 'local-hospital' },
  { id: 'entertainment', name: 'Entertainment', color: '#8B5CF6', icon: 'movie' },
  { id: 'transport', name: 'Transport', color: '#3B82F6', icon: 'directions-car' },
  { id: 'shopping', name: 'Shopping', color: '#EC4899', icon: 'shopping-bag' },
  { id: 'food', name: 'Food & Dining', color: '#F97316', icon: 'restaurant' },
  { id: 'services', name: 'Services', color: '#10B981', icon: 'build' },
  { id: 'other', name: 'Other', color: '#6B7280', icon: 'more-horiz' },
];

export const PayeeFormScreen: React.FC = () => {
  const navigation = useNavigation<PayeeFormScreenNavigationProp>();
  const route = useRoute<PayeeFormScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const { theme } = useTheme();

  const payeeId = route.params.payeeId;
  const isEditing = !!payeeId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    payee_type: 'business' as PayeeType,
    category: 'other',
    color: '#10B981',
    icon: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    preferred_payment_method: '',
    account_number: '',
  });

  useEffect(() => {
    if (isEditing) {
      loadPayee();
    }
  }, [isEditing]);

  const loadPayee = async () => {
    try {
      const payee = await client.getPayee(payeeId!);
      
      // Extract category from description if it follows our format: [category:id]
      let category = 'other';
      let description = payee.description || '';
      const categoryMatch = description.match(/\[category:(\w+)\]/);
      if (categoryMatch) {
        category = categoryMatch[1];
        description = description.replace(/\[category:\w+\]\s*/, '');
      }
      
      setFormData({
        name: payee.name,
        description,
        payee_type: payee.payee_type,
        category,
        color: payee.color || '#10B981',
        icon: payee.icon || '',
        email: payee.email || '',
        phone: payee.phone || '',
        website: payee.website || '',
        address: payee.address || '',
        preferred_payment_method: payee.preferred_payment_method || '',
        account_number: payee.account_number || '',
      });
    } catch (err) {
      console.error('Failed to load payee:', err);
      Alert.alert('Error', 'Failed to load payee. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a payee name.');
      return;
    }

    if (!selectedBudget?.id) {
      Alert.alert('Error', 'No budget selected.');
      return;
    }

    setSaving(true);
    try {
      // Embed category info in description for now
      const categoryTag = formData.category !== 'other' ? `[category:${formData.category}] ` : '';
      const fullDescription = categoryTag + (formData.description.trim() || '');
      
      if (isEditing) {
        const updates: UpdatePayeeInput = {
          name: formData.name.trim(),
          description: fullDescription || undefined,
          payee_type: formData.payee_type,
          color: formData.color,
          icon: formData.icon.trim() || undefined,
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          website: formData.website.trim() || undefined,
          address: formData.address.trim() || undefined,
          preferred_payment_method: formData.preferred_payment_method.trim() || undefined,
          account_number: formData.account_number.trim() || undefined,
        };
        await client.updatePayee(payeeId!, updates);
      } else {
        const input: CreatePayeeInput = {
          budget_id: selectedBudget.id,
          name: formData.name.trim(),
          description: fullDescription || null,
          payee_type: formData.payee_type,
          color: formData.color,
          icon: formData.icon.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
          address: formData.address.trim() || null,
          preferred_payment_method: formData.preferred_payment_method.trim() || null,
          account_number: formData.account_number.trim() || null,
        };
        await client.createPayee(input);
      }
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save payee:', err);
      Alert.alert('Error', 'Failed to save payee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderTypeSelector = () => (
    <View style={styles.typeSelector}>
      {payeeTypes.map((type) => {
        const isSelected = formData.payee_type === type;
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeOption,
              {
                backgroundColor: isSelected ? '#D1FAE5' : theme.surface,
                borderColor: isSelected ? '#10B981' : theme.border,
              },
            ]}
            onPress={() => setFormData({ ...formData, payee_type: type })}
            activeOpacity={0.7}
          >
            <Icon
              name={payeeTypeIcons[type]}
              size={24}
              color={isSelected ? '#059669' : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: isSelected ? '#047857' : theme.textSecondary,
                },
              ]}
            >
              {payeeTypeLabels[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderColorSelector = () => (
    <View style={styles.colorSelector}>
      {colorOptions.map((color) => {
        const isSelected = formData.color === color;
        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              isSelected && styles.colorOptionSelected,
            ]}
            onPress={() => setFormData({ ...formData, color })}
            activeOpacity={0.7}
          >
            {isSelected && (
              <Icon name="check" size={16} color={'white'} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderCategorySelector = () => (
    <View style={styles.categorySelector}>
      {payeeCategories.map((category) => {
        const isSelected = formData.category === category.id;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryOption,
              {
                backgroundColor: isSelected ? category.color + '20' : theme.surface,
                borderColor: isSelected ? category.color : theme.border,
              },
            ]}
            onPress={() => setFormData({ ...formData, category: category.id })}
            activeOpacity={0.7}
          >
            <Icon
              name={category.icon}
              size={20}
              color={isSelected ? category.color : theme.textSecondary}
            />
            <Text
              style={[
                styles.categoryLabel,
                {
                  color: isSelected ? category.color : theme.textSecondary,
                },
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (loading) {
    return <LoadingState message="Loading payee..." />;
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
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Basic Information
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Name *
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter payee name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: theme.textPrimary, borderColor: theme.border },
              ]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Add a description"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Type
            </Text>
            {renderTypeSelector()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Category
            </Text>
            {renderCategorySelector()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Color
            </Text>
            {renderColorSelector()}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Contact Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Email
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="email@example.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Phone
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="(555) 123-4567"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Website
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.website}
              onChangeText={(text) => setFormData({ ...formData, website: text })}
              placeholder="https://example.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Address
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: theme.textPrimary, borderColor: theme.border },
              ]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter address"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Payment Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Preferred Payment Method
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.preferred_payment_method}
              onChangeText={(text) =>
                setFormData({ ...formData, preferred_payment_method: text })
              }
              placeholder="e.g., Check, Credit Card, Bank Transfer"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Account Number
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={formData.account_number}
              onChangeText={(text) =>
                setFormData({ ...formData, account_number: text })
              }
              placeholder="Enter account number"
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
              {isEditing ? 'Update Payee' : 'Create Payee'}
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
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
  },
  typeLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#171717',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
    minWidth: '45%',
  },
  categoryLabel: {
    marginLeft: 8,
    fontSize: 14,
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