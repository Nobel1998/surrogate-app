import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';

export default function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to BabyTree Surrogacy</Text>
        <Text style={styles.subtitle}>Choose your path to begin</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SurrogateApplication')}
        >
          <Text style={styles.primaryText}>Become a Surrogate</Text>
          <Text style={styles.buttonHint}>Start the application without logging in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('LoginScreen')}
        >
          <Text style={styles.secondaryText}>Parents Login / Sign Up</Text>
          <Text style={styles.buttonHintSecondary}>Access your parent account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6E7191',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2A7BF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  primaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E0E7EE',
  },
  secondaryText: {
    color: '#2A7BF6',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonHintSecondary: {
    color: '#6E7191',
    fontSize: 13,
    marginTop: 4,
  },
});
