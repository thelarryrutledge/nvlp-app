import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleGestureTest from '../components/SimpleGestureTest';

const SettingsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.description}>
            Configure your app preferences, security settings, and account
            options.
          </Text>
        </View>
        <View style={styles.divider} />
        <SimpleGestureTest />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
    marginHorizontal: 20,
  },
});

export default SettingsScreen;