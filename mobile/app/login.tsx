import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accent, LightTheme, Typography, Spacing, Radius, Shadows } from '../constants/theme';

const { height } = Dimensions.get('window');
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';
const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
const GITHUB_SCOPES = ['read:user', 'user:email', 'repo'];
const GITHUB_DISCOVERY = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
};

// Get greeting based on time of day
const getGreeting = (): { line1: string; line2: string } => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { line1: 'Good', line2: 'morning' };
  } else if (hour >= 12 && hour < 17) {
    return { line1: 'Good', line2: 'afternoon' };
  } else if (hour >= 17 && hour < 21) {
    return { line1: 'Good', line2: 'evening' };
  } else {
    return { line1: 'Good', line2: 'night' };
  }
};

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting());
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Update greeting on mount
    setGreeting(getGreeting());
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const redirectUri = useMemo(
    () => {
      // Use backend URL as redirect URI - GitHub will redirect here, then backend redirects to mobile app
      const backendUrl = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';
      const uri = `${backendUrl}/api/auth/github/callback`;
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

  const handleGithubLogin = async () => {
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

      // Build GitHub OAuth URL - backend will handle the redirect
      const scopes = GITHUB_SCOPES.join(' ');
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&allow_signup=true`;
      
      console.log('[GitHub OAuth] Opening auth URL:', authUrl);
      
      // Open browser - user will authorize, GitHub redirects to backend, backend redirects to mobile://oauth-success
      // The deep link will be handled by oauth-redirect.tsx or the app's deep link handler
      await WebBrowser.openBrowserAsync(authUrl);
      
      // Note: The actual token exchange and storage happens via deep link handling
      // We can't wait for it here since it happens in a different flow
      // The user will be redirected back to the app via mobile://oauth-success
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error during GitHub login';
      console.error('[GitHub OAuth] Login error', error);
      Alert.alert('GitHub Login Failed', message);
    } finally {
      setGithubLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.greeting}>{greeting.line1}</Text>
          <Text style={styles.greetingAccent}>{greeting.line2}</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={LightTheme.textTertiary}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor={LightTheme.textTertiary}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              style={styles.input}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.githubButton, githubLoading && styles.buttonDisabled]}
            onPress={handleGithubLogin}
            disabled={githubLoading}
            activeOpacity={0.9}
          >
            {githubLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.githubIcon}>⬢</Text>
                <Text style={styles.githubButtonText}>GitHub</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: LightTheme.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backIcon: {
    fontSize: 20,
    color: LightTheme.text,
    fontWeight: '600',
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  greeting: {
    ...Typography.displayMedium,
    color: LightTheme.text,
    letterSpacing: -0.5,
  },
  greetingAccent: {
    ...Typography.displayMedium,
    color: Accent.primary,
    letterSpacing: -0.5,
    marginTop: -4,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    ...Typography.bodyLarge,
    color: LightTheme.text,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    ...Typography.bodyMedium,
    color: Accent.primary,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: Accent.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    ...Shadows.light.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: LightTheme.border,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: LightTheme.textTertiary,
    marginHorizontal: Spacing.md,
  },
  githubButton: {
    backgroundColor: '#24292F',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.light.sm,
  },
  githubIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: Spacing.sm,
  },
  githubButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  signupText: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
  },
  signupLink: {
    ...Typography.bodyMedium,
    color: Accent.primary,
    fontWeight: '600',
  },
});
