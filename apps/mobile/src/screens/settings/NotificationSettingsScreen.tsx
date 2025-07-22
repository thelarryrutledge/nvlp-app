/**
 * Notification Settings Screen
 * 
 * Allows users to configure income notification preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card, Button } from '../../components/ui';
import { notificationService, type NotificationSettings } from '../../services/notifications';
import { permissionService, type PermissionResult } from '../../services/permissions/permissionService';

export const NotificationSettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    incomeReminders: true,
    reminderTime: '09:00',
    advanceDays: 1,
    globalEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionResult>({
    status: 'denied',
    canAskAgain: true,
  });
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    upcoming: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [currentSettings, permission, stats] = await Promise.all([
        notificationService.getSettings(),
        notificationService.checkPermission(),
        notificationService.getNotificationStats(),
      ]);
      
      setSettings(currentSettings);
      setPermissionStatus(permission);
      setNotificationStats(stats);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleRequestPermission = async () => {
    try {
      const result = await notificationService.requestPermission();
      setPermissionStatus(result);
      
      if (result.status === 'granted') {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive income reminders based on your settings.',
          [{ text: 'OK' }]
        );
      } else if (result.status === 'blocked') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive income reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => permissionService.openAppSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setIsSaving(true);
      const updatedSettings = { ...settings, ...newSettings };
      await notificationService.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      
      // Reload stats after settings change
      const stats = await notificationService.getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all scheduled income notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.clearAllNotifications();
              const stats = await notificationService.getNotificationStats();
              setNotificationStats(stats);
              Alert.alert('Success', 'All notifications have been cleared.');
            } catch (error) {
              console.error('Failed to clear notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      // Check permission first
      if (permissionStatus.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications first to test this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enable', onPress: handleRequestPermission },
          ]
        );
        return;
      }

      // Show an immediate alert as a test
      Alert.alert(
        '💰 Income Reminder',
        'This is a test notification! In a real scenario, you would receive a push notification about your expected income.',
        [
          { 
            text: 'OK',
            onPress: () => {
              Alert.alert(
                'Test Complete',
                'When fully implemented with a push notification library, you would receive:\n\n' +
                '• Income reminders at your configured time\n' +
                '• Alerts based on your advance notice setting\n' +
                '• Notifications for all active income sources',
                [{ text: 'Got it!' }]
              );
            }
          }
        ]
      );

      // Log what would happen in a real implementation
      console.log('Test notification triggered. In production, this would:');
      console.log('- Send a push notification to the device');
      console.log('- Show notification in notification center');
      console.log('- Play notification sound if enabled');
      console.log(`- Use settings: Time=${settings.reminderTime}, Advance=${settings.advanceDays} days`);
    } catch (error) {
      console.error('Failed to test notification:', error);
      Alert.alert('Error', 'Failed to test notification');
    }
  };

  const handleCleanupOldNotifications = async () => {
    try {
      await notificationService.cleanupOldNotifications();
      const stats = await notificationService.getNotificationStats();
      setNotificationStats(stats);
      Alert.alert('Success', 'Old notifications have been cleaned up.');
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
      Alert.alert('Error', 'Failed to cleanup old notifications');
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const timeOptions = [
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '20:00', label: '8:00 PM' },
  ];

  const advanceDaysOptions = [
    { value: 0, label: 'Same day' },
    { value: 1, label: '1 day before' },
    { value: 2, label: '2 days before' },
    { value: 3, label: '3 days before' },
    { value: 7, label: '1 week before' },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Status */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="notifications-outline" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Notification Permission</Text>
          </View>
          
          <View style={styles.permissionStatus}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionStatusText}>
                Status: {permissionStatus.status === 'granted' ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={styles.permissionDescription}>
                {permissionStatus.status === 'granted'
                  ? 'You will receive income reminder notifications'
                  : 'Enable notifications to receive income reminders'}
              </Text>
            </View>
            
            {permissionStatus.status !== 'granted' && (
              <Button
                variant="primary"
                title="Enable"
                onPress={handleRequestPermission}
                style={styles.permissionButton}
              />
            )}
          </View>
        </Card>

        {/* Notification Statistics */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="stats-chart-outline" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Notification Statistics</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{notificationStats.total}</Text>
              <Text style={styles.statLabel}>Total Scheduled</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{notificationStats.upcoming}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{notificationStats.thisWeek}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{notificationStats.thisMonth}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>
        </Card>

        {/* Notification Settings */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="settings-outline" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Income Reminder Settings</Text>
          </View>

          {/* Global Enable/Disable */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Income Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive reminders about expected income
              </Text>
            </View>
            <Switch
              value={settings.globalEnabled}
              onValueChange={(value) => handleUpdateSettings({ globalEnabled: value })}
              disabled={isSaving}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={settings.globalEnabled ? theme.primary : theme.textTertiary}
            />
          </View>

          {settings.globalEnabled && (
            <>
              {/* Income Reminders */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Income Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get notified before expected income dates
                  </Text>
                </View>
                <Switch
                  value={settings.incomeReminders}
                  onValueChange={(value) => handleUpdateSettings({ incomeReminders: value })}
                  disabled={isSaving}
                  trackColor={{ false: theme.border, true: theme.primaryLight }}
                  thumbColor={settings.incomeReminders ? theme.primary : theme.textTertiary}
                />
              </View>

              {/* Reminder Time */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Reminder Time</Text>
                  <Text style={styles.settingDescription}>
                    What time to send daily reminders
                  </Text>
                </View>
                <Text style={styles.settingValue}>{formatTime(settings.reminderTime)}</Text>
              </View>

              {/* Time Options */}
              <View style={styles.timeOptions}>
                {timeOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeOption,
                      settings.reminderTime === option.value && styles.selectedTimeOption,
                    ]}
                    onPress={() => handleUpdateSettings({ reminderTime: option.value })}
                    disabled={isSaving}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      settings.reminderTime === option.value && styles.selectedTimeOptionText,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Advance Days */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Advance Notice</Text>
                  <Text style={styles.settingDescription}>
                    How far in advance to send reminders
                  </Text>
                </View>
                <Text style={styles.settingValue}>
                  {advanceDaysOptions.find(opt => opt.value === settings.advanceDays)?.label}
                </Text>
              </View>

              {/* Advance Days Options */}
              <View style={styles.advanceOptions}>
                {advanceDaysOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.advanceOption,
                      settings.advanceDays === option.value && styles.selectedAdvanceOption,
                    ]}
                    onPress={() => handleUpdateSettings({ advanceDays: option.value })}
                    disabled={isSaving}
                  >
                    <Text style={[
                      styles.advanceOptionText,
                      settings.advanceDays === option.value && styles.selectedAdvanceOptionText,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Management Actions */}
        <Card variant="elevated" padding="large" style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="construct-outline" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>Management</Text>
          </View>

          <Button
            variant="primary"
            title="Test Notification Now"
            onPress={handleTestNotification}
            style={styles.actionButton}
            disabled={isSaving}
          />

          <Button
            variant="secondary"
            title="Cleanup Old Notifications"
            onPress={handleCleanupOldNotifications}
            style={styles.actionButton}
            disabled={isSaving}
          />

          <Button
            variant="outline"
            title="Clear All Notifications"
            onPress={handleClearAllNotifications}
            style={styles.actionButton}
            disabled={isSaving}
          />
        </Card>
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
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    card: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginLeft: spacing.sm,
      fontWeight: '600' as const,
    },
    permissionStatus: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    permissionInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    permissionStatusText: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    permissionDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    permissionButton: {
      minWidth: 80,
    },
    statsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
    },
    statItem: {
      width: '48%',
      alignItems: 'center' as const,
      paddingVertical: spacing.md,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    statValue: {
      ...typography.h2,
      color: theme.primary,
      fontWeight: '700' as const,
    },
    statLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center' as const,
    },
    settingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    settingInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    settingLabel: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    settingDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    settingValue: {
      ...typography.body,
      color: theme.primary,
      fontWeight: '500' as const,
    },
    timeOptions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    timeOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    selectedTimeOption: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    timeOptionText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '500' as const,
    },
    selectedTimeOptionText: {
      color: theme.primary,
      fontWeight: '600' as const,
    },
    advanceOptions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    advanceOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    selectedAdvanceOption: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    advanceOptionText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '500' as const,
    },
    selectedAdvanceOptionText: {
      color: theme.primary,
      fontWeight: '600' as const,
    },
    actionButton: {
      marginBottom: spacing.md,
    },
  });
}

export default NotificationSettingsScreen;