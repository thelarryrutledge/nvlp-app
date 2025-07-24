import React, { useState, useEffect, useMemo } from 'react';
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

interface Payee {
  id: string;
  name: string;
  payee_type: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (payee: Payee | null) => void;
  payees: Payee[];
  selectedPayeeId?: string;
  onPayeeCreated?: (newPayee: Payee) => void;
}

export const PayeePickerBottomSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  onSelect,
  payees,
  selectedPayeeId,
  onPayeeCreated,
}) => {
  const { theme } = useTheme();
  const { selectedBudget } = useBudget();
  const { client } = useApiClient();
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // -1 for "No Payee" option
  const [isCreatingPayee, setIsCreatingPayee] = useState(false);

  // Filter payees based on search text
  const filteredPayees = useMemo(() => {
    if (!searchText.trim()) return payees;
    
    const searchLower = searchText.toLowerCase().trim();
    return payees.filter(payee =>
      payee.name.toLowerCase().includes(searchLower)
    );
  }, [payees, searchText]);

  // Check if search text matches any existing payee exactly
  const exactMatch = useMemo(() => {
    if (!searchText.trim()) return null;
    
    const searchLower = searchText.toLowerCase().trim();
    return payees.find(payee => 
      payee.name.toLowerCase() === searchLower
    );
  }, [payees, searchText]);

  // Should we show the "Create Payee" option?
  const shouldShowCreateOption = useMemo(() => {
    return searchText.trim().length > 0 && !exactMatch && filteredPayees.length === 0;
  }, [searchText, exactMatch, filteredPayees]);

  // Update highlighted index when filtered results change
  useEffect(() => {
    if (shouldShowCreateOption) {
      setHighlightedIndex(0); // Highlight "Create Payee" option
    } else if (filteredPayees.length > 0) {
      setHighlightedIndex(0); // Highlight first payee
    } else {
      setHighlightedIndex(-1); // Highlight "No Payee"
    }
  }, [filteredPayees, shouldShowCreateOption]);

  // Reset search when sheet closes
  useEffect(() => {
    if (!isVisible) {
      setSearchText('');
      setHighlightedIndex(-1);
    }
  }, [isVisible]);

  const createPayee = async (name: string) => {
    if (!selectedBudget?.id) {
      Alert.alert('Error', 'No budget selected.');
      return;
    }

    setIsCreatingPayee(true);
    try {
      const newPayee = await client.createPayee({
        budget_id: selectedBudget.id,
        name: name.trim(),
        payee_type: 'other',
        color: '#10B981',
      });

      // Notify parent about the new payee
      onPayeeCreated?.(newPayee);
      
      // Select the new payee
      onSelect(newPayee);
      onClose();
    } catch (err) {
      console.error('Failed to create payee:', err);
      Alert.alert('Error', 'Failed to create payee. Please try again.');
    } finally {
      setIsCreatingPayee(false);
    }
  };

  const handleEnterPress = () => {
    if (shouldShowCreateOption && highlightedIndex === 0) {
      // Create new payee
      createPayee(searchText);
    } else if (highlightedIndex === -1) {
      // Select "No Payee"
      onSelect(null);
      onClose();
    } else if (filteredPayees.length > 0 && highlightedIndex < filteredPayees.length) {
      // Select highlighted payee
      const selectedPayee = filteredPayees[highlightedIndex];
      onSelect(selectedPayee);
      onClose();
    }
  };

  const handlePayeePress = (payee: Payee | null, index: number) => {
    setHighlightedIndex(index);
    onSelect(payee);
    onClose();
  };

  const handleCreatePayeePress = () => {
    createPayee(searchText);
  };

  const renderNoPayeeOption = () => {
    const isSelected = !selectedPayeeId;
    const isHighlighted = highlightedIndex === -1;

    return (
      <TouchableOpacity
        style={[
          styles.payeeItem,
          {
            backgroundColor: isHighlighted 
              ? theme.primary + '20' 
              : isSelected 
                ? theme.primary + '10' 
                : 'transparent',
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => handlePayeePress(null, -1)}
        activeOpacity={0.7}
      >
        <View style={styles.payeeContent}>
          <Icon name="person-off" size={24} color={theme.textSecondary} style={styles.payeeIcon} />
          <View style={styles.payeeInfo}>
            <Text style={[styles.payeeName, { color: theme.textSecondary }]}>
              No Payee
            </Text>
            <Text style={[styles.payeeType, { color: theme.textTertiary }]}>
              No payee selected
            </Text>
          </View>
        </View>
        {isSelected && (
          <Icon name="check" size={20} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderCreatePayeeOption = () => {
    const isHighlighted = highlightedIndex === 0;

    return (
      <TouchableOpacity
        style={[
          styles.payeeItem,
          styles.createPayeeItem,
          {
            backgroundColor: isHighlighted ? theme.primary + '20' : theme.surface,
            borderColor: theme.primary,
          },
        ]}
        onPress={handleCreatePayeePress}
        activeOpacity={0.7}
        disabled={isCreatingPayee}
      >
        <View style={styles.payeeContent}>
          <Icon name="add" size={24} color={theme.primary} style={styles.payeeIcon} />
          <View style={styles.payeeInfo}>
            <Text style={[styles.payeeName, { color: theme.primary }]}>
              {isCreatingPayee ? 'Creating...' : `Create "${searchText}"`}
            </Text>
            <Text style={[styles.payeeType, { color: theme.textSecondary }]}>
              New payee
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPayeeItem = ({ item: payee, index }: { item: Payee; index: number }) => {
    const isSelected = payee.id === selectedPayeeId;
    const isHighlighted = index === highlightedIndex;
    
    const getPayeeIcon = (type: string) => {
      switch (type) {
        case 'business': return 'business';
        case 'person': return 'person';
        case 'organization': return 'domain';
        case 'utility': return 'flash-on';
        case 'service': return 'build';
        default: return 'more-horiz';
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.payeeItem,
          {
            backgroundColor: isHighlighted 
              ? theme.primary + '20' 
              : isSelected 
                ? theme.primary + '10' 
                : 'transparent',
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => handlePayeePress(payee, index)}
        activeOpacity={0.7}
      >
        <View style={styles.payeeContent}>
          <Icon 
            name={getPayeeIcon(payee.payee_type)} 
            size={24} 
            color={theme.textSecondary} 
            style={styles.payeeIcon} 
          />
          <View style={styles.payeeInfo}>
            <Text style={[styles.payeeName, { color: theme.textPrimary }]}>
              {payee.name}
            </Text>
            <Text style={[styles.payeeType, { color: theme.textSecondary }]}>
              {payee.payee_type.charAt(0).toUpperCase() + payee.payee_type.slice(1)}
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
    
    // Always show "No Payee" option first if no search text
    if (!searchText.trim()) {
      data.push({ type: 'no-payee' });
    }
    
    // Show filtered payees
    filteredPayees.forEach(payee => {
      data.push({ type: 'payee', payee });
    });
    
    // Show create option if applicable
    if (shouldShowCreateOption) {
      data.push({ type: 'create' });
    }

    return data;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'no-payee') {
      return renderNoPayeeOption();
    } else if (item.type === 'create') {
      return renderCreatePayeeOption();
    } else {
      // Adjust index for payee items (account for "No Payee" option when no search)
      const payeeIndex = !searchText.trim() ? index - 1 : index;
      return renderPayeeItem({ item: item.payee, index: payeeIndex });
    }
  };

  const listData = renderListData();

  return (
    <SimpleBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      snapPoints={['90%']}
      title="Select Payee"
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
            placeholder="Search payees or type to create new..."
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
            item.type === 'no-payee' ? 'no-payee' : 
            item.type === 'create' ? 'create' : 
            item.payee.id
          }
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchText.trim() && !shouldShowCreateOption ? (
              <View style={styles.emptyContainer}>
                <Icon name="person-search" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No payees found
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
  payeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  createPayeeItem: {
    borderStyle: 'dashed',
  },
  payeeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payeeIcon: {
    marginRight: 12,
  },
  payeeInfo: {
    flex: 1,
  },
  payeeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  payeeType: {
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