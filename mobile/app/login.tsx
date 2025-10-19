import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call - replace with actual login logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Success',
        'Logged in successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Email Address"
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.githubButton}
          onPress={() => {
            // If you have an OAuth flow, replace this with real navigation
            Alert.alert('GitHub Login', 'Starting GitHub login...');
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              Alert.alert(
                'Success',
                'Logged in with GitHub!',
                [
                  { text: 'OK', onPress: () => router.push('/(tabs)') },
                ]
              );
            }, 1000);
          }}
        >
          <Text style={styles.githubButtonText}>Login with GitHub</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.registerLinkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 32,
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerLinkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  githubButton: {
    backgroundColor: '#24292e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  githubButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

