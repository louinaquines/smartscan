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

  let bubbleColor = colors.surfaceBlue;
  let borderColor = colors.primaryDeep;
  
  if (type === 'alert') {
    bubbleColor = colors.surfacePink;
    borderColor = colors.accentDeep;
  } else if (type === 'happy') {
    bubbleColor = 'rgba(16, 185, 129, 0.1)';
    borderColor = colors.success;
  }

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={require('../assets/cow.png')} 
        style={[styles.mascot, { transform: [{ translateY: bounceAnim }] }]} 
        resizeMode="contain"
      />
      <View style={[styles.bubble, { backgroundColor: bubbleColor, borderColor }]}>
        <View style={[styles.tail, { borderTopColor: borderColor }]} />
        <View style={[styles.tailInner, { borderTopColor: bubbleColor }]} />
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
    borderWidth: 1,
    position: 'relative',
    ...shadow,
  },
  tail: {
    position: 'absolute',
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderTopColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderBottomWidth: 10,
    borderBottomColor: 'transparent',
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    transform: [{ rotate: '90deg' }],
  },
  tailInner: {
    position: 'absolute',
    left: -8,
    top: 21,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderTopColor: 'transparent',
    borderRightWidth: 9,
    borderRightColor: 'transparent',
    borderBottomWidth: 9,
    borderBottomColor: 'transparent',
    borderLeftWidth: 9,
    borderLeftColor: 'transparent',
    transform: [{ rotate: '90deg' }],
  },
  message: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
