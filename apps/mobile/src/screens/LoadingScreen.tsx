/**
 * Loading Screen
 * 
 * Displays loading indicator while app initializes
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const CustomSpinner: React.FC = () => {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.customSpinner, { transform: [{ rotate: spin }] }]}>
      <View style={[styles.spinnerRing, { 
        borderColor: theme.border, 
        borderTopColor: theme.primary 
      }]} />
    </Animated.View>
  );
};

export const LoadingScreen: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://nvlp.app/assets/FullLogo_Transparent_NoBuffer.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <CustomSpinner />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your budget...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - using theme
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    width: 280,
    height: 120,
  },
  customSpinner: {
    width: 50,
    height: 50,
    marginBottom: 30,
  },
  spinnerRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    // borderColor & borderTopColor removed - using theme
  },
  loadingText: {
    fontSize: 16,
    // color removed - using theme
    fontWeight: '500',
  },
});

export default LoadingScreen;