import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Animated, AppState } from 'react-native';
import { Stack } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { ToastProvider } from '../context/ToastContext';
import { NotificationProvider } from '../context/NotificationContext';
import Onboarding from '../components/Onboarding';
import LoadingScreen from '../components/LoadingScreen';
import SplashScreen from '../components/SplashScreen';
import TutorialOverlay from '../components/TutorialOverlay';
import { storage, StorageKeys } from '../lib/storage';
import { setupNotificationHandler, requestPermissions, setupAllNotifications, scheduleAbandonedCartNotifications, cancelAbandonedCartNotifications } from '../lib/notifications';

type AppPhase = 'splash' | 'loading' | 'onboarding' | 'app';

export default function RootLayout() {
  const loadState = useCartStore((s) => s.loadState);
  const setCurrency = useCartStore((s) => s.setCurrency);
  const setLanguage = useCartStore((s) => s.setLanguage);

  const [phase, setPhase] = useState<AppPhase>('splash');
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const tapCountRef = useRef(0);
  const resetLabelRef = useRef(new Animated.Value(0)).current;

  // Load data during splash
  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadState(),
      storage.getString(StorageKeys.ONBOARDING_COMPLETE),
      storage.getString('DEV_SHOW_ONBOARDING_RELOAD'),
      storage.getString(StorageKeys.TUTORIAL_COMPLETE),
    ]).then(([, savedOnboarding, devReset, savedTutorial]) => {
      if (!mounted) return;
      if (devReset === 'true') {
        storage.set(StorageKeys.ONBOARDING_COMPLETE, 'false');
        setOnboardingComplete(false);
      } else {
        setOnboardingComplete(savedOnboarding === 'true');
      }
      // Show tutorial if not yet completed
      if (savedTutorial !== 'true') {
        setShowTutorial(true);
      }
      setDataReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [loadState]);

  // Handle splash finish — transition to loading or directly to next screen
  const handleSplashFinish = useCallback(() => {
    if (dataReady) {
      // Data already loaded during splash, go straight to the right screen
      if (onboardingComplete) {
        setPhase('loading'); // brief loading screen before app
      } else {
        setPhase('onboarding');
      }
    } else {
      // Data still loading, show loading screen
      setPhase('loading');
    }
  }, [dataReady, onboardingComplete]);

  // When data becomes ready while on loading screen, transition forward
  useEffect(() => {
    if (phase === 'loading' && dataReady && onboardingComplete !== null) {
      if (onboardingComplete) {
        // Show loading briefly then go to app
        const timer = setTimeout(() => setPhase('app'), 1200);
        return () => clearTimeout(timer);
      } else {
        setPhase('onboarding');
      }
    }
  }, [phase, dataReady, onboardingComplete]);

  // Notifications setup
  const shoppingList = useCartStore((s) => s.shoppingList);

  useEffect(() => {
    setupNotificationHandler();
    requestPermissions();
  }, []);

  useEffect(() => {
    if (phase !== 'app') return;
    setupAllNotifications(shoppingList.filter((item) => !item.checked).length);
  }, [phase, shoppingList]);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (phase !== 'app') return;
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
  }, [phase]);

  // Dev: triple-tap to reset onboarding
  const handleLogoPress = () => {
    tapCountRef.current += 1;
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      storage.set('DEV_SHOW_ONBOARDING_RELOAD', 'true');
      storage.set(StorageKeys.ONBOARDING_COMPLETE, 'false').then(() => {
        setOnboardingComplete(false);
        setPhase('onboarding');
      });
    }
    if (tapCountRef.current > 0 && __DEV__) {
      Animated.sequence([
        Animated.timing(resetLabelRef, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(resetLabelRef, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  };

  // Finish onboarding handler
  const finishOnboarding = async (setup: { name: string; country: string; currencyId: Parameters<typeof setCurrency>[0]; languageId: Parameters<typeof setLanguage>[0] }) => {
    await Promise.all([
      storage.set(StorageKeys.USER_NAME, setup.name),
      storage.set(StorageKeys.COUNTRY, setup.country),
      setCurrency(setup.currencyId),
      setLanguage(setup.languageId),
      storage.set('DEV_SHOW_ONBOARDING_RELOAD', 'false'),
    ]);
    await storage.set(StorageKeys.ONBOARDING_COMPLETE, 'true');
    setPhase('loading');
    // Briefly show loading, then transition to app + show tutorial for new users
    setTimeout(() => {
      setOnboardingComplete(true);
      setShowTutorial(true);
      setPhase('app');
    }, 1800);
  };

  // Handle tutorial finish
  const handleTutorialFinish = useCallback(async () => {
    setShowTutorial(false);
    await storage.set(StorageKeys.TUTORIAL_COMPLETE, 'true');
  }, []);

  // RENDER by phase
  if (phase === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} duration={2200} />;
  }

  if (phase === 'loading') {
    return (
      <LoadingScreen
        message="Loading..."
        onLogoPress={handleLogoPress}
        showResetHint={__DEV__}
        resetLabelOpacity={resetLabelRef}
      />
    );
  }

  if (phase === 'onboarding') {
    return (
      <NotificationProvider>
        <Onboarding onDone={finishOnboarding} />
      </NotificationProvider>
    );
  }

  // phase === 'app'
  return (
    <NotificationProvider>
      <ToastProvider>
        <View style={{ flex: 1 }}>
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

          {/* First-time tutorial overlay — rendered on top of everything */}
          {showTutorial && (
            <TutorialOverlay onFinish={handleTutorialFinish} />
          )}
        </View>
      </ToastProvider>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({});

