import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useCartStore } from '../store/useCartStore';

export default function RootLayout() {
  const loadBudget = useCartStore((s) => s.loadBudget);

  useEffect(() => {
    loadBudget();
  }, []);

  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="scan"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </PaperProvider>
  );
}