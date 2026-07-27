import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../lib/theme';

interface NotificationToastProps {
  visible: boolean;
  title: string;
  body: string;
  icon?: string;
  onDismiss: () => void;
}

export default function NotificationToast({ visible, title, body, icon, onDismiss }: NotificationToastProps) {
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animating = useRef(false);

  useEffect(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    if (!visible) {
      translateY.setValue(-140);
      opacity.setValue(0);
      animating.current = false;
      return;
    }
    if (animating.current) return;
    animating.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -140,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          animating.current = false;
          onDismiss();
        });
      }, 5000);
    });

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible, title, body, onDismiss, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={onDismiss} activeOpacity={0.85}>
        <View style={styles.iconWrap}>
          <Image source={require('../assets/cany-logo2.png')} style={{ width: 44, height: 44, borderRadius: 14 }} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.body} numberOfLines={2}>{body}</Text>
        </View>
        <Ionicons name="close" size={16} color={colors.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 54,
    left: 12,
    right: 12,
    zIndex: 9999,
    ...shadow,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
