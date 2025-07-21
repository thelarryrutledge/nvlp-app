/**
 * Category List Screen
 * 
 * Displays and manages expense/income categories for the selected budget
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { useBudget } from '../../context';
import { categoryService } from '../../services/api/categoryService';
import type { Category, CategoryType } from '@nvlp/types';

export const CategoryListScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { selectedBudget, isLoading: budgetLoading } = useBudget();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');

  const loadCategories = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedBudget) {
      setCategories([]);
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

      const fetchedCategories = await categoryService.getCategories(selectedBudget.id);
      setCategories(fetchedCategories);
    } catch (error: any) {
      setError(error.message || 'Failed to load categories');
      console.error('Categories error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBudget]);

  // Load categories when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  // Reload when selected budget changes
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = () => {
    loadCategories(true);
  };

  const handleAddCategory = () => {
    // TODO: Navigate to category creation screen
    Alert.alert('Add Category', 'Category creation screen coming soon!');
  };

  const handleEditCategory = (category: Category) => {
    // TODO: Navigate to category edit screen
    Alert.alert('Edit Category', `Edit ${category.name} coming soon!`);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.is_system_category) {
      Alert.alert('Cannot Delete', 'System categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(category.id);
              await loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.category_type === selectedType && c.is_active);

  // Separate system and user categories
  const systemCategories = filteredCategories.filter(c => c.is_system_category);
  const userCategories = filteredCategories.filter(c => !c.is_system_category);

  const renderCategoryIcon = (icon: string | null, color: string | null) => {
    return (
      <View style={[styles.categoryIcon, { backgroundColor: color || theme.primary }]}>
        <Text style={styles.categoryIconText}>{icon || '📁'}</Text>
      </View>
    );
  };

  const renderCategory = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryItem}
      onPress={() => handleEditCategory(category)}
      activeOpacity={0.7}
    >
      {renderCategoryIcon(category.icon, category.color)}
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{category.name}</Text>
        {category.description && (
          <Text style={styles.categoryDescription}>{category.description}</Text>
        )}
      </View>
      {category.is_system_category && (
        <View style={styles.systemBadge}>
          <Text style={styles.systemBadgeText}>System</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
            Please select a budget to manage categories.
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
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Categories</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Category Type Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedType === 'expense' && styles.activeTab,
          ]}
          onPress={() => setSelectedType('expense')}
        >
          <Text style={[
            styles.tabText,
            selectedType === 'expense' && styles.activeTabText,
          ]}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedType === 'income' && styles.activeTab,
          ]}
          onPress={() => setSelectedType('income')}
        >
          <Text style={[
            styles.tabText,
            selectedType === 'income' && styles.activeTabText,
          ]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedType === 'transfer' && styles.activeTab,
          ]}
          onPress={() => setSelectedType('transfer')}
        >
          <Text style={[
            styles.tabText,
            selectedType === 'transfer' && styles.activeTabText,
          ]}>
            Transfer
          </Text>
        </TouchableOpacity>
      </View>

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
        {filteredCategories.length === 0 ? (
          <Card variant="elevated" padding="large" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Categories</Text>
            <Text style={styles.emptyDescription}>
              Tap the + button to create your first {selectedType} category.
            </Text>
          </Card>
        ) : (
          <>
            {/* System Categories */}
            {systemCategories.length > 0 && (
              <Card variant="elevated" padding="medium" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>System Categories</Text>
                {systemCategories.map(renderCategory)}
              </Card>
            )}

            {/* User Categories */}
            {userCategories.length > 0 && (
              <Card variant="elevated" padding="medium" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>My Categories</Text>
                {userCategories.map(renderCategory)}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddCategory}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    tabContainer: {
      flexDirection: 'row' as const,
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center' as const,
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: theme.primary,
    },
    tabText: {
      ...typography.body,
      color: theme.textSecondary,
      fontWeight: '500' as const,
    },
    activeTabText: {
      color: theme.textOnPrimary,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 80, // Space for FAB
    },
    emptyCard: {
      alignItems: 'center' as const,
      paddingVertical: spacing.xl,
    },
    sectionCard: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    categoryItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.md,
    },
    categoryIconText: {
      fontSize: 20,
    },
    categoryInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    categoryName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    categoryDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    systemBadge: {
      backgroundColor: theme.secondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    systemBadgeText: {
      ...typography.caption,
      color: theme.textPrimary,
      fontSize: 10,
    },
    fab: {
      position: 'absolute' as const,
      right: spacing.lg,
      bottom: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    fabText: {
      fontSize: 28,
      color: theme.textOnPrimary,
      fontWeight: '300' as const,
    },
  });
}

export default CategoryListScreen;