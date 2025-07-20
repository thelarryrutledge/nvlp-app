/**
 * Design System Example Screen
 * 
 * Demonstrates the new design system components and theming
 */

import React, { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles, useTheme, spacing, typography } from '../theme';
import { Button, TextInput, Card, SimpleBottomSheet } from '../components/ui';
import type { Theme } from '../theme';

export function DesignSystemExample() {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [textValue, setTextValue] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Design System</Text>
          <Text style={styles.subtitle}>
            Professional Financial Green Theme
          </Text>
          <Text style={styles.subtitle}>
            Current mode: {isDark ? 'Dark' : 'Light'}
          </Text>
        </View>

        {/* Theme Toggle */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <Button
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            onPress={toggleTheme}
            variant="outline"
            icon="contrast"
          />
        </Card>

        {/* Typography */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Typography</Text>
          <Text style={[styles.text, typography.h1]}>Heading 1</Text>
          <Text style={[styles.text, typography.h2]}>Heading 2</Text>
          <Text style={[styles.text, typography.h3]}>Heading 3</Text>
          <Text style={[styles.text, typography.body]}>Body text</Text>
          <Text style={[styles.text, typography.bodySmall]}>Small body text</Text>
          <Text style={[styles.text, typography.caption]}>Caption text</Text>
        </Card>

        {/* Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Components</Text>
          
          <Card variant="default" padding="medium" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Default Card</Text>
            <Text style={styles.cardDescription}>
              This is a default card with subtle shadow and medium padding.
            </Text>
          </Card>
          
          <Card variant="outlined" padding="medium" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Outlined Card</Text>
            <Text style={styles.cardDescription}>
              This card has a border instead of relying only on shadow for definition.
            </Text>
          </Card>
          
          <Card variant="elevated" padding="large" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Elevated Card</Text>
            <Text style={styles.cardDescription}>
              This card has enhanced shadows for greater visual prominence. Perfect for important content or financial summaries.
            </Text>
          </Card>
          
          <Card variant="default" padding="small" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Small Padding</Text>
            <Text style={styles.cardDescription}>
              Cards can have different padding sizes for various use cases.
            </Text>
          </Card>
        </View>

        {/* Buttons */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          <View style={styles.buttonGroup}>
            <Button title="Primary" onPress={() => {}} />
            <Button title="Secondary" variant="secondary" onPress={() => {}} />
            <Button title="Outline" variant="outline" onPress={() => {}} />
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
            <Button title="Destructive" variant="destructive" onPress={() => {}} />
          </View>
          
          <View style={styles.buttonGroup}>
            <Button title="Small" size="small" onPress={() => {}} />
            <Button title="Medium" size="medium" onPress={() => {}} />
            <Button title="Large" size="large" onPress={() => {}} />
          </View>
          
          <Button 
            title="With Icon" 
            icon="checkmark-circle" 
            iconPosition="left"
            onPress={() => {}} 
          />
          <Button title="Loading" loading onPress={() => {}} />
          <Button title="Disabled" disabled onPress={() => {}} />
        </Card>

        {/* Inputs */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Text Inputs</Text>
          <TextInput
            label="Email"
            placeholder="Enter your email"
            leftIcon="mail"
            value={textValue}
            onChangeText={setTextValue}
          />
          <TextInput
            label="Password"
            placeholder="Enter your password"
            leftIcon="lock-closed"
            rightIcon="eye"
            secureTextEntry
          />
          <TextInput
            label="With Error"
            placeholder="This field has an error"
            error="This field is required"
            leftIcon="alert-circle"
          />
          <TextInput
            label="With Hint"
            placeholder="This field has a hint"
            hint="This is helpful information"
            leftIcon="information-circle"
          />
        </Card>

        {/* Colors */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Colors</Text>
          <View style={styles.colorGrid}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.primary }]}>
              <Text style={styles.colorLabel}>Primary</Text>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: theme.secondary }]}>
              <Text style={styles.colorLabel}>Secondary</Text>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: theme.success }]}>
              <Text style={styles.colorLabel}>Success</Text>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: theme.warning }]}>
              <Text style={styles.colorLabel}>Warning</Text>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: theme.error }]}>
              <Text style={styles.colorLabel}>Error</Text>
            </View>
          </View>
        </Card>

        {/* Bottom Sheet */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Bottom Sheet</Text>
          <Button
            title="Show Bottom Sheet"
            onPress={() => setShowBottomSheet(true)}
            icon="layers"
          />
        </Card>

      </ScrollView>

      {/* Bottom Sheet Example */}
      <SimpleBottomSheet
        isVisible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Example Bottom Sheet"
        snapPoints={['40%', '80%']}
      >
        <View style={styles.bottomSheetContent}>
          <Text style={styles.text}>
            This is a bottom sheet that slides up from the bottom instead of a traditional modal.
          </Text>
          <Text style={styles.text}>
            It supports multiple snap points and can be dismissed by swiping down or tapping the backdrop.
          </Text>
          <Button
            title="Close"
            onPress={() => setShowBottomSheet(false)}
            variant="outline"
            style={styles.closeButton}
          />
        </View>
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing['2xl'],
      alignItems: 'center',
    },
    title: {
      ...typography.h1,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.lg,
    },
    text: {
      color: theme.textPrimary,
      marginBottom: spacing.sm,
    },
    buttonGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    colorSwatch: {
      width: 80,
      height: 60,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorLabel: {
      ...typography.caption,
      color: theme.textOnPrimary,
      fontWeight: 'bold',
    },
    bottomSheetContent: {
      padding: spacing.lg,
    },
    closeButton: {
      marginTop: spacing.xl,
    },
    cardExample: {
      marginBottom: spacing.lg,
    },
    cardTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
    },
    cardDescription: {
      ...typography.body,
      color: theme.textSecondary,
    },
  };
}