import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getTheme } from '../lib/theme';

type LoadingScreenProps = {
  message?: string;
  onLogoPress?: () => void;
  showResetHint?: boolean;
  resetLabelOpacity?: Animated.Value;
  darkMode?: boolean;
};

function BouncingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    animateDot(dot1, 0).start();
    animateDot(dot2, 150).start();
    animateDot(dot3, 300).start();
  }, [dot1, dot2, dot3]);

  return (
    <View style={dotStyles.container}>
      <Animated.View style={[dotStyles.dot, { backgroundColor: color, transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: color, transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: color, transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    height: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default function LoadingScreen({
  message,
  onLogoPress,
  showResetHint,
  resetLabelOpacity,
  darkMode = false,
}: LoadingScreenProps) {
  const theme = getTheme(darkMode);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Breathing pulse on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeInAnim, pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Animated.View style={[styles.content, { opacity: fadeInAnim }]}>
        <Pressable onPress={onLogoPress}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.logoShadow, { shadowColor: theme.text }]}>
              <Image
                source={require('../assets/loading2.jpg')}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </Pressable>

        <Text style={[styles.text, { color: theme.muted }]}>{message || 'Loading...'}</Text>

        <BouncingDots color={theme.text} />

        {showResetHint && resetLabelOpacity && (
          <Animated.Text style={[styles.devHint, { color: theme.soft, opacity: resetLabelOpacity }]}>
            Triple-tap to reset
          </Animated.Text>
        )}
      </Animated.View>
    </View>
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
  logoShadow: {
    borderRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 28,
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
    letterSpacing: 0.3,
  },
  devHint: {
    position: 'absolute',
    bottom: -80,
    fontSize: 12,
    fontWeight: '700',
  },
});
