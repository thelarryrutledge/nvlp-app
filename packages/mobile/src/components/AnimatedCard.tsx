import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ title, subtitle, onPress }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in animation on mount
    opacity.value = withTiming(1, { duration: 500 });
    
    // Gentle pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [opacity, scale]);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.95);
    rotation.value = withSpring(-2);
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1);
    rotation.value = withSpring(0);
    if (onPress) {
      runOnJS(onPress)();
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadowRadius = interpolate(
      scale.value,
      [0.95, 1, 1.02],
      [5, 10, 12],
      Extrapolate.CLAMP
    );
    
    return {
      shadowRadius,
      elevation: shadowRadius,
    };
  });

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, animatedStyle, shadowStyle]}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>✨ Animated with Reanimated 3</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  indicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  indicatorText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default AnimatedCard;