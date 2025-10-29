import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="oauth-redirect"
        options={{
          title: 'Completing Login',
          headerShown: false,
        }}
      />
    </Stack>
  );
}