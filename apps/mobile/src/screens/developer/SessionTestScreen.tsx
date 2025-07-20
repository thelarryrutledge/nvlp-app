/**
 * Session Test Screen
 * 
 * Developer screen for testing session expiration flows
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, Card } from '../../components/ui';
import { runSessionExpirationTests, type SessionTestReport } from '../../utils/sessionTestUtils';
import type { Theme } from '../../theme';

export const SessionTestScreen: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<SessionTestReport[]>([]);
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const results = await runSessionExpirationTests();
      setTestResults(results);
      
      const summary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
      };
      
      Alert.alert(
        'Test Results',
        `Total: ${summary.total}\nPassed: ${summary.passed}\nFailed: ${summary.failed}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Test Error', error.message || 'Failed to run tests');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getTestIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  const getTestColor = (passed: boolean) => {
    return passed ? theme.success : theme.error;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Expiration Tests</Text>
          <Text style={styles.subtitle}>
            Test token management and session flows
          </Text>
        </View>

        <Card variant="elevated" padding="large" style={styles.controlCard}>
          <View style={styles.buttonRow}>
            <Button
              title="Run Tests"
              onPress={runTests}
              loading={isRunning}
              disabled={isRunning}
              icon="play"
              style={styles.button}
            />
            <Button
              title="Clear Results"
              onPress={clearResults}
              variant="outline"
              icon="trash"
              style={styles.button}
              disabled={testResults.length === 0}
            />
          </View>
        </Card>

        {testResults.length > 0 && (
          <Card variant="elevated" padding="large" style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            
            {testResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIcon}>
                    {getTestIcon(result.passed)}
                  </Text>
                  <Text style={[styles.resultName, { color: getTestColor(result.passed) }]}>
                    {result.testName}
                  </Text>
                </View>
                
                <Text style={styles.resultDetails}>
                  {result.details}
                </Text>
                
                <Text style={styles.resultTimestamp}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
            
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {testResults.filter(r => r.passed).length} / {testResults.length} tests passed
              </Text>
            </View>
          </Card>
        )}

        <Card variant="elevated" padding="large" style={styles.infoCard}>
          <Text style={styles.infoTitle}>Test Coverage</Text>
          <Text style={styles.infoText}>
            • Token expiration detection{'\n'}
            • Token refresh need calculation{'\n'}
            • Logout token clearance{'\n'}
            • Remember me persistence{'\n'}
            • Biometric credential management
          </Text>
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
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing['3xl'],
    },
    header: {
      alignItems: 'center' as const,
      marginVertical: spacing['2xl'],
    },
    title: {
      ...typography.h2,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    controlCard: {
      marginBottom: spacing.xl,
    },
    buttonRow: {
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    button: {
      flex: 1,
    },
    resultsCard: {
      marginBottom: spacing.xl,
    },
    resultsTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.lg,
    },
    resultItem: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    resultHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.xs,
    },
    resultIcon: {
      fontSize: 20,
      marginRight: spacing.sm,
    },
    resultName: {
      ...typography.bodyLarge,
      fontWeight: '600' as const,
      flex: 1,
    },
    resultDetails: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      marginLeft: 32, // Align with test name
    },
    resultTimestamp: {
      ...typography.caption,
      color: theme.textTertiary,
      marginLeft: 32, // Align with test name
    },
    summary: {
      backgroundColor: theme.surfaceVariant,
      padding: spacing.md,
      borderRadius: 8,
      marginTop: spacing.md,
    },
    summaryText: {
      ...typography.bodyLarge,
      color: theme.textPrimary,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    infoCard: {
      marginBottom: spacing.xl,
    },
    infoTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    infoText: {
      ...typography.body,
      color: theme.textSecondary,
      lineHeight: 24,
    },
  });
}

export default SessionTestScreen;