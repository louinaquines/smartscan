import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { colors } from '../../lib/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.wrap}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.soft,
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
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <Ionicons name="grid-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            tabBarIcon: ({ color }) => <Ionicons name="cart-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <Ionicons name="time-outline" color={color} size={22} />,
          }}
        />
      </Tabs>

      <View style={[styles.scanContainer, { right: Math.max(16, insets.right), bottom: insets.bottom + 78 }]}>
        <View style={styles.fabPulseContainer}>
          <Animated.View style={[styles.scanFabGlow, { transform: [{ scale: pulseAnim }] }]} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Scan price tag"
            style={styles.scanFab}
            onPress={() => router.push('/scan')}>
            <Ionicons name="scan" size={27} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabBarGlass: {
    backgroundColor: 'rgba(7,11,20,0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
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
    backgroundColor: colors.accent,
    opacity: 0.4,
  },
  scanFab: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.3)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
  },
});
