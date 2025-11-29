import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';

export default function OAuthRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      console.log('[OAuth Redirect] Received params:', params);
      
      if (params.code) {
        console.log('[OAuth Redirect] Received code:', params.code);
        
        try {
          // Build the same redirect URI that was used in the auth request
          const redirectUri = makeRedirectUri({
            scheme: 'exp',
            path: 'oauth-redirect'
          });

          console.log('[OAuth] Exchanging code for token...');
          
          // Call your backend to exchange the code for an access token
          const response = await fetch(`${API_BASE_URL}/api/auth/github/exchange`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: params.code,
              redirect_uri: redirectUri,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to exchange code');
          }

          const data = await response.json();
          console.log('[OAuth] Successfully exchanged code for token');
          
          // Store the access token and user info
          await AsyncStorage.setItem('github_access_token', data.access_token);
          await AsyncStorage.setItem('github_user', JSON.stringify(data.user));
          
          console.log('[OAuth] Token and user data stored');
          
          // Navigate to the main app
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 500);
          
        } catch (error) {
          console.error('[OAuth] Error exchanging code:', error);
          setError(error instanceof Error ? error.message : 'Authentication failed');
          
          Alert.alert(
            'Authentication Failed',
            'Could not complete GitHub sign-in. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/login'),
              },
            ]
          );
        }
      } else if (params.error) {
        console.error('[OAuth] Error from GitHub:', params.error);
        setError('Authorization denied');
        router.replace('/login');
      }
    };

    exchangeCodeForToken();
  }, [params.code, params.error, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      {error ? (
        <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color="#0366d6" />
          <Text style={{ marginTop: 20 }}>Processing login...</Text>
        </>
      )}
    </View>
  );
}
