import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../lib/theme';

interface ToastProps {
  visible: boolean;
  message: string;
  price?: string;
  onComplete: () => void;
}

export default function Toast({ visible, message, price, onComplete }: ToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const priceOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset all animations
    translateY.setValue(80);
    opacity.setValue(0);
    scale.setValue(0.8);
    checkScale.setValue(0);
    priceOpacity.setValue(0);

    // Entrance animation sequence
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Check mark animation
      Animated.timing(checkScale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }).start();

      // Price fade in
      if (price) {
        Animated.timing(priceOpacity, {
          toValue: 1,
          duration: 200,
          delay: 200,
          useNativeDriver: true,
        }).start();
      }

      // Auto dismiss after 1.5 seconds
      setTimeout(() => {
        // Exit animation
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
        });
      }, 1500);
    });
  }, [visible, translateY, opacity, scale, checkScale, priceOpacity, price, onComplete]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.checkContainer,
          { transform: [{ scale: checkScale }] },
        ]}
      >
        <Ionicons name="checkmark" size={28} color="#FFF" />
      </Animated.View>
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.message, { opacity }]}>{message}</Animated.Text>
        {price && (
          <Animated.Text
            style={[
              styles.price,
              { opacity: priceOpacity },
            ]}
          >
            {price}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.text,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...shadow,
    zIndex: 1000,
  },
  checkContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  price: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});