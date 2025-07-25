import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SimpleBottomSheet } from '../ui/BottomSheet';
import { useTheme } from '../../theme';

interface Envelope {
  id: string;
  name: string;
  current_balance: number;
  color?: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (envelope: Envelope) => void;
  envelopes: Envelope[];
  selectedEnvelopeId?: string;
}

export const EnvelopePickerBottomSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  onSelect,
  envelopes,
  selectedEnvelopeId,
}) => {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<TextInput>(null);

  // Filter envelopes based on search text
  const filteredEnvelopes = useMemo(() => {
    if (!searchText.trim()) return envelopes;
    
    const searchLower = searchText.toLowerCase().trim();
    return envelopes.filter(envelope =>
      envelope.name.toLowerCase().includes(searchLower)
    );
  }, [envelopes, searchText]);

  // Update highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredEnvelopes]);

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

  const handleEnterPress = () => {
    if (filteredEnvelopes.length > 0 && highlightedIndex < filteredEnvelopes.length) {
      const selectedEnvelope = filteredEnvelopes[highlightedIndex];
      if (selectedEnvelope) {
        onSelect(selectedEnvelope);
        onClose();
      }
    }
  };

  const handleEnvelopePress = (envelope: Envelope, index: number) => {
    setHighlightedIndex(index);
    onSelect(envelope);
    onClose();
  };

  const renderEnvelopeItem = ({ item: envelope, index }: { item: Envelope; index: number }) => {
    const isSelected = envelope.id === selectedEnvelopeId;
    const isHighlighted = index === highlightedIndex;
    
    const balanceColor = envelope.current_balance > 0 
      ? theme.textSecondary 
      : envelope.current_balance === 0 
        ? '#D97706' 
        : '#EF4444';

    return (
      <TouchableOpacity
        style={[
          styles.envelopeItem,
          {
            backgroundColor: isHighlighted 
              ? theme.primary + '20' 
              : isSelected 
                ? theme.primary + '10' 
                : 'transparent',
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => handleEnvelopePress(envelope, index)}
        activeOpacity={0.7}
      >
        <View style={styles.envelopeContent}>
          <View style={styles.envelopeInfo}>
            <Text style={[styles.envelopeName, { color: theme.textPrimary }]}>
              {envelope.name}
            </Text>
            <Text style={[styles.envelopeBalance, { color: balanceColor }]}>
              ${envelope.current_balance.toFixed(2)}
            </Text>
          </View>
          {envelope.color && (
            <View
              style={[
                styles.envelopeColorIndicator,
                { backgroundColor: envelope.color },
              ]}
            />
          )}
        </View>
        {isSelected && (
          <Icon name="check" size={20} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SimpleBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      snapPoints={['90%']}
      title="Select Envelope"
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
            placeholder="Search envelopes..."
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
          data={filteredEnvelopes}
          renderItem={renderEnvelopeItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="inbox" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No envelopes found
              </Text>
              {searchText.length > 0 && (
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  Try adjusting your search
                </Text>
              )}
            </View>
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
  envelopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  envelopeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  envelopeInfo: {
    flex: 1,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  envelopeBalance: {
    fontSize: 14,
    fontWeight: '400',
  },
  envelopeColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
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