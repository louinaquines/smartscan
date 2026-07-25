import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useMemo } from 'react';
import { getTheme } from '../../lib/theme';
import { useCartStore } from '../../store/useCartStore';
import { useTranslation } from '../../lib/i18n';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1));
  const { themeMode } = useCartStore();
  const darkMode = themeMode === 'dark';
  const { t } = useTranslation();
  const theme = useMemo(() => getTheme(darkMode), [darkMode]);
  const styles = useMemo(() => getStyles(theme, darkMode), [theme, darkMode]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim.current, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim.current, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.wrap}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.text,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0,
            backgroundColor: 'transparent',
            height: 64 + insets.bottom,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, styles.tabBarGlass]} />
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard'),
            tabBarIcon: ({ color }) => <Ionicons name="grid-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: t('cart'),
            tabBarIcon: ({ color }) => <Ionicons name="cart-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="list"
          options={{
            title: t('list'),
            tabBarIcon: ({ color }) => <Ionicons name="checkbox-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('history'),
            tabBarIcon: ({ color }) => <Ionicons name="time-outline" color={color} size={22} />,
          }}
        />
      </Tabs>

      <View style={[styles.scanContainer, { right: Math.max(16, insets.right), bottom: insets.bottom + 78 }]}>
        <View style={styles.fabPulseContainer}>
          <Animated.View style={[styles.scanFabGlow, { transform: [{ scale: pulseAnim.current }] }]} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Scan price tag"
            style={styles.scanFab}
            onPress={() => router.push('/scan')}>
            <Ionicons name="scan" size={27} color={darkMode ? '#111' : '#FFF'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme: ReturnType<typeof getTheme>, darkMode: boolean) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  tabBarGlass: {
    backgroundColor: darkMode ? 'rgba(17,17,17,0.92)' : 'rgba(255,255,255,0.88)',
    borderTopWidth: 1,
    borderTopColor: theme.glassBorder,
  },
  scanContainer: {
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPulseContainer: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFabGlow: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.text,
    opacity: 0.18,
  },
  scanFab: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.text,
    borderWidth: 3,
    borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)',
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
});
