import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, palette } from '../theme';

export const ColorTest: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Theme Colors Test - {isDark ? 'Dark' : 'Light'} Mode
          </Text>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Current Background
            </Text>
            <View style={[styles.colorBox, { backgroundColor: theme.background }]}>
              <Text style={{ color: theme.textPrimary }}>{theme.background}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Background Color Comparison
            </Text>
            
            <View style={styles.row}>
              <View style={[styles.colorBox, { backgroundColor: '#FFFFFF' }]}>
                <Text style={{ color: '#000' }}>Pure White</Text>
                <Text style={{ color: '#000', fontSize: 10 }}>#FFFFFF</Text>
              </View>
              
              <View style={[styles.colorBox, { backgroundColor: palette.coolGray50 }]}>
                <Text style={{ color: '#000' }}>Cool Gray 50</Text>
                <Text style={{ color: '#000', fontSize: 10 }}>{palette.coolGray50}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.colorBox, { backgroundColor: '#000000' }]}>
                <Text style={{ color: '#FFF' }}>Pure Black</Text>
                <Text style={{ color: '#FFF', fontSize: 10 }}>#000000</Text>
              </View>
              
              <View style={[styles.colorBox, { backgroundColor: palette.darkSlate }]}>
                <Text style={{ color: '#FFF' }}>Dark Slate</Text>
                <Text style={{ color: '#FFF', fontSize: 10 }}>{palette.darkSlate}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              All Background Options
            </Text>
            
            <View style={[styles.colorBox, { backgroundColor: palette.offWhite }]}>
              <Text style={{ color: '#000' }}>Off White: {palette.offWhite}</Text>
            </View>
            
            <View style={[styles.colorBox, { backgroundColor: palette.warmGray50 }]}>
              <Text style={{ color: '#000' }}>Warm Gray 50: {palette.warmGray50}</Text>
            </View>
            
            <View style={[styles.colorBox, { backgroundColor: palette.coolGray50 }]}>
              <Text style={{ color: '#000' }}>Cool Gray 50: {palette.coolGray50}</Text>
            </View>
            
            <View style={[styles.colorBox, { backgroundColor: palette.charcoal }]}>
              <Text style={{ color: '#FFF' }}>Charcoal: {palette.charcoal}</Text>
            </View>
            
            <View style={[styles.colorBox, { backgroundColor: palette.darkSlate }]}>
              <Text style={{ color: '#FFF' }}>Dark Slate: {palette.darkSlate}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  colorBox: {
    flex: 1,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});