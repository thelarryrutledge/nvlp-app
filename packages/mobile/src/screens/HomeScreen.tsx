import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedCard from '../components/AnimatedCard';
import AnimationShowcase from '../components/AnimationShowcase';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>NVLP Dashboard</Text>
          <Text style={styles.subtitle}>Virtual Envelope Budgeting</Text>
        </View>
        
        <AnimatedCard
          title="Welcome to NVLP"
          subtitle="Your personal finance dashboard with smooth animations"
          onPress={() => {
            // Card press handler
          }}
        />
        
        <View style={styles.content}>
          <Text style={styles.description}>
            Welcome to your personal finance dashboard. Here you'll see your
            budget overview, recent transactions, and account summaries.
          </Text>
        </View>

        <AnimationShowcase />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default HomeScreen;