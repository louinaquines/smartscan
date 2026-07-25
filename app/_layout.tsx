import { useEffect, useState, useRef } from 'react';
import { Image, StyleSheet, Text, View, Animated, AppState, Pressable, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../lib/theme';
import { ToastProvider } from '../context/ToastContext';
import { NotificationProvider } from '../context/NotificationContext';
import Onboarding from '../components/Onboarding';
import { storage, StorageKeys } from '../lib/storage';
import { setupAllNotifications, scheduleAbandonedCartNotifications, cancelAbandonedCartNotifications } from '../lib/notifications';

export default function RootLayout() {
  const loadState = useCartStore((s) => s.loadState);
  const setCurrency = useCartStore((s) => s.setCurrency);
  const setLanguage = useCartStore((s) => s.setLanguage);
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const logoScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const tapCountRef = useRef(0);
  const resetLabelRef = useRef(new Animated.Value(0)).current;

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
      storage.getString('DEV_SHOW_ONBOARDING_RELOAD'),
      new Promise((resolve) => setTimeout(resolve, 1800)),
    ]).then(([, savedOnboarding, devReset]) => {
      if (!mounted) return;
      if (devReset === 'true') {
        storage.set(StorageKeys.ONBOARDING_COMPLETE, 'false');
        setOnboardingComplete(false);
      } else {
        setOnboardingComplete(savedOnboarding === 'true');
      }
    }).finally(() => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [loadState]);

  const shoppingList = useCartStore((s) => s.shoppingList);

  useEffect(() => {
    if (!onboardingComplete) return;
    setupAllNotifications(shoppingList.filter((item) => !item.checked).length);
  }, [onboardingComplete, shoppingList]);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (!onboardingComplete) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      const itemCount = useCartStore.getState().items.length;
      if (prev !== null && /^active$/.test(prev) && /^(inactive|background)$/.test(nextState)) {
        if (itemCount > 0) {
          scheduleAbandonedCartNotifications(itemCount, useCartStore.getState().total());
        }
      } else if (/^active$/.test(nextState)) {
        cancelAbandonedCartNotifications();
      }
    });
    return () => subscription.remove();
  }, [onboardingComplete]);

  if (!ready || onboardingComplete === null) {
    return (
      <View style={styles.loadingScreen}>
        <Pressable
          onPress={() => {
            tapCountRef.current += 1;
            if (tapCountRef.current >= 3) {
              tapCountRef.current = 0;
              storage.set('DEV_SHOW_ONBOARDING_RELOAD', 'true');
              storage.set(StorageKeys.ONBOARDING_COMPLETE, 'false').then(() => {
                setOnboardingComplete(false);
              });
            }
            if (tapCountRef.current > 0 && __DEV__) {
              Animated.sequence([
                Animated.timing(resetLabelRef, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.delay(1200),
                Animated.timing(resetLabelRef, { toValue: 0, duration: 200, useNativeDriver: true }),
              ]).start();
            }
          }}
        >
          <Animated.View style={[styles.brandBlock, { transform: [{ scale: logoScale }] }]}>
            <Image source={require('../assets/cany-logo2.png')} style={styles.logo} />
          </Animated.View>
        </Pressable>
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }], alignItems: 'center' }}>
          <Text style={styles.logoTitle}>Cany</Text>
          <Text style={styles.logoCaption}>Smart grocery scanning</Text>
        </Animated.View>
        {__DEV__ && (
          <Animated.Text style={[styles.devResetHint, { opacity: resetLabelRef }]}>
            Triple-tap logo to show onboarding on next reload
          </Animated.Text>
        )}
      </View>
    );
  }

  const finishOnboarding = async (setup: { name: string; country: string; currencyId: Parameters<typeof setCurrency>[0]; languageId: Parameters<typeof setLanguage>[0] }) => {
    await Promise.all([
      storage.set(StorageKeys.USER_NAME, setup.name),
      storage.set(StorageKeys.COUNTRY, setup.country),
      setCurrency(setup.currencyId),
      setLanguage(setup.languageId),
      storage.set('DEV_SHOW_ONBOARDING_RELOAD', 'false'),
    ]);
    await storage.set(StorageKeys.ONBOARDING_COMPLETE, 'true');
    setOnboardingComplete(true);
  };

  return (
    <NotificationProvider>
      {!onboardingComplete ? (
        <Onboarding onDone={finishOnboarding} />
      ) : (
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
      )}
    </NotificationProvider>
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
  devResetHint: {
    position: 'absolute',
    bottom: 60,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
