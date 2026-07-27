import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator,
  PermissionsAndroid, Platform, Linking, NativeModules,
  Animated, Easing,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOcrSelectionChoices, OcrChoice, OcrPriceChoice, parsePriceTag } from '../lib/ocrParser';
import { BudgetCategoryId, DEFAULT_CATEGORY } from '../lib/budgetCategories';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';
import AppDialog from '../components/AppDialog';
import { colors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export default function ScanScreen() {
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState(Platform.OS === 'ios');
  const [permissionChecked, setPermissionChecked] = useState(Platform.OS === 'ios');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanStatus, setScanStatus] = useState(t('tapScan'));
  const [detected, setDetected] = useState<{ name: string; price: number } | null>(null);
  const [choices, setChoices] = useState<{ names: OcrChoice[]; prices: OcrPriceChoice[] }>({ names: [], prices: [] });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addedToCartDialogOpen, setAddedToCartDialogOpen] = useState(false);
  const [addedDialog, setAddedDialog] = useState<{ title: string; message: string }>({ title: t('itemAdded'), message: t('productAdded') });
  
  const cameraRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const foundRef = useRef(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const addItem = useCartStore((s) => s.addItem);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: isScanning ? 600 : 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: isScanning ? 600 : 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanAnim, isScanning]);

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 168],
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      foundRef.current = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      foundRef.current = false;

      return () => {
        focusedRef.current = false;
        foundRef.current = true;
        isScanningRef.current = false;
        setCameraReady(false);
      };
    }, [])
  );

  useEffect(() => {
    let cancelled = false;

    const requestPermission = async () => {
      if (Platform.OS !== 'android') {
        setHasPermission(true);
        setPermissionChecked(true);
        return;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Cany needs camera access to scan price tags.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (!cancelled) {
        setHasPermission(result === PermissionsAndroid.RESULTS.GRANTED);
        setPermissionChecked(true);
      }
    };

    requestPermission();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (isScanningRef.current || !cameraReady || !cameraRef.current || !mountedRef.current) return;

    isScanningRef.current = true;
    setIsScanning(true);
    setScanStatus(t('readingTag'));

    try {
      const photo = await cameraRef.current.capture();
      if (!photo?.uri) throw new Error('No photo');

      const TextRecognition = NativeModules.TextRecognition;
      if (!TextRecognition?.recognize) {
        throw new Error('Text recognition native module is not available in this build.');
      }

      const result = await TextRecognition.recognize(photo.uri);
      const parsed = parsePriceTag(result);
      const nextChoices = getOcrSelectionChoices(result);

      if (parsed) {
        foundRef.current = true;
        if (!mountedRef.current) return;
        setChoices(nextChoices);
        setDetected(parsed);
        setSheetOpen(true);
        setScanStatus(t('itemFound'));
      } else {
        setScanStatus(t('noItemDetected'));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes('camera is closed')) {
        if (mountedRef.current) {
          setCameraReady(false);
          setTimeout(() => {
            if (mountedRef.current && focusedRef.current) {
              setCameraReady(true);
            }
          }, 1500);
        }
      } else if (mountedRef.current) {
        console.error(e);
        setScanStatus(t('captureFailed'));
      }
    } finally {
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
    }
  }, [cameraReady, t]);

  useEffect(() => {
    if (!hasPermission) return;

    setCameraReady(false);
    const readyTimer = setTimeout(() => {
      if (mountedRef.current && focusedRef.current) {
        setCameraReady(true);
        setScanStatus(t('tapScan'));
      }
    }, 1000);

    return () => clearTimeout(readyTimer);
  }, [hasPermission, t]);

  const handleConfirm = useCallback((name: string, price: number, quantity: number, category: BudgetCategoryId, weight?: number, unit?: any, pricePerKg?: number) => {
    addItem({
      name,
      price,
      quantity,
      isScanned: true,
      category,
      weight,
      unit,
      pricePerKg,
    });
    setAddedDialog({ title: t('itemAdded'), message: t('productAdded') });
    setAddedToCartDialogOpen(true);
    setSheetOpen(false);
    setDetected(null);
    setChoices({ names: [], prices: [] });
    router.dismiss();
  }, [addItem, t]);

  const handleCancelDetected = useCallback(() => {
    setSheetOpen(false);
    setDetected(null);
    setChoices({ names: [], prices: [] });
    foundRef.current = false;
    setScanStatus(t('tapScan'));
  }, [t]);

  if (!permissionChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.title}>{t('openingCamera')}</Text>
        <Text style={styles.text}>{t('cameraPreparing')}</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permIconCircle}>
          <Ionicons name="camera-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('cameraAccessNeeded')}</Text>
        <Text style={styles.text}>{t('enableCamera')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
          <Text style={styles.permBtnText}>{t('openSettings')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.dismiss()} activeOpacity={0.7}>
          <Text style={styles.cancelText}>{t('goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { Camera, CameraType } = require('react-native-camera-kit');

  return (
    <View style={styles.cameraRoot}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        cameraType={CameraType.Back}
        flashMode="auto"
        onError={(e: any) => {
          console.error('Camera error:', e);
          setCameraReady(false);
          setScanStatus(t('cameraNotReady'));
        }}
      />

      <View style={styles.overlay}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.glassCloseBtn} onPress={() => router.dismiss()} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerBadge}>
            <Ionicons name="pricetag" size={14} color="#FFFFFF" />
            <Text style={styles.headerTitle}>{t('priceTag')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Viewfinder Section */}
        <View style={styles.middleContainer}>
          <View style={styles.topBadge}>
            <Ionicons name="scan-outline" size={15} color="#FFFFFF" />
            <Text style={styles.hint}>{t('alignTag')}</Text>
          </View>

          <View style={styles.viewfinderFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            <Animated.View
              style={[
                styles.scanLineGlow,
                { transform: [{ translateY: scanTranslateY }] },
              ]}
            />
            <Animated.View
              style={[
                styles.scanLine,
                isScanning && styles.scanLineActive,
                { transform: [{ translateY: scanTranslateY }] },
              ]}
            />
          </View>
        </View>

        {/* Bottom Control Bar */}
        <View style={styles.bottomControlBar}>
          <View style={styles.statusPill}>
            {isScanning && (
              <ActivityIndicator color={colors.primary} size="small" />
            )}
            <Text style={styles.statusText}>{scanStatus}</Text>
          </View>

          <TouchableOpacity
            style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
            disabled={isScanning || !cameraReady}
            onPress={handleCapture}
            activeOpacity={0.88}
          >
            <View style={styles.captureRing}>
              <View style={styles.captureInnerCircle}>
                <Ionicons
                  name={isScanning ? "sync" : "camera"}
                  size={26}
                  color={colors.primary}
                />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.captureHint}>{isScanning ? t('processing') : t('scanPriceTag')}</Text>
        </View>
      </View>

      {detected && (
        <VerifySheet
          open={sheetOpen}
          name={detected.name}
          price={detected.price}
          initialCategory={DEFAULT_CATEGORY}
          nameChoices={choices.names}
          priceChoices={choices.prices}
          onConfirm={handleConfirm}
          onCancel={handleCancelDetected}
        />
      )}

      <AppDialog
        visible={addedToCartDialogOpen}
        title={addedDialog.title}
        message={addedDialog.message}
        icon="checkmark-done-outline"
        onDismiss={() => setAddedToCartDialogOpen(false)}
        actions={[{ label: 'OK', onPress: () => setAddedToCartDialogOpen(false) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  permIconCircle: { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  text: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  permBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 32, paddingVertical: 15, marginTop: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  permBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: colors.soft, fontSize: 14, fontWeight: '600' },
  
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingVertical: 48, paddingHorizontal: 20 },
  
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  glassCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  middleContainer: { alignItems: 'center', justifyContent: 'center', gap: 20 },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(15, 20, 28, 0.82)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  hint: { color: '#FFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  viewfinderFrame: { width: 320, height: 190, position: 'relative', borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: colors.primary, borderWidth: 3.5 },
  topLeft: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 18 },
  topRight: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 18 },
  bottomLeft: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 18 },
  bottomRight: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 18 },
  
  scanLine: { position: 'absolute', left: '6%', right: '6%', height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  scanLineActive: { height: 4, backgroundColor: '#34C759', shadowColor: '#34C759', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12, elevation: 8 },
  scanLineGlow: { position: 'absolute', left: '6%', right: '6%', height: 28, backgroundColor: colors.primary, opacity: 0.2, borderRadius: 14 },

  bottomControlBar: { alignItems: 'center', gap: 14 },
  statusPill: { height: 40, borderRadius: 20, backgroundColor: 'rgba(15,20,28,0.85)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  statusText: { color: '#FFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  
  captureButton: { alignItems: 'center', justifyContent: 'center' },
  captureButtonDisabled: { opacity: 0.6 },
  captureRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  captureInnerCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  captureHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
});
