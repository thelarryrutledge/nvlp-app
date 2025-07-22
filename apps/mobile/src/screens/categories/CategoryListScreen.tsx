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
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useThemedStyles, useTheme, spacing, typography, Theme } from '../../theme';
import { Card } from '../../components/ui';
import { useBudget } from '../../context';
import { categoryService } from '../../services/api/categoryService';
import type { Category, CategoryType } from '@nvlp/types';

export const CategoryListScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { selectedBudget, isLoading: budgetLoading } = useBudget();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

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
    (navigation as any).navigate('CategoryForm', { 
      categoryType: selectedType // Pass the selected type to pre-fill the form
    });
  };

  const handleEditCategory = (category: Category) => {
    (navigation as any).navigate('CategoryForm', { 
      categoryId: category.id 
    });
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

  const handleToggleReorderMode = () => {
    if (userCategories.length < 2) {
      Alert.alert('Reorder Categories', 'You need at least 2 custom categories to reorder them.');
      return;
    }
    setIsReorderMode(!isReorderMode);
  };

  const handleReorderCategories = async (data: Category[]) => {
    if (!selectedBudget || isReordering) return;

    // Only allow reordering of user categories, not system categories
    const reorderedUserCategories = data.filter(c => !c.is_system_category);
    
    if (reorderedUserCategories.length === 0) return;

    setIsReordering(true);
    try {
      // Create reorder data with new sort_order values
      const reorderData = reorderedUserCategories.map((category, index) => ({
        id: category.id,
        sort_order: index + 1, // Start from 1
      }));

      await categoryService.reorderCategories(selectedBudget.id, reorderData);
      
      // Update local state to reflect new order
      setCategories(prevCategories => {
        const systemCats = prevCategories.filter(c => c.is_system_category);
        const updatedUserCats = reorderedUserCategories.map((cat, index) => ({
          ...cat,
          sort_order: index + 1,
        }));
        return [...systemCats, ...updatedUserCats];
      });

      // Optionally show success feedback
      // Alert.alert('Success', 'Categories reordered successfully.');
    } catch (error: any) {
      Alert.alert('Reorder Failed', error.message || 'Failed to reorder categories. Please try again.');
      // Reload categories to reset to server state
      await loadCategories();
    } finally {
      setIsReordering(false);
    }
  };

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.category_type === selectedType && c.is_active);

  // Separate system and user categories
  const systemCategories = filteredCategories.filter(c => c.is_system_category);
  const userCategories = filteredCategories.filter(c => !c.is_system_category);

  const getCategoryTypeIcon = (categoryType: CategoryType): string => {
    switch (categoryType) {
      case 'expense':
        return 'arrow-up-circle-outline';
      case 'income':
        return 'arrow-down-circle-outline';
      case 'transfer':
        return 'swap-horizontal-outline';
      default:
        return 'folder-outline';
    }
  };

  const renderCategoryIcon = (category: Category) => {
    const iconColor = category.color || theme.primary;
    const backgroundColor = iconColor + '20'; // Add transparency
    
    return (
      <View style={[styles.categoryIcon, { backgroundColor }]}>
        <Icon 
          name={category.icon || getCategoryTypeIcon(category.category_type)} 
          size={24} 
          color={iconColor}
        />
      </View>
    );
  };

  const renderDraggableCategory = ({ item: category, drag, isActive }: RenderItemParams<Category>) => (
    <ScaleDecorator>
      <View style={[
        styles.categoryItemContainer, 
        isActive && styles.dragActiveItem,
        category.is_system_category && styles.systemCategoryItem
      ]}>
        <TouchableOpacity
          style={[styles.categoryItem, isActive && styles.dragActiveCategory]}
          onPress={() => isReorderMode ? undefined : handleEditCategory(category)}
          onLongPress={!category.is_system_category ? drag : undefined}
          disabled={isActive}
          activeOpacity={isReorderMode ? 1 : 0.7}
        >
          {renderCategoryIcon(category)}
          <View style={styles.categoryInfo}>
            <View style={styles.categoryNameRow}>
              <Text style={styles.categoryName}>{category.name}</Text>
              {category.is_system_category && (
                <View style={styles.systemBadge}>
                  <Text style={styles.systemBadgeText}>System</Text>
                </View>
              )}
            </View>
            {category.description && (
              <Text style={styles.categoryDescription}>{category.description}</Text>
            )}
          </View>
          <View style={styles.categoryActions}>
            {isReorderMode ? (
              !category.is_system_category && (
                <View style={styles.dragHandle}>
                  <Icon name="reorder-three-outline" size={20} color={theme.textSecondary} />
                </View>
              )
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditCategory(category)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="pencil" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                {!category.is_system_category && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteCategory(category)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="trash-outline" size={18} color={theme.error} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </ScaleDecorator>
  );

  const renderStaticCategory = (category: Category) => (
    <View key={category.id} style={styles.categoryItemContainer}>
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleEditCategory(category)}
        activeOpacity={0.7}
      >
        {renderCategoryIcon(category)}
        <View style={styles.categoryInfo}>
          <View style={styles.categoryNameRow}>
            <Text style={styles.categoryName}>{category.name}</Text>
            {category.is_system_category && (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>System</Text>
              </View>
            )}
          </View>
          {category.description && (
            <Text style={styles.categoryDescription}>{category.description}</Text>
          )}
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditCategory(category)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="pencil" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          {!category.is_system_category && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteCategory(category)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="trash-outline" size={18} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
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
          onPress={() => {
            setSelectedType('expense');
            setIsReorderMode(false); // Exit reorder mode when switching tabs
          }}
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
          onPress={() => {
            setSelectedType('income');
            setIsReorderMode(false); // Exit reorder mode when switching tabs
          }}
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
          onPress={() => {
            setSelectedType('transfer');
            setIsReorderMode(false); // Exit reorder mode when switching tabs
          }}
        >
          <Text style={[
            styles.tabText,
            selectedType === 'transfer' && styles.activeTabText,
          ]}>
            Transfer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reorder Mode Header */}
      {userCategories.length >= 2 && !isReorderMode && (
        <View style={styles.reorderHeader}>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={handleToggleReorderMode}
          >
            <Icon name="reorder-three-outline" size={20} color={theme.primary} />
            <Text style={styles.reorderButtonText}>Reorder Categories</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reorder Mode Active Header */}
      {isReorderMode && (
        <View style={styles.reorderActiveHeader}>
          <View style={styles.reorderActiveInfo}>
            <Icon name="information-circle-outline" size={20} color={theme.textSecondary} />
            <Text style={styles.reorderActiveText}>Long press and drag to reorder</Text>
          </View>
          <TouchableOpacity
            style={styles.reorderDoneButton}
            onPress={() => setIsReorderMode(false)}
          >
            <Text style={styles.reorderDoneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
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
            <Icon 
              name={getCategoryTypeIcon(selectedType)} 
              size={64} 
              color={theme.textTertiary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Categories</Text>
            <Text style={styles.emptyDescription}>
              Create your first {selectedType} category to start organizing your {selectedType === 'expense' ? 'spending' : selectedType === 'income' ? 'income sources' : 'transfers'}.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={handleAddCategory}
            >
              <Icon name="add" size={20} color={theme.textOnPrimary} />
              <Text style={styles.emptyActionText}>Add {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Category</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <Card variant="elevated" padding="large" style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{filteredCategories.length}</Text>
                  <Text style={styles.summaryLabel}>Total {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{systemCategories.length}</Text>
                  <Text style={styles.summaryLabel}>System</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{userCategories.length}</Text>
                  <Text style={styles.summaryLabel}>Custom</Text>
                </View>
              </View>
            </Card>

            {/* System Categories - Always static */}
            {systemCategories.length > 0 && (
              <Card variant="elevated" padding="none" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>System Categories</Text>
                  <Text style={styles.sectionCount}>{systemCategories.length}</Text>
                </View>
                <View style={styles.sectionContent}>
                  {systemCategories.map(renderStaticCategory)}
                </View>
              </Card>
            )}

            {/* User Categories - Draggable when in reorder mode */}
            {userCategories.length > 0 && (
              <Card variant="elevated" padding="none" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>My Categories</Text>
                  <Text style={styles.sectionCount}>{userCategories.length}</Text>
                </View>
                <View style={styles.sectionContent}>
                  {isReorderMode ? (
                    <DraggableFlatList
                      data={userCategories}
                      onDragEnd={({ data }) => handleReorderCategories(data)}
                      keyExtractor={(item) => item.id}
                      renderItem={renderDraggableCategory}
                      scrollEnabled={false} // Disable internal scrolling
                      nestedScrollEnabled={false}
                      style={styles.draggableList}
                      contentContainerStyle={styles.draggableListContent}
                    />
                  ) : (
                    userCategories.map(renderStaticCategory)
                  )}
                </View>
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
    emptyCard: {
      alignItems: 'center' as const,
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      marginBottom: spacing.lg,
    },
    emptyActionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    emptyActionText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    summaryCard: {
      marginBottom: spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
    },
    summaryItem: {
      alignItems: 'center' as const,
      flex: 1,
    },
    summaryValue: {
      ...typography.h2,
      color: theme.primary,
      fontWeight: '700' as const,
      marginBottom: spacing.xs,
    },
    summaryLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    sectionCard: {
      marginBottom: spacing.lg,
      overflow: 'hidden' as const,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.textPrimary,
      fontWeight: '600' as const,
    },
    sectionCount: {
      ...typography.caption,
      color: theme.textSecondary,
      backgroundColor: theme.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      minWidth: 24,
      textAlign: 'center' as const,
    },
    sectionContent: {
      backgroundColor: theme.background,
    },
    categoryItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.md,
    },
    categoryItemContainer: {
      marginBottom: 1, // Small gap between items
    },
    categoryInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    categoryNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    categoryName: {
      ...typography.body,
      color: theme.textPrimary,
      fontWeight: '500' as const,
      flex: 1,
    },
    categoryDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    categoryActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.xs,
    },
    actionButton: {
      padding: spacing.xs,
      borderRadius: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minWidth: 32,
      minHeight: 32,
    },
    systemBadge: {
      backgroundColor: theme.warning + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      marginLeft: spacing.xs,
    },
    systemBadgeText: {
      ...typography.caption,
      color: theme.warning,
      fontSize: 10,
      fontWeight: '600' as const,
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
    reorderHeader: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    reorderButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    reorderButtonText: {
      ...typography.body,
      color: theme.primary,
      fontWeight: '500' as const,
    },
    reorderActiveHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.primary + '10',
      borderBottomWidth: 1,
      borderBottomColor: theme.primary + '30',
    },
    reorderActiveInfo: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    reorderActiveText: {
      ...typography.body,
      color: theme.textSecondary,
      fontStyle: 'italic' as const,
    },
    reorderDoneButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    reorderDoneButtonText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '600' as const,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: 80, // Space for FAB
    },
    dragActiveItem: {
      backgroundColor: theme.primaryLight + '20',
      borderWidth: 2,
      borderColor: theme.primary,
      borderRadius: 8,
    },
    dragActiveCategory: {
      backgroundColor: 'transparent',
    },
    systemCategoryItem: {
      opacity: 0.7,
    },
    dragHandle: {
      padding: spacing.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    draggableList: {
      flexGrow: 0,
    },
    draggableListContent: {
      flexGrow: 1,
    },
  });
}

export default CategoryListScreen;