import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SimpleBottomSheet } from '../ui/BottomSheet';
import { useTheme } from '../../theme';
import { useBudget } from '../../context/BudgetContext';
import { useApiClient } from '../../hooks/useApiClient';

interface IncomeSource {
  id: string;
  name: string;
  source_type: string;
  color?: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (incomeSource: IncomeSource) => void;
  incomeSources: IncomeSource[];
  selectedIncomeSourceId?: string;
  onIncomeSourceCreated?: (newIncomeSource: IncomeSource) => void;
}

export const IncomeSourcePickerBottomSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  onSelect,
  incomeSources,
  selectedIncomeSourceId,
  onIncomeSourceCreated,
}) => {
  const { theme } = useTheme();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreatingIncomeSource, setIsCreatingIncomeSource] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Filter income sources based on search text
  const filteredIncomeSources = useMemo(() => {
    if (!searchText.trim()) return incomeSources;
    
    const searchLower = searchText.toLowerCase().trim();
    return incomeSources.filter(source =>
      source.name.toLowerCase().includes(searchLower)
    );
  }, [incomeSources, searchText]);

  // Check if search text matches any existing income source exactly
  const exactMatch = useMemo(() => {
    if (!searchText.trim()) return null;
    
    const searchLower = searchText.toLowerCase().trim();
    return incomeSources.find(source => 
      source.name.toLowerCase() === searchLower
    );
  }, [incomeSources, searchText]);

  // Should we show the "Create Income Source" option?
  const shouldShowCreateOption = useMemo(() => {
    return searchText.trim().length > 0 && !exactMatch && filteredIncomeSources.length === 0;
  }, [searchText, exactMatch, filteredIncomeSources]);

  // Update highlighted index when filtered results change
  useEffect(() => {
    if (shouldShowCreateOption) {
      setHighlightedIndex(0); // Highlight "Create Income Source" option
    } else if (filteredIncomeSources.length > 0) {
      setHighlightedIndex(0); // Highlight first income source
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredIncomeSources, shouldShowCreateOption]);

  // Handle sheet visibility changes
  useEffect(() => {
    if (isVisible) {
      // Clear search text when opening
      setSearchText('');
      setHighlightedIndex(0);
      // Focus input after a short delay to ensure the sheet is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const createIncomeSource = async (name: string) => {
    if (!selectedBudget?.id) {
      Alert.alert('Error', 'No budget selected.');
      return;
    }

    setIsCreatingIncomeSource(true);
    try {
      const newIncomeSource = await client.createIncomeSource({
        budget_id: selectedBudget.id,
        name: name.trim(),
        source_type: 'other',
        color: '#10B981',
      });

      // Notify parent about the new income source
      onIncomeSourceCreated?.(newIncomeSource);
      
      // Select the new income source
      onSelect(newIncomeSource);
      onClose();
    } catch (err) {
      console.error('Failed to create income source:', err);
      Alert.alert('Error', 'Failed to create income source. Please try again.');
    } finally {
      setIsCreatingIncomeSource(false);
    }
  };

  const handleEnterPress = () => {
    if (shouldShowCreateOption && highlightedIndex === 0) {
      // Create new income source
      createIncomeSource(searchText);
    } else if (filteredIncomeSources.length > 0 && highlightedIndex < filteredIncomeSources.length) {
      // Select highlighted income source
      const selectedIncomeSource = filteredIncomeSources[highlightedIndex];
      if (selectedIncomeSource) {
        onSelect(selectedIncomeSource);
        onClose();
      }
    }
  };

  const handleIncomeSourcePress = (incomeSource: IncomeSource, index: number) => {
    setHighlightedIndex(index);
    onSelect(incomeSource);
    onClose();
  };

  const handleCreateIncomeSourcePress = () => {
    createIncomeSource(searchText);
  };

  const renderCreateIncomeSourceOption = () => {
    const isHighlighted = highlightedIndex === 0;

    return (
      <TouchableOpacity
        style={[
          styles.incomeSourceItem,
          styles.createIncomeSourceItem,
          {
            backgroundColor: isHighlighted ? theme.primary + '20' : theme.surface,
            borderColor: theme.primary,
          },
        ]}
        onPress={handleCreateIncomeSourcePress}
        activeOpacity={0.7}
        disabled={isCreatingIncomeSource}
      >
        <View style={styles.incomeSourceContent}>
          <Icon name="add" size={24} color={theme.primary} style={styles.incomeSourceIcon} />
          <View style={styles.incomeSourceInfo}>
            <Text style={[styles.incomeSourceName, { color: theme.primary }]}>
              {isCreatingIncomeSource ? 'Creating...' : `Create "${searchText}"`}
            </Text>
            <Text style={[styles.incomeSourceType, { color: theme.textSecondary }]}>
              New income source
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderIncomeSourceItem = ({ item: incomeSource, index }: { item: IncomeSource; index: number }) => {
    const isSelected = incomeSource.id === selectedIncomeSourceId;
    const isHighlighted = index === highlightedIndex;
    
    const getIncomeSourceIcon = (type: string) => {
      switch (type) {
        case 'salary': return 'work';
        case 'business': return 'business';
        case 'investment': return 'trending-up';
        case 'gift': return 'card-giftcard';
        case 'bonus': return 'star';
        default: return 'attach-money';
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.incomeSourceItem,
          {
            backgroundColor: isHighlighted 
              ? theme.primary + '20' 
              : isSelected 
                ? theme.primary + '10' 
                : 'transparent',
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => handleIncomeSourcePress(incomeSource, index)}
        activeOpacity={0.7}
      >
        <View style={styles.incomeSourceContent}>
          <Icon 
            name={getIncomeSourceIcon(incomeSource.source_type)} 
            size={24} 
            color={theme.textSecondary} 
            style={styles.incomeSourceIcon} 
          />
          <View style={styles.incomeSourceInfo}>
            <Text style={[styles.incomeSourceName, { color: theme.textPrimary }]}>
              {incomeSource.name}
            </Text>
            <Text style={[styles.incomeSourceType, { color: theme.textSecondary }]}>
              {incomeSource.source_type.charAt(0).toUpperCase() + incomeSource.source_type.slice(1)}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Icon name="check" size={20} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderListData = () => {
    const data = [];
    
    // Show filtered income sources
    filteredIncomeSources.forEach(source => {
      data.push({ type: 'income-source', source });
    });
    
    // Show create option if applicable
    if (shouldShowCreateOption) {
      data.push({ type: 'create' });
    }

    return data;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'create') {
      return renderCreateIncomeSourceOption();
    } else if (item.type === 'income-source' && item.source) {
      return renderIncomeSourceItem({ item: item.source, index });
    }
    return null;
  };

  const listData = renderListData();

  return (
    <SimpleBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      snapPoints={['90%']}
      title="Select Income Source"
    >
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Icon 
            name="search" 
            size={20} 
            color={theme.textSecondary} 
            style={styles.searchIcon} 
          />
          <TextInput
            ref={searchInputRef}
            style={[
              styles.searchInput,
              {
                color: theme.textPrimary,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search income sources or type to create new..."
            placeholderTextColor={theme.textSecondary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleEnterPress}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={styles.clearButton}
            >
              <Icon name="clear" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) => 
            item.type === 'create' ? 'create' : item.source.id
          }
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchText.trim() && !shouldShowCreateOption ? (
              <View style={styles.emptyContainer}>
                <Icon name="attach-money" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No income sources found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  Try adjusting your search
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SimpleBottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  incomeSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  createIncomeSourceItem: {
    borderStyle: 'dashed',
  },
  incomeSourceContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeSourceIcon: {
    marginRight: 12,
  },
  incomeSourceInfo: {
    flex: 1,
  },
  incomeSourceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  incomeSourceType: {
    fontSize: 14,
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});