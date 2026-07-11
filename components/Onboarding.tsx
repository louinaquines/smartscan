import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../lib/theme';

type OnboardingProps = {
  onDone: () => void;
};

// ─── Slide content ────────────────────────────────────────────────────────────
const TOTAL = 3;

// ─── Per-slide animated entrance hook ────────────────────────────────────────
function useSlideEntrance(active: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (active) {
      opacity.setValue(0);
      translateY.setValue(36);
      scale.setValue(0.92);

      Animated.stagger(60, [
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [active]);

  return { opacity, translateY, scale };
}

// ─── Scan-line animation ──────────────────────────────────────────────────────
function ScanLine() {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });

  return (
    <Animated.View
      style={[
        styles.scanLine,
        { transform: [{ translateY }] },
      ]}
    />
  );
}

// ─── Budget bar animation ─────────────────────────────────────────────────────
function BudgetBar({ active }: { active: boolean }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      width.setValue(0);
      Animated.timing(width, { toValue: 70, duration: 1100, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  }, [active]);

  const widthInterp = width.interpolate({ inputRange: [0, 70], outputRange: ['0%', '70%'] });

  return (
    <View style={styles.mockTrack}>
      <Animated.View style={[styles.mockFill, { width: widthInterp }]} />
    </View>
  );
}

// ─── Pulsing Get Started button ───────────────────────────────────────────────
function PulseButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.035, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], width: '100%', maxWidth: 350, marginTop: 26 }}>
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.82 }]}
        onPress={onPress}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Dot indicator ────────────────────────────────────────────────────────────
function Dot({ active }: { active: boolean }) {
  const width = useRef(new Animated.Value(active ? 24 : 8)).current;
  const opacity = useRef(new Animated.Value(active ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(width, { toValue: active ? 24 : 8, friction: 6, tension: 60, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: active ? 1 : 0.35, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [active]);

  return (
    <Animated.View style={[styles.dot, { width, opacity, backgroundColor: colors.primary }]} />
  );
}

// ─── Slide 0 — Illustration ───────────────────────────────────────────────────
function Slide0({ active }: { active: boolean }) {
  const { opacity, translateY, scale } = useSlideEntrance(active);
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [active]);

  return (
    <Animated.View style={[styles.illustrationWrap, { opacity, transform: [{ translateY }, { scale }] }]}>
      <Animated.View style={[styles.logoHalo, { transform: [{ scale: logoScale }] }]}>
        <Image source={require('../assets/cany-logo.jpg')} style={styles.logo} />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Slide 1 — Scanner mockup ─────────────────────────────────────────────────
function Slide1({ active }: { active: boolean }) {
  const { opacity, translateY, scale } = useSlideEntrance(active);

  return (
    <Animated.View style={[styles.illustrationWrap, { opacity, transform: [{ translateY }, { scale }] }]}>
      <View style={styles.scannerMockup}>
        <View style={styles.mockMaskTop} />
        <View style={styles.mockScanRow}>
          <View style={styles.mockSideMask} />
          <View style={styles.mockFrame}>
            {active && <ScanLine />}
            <View style={styles.priceTag}>
              <Text style={styles.tagName}>JIN RAMEN BOWL</Text>
              <Text style={styles.tagSub}>Spicy noodle soup 110g</Text>
              <View style={styles.tagPriceRow}>
                <Text style={styles.tagPrice}>56</Text>
                <Text style={styles.tagCents}>00</Text>
              </View>
              <View style={styles.barcode} />
            </View>
          </View>
          <View style={styles.mockSideMask} />
        </View>
        <View style={styles.mockMaskBottom} />
        {/* Corner brackets */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>
    </Animated.View>
  );
}

// ─── Slide 2 — Budget mockup ──────────────────────────────────────────────────
function Slide2({ active }: { active: boolean }) {
  const { opacity, translateY, scale } = useSlideEntrance(active);

  return (
    <Animated.View style={[styles.illustrationWrap, { opacity, transform: [{ translateY }, { scale }] }]}>
      <View style={styles.budgetMockup}>
        <View>
          <Text style={styles.mockLabel}>Total spent</Text>
          <Text style={styles.mockAmount}>PHP 348.50</Text>
          <Text style={styles.mockLeft}>PHP 151.50 left</Text>
        </View>
        <BudgetBar active={active} />
      </View>
    </Animated.View>
  );
}

// ─── Slide text block w/ stagger ──────────────────────────────────────────────
function SlideText({ active, headline, copy }: { active: boolean; headline: string; copy: string }) {
  const headlineAnim = useRef({ opacity: new Animated.Value(0), y: new Animated.Value(22) }).current;
  const copyAnim = useRef({ opacity: new Animated.Value(0), y: new Animated.Value(22) }).current;

  useEffect(() => {
    if (active) {
      headlineAnim.opacity.setValue(0);
      headlineAnim.y.setValue(22);
      copyAnim.opacity.setValue(0);
      copyAnim.y.setValue(22);

      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(headlineAnim.opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.spring(headlineAnim.y, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(copyAnim.opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(copyAnim.y, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [active]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.Text style={[styles.headline, { opacity: headlineAnim.opacity, transform: [{ translateY: headlineAnim.y }] }]}>
        {headline}
      </Animated.Text>
      <Animated.Text style={[styles.copy, { opacity: copyAnim.opacity, transform: [{ translateY: copyAnim.y }] }]}>
        {copy}
      </Animated.Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Onboarding({ onDone }: OnboardingProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  const skipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(skipOpacity, { toValue: 1, duration: 500, delay: 600, useNativeDriver: true }).start();
  }, []);

  const goNext = () => {
    if (page < TOTAL - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
      setPage(page + 1);
    }
  };

  const requestCamera = async () => {
    if (Platform.OS !== 'android') {
      setCameraStatus('granted');
      return;
    }
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera Access',
      message: 'Cany uses your camera to scan grocery price tags.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    setCameraStatus(result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied');
  };

  return (
    <View style={styles.root}>
      {/* Skip button */}
      {page < TOTAL - 1 && (
        <Animated.View style={[styles.skipWrap, { opacity: skipOpacity }]}>
          <Pressable onPress={onDone} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Slides */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Slide 0 */}
        <View style={[styles.screen, { width }]}>
          <Slide0 active={page === 0} />
          <SlideText
            active={page === 0}
            headline="Meet Cany"
            copy="Your ultimate smart grocery companion. No accounts, no sign-ups, no passwords. Just open and start shopping."
          />
        </View>

        {/* Slide 1 */}
        <View style={[styles.screen, { width }]}>
          <Slide1 active={page === 1} />
          <SlideText
            active={page === 1}
            headline="Point & Scan"
            copy="Stop guessing totals. Our smart camera parser extracts product names and prices from shelf labels instantly."
          />
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.78 }]}
            onPress={requestCamera}
          >
            <Ionicons
              name={cameraStatus === 'granted' ? 'checkmark-circle' : 'camera-outline'}
              size={20}
              color={colors.text}
            />
            <Text style={styles.secondaryButtonText}>
              {cameraStatus === 'granted' ? 'Camera Access Enabled' : 'Enable Camera Access'}
            </Text>
          </Pressable>
          {cameraStatus === 'denied' && (
            <Text style={styles.permissionHint}>You can enable camera access later in settings.</Text>
          )}
        </View>

        {/* Slide 2 */}
        <View style={[styles.screen, { width }]}>
          <Slide2 active={page === 2} />
          <SlideText
            active={page === 2}
            headline="Never Overspend"
            copy="Set your budget before you grab a cart. Cany calculates your exact remaining balance in real time with every scan."
          />
          <PulseButton onPress={onDone} />
        </View>
      </Animated.ScrollView>

      {/* Bottom bar: dots + Next */}
      <View style={styles.bottomBar}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => <Dot key={i} active={i === page} />)}
        </View>
        {page < TOTAL - 1 && (
          <Pressable
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.78 }]}
            onPress={goNext}
          >
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  screen: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 100,
    paddingBottom: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },

  illustrationWrap: { marginBottom: 32, alignItems: 'center' },

  // ── Slide 0 ──
  logoHalo: {
    width: 192,
    height: 192,
    borderRadius: 48,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 10,
  },
  logo: { width: 192, height: 192, borderRadius: 48 },

  // ── Slide 1 — scanner ──
  scannerMockup: {
    width: 340,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...shadow,
  },
  mockMaskTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  mockScanRow: { height: 106, flexDirection: 'row' },
  mockSideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  mockFrame: {
    width: 232,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mockMaskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },

  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(100, 220, 120, 0.85)',
    shadowColor: '#64DC78',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  priceTag: {
    width: 186,
    height: 80,
    backgroundColor: '#F5C83A',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagName: { color: '#111', fontSize: 13, fontWeight: '900' },
  tagSub: { color: '#333', fontSize: 9, fontWeight: '700', marginTop: 1 },
  tagPriceRow: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'flex-end', marginTop: -2 },
  tagPrice: { color: '#111', fontSize: 40, fontWeight: '900', lineHeight: 41 },
  tagCents: { color: '#111', fontSize: 17, fontWeight: '900', marginTop: 5 },
  barcode: { height: 7, width: 88, backgroundColor: '#111', opacity: 0.22, marginTop: 1 },

  // corner brackets
  corner: { position: 'absolute', width: 18, height: 18, borderColor: '#00FF88', borderWidth: 3 },
  cornerTL: { top: 6, left: 6, borderRightWidth: 0, borderBottomWidth: 0, borderRadius: 3 },
  cornerTR: { top: 6, right: 6, borderLeftWidth: 0, borderBottomWidth: 0, borderRadius: 3 },
  cornerBL: { bottom: 6, left: 6, borderRightWidth: 0, borderTopWidth: 0, borderRadius: 3 },
  cornerBR: { bottom: 6, right: 6, borderLeftWidth: 0, borderTopWidth: 0, borderRadius: 3 },

  // ── Slide 2 — budget ──
  budgetMockup: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow,
  },
  mockLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  mockAmount: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 6 },
  mockLeft: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 6, opacity: 0.7 },

  mockTrack: { height: 10, borderRadius: 99, backgroundColor: colors.surfaceMuted, marginTop: 28, overflow: 'hidden' },
  mockFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 99 },

  // ── Typography ──
  headline: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  copy: {
    color: colors.muted,
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },

  // ── Buttons ──
  secondaryButton: {
    marginTop: 22,
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadow,
  },
  secondaryButtonText: { color: colors.text, fontSize: 14.5, fontWeight: '900' },
  permissionHint: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 10 },

  primaryButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: '900' },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  dots: { flexDirection: 'row', gap: 7, flex: 1, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },

  nextBtn: {
    position: 'absolute',
    right: 28,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },

  // ── Skip ──
  skipWrap: { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surfaceMuted },
  skipText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
});
