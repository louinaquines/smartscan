import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../lib/theme';
import Skeleton from '../components/Skeleton';

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

        <View style={styles.skeletonPanel}>
          <View style={styles.skeletonHeader}>
            <View>
              <Skeleton width={70} height={12} radius={6} />
              <Skeleton width={132} height={28} radius={8} style={styles.skeletonGap} />
            </View>
            <Skeleton width={56} height={56} radius={28} />
          </View>
          <Skeleton height={9} radius={99} style={styles.skeletonWideGap} />
          <View style={styles.skeletonGrid}>
            <Skeleton height={72} radius={14} style={styles.skeletonCell} />
            <Skeleton height={72} radius={14} style={styles.skeletonCell} />
            <Skeleton height={72} radius={14} style={styles.skeletonCell} />
          </View>
        </View>
      </View>
    );
  }

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
    marginBottom: 34,
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
  skeletonPanel: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonGap: {
    marginTop: 12,
  },
  skeletonWideGap: {
    marginTop: 22,
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  skeletonCell: {
    flex: 1,
  },
});
