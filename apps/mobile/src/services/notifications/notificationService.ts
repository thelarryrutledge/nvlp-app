/**
 * Notification Service
 * 
 * Handles scheduling and managing notifications for income tracking
 * Note: This is a simplified implementation that can be enhanced with 
 * react-native-push-notification or @react-native-community/push-notification later
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { permissionService, PermissionResult } from '../permissions/permissionService';
import type { IncomeSource } from '@nvlp/types';

export interface IncomeNotification {
  id: string;
  incomeSourceId: string;
  title: string;
  body: string;
  scheduledDate: Date;
  frequency: string;
  amount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface NotificationScheduleOptions {
  title?: string;
  body?: string;
  customDate?: Date;
}

const NOTIFICATIONS_STORAGE_KEY = '@nvlp_income_notifications';
const NOTIFICATION_SETTINGS_KEY = '@nvlp_notification_settings';

export interface NotificationSettings {
  incomeReminders: boolean;
  reminderTime: string; // HH:MM format
  advanceDays: number; // Days before expected income to notify
  globalEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  incomeReminders: true,
  reminderTime: '09:00',
  advanceDays: 1,
  globalEnabled: true,
};

class NotificationService {
  private cachedNotifications: IncomeNotification[] = [];
  private settings: NotificationSettings = DEFAULT_SETTINGS;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      await this.loadNotifications();
      console.log('NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  /**
   * Get current notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    return this.settings;
  }

  /**
   * Update notification settings
   */
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));

    // If global notifications are disabled, clear all notifications
    if (!this.settings.globalEnabled) {
      await this.clearAllNotifications();
    }
  }

  /**
   * Check and request notification permissions
   */
  async checkPermission(): Promise<PermissionResult> {
    return await permissionService.checkPermission('notifications');
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<PermissionResult> {
    return await permissionService.requestPermission('notifications', {
      title: 'Income Notifications',
      message: 'Allow NVLP to send you reminders about expected income',
    });
  }

  /**
   * Schedule notifications for an income source
   */
  async scheduleIncomeNotifications(
    incomeSource: IncomeSource,
    options?: NotificationScheduleOptions
  ): Promise<void> {
    if (!this.settings.globalEnabled || !incomeSource.should_notify || !incomeSource.is_active) {
      return;
    }

    // Check permission first
    const permission = await this.checkPermission();
    if (permission.status !== 'granted') {
      console.log('Notification permission not granted, skipping notification scheduling');
      return;
    }

    try {
      // Clear existing notifications for this income source
      await this.clearIncomeSourceNotifications(incomeSource.id);

      // Calculate next few notification dates based on frequency
      const notificationDates = this.calculateNotificationDates(incomeSource);

      for (const date of notificationDates) {
        const notification: IncomeNotification = {
          id: `income_${incomeSource.id}_${date.getTime()}`,
          incomeSourceId: incomeSource.id,
          title: options?.title || `💰 Income Expected: ${incomeSource.name}`,
          body: options?.body || this.generateNotificationBody(incomeSource),
          scheduledDate: date,
          frequency: incomeSource.frequency,
          amount: incomeSource.expected_amount || 0,
          isActive: true,
          createdAt: new Date(),
        };

        await this.scheduleNotification(notification);
      }

      await this.saveNotifications();
    } catch (error) {
      console.error('Failed to schedule income notifications:', error);
    }
  }

  /**
   * Clear notifications for a specific income source
   */
  async clearIncomeSourceNotifications(incomeSourceId: string): Promise<void> {
    this.cachedNotifications = this.cachedNotifications.filter(
      notification => notification.incomeSourceId !== incomeSourceId
    );
    await this.saveNotifications();
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    this.cachedNotifications = [];
    await this.saveNotifications();
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<IncomeNotification[]> {
    return this.cachedNotifications.filter(notification => 
      notification.isActive && notification.scheduledDate > new Date()
    );
  }

  /**
   * Get notifications for a specific income source
   */
  async getIncomeSourceNotifications(incomeSourceId: string): Promise<IncomeNotification[]> {
    return this.cachedNotifications.filter(notification => 
      notification.incomeSourceId === incomeSourceId && 
      notification.isActive &&
      notification.scheduledDate > new Date()
    );
  }

  /**
   * Update notifications when income source is modified
   */
  async updateIncomeSourceNotifications(incomeSource: IncomeSource): Promise<void> {
    if (incomeSource.should_notify && incomeSource.is_active) {
      await this.scheduleIncomeNotifications(incomeSource);
    } else {
      await this.clearIncomeSourceNotifications(incomeSource.id);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    total: number;
    upcoming: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const notifications = await this.getScheduledNotifications();
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    return {
      total: notifications.length,
      upcoming: notifications.filter(n => n.scheduledDate > now).length,
      thisWeek: notifications.filter(n => n.scheduledDate <= oneWeekFromNow).length,
      thisMonth: notifications.filter(n => n.scheduledDate <= oneMonthFromNow).length,
    };
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const initialCount = this.cachedNotifications.length;
    
    this.cachedNotifications = this.cachedNotifications.filter(
      notification => notification.scheduledDate > thirtyDaysAgo
    );

    if (this.cachedNotifications.length !== initialCount) {
      await this.saveNotifications();
      console.log(`Cleaned up ${initialCount - this.cachedNotifications.length} old notifications`);
    }
  }

  // Private methods

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cachedNotifications = parsed.map((n: any) => ({
          ...n,
          scheduledDate: new Date(n.scheduledDate),
          createdAt: new Date(n.createdAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.cachedNotifications = [];
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.cachedNotifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  private calculateNotificationDates(incomeSource: IncomeSource): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    const maxFutureMonths = 3; // Calculate notifications for next 3 months

    // Calculate based on frequency
    switch (incomeSource.frequency) {
      case 'weekly':
        dates.push(...this.calculateWeeklyDates(incomeSource, now, maxFutureMonths));
        break;
      case 'bi_weekly':
        dates.push(...this.calculateBiWeeklyDates(incomeSource, now, maxFutureMonths));
        break;
      case 'twice_monthly':
        dates.push(...this.calculateTwiceMonthlyDates(incomeSource, now, maxFutureMonths));
        break;
      case 'monthly':
        dates.push(...this.calculateMonthlyDates(incomeSource, now, maxFutureMonths));
        break;
      case 'annually':
        dates.push(...this.calculateAnnualDates(incomeSource, now, maxFutureMonths));
        break;
      case 'custom':
        dates.push(...this.calculateCustomDates(incomeSource, now, maxFutureMonths));
        break;
      case 'one_time':
        // One-time notifications would need a specific date - skip for now
        break;
    }

    // Apply advance notification settings
    return dates.map(date => {
      const notificationDate = new Date(date);
      notificationDate.setDate(notificationDate.getDate() - this.settings.advanceDays);
      
      // Set the time from settings
      const [hours, minutes] = this.settings.reminderTime.split(':');
      notificationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      return notificationDate;
    }).filter(date => date > now); // Only future dates
  }

  private calculateWeeklyDates(incomeSource: IncomeSource, startDate: Date, months: number): Date[] {
    const dates: Date[] = [];
    const weekDay = incomeSource.weekly_day ?? 1; // Default to Monday
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + months, startDate.getDate());

    let currentDate = new Date(startDate);
    // Find next occurrence of the weekday
    const daysUntilWeekDay = (weekDay + 7 - currentDate.getDay()) % 7;
    currentDate.setDate(currentDate.getDate() + daysUntilWeekDay);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return dates;
  }

  private calculateBiWeeklyDates(incomeSource: IncomeSource, startDate: Date, months: number): Date[] {
    const dates: Date[] = [];
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + months, startDate.getDate());

    // Simplified bi-weekly: every 14 days from next Monday
    let currentDate = new Date(startDate);
    const daysUntilMonday = (1 + 7 - currentDate.getDay()) % 7;
    currentDate.setDate(currentDate.getDate() + daysUntilMonday);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 14);
    }

    return dates;
  }

  private calculateTwiceMonthlyDates(incomeSource: IncomeSource, startDate: Date, months: number): Date[] {
    const dates: Date[] = [];
    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();

    for (let i = 0; i < months; i++) {
      // 15th of month
      const fifteenth = new Date(currentYear, currentMonth, 15);
      if (fifteenth > startDate) {
        dates.push(fifteenth);
      }

      // Last day of month
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      if (lastDay > startDate) {
        dates.push(lastDay);
      }

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    return dates;
  }

  private calculateMonthlyDates(incomeSource: IncomeSource, startDate: Date, months: number): Date[] {
    const dates: Date[] = [];
    const dayOfMonth = incomeSource.monthly_day ?? 1;
    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();

    for (let i = 0; i < months; i++) {
      let monthlyDate: Date;
      
      if (dayOfMonth === -1) {
        // Last day of month
        monthlyDate = new Date(currentYear, currentMonth + 1, 0);
      } else {
        monthlyDate = new Date(currentYear, currentMonth, dayOfMonth);
        // If the day doesn't exist in this month, use the last day
        if (monthlyDate.getMonth() !== currentMonth) {
          monthlyDate = new Date(currentYear, currentMonth + 1, 0);
        }
      }

      if (monthlyDate > startDate) {
        dates.push(monthlyDate);
      }

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    return dates;
  }

  private calculateAnnualDates(incomeSource: IncomeSource, startDate: Date, months: number): Date[] {
    const dates: Date[] = [];
    // For now, default to January 1st since we don't have annual_month/annual_day in the schema
    const currentYear = startDate.getFullYear();
    
    for (let year = currentYear; year <= currentYear + Math.ceil(months / 12); year++) {
      const annualDate = new Date(year, 0, 1); // January 1st
      if (annualDate > startDate) {
        dates.push(annualDate);
      }
    }

    return dates;
  }

  private calculateCustomDates(incomeSource: IncomeSource, startDate: Date, months: number): Date[] {
    const dates: Date[] = [];
    const customDay = incomeSource.custom_day ?? 1;
    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();

    // Treat custom as monthly for now
    for (let i = 0; i < months; i++) {
      const customDate = new Date(currentYear, currentMonth, customDay);
      if (customDate.getMonth() !== currentMonth) {
        // Day doesn't exist in this month, skip
        continue;
      }

      if (customDate > startDate) {
        dates.push(customDate);
      }

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    return dates;
  }

  private generateNotificationBody(incomeSource: IncomeSource): string {
    const amount = incomeSource.expected_amount 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(incomeSource.expected_amount)
      : '';
    
    const frequency = incomeSource.frequency.replace('_', ' ');
    
    if (amount) {
      return `Your ${frequency} income of ${amount} is expected soon. Remember to track it in your budget!`;
    } else {
      return `Your ${frequency} income from ${incomeSource.name} is expected soon.`;
    }
  }

  private async scheduleNotification(notification: IncomeNotification): Promise<void> {
    // Add to our in-memory cache
    this.cachedNotifications.push(notification);
    
    // In a real implementation, this would integrate with:
    // - react-native-push-notification for local notifications
    // - Firebase Cloud Messaging for push notifications
    // - iOS/Android native notification APIs
    
    console.log(`Scheduled notification: ${notification.title} for ${notification.scheduledDate.toLocaleString()}`);
  }
}

export const notificationService = new NotificationService();
export default notificationService;