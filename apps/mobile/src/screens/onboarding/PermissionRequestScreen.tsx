/**
 * Permission Request Screen
 * 
 * Guides users through granting necessary permissions for the app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, Card } from '../../components/ui';
import { permissionService, AppPermission, PermissionResult } from '../../services/permissions/permissionService';
import type { Theme } from '../../theme';

interface PermissionCardProps {
  permission: AppPermission;
  title: string;
  description: string;
  icon: string;
  essential: boolean;
  result?: PermissionResult;
  onRequest: (permission: AppPermission) => Promise<void>;
  isLoading: boolean;
}

const PermissionCard: React.FC<PermissionCardProps> = ({
  permission,
  title,
  description,
  icon,
  essential,
  result,
  onRequest,
  isLoading,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const getStatusColor = () => {
    if (!result) return theme.textTertiary;
    return result.status === 'granted' ? theme.success : theme.error;
  };

  const getStatusIcon = () => {
    if (isLoading) return null;
    if (!result) return 'chevron-forward';
    return result.status === 'granted' ? 'checkmark-circle' : 'close-circle';
  };

  const getStatusText = () => {
    if (isLoading) return 'Requesting...';
    if (!result) return essential ? 'Required' : 'Optional';
    return result.status === 'granted' ? 'Granted' : 'Denied';
  };

  return (
    <Card variant="elevated" padding="large" style={styles.permissionCard}>
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIcon}>
          <Icon name={icon} size={32} color={theme.primary} />
        </View>
        <View style={styles.permissionInfo}>
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.permissionDescription}>{description}</Text>
          {essential && (
            <Text style={styles.requiredBadge}>Required</Text>
          )}
        </View>
      </View>
      
      <View style={styles.permissionFooter}>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Icon 
              name={getStatusIcon()!} 
              size={20} 
              color={getStatusColor()} 
            />
          )}
        </View>
        
        {(!result || result.status !== 'granted') && (
          <Button
            title={result ? 'Retry' : 'Grant'}
            size="small"
            onPress={() => onRequest(permission)}
            disabled={isLoading}
            style={styles.grantButton}
          />
        )}
      </View>
    </Card>
  );
};

export const PermissionRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [permissionResults, setPermissionResults] = useState<Map<AppPermission, PermissionResult>>(new Map());
  const [loadingPermissions, setLoadingPermissions] = useState<Set<AppPermission>>(new Set());
  const [isCheckingInitial, setIsCheckingInitial] = useState(true);

  const permissions = [
    {
      permission: 'camera' as AppPermission,
      title: 'Camera Access',
      description: 'Take photos for your profile and document receipts',
      icon: 'camera',
      essential: true,
    },
    {
      permission: 'photoLibrary' as AppPermission,
      title: 'Photo Library',
      description: 'Select photos from your library for your profile',
      icon: 'images',
      essential: true,
    },
    {
      permission: 'notifications' as AppPermission,
      title: 'Notifications',
      description: 'Get alerts about budget limits and important updates',
      icon: 'notifications',
      essential: false,
    },
  ];

  useEffect(() => {
    checkCurrentPermissions();
  }, []);

  const checkCurrentPermissions = async () => {
    setIsCheckingInitial(true);
    try {
      const results = new Map<AppPermission, PermissionResult>();
      
      for (const { permission } of permissions) {
        const result = await permissionService.checkPermission(permission);
        results.set(permission, result);
      }
      
      setPermissionResults(results);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsCheckingInitial(false);
    }
  };

  const requestPermission = async (permission: AppPermission) => {
    setLoadingPermissions(prev => new Set(prev).add(permission));
    
    try {
      const result = await permissionService.requestPermission(permission, {
        showSettingsAlert: true,
      });
      
      setPermissionResults(prev => new Map(prev).set(permission, result));
    } catch (error) {
      console.error(`Error requesting ${permission} permission:`, error);
      Alert.alert(
        'Permission Error',
        'Failed to request permission. Please try again.'
      );
    } finally {
      setLoadingPermissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(permission);
        return newSet;
      });
    }
  };

  const requestAllEssential = async () => {
    const essentialPermissions = permissions
      .filter(p => p.essential)
      .map(p => p.permission);
    
    for (const permission of essentialPermissions) {
      const current = permissionResults.get(permission);
      if (current?.status !== 'granted') {
        await requestPermission(permission);
      }
    }
  };

  const handleContinue = () => {
    const essentialPermissions = permissions.filter(p => p.essential);
    const allEssentialGranted = essentialPermissions.every(p => {
      const result = permissionResults.get(p.permission);
      return result?.status === 'granted';
    });

    if (!allEssentialGranted) {
      Alert.alert(
        'Required Permissions',
        'Please grant all required permissions to continue using NVLP.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant All', onPress: requestAllEssential },
        ]
      );
      return;
    }

    // Navigate to main app or next onboarding step
    navigation.goBack();
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Permission Setup?',
      'You can always enable permissions later in Settings, but some features may not work properly.',
      [
        { text: 'Go Back', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.goBack() },
      ]
    );
  };

  const getOverallStatus = () => {
    const essentialPermissions = permissions.filter(p => p.essential);
    const grantedEssential = essentialPermissions.filter(p => {
      const result = permissionResults.get(p.permission);
      return result?.status === 'granted';
    }).length;
    
    const totalOptional = permissions.filter(p => !p.essential).length;
    const grantedOptional = permissions.filter(p => !p.essential).filter(p => {
      const result = permissionResults.get(p.permission);
      return result?.status === 'granted';
    }).length;

    return {
      essential: { granted: grantedEssential, total: essentialPermissions.length },
      optional: { granted: grantedOptional, total: totalOptional },
    };
  };

  if (isCheckingInitial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = getOverallStatus();
  const allEssentialGranted = status.essential.granted === status.essential.total;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Icon name="shield-checkmark" size={64} color={theme.primary} />
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            NVLP needs access to certain features to provide the best experience
          </Text>
        </View>

        {/* Status Summary */}
        <Card variant="default" padding="large" style={styles.statusCard}>
          <Text style={styles.statusTitle}>Permission Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Essential:</Text>
            <Text style={[
              styles.statusValue,
              { color: allEssentialGranted ? theme.success : theme.warning }
            ]}>
              {status.essential.granted}/{status.essential.total}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Optional:</Text>
            <Text style={[styles.statusValue, { color: theme.textSecondary }]}>
              {status.optional.granted}/{status.optional.total}
            </Text>
          </View>
        </Card>

        {/* Permission Cards */}
        <View style={styles.permissionsContainer}>
          {permissions.map((permissionConfig) => (
            <PermissionCard
              key={permissionConfig.permission}
              {...permissionConfig}
              result={permissionResults.get(permissionConfig.permission)}
              onRequest={requestPermission}
              isLoading={loadingPermissions.has(permissionConfig.permission)}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!allEssentialGranted}
            fullWidth
            style={styles.continueButton}
          />
          <Button
            title="Skip for Now"
            variant="ghost"
            onPress={handleSkip}
            fullWidth
            style={styles.skipButton}
          />
        </View>

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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: spacing.xl,
    },
    loadingText: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.lg,
    },
    header: {
      alignItems: 'center' as const,
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h1,
      color: theme.textPrimary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
      lineHeight: 24,
    },
    statusCard: {
      marginBottom: spacing.xl,
    },
    statusTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    statusRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    statusLabel: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
    },
    statusValue: {
      ...typography.bodyMedium,
      fontWeight: '600',
    },
    permissionsContainer: {
      gap: spacing.lg,
      marginBottom: spacing.xl,
    },
    permissionCard: {
      gap: spacing.lg,
    },
    permissionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing.md,
    },
    permissionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primaryLight + '20',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    permissionInfo: {
      flex: 1,
    },
    permissionTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    permissionDescription: {
      ...typography.body,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    requiredBadge: {
      ...typography.caption,
      color: theme.warning,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    permissionFooter: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    statusContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    statusText: {
      ...typography.bodyMedium,
      fontWeight: '600',
    },
    grantButton: {
      minWidth: 80,
    },
    actions: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    continueButton: {
      marginBottom: spacing.sm,
    },
    skipButton: {
      marginBottom: spacing.lg,
    },
  });
}

export default PermissionRequestScreen;