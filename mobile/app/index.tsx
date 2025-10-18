import { router, useFocusEffect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useCallback } from 'react';

export default function Index() {
  useFocusEffect(
    useCallback(() => {
      // Use useFocusEffect to ensure navigation is ready
      const timer = setTimeout(() => {
        router.replace('/welcome');
      }, 50);

      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

