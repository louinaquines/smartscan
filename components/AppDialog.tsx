import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme, shadow } from '../lib/theme';
import { useCartStore } from '../store/useCartStore';

export type AppDialogAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'danger';
};

export type AppDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'success' | 'danger' | 'warning';
  actions: AppDialogAction[];
  onDismiss?: () => void;
};

export default function AppDialog({
  visible,
  title,
  message,
  icon = 'alert-circle-outline',
  variant,
  actions,
  onDismiss,
}: AppDialogProps) {
  const { themeMode } = useCartStore();
  const darkMode = themeMode === 'dark';
  const t = getTheme(darkMode);

  const entrance = useRef(new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      entrance.current.setValue(0);
      return;
    }

    Animated.spring(entrance.current, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [entrance, visible]);

  const iconName = String(icon);
  const isSuccess = variant === 'success' || iconName.includes('checkmark') || iconName.includes('done');
  const isDanger = variant === 'danger' || iconName.includes('trash') || iconName.includes('alert') || iconName.includes('close');
  const isWarning = variant === 'warning' || iconName.includes('wallet') || iconName.includes('cash') || iconName.includes('cart') || iconName.includes('create');

  const cardStyle = {
    opacity: entrance.current,
    transform: [
      {
        scale: entrance.current.interpolate({
          inputRange: [0, 1],
          outputRange: [0.90, 1],
        }),
      },
      {
        translateY: entrance.current.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  const backdropStyle = {
    opacity: entrance.current,
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        </Animated.View>
        
        <Animated.View style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorder, borderWidth: 1 }, cardStyle]}>
          <View style={[
            styles.iconWrap,
            { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F0EEEA' },
            isSuccess && { backgroundColor: darkMode ? 'rgba(122,158,126,0.2)' : '#EFF3EF' },
            isDanger && { backgroundColor: darkMode ? 'rgba(255,107,107,0.2)' : '#F5EBE8' },
            isWarning && { backgroundColor: darkMode ? 'rgba(255,180,100,0.2)' : '#F5EDE6' },
          ]}>
            <Ionicons
              name={icon}
              size={28}
              color={isSuccess ? (darkMode ? '#A3C1A5' : '#7A9E7E') : t.text}
            />
          </View>

          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <Text style={[styles.message, { color: t.muted }]}>{message}</Text>

          <View style={styles.actions}>
            {actions.map((action, idx) => {
              const isPrimary = action.variant !== 'soft';
              const isDestructive = action.variant === 'danger' || (isDanger && idx === actions.length - 1 && actions.length > 1);

              return (
                <TouchableOpacity
                  key={action.label}
                  activeOpacity={0.8}
                  style={[
                    styles.button,
                    { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder, borderWidth: 1 },
                    isPrimary && { backgroundColor: t.primary, borderColor: t.primary },
                    isDestructive && { backgroundColor: t.dangerSoft, borderColor: t.danger },
                  ]}
                  onPress={action.onPress}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: t.text },
                      isPrimary && { color: darkMode ? '#111' : '#FFF' },
                      isDestructive && { color: t.danger },
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    ...shadow,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    width: '100%',
  },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
