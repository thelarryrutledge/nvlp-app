import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { BottomSheet } from '../ui';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { TransactionType } from '@nvlp/types';

interface Envelope {
  id: string;
  name: string;
  color?: string;
}

export interface TransactionFilters {
  startDate: Date | null;
  endDate: Date | null;
  transactionTypes: TransactionType[];
  envelopeIds: string[];
}

interface TransactionFilterBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (filters: TransactionFilters) => void;
  currentFilters: TransactionFilters;
  envelopes: Envelope[];
}

const transactionTypeOptions: { value: TransactionType; label: string; icon: string; color: string }[] = [
  { value: 'income', label: 'Income', icon: 'add-circle', color: '#10B981' },
  { value: 'expense', label: 'Expense', icon: 'remove-circle', color: '#EF4444' },
  { value: 'transfer', label: 'Transfer', icon: 'swap-horiz', color: '#3B82F6' },
  { value: 'allocation', label: 'Allocation', icon: 'account-balance-wallet', color: '#8B5CF6' },
];

export const TransactionFilterBottomSheet: React.FC<TransactionFilterBottomSheetProps> = ({
  isVisible,
  onClose,
  onApply,
  currentFilters,
  envelopes,
}) => {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<TransactionFilters>(currentFilters);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleDateChange = (type: 'start' | 'end', selectedDate?: Date) => {
    if (type === 'start') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setFilters(prev => ({ ...prev, startDate: selectedDate }));
      }
    } else {
      setShowEndDatePicker(false);
      if (selectedDate) {
        setFilters(prev => ({ ...prev, endDate: selectedDate }));
      }
    }
  };

  const toggleTransactionType = (type: TransactionType) => {
    setFilters(prev => {
      const types = prev.transactionTypes.includes(type)
        ? prev.transactionTypes.filter(t => t !== type)
        : [...prev.transactionTypes, type];
      return { ...prev, transactionTypes: types };
    });
  };

  const toggleEnvelope = (envelopeId: string) => {
    setFilters(prev => {
      const ids = prev.envelopeIds.includes(envelopeId)
        ? prev.envelopeIds.filter(id => id !== envelopeId)
        : [...prev.envelopeIds, envelopeId];
      return { ...prev, envelopeIds: ids };
    });
  };

  const handleReset = () => {
    setFilters({
      startDate: null,
      endDate: null,
      transactionTypes: [],
      envelopeIds: [],
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.startDate !== null ||
      filters.endDate !== null ||
      filters.transactionTypes.length > 0 ||
      filters.envelopeIds.length > 0
    );
  };

  return (
    <>
      <BottomSheet
        isVisible={isVisible}
        onClose={onClose}
        snapPoints={['75%']}
        title="Filter Transactions"
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Range Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Date Range
            </Text>
            
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Icon name="calendar-today" size={20} color={theme.textSecondary} />
                <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                  {formatDate(filters.startDate)}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dateToText, { color: theme.textSecondary }]}>to</Text>

              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Icon name="calendar-today" size={20} color={theme.textSecondary} />
                <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                  {formatDate(filters.endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick date presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: theme.border }]}
                onPress={() => {
                  const today = new Date();
                  setFilters(prev => ({ ...prev, startDate: today, endDate: today }));
                }}
              >
                <Text style={[styles.presetText, { color: theme.primary }]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetButton, { borderColor: theme.border }]}
                onPress={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                  setFilters(prev => ({ ...prev, startDate: firstDay, endDate: now }));
                }}
              >
                <Text style={[styles.presetText, { color: theme.primary }]}>This Month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetButton, { borderColor: theme.border }]}
                onPress={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                  setFilters(prev => ({ ...prev, startDate: firstDay, endDate: lastDay }));
                }}
              >
                <Text style={[styles.presetText, { color: theme.primary }]}>Last Month</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transaction Type Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Transaction Type
            </Text>
            
            <View style={styles.typeGrid}>
              {transactionTypeOptions.map(option => {
                const isSelected = filters.transactionTypes.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isSelected ? `${option.color}20` : theme.surface,
                        borderColor: isSelected ? option.color : theme.border,
                      },
                    ]}
                    onPress={() => toggleTransactionType(option.value)}
                  >
                    <Icon 
                      name={option.icon} 
                      size={20} 
                      color={isSelected ? option.color : theme.textSecondary} 
                    />
                    <Text
                      style={[
                        styles.typeText,
                        { color: isSelected ? option.color : theme.textSecondary },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Icon name="check" size={16} color={option.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Envelope Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Envelopes
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.envelopeScroll}
            >
              {envelopes.map(envelope => {
                const isSelected = filters.envelopeIds.includes(envelope.id);
                return (
                  <TouchableOpacity
                    key={envelope.id}
                    style={[
                      styles.envelopeChip,
                      {
                        backgroundColor: isSelected 
                          ? `${envelope.color || theme.primary}20` 
                          : theme.surface,
                        borderColor: isSelected 
                          ? envelope.color || theme.primary 
                          : theme.border,
                      },
                    ]}
                    onPress={() => toggleEnvelope(envelope.id)}
                  >
                    <View
                      style={[
                        styles.envelopeDot,
                        { backgroundColor: envelope.color || theme.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.envelopeText,
                        { 
                          color: isSelected 
                            ? envelope.color || theme.primary 
                            : theme.textSecondary 
                        },
                      ]}
                    >
                      {envelope.name}
                    </Text>
                    {isSelected && (
                      <Icon 
                        name="check" 
                        size={14} 
                        color={envelope.color || theme.primary} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: theme.border }]}
              onPress={handleReset}
              disabled={!hasActiveFilters()}
            >
              <Text 
                style={[
                  styles.resetText, 
                  { color: hasActiveFilters() ? theme.textPrimary : theme.textTertiary }
                ]}
              >
                Reset Filters
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={filters.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => handleDateChange('start', date)}
          maximumDate={filters.endDate || new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={filters.endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => handleDateChange('end', date)}
          minimumDate={filters.startDate || undefined}
          maximumDate={new Date()}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateToText: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '47%',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  envelopeScroll: {
    marginHorizontal: -4,
  },
  envelopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
    gap: 6,
  },
  envelopeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  envelopeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});