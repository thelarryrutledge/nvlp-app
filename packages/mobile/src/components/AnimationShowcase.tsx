import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedBoxProps {
  title: string;
  animation: 'spring' | 'timing' | 'repeat' | 'sequence' | 'color';
}

const AnimatedBox: React.FC<AnimatedBoxProps> = ({ title, animation }) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    switch (animation) {
      case 'spring':
        progress.value = withRepeat(
          withSpring(1, { damping: 2, stiffness: 80 }),
          -1,
          true
        );
        break;
      case 'timing':
        progress.value = withRepeat(
          withTiming(1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          -1,
          true
        );
        break;
      case 'repeat':
        progress.value = withRepeat(
          withTiming(1, { duration: 1000 }),
          -1,
          true
        );
        break;
      case 'sequence':
        progress.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 500 }),
            withTiming(1, { duration: 500 }),
            withTiming(0, { duration: 500 })
          ),
          -1,
          false
        );
        break;
      case 'color':
        progress.value = withRepeat(
          withTiming(1, { duration: 2000 }),
          -1,
          true
        );
        break;
    }
  }, [animation, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    let transform = [];
    let backgroundColor = '#4CAF50';

    switch (animation) {
      case 'spring':
        transform = [
          { translateY: progress.value * 20 },
          { scale: 1 + progress.value * 0.2 },
        ];
        break;
      case 'timing':
        transform = [
          { translateX: progress.value * 50 },
        ];
        break;
      case 'repeat':
        transform = [
          { rotate: `${progress.value * 360}deg` },
        ];
        break;
      case 'sequence':
        transform = [
          { scale: 1 + progress.value * 0.5 },
        ];
        break;
      case 'color':
        backgroundColor = interpolateColor(
          progress.value,
          [0, 0.5, 1],
          ['#4CAF50', '#2196F3', '#FF9800']
        );
        transform = [
          { scale: 1 + Math.sin(progress.value * Math.PI) * 0.1 },
        ];
        break;
    }

    return {
      transform,
      backgroundColor,
    };
  });

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1.1),
      withSpring(1)
    );
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable onPress={handlePress} style={pressStyle}>
      <Animated.View style={[styles.box, animatedStyle]}>
        <Text style={styles.boxText}>{title}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
};

const AnimationShowcase: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reanimated 3 Showcase</Text>
      <Text style={styles.subtitle}>
        All animations are running at 60 FPS on the UI thread
      </Text>

      <View style={styles.grid}>
        <AnimatedBox title="Spring" animation="spring" />
        <AnimatedBox title="Timing" animation="timing" />
        <AnimatedBox title="Rotate" animation="repeat" />
        <AnimatedBox title="Sequence" animation="sequence" />
        <AnimatedBox title="Color" animation="color" />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>✅ Reanimated 3 Features:</Text>
        <Text style={styles.infoText}>• Worklet functions running on UI thread</Text>
        <Text style={styles.infoText}>• Spring animations with physics</Text>
        <Text style={styles.infoText}>• Color interpolation</Text>
        <Text style={styles.infoText}>• Gesture integration ready</Text>
        <Text style={styles.infoText}>• Layout animations support</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  box: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  boxText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  info: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
    paddingLeft: 10,
  },
});

export default AnimationShowcase;