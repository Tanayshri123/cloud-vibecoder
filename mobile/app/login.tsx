import React, { useMemo, useState } from 'react';
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
import {
  AuthRequest,
  AuthSessionResult,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';
const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
const GITHUB_SCOPES = ['read:user', 'user:email', 'repo'];
const GITHUB_DISCOVERY = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
};

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

// Build a redirect URI that works across web, Expo Go, and native builds.
// Note: Route groups like (auth) don't appear in the actual URL path
// So app/(auth)/oauth-redirect.tsx is accessible at /oauth-redirect
const redirectUri = useMemo(
  () => {
    // For web/localhost: use http://localhost:8081/oauth-redirect
    // For Expo Go on device: use exp://... (requires GitHub OAuth App config update)
    const uri = makeRedirectUri({
      path: 'oauth-redirect',
      // Omit 'scheme' to use default (http for web, exp for Expo Go)
    });
    console.log('[DEBUG] Generated Redirect URI:', uri);
    return uri;
  },
  []
);

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
          style={[styles.githubButton, githubLoading && styles.buttonDisabled]}
          onPress={async () => {
            if (!GITHUB_CLIENT_ID) {
              Alert.alert('GitHub Login', 'GitHub OAuth is not configured. Please set EXPO_PUBLIC_GITHUB_CLIENT_ID.');
              console.warn('[GitHub OAuth] Missing EXPO_PUBLIC_GITHUB_CLIENT_ID');
              return;
            }

            setGithubLoading(true);
            try {
              console.log('[GitHub OAuth] Starting login', {
                redirectUri,
                clientId: GITHUB_CLIENT_ID,
                scopes: GITHUB_SCOPES,
              });

              const request = new AuthRequest({
                clientId: GITHUB_CLIENT_ID,
                scopes: GITHUB_SCOPES,
                redirectUri,
                responseType: ResponseType.Code,
                extraParams: {
                  allow_signup: 'true',
                },
                usePKCE: false,
              });
              
              // Log the full request URL for debugging
              const url = await request.makeAuthUrlAsync(GITHUB_DISCOVERY);
              console.log('[GitHub OAuth] Auth URL:', url);

              const result = await request.promptAsync(GITHUB_DISCOVERY);
              console.log('[GitHub OAuth] AuthSession result', result);

              if (result.type === 'error') {
                const errorDescription = (result as AuthSessionResult & { params?: { error_description?: string } })?.params?.error_description;
                throw new Error(errorDescription || 'GitHub returned an error during authentication');
              }

              if (result.type !== 'success' || !result.params?.code) {
                if (result.type !== 'dismiss') {
                  Alert.alert('GitHub Login', 'GitHub login was cancelled.');
                }
                return;
              }

              const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/github/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  code: result.params.code,
                  redirect_uri: redirectUri,
                }),
              });

              console.log('[GitHub OAuth] Exchange response status', {
                status: exchangeResponse.status,
                url: exchangeResponse.url,
              });

              if (!exchangeResponse.ok) {
                const errorPayload = await exchangeResponse.json().catch(() => ({}));
                console.error('[GitHub OAuth] Exchange failure payload', errorPayload);
                throw new Error(errorPayload?.detail || 'GitHub exchange failed');
              }

              const payload = await exchangeResponse.json();
              console.log('[GitHub OAuth] Exchange success payload', payload);
              const userName = payload?.user?.name || payload?.user?.login || 'GitHub user';

              // Store the access token and user info
              await AsyncStorage.setItem('github_access_token', payload.access_token);
              await AsyncStorage.setItem('github_user', JSON.stringify(payload.user));
              console.log('[GitHub OAuth] Token and user data stored');

              Alert.alert('Success', `Signed in as ${userName}`, [
                {
                  text: 'Continue',
                  onPress: () => router.push('/(tabs)'),
                },
              ]);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unexpected error during GitHub login';
              console.error('[GitHub OAuth] Login error', error);
              Alert.alert('GitHub Login Failed', message);
            } finally {
              setGithubLoading(false);
            }
          }}
          disabled={githubLoading}
        >
          {githubLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.githubButtonText}>Login with GitHub</Text>
          )}
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
