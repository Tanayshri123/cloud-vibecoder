import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function OAuthRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // The GitHub OAuth code will be in params.code
    if (params.code) {
      // Since this is a redirect page, we want to send the user back to the app
      // You might want to show a loading state here while processing the code
      router.replace('/(tabs)');  // or wherever you want to send them after login
    }
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Processing login...</Text>
    </View>
  );
}
