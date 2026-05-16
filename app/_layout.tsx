import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const loadState = useCartStore((s) => s.loadState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadState(),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]).finally(() => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [loadState]);

  if (!ready) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.brandBlock}>
          <Image source={require('../assets/cany-logo.png')} style={styles.logo} />
          <Text style={styles.logoTitle}>CANY</Text>
          <Text style={styles.logoCaption}>Smart grocery scanning</Text>
        </View>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 22,
  },
  brandBlock: {
    alignItems: 'center',
  },
  logo: {
    width: 132,
    height: 132,
    borderRadius: 32,
    marginBottom: 18,
  },
  logoTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  logoCaption: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
  },
});
