import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    // Handle deep links for OAuth flow
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[Deep Link] Received:', event.url);
      
      if (!event.url.includes('mobile://')) {
        return;
      }

      const parsed = Linking.parse(event.url);
      console.log('[Deep Link] Parsed:', parsed);
      
      // Handle OAuth success
      if (parsed.hostname === 'oauth-success' || parsed.path === 'oauth-success') {
        const token = parsed.queryParams?.token as string;
        const userParam = parsed.queryParams?.user as string;
        
        if (token) {
          try {
            await AsyncStorage.setItem('github_access_token', token);
            
            if (userParam) {
              const user = JSON.parse(decodeURIComponent(userParam));
              await AsyncStorage.setItem('github_user', JSON.stringify(user));
              console.log('[Deep Link] Stored user:', user.login);
            }
            
            console.log('[Deep Link] OAuth success, navigating to tabs');
            router.replace('/(tabs)');
          } catch (e) {
            console.error('[Deep Link] Error storing credentials:', e);
            Alert.alert('Error', 'Failed to store credentials');
            router.replace('/login');
          }
        }
      }
      
      // Handle OAuth error
      if (parsed.hostname === 'oauth-error' || parsed.path === 'oauth-error') {
        const error = parsed.queryParams?.error as string;
        console.error('[Deep Link] OAuth error:', error);
        Alert.alert('GitHub Login Failed', error || 'Authentication failed');
        router.replace('/login');
      }
    };
    
    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen 
          name="modal" 
          options={{ 
            headerShown: true,
            presentation: 'modal', 
            title: 'Modal' 
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
