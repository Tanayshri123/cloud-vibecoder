import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function OAuthRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('[OAuth Redirect] Received params:', params);
    
    // The GitHub OAuth code will be in params.code
    if (params.code) {
      console.log('[OAuth Redirect] Received code:', params.code);
      
      // Use setTimeout to ensure the layout is mounted
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    }
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text>Processing login...</Text>
    </View>
  );
}