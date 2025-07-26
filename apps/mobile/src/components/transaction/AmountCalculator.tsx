/**
 * Amount Calculator Component
 * 
 * Calculator-style input for entering transaction amounts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme';

interface AmountCalculatorProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => void;
  initialValue?: string;
  title?: string;
}

type CalculatorButton = {
  value: string;
  label: string;
  type: 'number' | 'operator' | 'action' | 'equals';
  span?: number;
};

export const AmountCalculator: React.FC<AmountCalculatorProps> = ({
  isVisible,
  onClose,
  onConfirm,
  initialValue = '0',
  title = 'Enter Amount',
}) => {
  const { theme } = useTheme();
  const [display, setDisplay] = useState(initialValue);
  const [previousValue, setPreviousValue] = useState('');
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setDisplay(initialValue || '0');
      setPreviousValue('');
      setOperation(null);
      setWaitingForOperand(false);
    }
  }, [isVisible, initialValue]);

  const calculatorButtons: CalculatorButton[] = [
    { value: 'C', label: 'C', type: 'action' },
    { value: '⌫', label: '⌫', type: 'action' },
    { value: '÷', label: '÷', type: 'operator' },
    { value: '×', label: '×', type: 'operator' },
    { value: '7', label: '7', type: 'number' },
    { value: '8', label: '8', type: 'number' },
    { value: '9', label: '9', type: 'number' },
    { value: '-', label: '-', type: 'operator' },
    { value: '4', label: '4', type: 'number' },
    { value: '5', label: '5', type: 'number' },
    { value: '6', label: '6', type: 'number' },
    { value: '+', label: '+', type: 'operator' },
    { value: '1', label: '1', type: 'number' },
    { value: '2', label: '2', type: 'number' },
    { value: '3', label: '3', type: 'number' },
    { value: '=', label: '=', type: 'equals' },
    { value: '0', label: '0', type: 'number', span: 2 },
    { value: '.', label: '.', type: 'number' },
  ];

  const performOperation = () => {
    const inputValue = parseFloat(display);
    const previousValueFloat = parseFloat(previousValue);

    if (isNaN(previousValueFloat) || isNaN(inputValue)) {
      return;
    }

    let newValue = 0;
    switch (operation) {
      case '+':
        newValue = previousValueFloat + inputValue;
        break;
      case '-':
        newValue = previousValueFloat - inputValue;
        break;
      case '×':
        newValue = previousValueFloat * inputValue;
        break;
      case '÷':
        newValue = previousValueFloat / inputValue;
        break;
      default:
        return;
    }

    setDisplay(String(newValue));
    setPreviousValue('');
    setOperation(null);
    setWaitingForOperand(true);
  };

  const handleNumberPress = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      if (num === '.' && display.includes('.')) {
        return;
      }
      setDisplay(display === '0' ? num : display + num);
    }
    Vibration.vibrate(10);
  };

  const handleOperatorPress = (op: string) => {
    const inputValue = parseFloat(display);

    if (previousValue && operation && !waitingForOperand) {
      performOperation();
    } else {
      setPreviousValue(String(inputValue));
    }

    setWaitingForOperand(true);
    setOperation(op);
    Vibration.vibrate(10);
  };

  const handleActionPress = (action: string) => {
    switch (action) {
      case 'C':
        setDisplay('0');
        setPreviousValue('');
        setOperation(null);
        setWaitingForOperand(false);
        break;
      case '⌫':
        if (display.length > 1) {
          setDisplay(display.slice(0, -1));
        } else {
          setDisplay('0');
        }
        break;
    }
    Vibration.vibrate(10);
  };

  const handleEqualsPress = () => {
    if (operation && previousValue) {
      performOperation();
    }
    Vibration.vibrate(10);
  };

  const handleButtonPress = (button: CalculatorButton) => {
    switch (button.type) {
      case 'number':
        handleNumberPress(button.value);
        break;
      case 'operator':
        handleOperatorPress(button.value);
        break;
      case 'action':
        handleActionPress(button.value);
        break;
      case 'equals':
        handleEqualsPress();
        break;
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(display);
    if (!isNaN(amount) && amount > 0) {
      onConfirm(display);
      Vibration.vibrate(20);
    }
  };

  const formatDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // Format with commas for thousands
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const getButtonStyle = (button: CalculatorButton) => {
    if (button.type === 'equals') {
      return [styles.button, styles.equalsButton, { backgroundColor: theme.primary }];
    } else if (button.type === 'operator') {
      return [styles.button, styles.operatorButton, { backgroundColor: theme.surface }];
    } else if (button.type === 'action') {
      return [styles.button, styles.actionButton, { backgroundColor: theme.surface }];
    } else {
      return [styles.button, styles.numberButton, { backgroundColor: theme.surface }];
    }
  };

  const getButtonTextStyle = (button: CalculatorButton) => {
    if (button.type === 'equals') {
      return [styles.buttonText, { color: theme.textOnPrimary }];
    } else if (button.type === 'operator' || button.type === 'action') {
      return [styles.buttonText, styles.operatorText, { color: theme.primary }];
    } else {
      return [styles.buttonText, { color: theme.textPrimary }];
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Display */}
          <View style={[styles.display, { backgroundColor: theme.surface }]}>
            <Text style={[styles.displayText, { color: theme.textPrimary }]}>
              ${formatDisplay(display)}
            </Text>
            {operation && (
              <Text style={[styles.operationText, { color: theme.textSecondary }]}>
                {previousValue} {operation}
              </Text>
            )}
          </View>

          {/* Calculator Grid */}
          <View style={styles.buttonGrid}>
            {calculatorButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  getButtonStyle(button),
                  button.span === 2 && styles.spanTwo,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text style={getButtonTextStyle(button)}>
                  {button.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: theme.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={[styles.confirmButtonText, { color: theme.textOnPrimary }]}>
              Confirm Amount
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  display: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  displayText: {
    fontSize: 36,
    fontWeight: '600',
  },
  operationText: {
    fontSize: 14,
    marginTop: 4,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 10,
  },
  button: {
    width: '22.5%',
    aspectRatio: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spanTwo: {
    width: '47.5%',
  },
  numberButton: {
    // Styled in getButtonStyle
  },
  operatorButton: {
    // Styled in getButtonStyle
  },
  actionButton: {
    // Styled in getButtonStyle
  },
  equalsButton: {
    // Styled in getButtonStyle
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '500',
  },
  operatorText: {
    fontWeight: '600',
  },
  confirmButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AmountCalculator;