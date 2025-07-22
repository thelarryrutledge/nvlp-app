/**
 * Envelope Notifications Screen
 * 
 * Configure notification settings for individual envelopes
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
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button, Card, TextInput } from '../../components/ui';
import { envelopeService } from '../../services/api/envelopeService';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';

import type { Envelope, UpdateEnvelopeInput } from '@nvlp/types';
import type { MainStackParamList } from '../../navigation/types';

type EnvelopeNotificationsRouteProp = RouteProp<MainStackParamList, 'EnvelopeNotifications'>;

interface NotificationFormData {
  should_notify: boolean;
  notify_below_amount: string;
  notify_above_amount: string;
  notify_date: Date | null;
}

export const EnvelopeNotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EnvelopeNotificationsRouteProp>();
  const { envelopeId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [formData, setFormData] = useState<NotificationFormData>({
    should_notify: false,
    notify_below_amount: '',
    notify_above_amount: '',
    notify_date: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load envelope data
  const loadEnvelope = useCallback(async () => {
    try {
      setIsLoading(true);
      const envelopeData = await envelopeService.getEnvelope(envelopeId);
      setEnvelope(envelopeData);
      
      // Initialize form data from envelope
      setFormData({
        should_notify: envelopeData.should_notify,
        notify_below_amount: envelopeData.notify_below_amount?.toString() || '',
        notify_above_amount: envelopeData.notify_above_amount?.toString() || '',
        notify_date: envelopeData.notify_date ? new Date(envelopeData.notify_date) : null,
      });
    } catch (error: any) {
      Alert.alert(
        'Error Loading Data',
        error.message || 'Failed to load envelope data. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: loadEnvelope },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [envelopeId, navigation]);

  // Load data on mount
  useEffect(() => {
    loadEnvelope();
  }, [loadEnvelope]);

  // Track changes
  useEffect(() => {
    if (!envelope) return;
    
    const hasFormChanges = 
      envelope.should_notify !== formData.should_notify ||
      (envelope.notify_below_amount?.toString() || '') !== formData.notify_below_amount ||
      (envelope.notify_above_amount?.toString() || '') !== formData.notify_above_amount ||
      (envelope.notify_date ? new Date(envelope.notify_date).toISOString() : null) !== 
        (formData.notify_date ? formData.notify_date.toISOString() : null);
    
    setHasChanges(hasFormChanges);
  }, [envelope, formData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.should_notify) {
      // Validate amounts if notifications are enabled
      if (formData.notify_below_amount) {
        const amount = parseFloat(formData.notify_below_amount);
        if (isNaN(amount) || amount < 0) {
          newErrors.notify_below_amount = 'Must be a valid positive number';
        }
      }

      if (formData.notify_above_amount) {
        const amount = parseFloat(formData.notify_above_amount);
        if (isNaN(amount) || amount < 0) {
          newErrors.notify_above_amount = 'Must be a valid positive number';
        }
      }

      // Check that at least one notification type is set
      if (!formData.notify_below_amount && !formData.notify_above_amount && !formData.notify_date) {
        newErrors.general = 'Please configure at least one notification type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!envelope || !validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const updates: UpdateEnvelopeInput = {
        should_notify: formData.should_notify,
        notify_below_amount: formData.notify_below_amount ? parseFloat(formData.notify_below_amount) : null,
        notify_above_amount: formData.notify_above_amount ? parseFloat(formData.notify_above_amount) : null,
        notify_date: formData.notify_date ? formData.notify_date.toISOString() : null,
      };

      await envelopeService.updateEnvelope(envelope.id, updates);

      Alert.alert(
        'Settings Saved',
        'Notification settings have been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Save Failed',
        error.message || 'Failed to save notification settings. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (field: keyof NotificationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (errors[field] || errors.general) {
      setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getNotificationLabel = () => {
    if (!envelope) return '';
    
    switch (envelope.envelope_type) {
      case 'savings':
        return 'Enable savings goal notifications';
      case 'debt':
        return 'Enable debt payment reminders';
      case 'regular':
      default:
        return 'Enable envelope notifications';
    }
  };

  const getBalanceAlertLabel = () => {
    if (!envelope) return { below: '', above: '' };
    
    switch (envelope.envelope_type) {
      case 'savings':
        return {
          below: 'Alert when balance falls below',
          above: 'Alert when goal is reached',
        };
      case 'debt':
        return {
          below: 'Alert when payment is due',
          above: 'Alert when balance exceeds',
        };
      case 'regular':
      default:
        return {
          below: 'Alert when balance is low',
          above: 'Alert when balance exceeds',
        };
    }
  };

  const getDateAlertLabel = () => {
    if (!envelope) return '';
    
    switch (envelope.envelope_type) {
      case 'savings':
        return 'Goal deadline reminder';
      case 'debt':
        return 'Payment due date reminder';
      case 'regular':
      default:
        return 'Review date reminder';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading notification settings...</Text>
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

  const balanceLabels = getBalanceAlertLabel();

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
              <Text style={styles.envelopeType}>
                {envelope.envelope_type.charAt(0).toUpperCase() + envelope.envelope_type.slice(1)} Envelope
              </Text>
            </View>
          </View>
        </Card>

        {/* Master Toggle */}
        <Card variant="elevated" padding="large" style={styles.toggleCard}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => updateFormData('should_notify', !formData.should_notify)}
            activeOpacity={0.7}
          >
            <View style={styles.toggleContent}>
              <Icon 
                name="notifications-outline" 
                size={24} 
                color={formData.should_notify ? theme.primary : theme.textSecondary} 
              />
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>{getNotificationLabel()}</Text>
                <Text style={styles.toggleDescription}>
                  Receive alerts for this envelope
                </Text>
              </View>
            </View>
            <Switch
              value={formData.should_notify}
              onValueChange={(value) => updateFormData('should_notify', value)}
              trackColor={{ false: theme.border, true: theme.primary + '50' }}
              thumbColor={formData.should_notify ? theme.primary : theme.surface}
            />
          </TouchableOpacity>
        </Card>

        {/* Notification Settings */}
        {formData.should_notify && (
          <>
            {/* Balance Alerts */}
            <Card variant="elevated" padding="large" style={styles.settingsCard}>
              <Text style={styles.sectionTitle}>Balance Alerts</Text>
              
              {/* Low Balance Alert */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{balanceLabels.below}</Text>
                <TextInput
                  value={formData.notify_below_amount}
                  onChangeText={(value) => updateFormData('notify_below_amount', value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.notify_below_amount || undefined}
                />
                {envelope.envelope_type === 'regular' && (
                  <Text style={styles.helperText}>
                    Current balance: {formatCurrency(envelope.current_balance)}
                  </Text>
                )}
              </View>

              {/* High Balance Alert (for savings goals) */}
              {envelope.envelope_type === 'savings' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{balanceLabels.above}</Text>
                  <TextInput
                    value={formData.notify_above_amount}
                    onChangeText={(value) => updateFormData('notify_above_amount', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    error={errors.notify_above_amount || undefined}
                  />
                  <Text style={styles.helperText}>
                    This is your savings goal target
                  </Text>
                </View>
              )}

              {/* Excess Balance Alert (for regular envelopes) */}
              {envelope.envelope_type === 'regular' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{balanceLabels.above}</Text>
                  <TextInput
                    value={formData.notify_above_amount}
                    onChangeText={(value) => updateFormData('notify_above_amount', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    error={errors.notify_above_amount || undefined}
                  />
                  <Text style={styles.helperText}>
                    Alert when balance is unusually high
                  </Text>
                </View>
              )}
            </Card>

            {/* Date Alerts */}
            <Card variant="elevated" padding="large" style={styles.settingsCard}>
              <Text style={styles.sectionTitle}>Date Reminders</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{getDateAlertLabel()}</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={styles.datePickerText}>
                    {formData.notify_date ? formatDate(formData.notify_date) : 'Select date'}
                  </Text>
                  {formData.notify_date && (
                    <TouchableOpacity
                      onPress={() => updateFormData('notify_date', null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close-circle" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  {envelope.envelope_type === 'debt' 
                    ? 'Remind you before payment is due'
                    : 'Remind you to review this envelope'}
                </Text>
              </View>
            </Card>

            {/* Notification Preview */}
            <Card variant="elevated" padding="large" style={styles.previewCard}>
              <Text style={styles.sectionTitle}>Notification Preview</Text>
              <View style={styles.previewList}>
                {formData.notify_below_amount && (
                  <View style={styles.previewItem}>
                    <Icon name="trending-down" size={20} color={theme.warning} />
                    <Text style={styles.previewText}>
                      When balance drops below {formatCurrency(parseFloat(formData.notify_below_amount) || 0)}
                    </Text>
                  </View>
                )}
                {formData.notify_above_amount && envelope.envelope_type === 'savings' && (
                  <View style={styles.previewItem}>
                    <Icon name="trophy" size={20} color={theme.success} />
                    <Text style={styles.previewText}>
                      When you reach your {formatCurrency(parseFloat(formData.notify_above_amount) || 0)} goal
                    </Text>
                  </View>
                )}
                {formData.notify_above_amount && envelope.envelope_type === 'regular' && (
                  <View style={styles.previewItem}>
                    <Icon name="trending-up" size={20} color={theme.info} />
                    <Text style={styles.previewText}>
                      When balance exceeds {formatCurrency(parseFloat(formData.notify_above_amount) || 0)}
                    </Text>
                  </View>
                )}
                {formData.notify_date && (
                  <View style={styles.previewItem}>
                    <Icon name="calendar" size={20} color={theme.primary} />
                    <Text style={styles.previewText}>
                      Reminder on {formatDate(formData.notify_date)}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </>
        )}

        {/* Error Message */}
        {errors.general && (
          <Card variant="outlined" padding="medium" style={styles.errorCard}>
            <Text style={styles.errorMessage}>{errors.general}</Text>
          </Card>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <Button
          title="Save Settings"
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
          loading={isSaving}
          variant="primary"
        />
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.notify_date || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'android');
            if (selectedDate) {
              updateFormData('notify_date', selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
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
      ...typography.h3,
      color: theme.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 100, // Space for save button
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
    envelopeType: {
      ...typography.body,
      color: theme.textSecondary,
    },
    toggleCard: {
      marginBottom: spacing.lg,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.md,
    },
    toggleText: {
      flex: 1,
      marginLeft: spacing.md,
    },
    toggleLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500',
      marginBottom: spacing.xs,
    },
    toggleDescription: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    settingsCard: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
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
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    datePickerText: {
      ...typography.body,
      color: theme.textPrimary,
      flex: 1,
      marginLeft: spacing.sm,
    },
    previewCard: {
      marginBottom: spacing.lg,
    },
    previewList: {
      gap: spacing.md,
    },
    previewItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    previewText: {
      ...typography.body,
      color: theme.textSecondary,
      flex: 1,
    },
    errorCard: {
      marginBottom: spacing.lg,
      borderColor: theme.error,
    },
    errorMessage: {
      ...typography.body,
      color: theme.error,
      textAlign: 'center',
    },
    saveButtonContainer: {
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

export default EnvelopeNotificationsScreen;