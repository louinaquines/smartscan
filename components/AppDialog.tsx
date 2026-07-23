import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../lib/theme';

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
        
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={[
            styles.iconWrap,
            isSuccess && styles.iconWrapSuccess,
            isDanger && styles.iconWrapDanger,
            isWarning && styles.iconWrapWarning,
          ]}>
            <Ionicons
              name={icon}
              size={28}
              color={isSuccess ? '#7A9E7E' : colors.text}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

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
                    isPrimary && styles.primaryButton,
                    isDestructive && styles.dangerButton,
                  ]}
                  onPress={action.onPress}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isPrimary && styles.primaryText,
                      isDestructive && styles.dangerText,
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
    backgroundColor: colors.card,
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
    backgroundColor: '#F0EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconWrapSuccess: {
    backgroundColor: '#EFF3EF',
  },
  iconWrapDanger: {
    backgroundColor: '#F5EBE8',
  },
  iconWrapWarning: {
    backgroundColor: '#F5EDE6',
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    color: colors.muted,
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
    backgroundColor: '#F0EEEA',
    borderWidth: 1,
    borderColor: '#E8E4E0',
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  dangerButton: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },
});
