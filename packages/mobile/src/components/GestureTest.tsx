import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  GestureHandlerRootView,
  TapGestureHandler,
  State,
  LongPressGestureHandler,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface GestureTestProps {
  title?: string;
}

const GestureTest: React.FC<GestureTestProps> = ({ title = 'Gesture Test' }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      'worklet';
    },
    onActive: (event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: () => {
      'worklet';
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const handleTap = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      Alert.alert('Tap', 'Single tap detected!');
    }
  };

  const handleLongPress = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      Alert.alert('Long Press', 'Long press detected!');
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tap Gesture</Text>
        <TapGestureHandler onHandlerStateChange={handleTap}>
          <View style={styles.tapBox}>
            <Text style={styles.boxText}>Tap Me</Text>
          </View>
        </TapGestureHandler>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Long Press Gesture</Text>
        <LongPressGestureHandler onHandlerStateChange={handleLongPress}>
          <View style={styles.longPressBox}>
            <Text style={styles.boxText}>Long Press Me</Text>
          </View>
        </LongPressGestureHandler>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pan Gesture (Drag)</Text>
        <PanGestureHandler onGestureEvent={panGestureHandler}>
          <Animated.View style={[styles.panBox, animatedStyle]}>
            <Text style={styles.boxText}>Drag Me</Text>
          </Animated.View>
        </PanGestureHandler>
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
    marginBottom: 20,
    color: '#333',
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
    width: 150,
    height: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  longPressBox: {
    width: 150,
    height: 50,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  panBox: {
    width: 150,
    height: 50,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  boxText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default GestureTest;