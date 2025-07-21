/**
 * Income Calendar Screen
 * 
 * Displays expected income in a calendar view format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { useBudget } from '../../context';
import { incomeSourceService } from '../../services/api/incomeSourceService';
import type { IncomeSource } from '@nvlp/types';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  incomes: IncomeEvent[];
}

interface IncomeEvent {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  color?: string;
}

export const IncomeCalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget, isLoading: budgetLoading } = useBudget();
  
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const loadIncomeSources = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedBudget) {
      setIncomeSources([]);
      setIsLoading(false);
      return;
    }

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const fetchedIncomeSources = await incomeSourceService.getIncomeSources(selectedBudget.id);
      setIncomeSources(fetchedIncomeSources.filter(source => source.is_active));
    } catch (error: any) {
      setError(error.message || 'Failed to load income sources');
      console.error('Income sources error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBudget]);

  // Load income sources when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadIncomeSources();
    }, [loadIncomeSources])
  );

  // Generate calendar days for the current month
  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, incomeSources]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const today = new Date();
    const days: CalendarDay[] = [];

    // Add days from previous month to fill the first week
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth: false,
        isToday: false,
        incomes: getIncomesForDate(date),
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        incomes: getIncomesForDate(date),
      });
    }

    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        incomes: getIncomesForDate(date),
      });
    }

    setCalendarDays(days);
  };

  const getIncomesForDate = (date: Date): IncomeEvent[] => {
    const events: IncomeEvent[] = [];
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const year = date.getFullYear();

    incomeSources.forEach(source => {
      let shouldInclude = false;

      switch (source.frequency) {
        case 'weekly':
          if (source.weekly_day !== null && dayOfWeek === source.weekly_day) {
            shouldInclude = true;
          }
          break;

        case 'bi_weekly':
          // Simplified bi-weekly logic - would need start date for accurate calculation
          if (dayOfWeek === 1) { // Every other Monday for example
            shouldInclude = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 14)) % 2 === 0;
          }
          break;

        case 'twice_monthly':
          // 15th and last day of month
          if (day === 15) {
            shouldInclude = true;
          } else if (day === new Date(year, month + 1, 0).getDate()) {
            shouldInclude = true;
          }
          break;

        case 'monthly':
          if (source.monthly_day !== null) {
            if (source.monthly_day === -1) {
              // Last day of month
              if (day === new Date(year, month + 1, 0).getDate()) {
                shouldInclude = true;
              }
            } else if (day === source.monthly_day) {
              shouldInclude = true;
            }
          }
          break;

        case 'annually':
          // Would need annual_month and annual_day fields
          if (month === 0 && day === 1) { // Default to January 1st
            shouldInclude = true;
          }
          break;

        case 'one_time':
          // Would need a specific date field
          break;

        case 'custom':
          // Would need custom logic based on custom_day
          if (source.custom_day !== null && day === source.custom_day) {
            shouldInclude = true;
          }
          break;
      }

      if (shouldInclude && source.expected_amount) {
        events.push({
          id: source.id,
          name: source.name,
          amount: source.expected_amount,
          frequency: source.frequency,
          color: getFrequencyColor(source.frequency),
        });
      }
    });

    return events;
  };

  const getFrequencyColor = (frequency: string): string => {
    const colors: Record<string, string> = {
      weekly: theme.success,
      bi_weekly: theme.primary,
      twice_monthly: theme.secondary,
      monthly: theme.warning,
      annually: theme.error,
      custom: theme.textSecondary,
      one_time: theme.textTertiary,
    };
    return colors[frequency] || theme.primary;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRefresh = () => {
    loadIncomeSources(true);
  };

  const navigateToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const navigateToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  const renderCalendarDay = (calendarDay: CalendarDay, index: number) => {
    const totalAmount = calendarDay.incomes.reduce((sum, income) => sum + income.amount, 0);
    
    return (
      <View
        key={index}
        style={[
          styles.calendarDay,
          !calendarDay.isCurrentMonth && styles.otherMonthDay,
          calendarDay.isToday && styles.todayDay,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            !calendarDay.isCurrentMonth && styles.otherMonthText,
            calendarDay.isToday && styles.todayText,
          ]}
        >
          {calendarDay.day}
        </Text>
        
        {calendarDay.incomes.length > 0 && (
          <View style={styles.incomeIndicators}>
            {calendarDay.incomes.slice(0, 2).map((income, idx) => (
              <View
                key={income.id + idx}
                style={[
                  styles.incomeIndicator,
                  { backgroundColor: income.color },
                ]}
              />
            ))}
            {calendarDay.incomes.length > 2 && (
              <Text style={styles.moreIndicator}>+{calendarDay.incomes.length - 2}</Text>
            )}
          </View>
        )}
        
        {totalAmount > 0 && (
          <Text style={styles.amountText}>
            {formatCurrency(totalAmount)}
          </Text>
        )}
      </View>
    );
  };

  if (budgetLoading && !selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Budget Selected</Text>
          <Text style={styles.emptyDescription}>
            Please select a budget to view income calendar.
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
          <Text style={styles.loadingText}>Loading income calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Income Calendar</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding="large" style={styles.calendarCard}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={navigateToPreviousMonth}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={navigateToToday} style={styles.monthTitle}>
              <Text style={styles.monthText}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={navigateToNextMonth}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View style={styles.weekHeader}>
            {weekDays.map(day => (
              <View key={day} style={styles.weekDayHeader}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map(renderCalendarDay)}
          </View>
        </Card>

        {/* Legend */}
        {incomeSources.length > 0 && (
          <Card variant="elevated" padding="medium" style={styles.legendCard}>
            <Text style={styles.legendTitle}>Income Types</Text>
            <View style={styles.legendItems}>
              {['weekly', 'bi_weekly', 'twice_monthly', 'monthly', 'annually'].map(freq => (
                <View key={freq} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: getFrequencyColor(freq) },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {freq.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    errorTitle: {
      ...typography.h3,
      color: theme.error,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    errorText: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    calendarCard: {
      marginBottom: spacing.lg,
    },
    calendarHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.lg,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surface,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: theme.border,
    },
    navButtonText: {
      fontSize: 24,
      color: theme.primary,
      fontWeight: 'bold' as const,
    },
    monthTitle: {
      flex: 1,
      alignItems: 'center' as const,
    },
    monthText: {
      ...typography.h3,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    weekHeader: {
      flexDirection: 'row' as const,
      marginBottom: spacing.sm,
    },
    weekDayHeader: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: spacing.sm,
    },
    weekDayText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '600' as const,
    },
    calendarGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
    },
    calendarDay: {
      width: '14.285%', // 1/7 of the width
      aspectRatio: 1,
      padding: spacing.xs,
      borderWidth: 0.5,
      borderColor: theme.border,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
    },
    otherMonthDay: {
      opacity: 0.3,
    },
    todayDay: {
      backgroundColor: theme.primaryLight + '20',
      borderColor: theme.primary,
      borderWidth: 1,
    },
    dayNumber: {
      ...typography.caption,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      fontSize: 12,
    },
    otherMonthText: {
      color: theme.textTertiary,
    },
    todayText: {
      color: theme.primary,
      fontWeight: '700' as const,
    },
    incomeIndicators: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
      marginTop: spacing.xs,
      gap: 2,
    },
    incomeIndicator: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    moreIndicator: {
      fontSize: 8,
      color: theme.textSecondary,
    },
    amountText: {
      fontSize: 8,
      color: theme.success,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
      marginTop: spacing.xs,
    },
    legendCard: {
      marginBottom: spacing.md,
    },
    legendTitle: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      marginBottom: spacing.sm,
    },
    legendItems: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.md,
    },
    legendItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.xs,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.xs,
    },
    legendText: {
      ...typography.caption,
      color: theme.textSecondary,
    },
  });
}

export default IncomeCalendarScreen;