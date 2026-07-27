import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface TutorialStep {
  id: number;
  spotlightTop: number;
  spotlightLeft: number;
  spotlightWidth: number;
  spotlightHeight: number;
  spotlightRadius: number;
  tooltipPosition: 'above' | 'below';
  tooltipAlign?: 'left' | 'center' | 'right';
  arrowAlign?: 'left' | 'center' | 'right';
  iconName: keyof typeof Ionicons.glyphMap;
  header: string;
  text: string;
  step: string;
}

interface TutorialOverlayProps {
  onFinish: () => void;
}

export default function TutorialOverlay({ onFinish }: TutorialOverlayProps) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;


  // Wait 1.4s after component mount to ensure skeleton loading on dashboard completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const TAB_BAR_H = 64 + insets.bottom;
  const FAB_BOTTOM = insets.bottom + 78;

  // Screen padding: top header (~50), Mascot (~92), Smart suggestion (~84), gap (~18)
  // Header top padding in index content is insets.top + 20
  const dashboardTopPadding = insets.top + 20;
  const budgetCardTop = dashboardTopPadding + 50 + 16 + 92 + 18 + 84 + 18;

  // Exact FAB position:
  // right: Math.max(16, insets.right), bottom: insets.bottom + 78
  // FAB dimensions: 62x62
  const fabRight = Math.max(16, insets.right);
  const fabBottom = insets.bottom + 78;
  const fabTop = SCREEN_H - fabBottom - 62;
  const fabLeft = SCREEN_W - fabRight - 62;

  // Exact List tab bar item position:
  // 4 tabs total across SCREEN_W. Index 2 is "List" (0: Dashboard, 1: Cart, 2: List, 3: History)
  const tabWidth = SCREEN_W / 4;
  const listTabLeft = tabWidth * 2 + (tabWidth - 44) / 2;
  const tabHeight = 64 + insets.bottom;
  const listTabTop = SCREEN_H - tabHeight + 4;

  const steps: TutorialStep[] = [
    {
      id: 1,
      spotlightTop: budgetCardTop,
      spotlightLeft: 16,
      spotlightWidth: SCREEN_W - 32,
      spotlightHeight: 245,
      spotlightRadius: 26,
      tooltipPosition: 'below',
      tooltipAlign: 'center',
      arrowAlign: 'center',
      iconName: 'disc-outline',
      header: 'Set Your Target Budget',
      text: 'Type your budget limit here before shopping. Cany will track your spending against this target in real-time.',
      step: '1 / 4',
    },
    {
      id: 2,
      spotlightTop: fabTop,
      spotlightLeft: fabLeft,
      spotlightWidth: 62,
      spotlightHeight: 62,
      spotlightRadius: 31,
      tooltipPosition: 'above',
      tooltipAlign: 'right',
      arrowAlign: 'right',
      iconName: 'camera-outline',
      header: 'Scan Price Tags on the Shelf',
      text: 'Tap this button anytime in the store to point your camera at a price tag and automatically add items to your cart.',
      step: '2 / 4',
    },
    {
      id: 3,
      spotlightTop: dashboardTopPadding + 50 + 16,
      spotlightLeft: 16,
      spotlightWidth: SCREEN_W - 32,
      spotlightHeight: 180,
      spotlightRadius: 24,
      tooltipPosition: 'below',
      tooltipAlign: 'center',
      arrowAlign: 'center',
      iconName: 'cart-outline',
      header: 'Keep Track of Your Total',
      text: 'Watch your running total update as you shop. You can also manually type items or add discounts here.',
      step: '3 / 4',
    },
    {
      id: 4,
      spotlightTop: listTabTop,
      spotlightLeft: listTabLeft,
      spotlightWidth: 44,
      spotlightHeight: 52,
      spotlightRadius: 14,
      tooltipPosition: 'above',
      tooltipAlign: 'center',
      arrowAlign: 'center',
      iconName: 'checkbox-outline',
      header: 'Plan Before You Go',
      text: 'Build your checklist before heading to the store. As you scan price tags, Cany automatically checks off items for you!',
      step: '4 / 4',
    },
  ];

  const step = steps[stepIndex];

  // Animate tooltip in on step change
  const animateIn = () => {
    slideAnim.setValue(16);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (ready) {
      animateIn();
    }
  }, [stepIndex, ready]);

  if (!ready) return null;

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        setStepIndex((i) => i + 1);
      });
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onFinish());
  };

  const isLast = stepIndex === steps.length - 1;

  const spotlightTop = step.spotlightTop;
  const spotlightLeft = step.spotlightLeft;
  const spotlightW = step.spotlightWidth;

  // Tooltip horizontal position
  const TOOLTIP_W = SCREEN_W - 48;
  let tooltipLeft = (SCREEN_W - TOOLTIP_W) / 2;
  if (step.tooltipAlign === 'right') {
    tooltipLeft = SCREEN_W - TOOLTIP_W - 16;
  } else if (step.tooltipAlign === 'left') {
    tooltipLeft = 16;
  }

  const TOOLTIP_APPROX_H = 170;
  const ARROW_H = 10;

  let tooltipTop: number;
  if (step.tooltipPosition === 'below') {
    tooltipTop = spotlightTop + step.spotlightHeight + ARROW_H + 6;
    // Boundary check so tooltip doesn't overflow screen bottom
    if (tooltipTop + TOOLTIP_APPROX_H > SCREEN_H - 20) {
      tooltipTop = SCREEN_H - TOOLTIP_APPROX_H - 20;
    }
  } else {
    tooltipTop = spotlightTop - TOOLTIP_APPROX_H - ARROW_H - 6;
    if (tooltipTop < insets.top + 10) {
      tooltipTop = insets.top + 10;
    }
  }

  // Arrow horizontal offset
  let arrowLeft: number | undefined;
  let arrowRight: number | undefined;
  if (step.arrowAlign === 'right') {
    const fabCenterX = spotlightLeft + spotlightW / 2;
    arrowRight = SCREEN_W - fabCenterX - 16 - 8;
  } else {
    arrowLeft = TOOLTIP_W / 2 - 10;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Tooltip */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.tooltip,
          {
            top: tooltipTop,
            left: tooltipLeft,
            width: TOOLTIP_W,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Arrow up (when tooltip is below the spotlight) */}
        {step.tooltipPosition === 'below' && (
          <View
            style={[
              styles.arrowUp,
              arrowLeft !== undefined ? { left: arrowLeft } : undefined,
              arrowRight !== undefined ? { right: arrowRight } : undefined,
            ]}
          />
        )}

        {/* Card content */}
        <View style={styles.tooltipCard}>
          {/* Header row */}
          <View style={styles.tooltipHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name={step.iconName} size={20} color="#080808" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepLabel}>{step.step}</Text>
              <Text style={styles.tooltipHeader}>{step.header}</Text>
            </View>
          </View>

          <Text style={styles.tooltipText}>{step.text}</Text>

          {/* Bottom Row: Progress dots + Navigation buttons */}
          <View style={styles.bottomRow}>
            <View style={styles.dotsRow}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === stepIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttonRow}>
              {!isLast && (
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Arrow down (when tooltip is above the spotlight) */}
        {step.tooltipPosition === 'above' && (
          <View
            style={[
              styles.arrowDown,
              arrowLeft !== undefined ? { left: arrowLeft } : undefined,
              arrowRight !== undefined ? { right: arrowRight } : undefined,
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const CARD_BG = '#111111';
const MASK_COLOR = 'rgba(0, 0, 0, 0.76)';

const styles = StyleSheet.create({
  maskRect: {
    position: 'absolute',
    backgroundColor: MASK_COLOR,
  },
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tooltip: {
    position: 'absolute',
  },
  arrowUp: {
    position: 'absolute',
    top: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: CARD_BG,
    zIndex: 2,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: CARD_BG,
    zIndex: 2,
  },
  tooltipCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tooltipHeader: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tooltipText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  nextBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  nextText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
