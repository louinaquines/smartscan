import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { getTheme } from '../lib/theme';

type SplashScreenProps = {
  onFinish?: () => void;
  duration?: number;
  darkMode?: boolean;
};

export default function SplashScreen({ onFinish, duration = 2200, darkMode = false }: SplashScreenProps) {
  const theme = getTheme(darkMode);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle shimmer on logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade out before calling onFinish
    const timeout = setTimeout(() => {
      Animated.timing(fadeOutAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }, duration - 350);

    return () => clearTimeout(timeout);
  }, [duration, onFinish]);

  const ringOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.2],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.bg, opacity: fadeOutAnim }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Outer glow ring */}
        <Animated.View style={[styles.logoRing, { borderColor: theme.text, opacity: ringOpacity }]} />
        <View style={[styles.logoContainer, { borderColor: theme.glassBorder }]}>
          <Image
            source={require('../assets/cany-logo2.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Cany</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Your fast offline shopping companion.</Text>
      </Animated.View>

      {/* Bottom branding */}
      <Animated.Text style={[styles.footer, { color: theme.soft, opacity: fadeAnim }]}>
        Made by Loui Naquines
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoRing: {
    position: 'absolute',
    top: -12,
    width: 164,
    height: 164,
    borderRadius: 44,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 36,
    overflow: 'hidden',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    fontWeight: '600',
  },
});
