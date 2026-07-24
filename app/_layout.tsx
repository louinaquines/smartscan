import { useEffect, useState, useRef } from 'react';
import { Image, StyleSheet, Text, View, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../lib/theme';
import { ToastProvider } from '../context/ToastContext';
import Onboarding from '../components/Onboarding';
import { storage, StorageKeys } from '../lib/storage';

export default function RootLayout() {
  const loadState = useCartStore((s) => s.loadState);
  const setCurrency = useCartStore((s) => s.setCurrency);
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const logoScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadState(),
      storage.getString(StorageKeys.ONBOARDING_COMPLETE),
      new Promise((resolve) => setTimeout(resolve, 1800)),
    ]).then(([, savedOnboarding]) => {
      if (mounted) setOnboardingComplete(savedOnboarding === 'true');
    }).finally(() => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [loadState]);

  if (!ready || onboardingComplete === null) {
    return (
      <View style={styles.loadingScreen}>
        <Animated.View style={[styles.brandBlock, { transform: [{ scale: logoScale }] }]}>
          <Image source={require('../assets/cany-logo2.png')} style={styles.logo} />
        </Animated.View>
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }], alignItems: 'center' }}>
          <Text style={styles.logoTitle}>Cany</Text>
          <Text style={styles.logoCaption}>Smart grocery scanning</Text>
        </Animated.View>
      </View>
    );
  }

  const finishOnboarding = async (setup: { name: string; country: string; currencyId: Parameters<typeof setCurrency>[0] }) => {
    await Promise.all([
      storage.set(StorageKeys.USER_NAME, setup.name),
      storage.set(StorageKeys.COUNTRY, setup.country),
      setCurrency(setup.currencyId),
    ]);
    await storage.set(StorageKeys.ONBOARDING_COMPLETE, 'true');
    setOnboardingComplete(true);
  };

  if (!onboardingComplete) {
    return <Onboarding onDone={finishOnboarding} />;
  }

  return (
    <ToastProvider>
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
    </ToastProvider>
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
    color: colors.primary,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
