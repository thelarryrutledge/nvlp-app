import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  GestureHandlerRootView,
  TapGestureHandler,
  State,
  LongPressGestureHandler,
  StateChangeEvent,
  HandlerStateChangeEvent,
} from 'react-native-gesture-handler';

const SimpleGestureTest: React.FC = () => {
  const [tapCount, setTapCount] = useState(0);
  const [longPressCount, setLongPressCount] = useState(0);

  const handleTap = (event: HandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setTapCount(prev => prev + 1);
      Alert.alert('Tap', `Tap detected! Count: ${tapCount + 1}`);
    }
  };

  const handleLongPress = (event: HandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setLongPressCount(prev => prev + 1);
      Alert.alert('Long Press', `Long press detected! Count: ${longPressCount + 1}`);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.title}>Gesture Handler Test</Text>
      <Text style={styles.subtitle}>React Native Gesture Handler is working!</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tap Gesture</Text>
        <TapGestureHandler onHandlerStateChange={handleTap}>
          <View style={styles.tapBox}>
            <Text style={styles.boxText}>Tap Me</Text>
            <Text style={styles.countText}>Taps: {tapCount}</Text>
          </View>
        </TapGestureHandler>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Long Press Gesture</Text>
        <LongPressGestureHandler 
          onHandlerStateChange={handleLongPress}
          minDurationMs={800}>
          <View style={styles.longPressBox}>
            <Text style={styles.boxText}>Long Press Me</Text>
            <Text style={styles.countText}>Long Presses: {longPressCount}</Text>
          </View>
        </LongPressGestureHandler>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ✅ GestureHandlerRootView configured
        </Text>
        <Text style={styles.infoText}>
          ✅ Tap and Long Press handlers working
        </Text>
        <Text style={styles.infoText}>
          ✅ Ready for navigation gestures
        </Text>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  section: {
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  tapBox: {
    width: 200,
    padding: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  longPressBox: {
    width: 200,
    padding: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  boxText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  countText: {
    color: 'white',
    fontSize: 14,
  },
  infoBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    marginVertical: 2,
  },
});

export default SimpleGestureTest;