import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../lib/theme';

interface MascotProps {
  message: string;
  type?: 'neutral' | 'happy' | 'alert';
}

export default function Mascot({ message, type = 'neutral' }: MascotProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={require('../assets/cow.png')} 
        style={[styles.mascot, { transform: [{ translateY: bounceAnim }] }]} 
        resizeMode="contain"
      />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        <View style={styles.tailInner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 16,
  },
  mascot: {
    width: 68,
    height: 68,
  },
  bubble: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    ...shadow,
  },
  tail: {
    position: 'absolute',
    left: -14,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderTopColor: 'transparent',
    borderRightWidth: 14,
    borderRightColor: colors.primary,
    borderBottomWidth: 11,
    borderBottomColor: 'transparent',
  },
  tailInner: {
    position: 'absolute',
    left: -10,
    top: 14,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderTopColor: 'transparent',
    borderRightWidth: 11,
    borderRightColor: '#FFFFFF',
    borderBottomWidth: 9,
    borderBottomColor: 'transparent',
  },
  message: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
