import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Temporarily disabled until reanimated is fixed
// import AnimatedCard from '../components/AnimatedCard';
// import AnimationShowcase from '../components/AnimationShowcase';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>NVLP Dashboard</Text>
          <Text style={styles.subtitle}>Virtual Envelope Budgeting</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to NVLP</Text>
          <Text style={styles.cardSubtitle}>
            Your personal finance dashboard
          </Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.description}>
            Welcome to your personal finance dashboard. Here you'll see your
            budget overview, recent transactions, and account summaries.
          </Text>
        </View>

        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            📊 Budget Overview Coming Soon
          </Text>
        </View>
        
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            💳 Recent Transactions Coming Soon
          </Text>
        </View>
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
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  placeholderBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 30,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
});

export default HomeScreen;