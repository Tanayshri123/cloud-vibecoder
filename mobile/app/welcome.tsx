import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>☁️</Text>
          <Text style={styles.appName}>Cloud Vibecoder</Text>
        </View>

        <Text style={styles.title}>Transform Your Code</Text>
        <Text style={styles.subtitle}>
          Generate implementation plans for GitHub repositories using natural language prompts
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🚀</Text>
            <Text style={styles.featureText}>AI-Powered Planning</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Cross-Platform</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureText}>Fast & Reliable</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 48,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

