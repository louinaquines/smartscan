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
import { parseReceiptItemsLenient, parseReceiptTotal, receiptItemToCartItem, ReceiptParsedItem, getRawOcrLines, getReceiptOcrSuggestions, OcrTextChoice } from '../lib/receiptParser';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';
import ReceiptReviewSheet from '../components/ReceiptReviewSheet';
import AppDialog from '../components/AppDialog';
import { colors } from '../lib/theme';

type ScanMode = 'priceTag' | 'receipt';

const dedupeReceiptItems = (items: ReceiptParsedItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}|${item.price.toFixed(2)}|${item.quantity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState(Platform.OS === 'ios');
  const [permissionChecked, setPermissionChecked] = useState(Platform.OS === 'ios');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('priceTag');
  const [scanStatus, setScanStatus] = useState('Tap Scan to capture');
  const [detected, setDetected] = useState<{ name: string; price: number } | null>(null);
  const [choices, setChoices] = useState<{ names: OcrChoice[]; prices: OcrPriceChoice[] }>({ names: [], prices: [] });
  const [receiptItems, setReceiptItems] = useState<ReceiptParsedItem[]>([]);
  const [accumulatedReceiptItems, setAccumulatedReceiptItems] = useState<ReceiptParsedItem[]>([]);
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null);
  const [receiptSheetOpen, setReceiptSheetOpen] = useState(false);
  const [receiptNameSuggestions, setReceiptNameSuggestions] = useState<OcrTextChoice[]>([]);
  const [receiptScanPass, setReceiptScanPass] = useState(0);
  const [receiptComplete, setReceiptComplete] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addedToCartDialogOpen, setAddedToCartDialogOpen] = useState(false);
  const [addedDialog, setAddedDialog] = useState<{ title: string; message: string }>({ title: 'Item added', message: 'Product added to cart.' });
  const cameraRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const foundRef = useRef(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const scanModeRef = useRef<ScanMode>('priceTag');
  const addItem = useCartStore((s) => s.addItem);
  const addItems = useCartStore((s) => s.addItems);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: isScanning ? 700 : 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: isScanning ? 700 : 1600,
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
    outputRange: [10, scanMode === 'receipt' ? 390 : 155],
  });

  useEffect(() => {
    scanModeRef.current = scanMode;
  }, [scanMode]);

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
    setScanStatus(scanModeRef.current === 'receipt' ? 'Reading receipt...' : 'Reading shelf tag...');

    try {
      const photo = await cameraRef.current.capture();
      if (!photo?.uri) throw new Error('No photo');

      const TextRecognition = NativeModules.TextRecognition;
      if (!TextRecognition?.recognize) {
        throw new Error('Text recognition native module is not available in this build.');
      }

      const result = await TextRecognition.recognize(photo.uri);
      if (scanModeRef.current === 'receipt') {
        const newItems = parseReceiptItemsLenient(result);
        const total = parseReceiptTotal(result);
        const rawLines = getRawOcrLines(result);
        const suggestions = getReceiptOcrSuggestions(result);
        const totalDetected = rawLines.some((line) => /^\s*total\b/i.test(line));

        setAccumulatedReceiptItems((prev) => dedupeReceiptItems([...prev, ...newItems]));
        setReceiptItems(newItems);
        setReceiptTotal(total);
        setReceiptNameSuggestions(suggestions.names);
        if (totalDetected) setReceiptComplete(true);
        setReceiptScanPass((prev) => prev + 1);

        foundRef.current = true;
        if (!mountedRef.current) return;
        setReceiptSheetOpen(true);
        setScanStatus(totalDetected ? 'Receipt complete — review items' : 'Review receipt items');
        return;
      }

      const parsed = parsePriceTag(result);
      const nextChoices = getOcrSelectionChoices(result);

      if (parsed) {
        foundRef.current = true;
        if (!mountedRef.current) return;
        setChoices(nextChoices);
        setDetected(parsed);
        setSheetOpen(true);
        setScanStatus('Item found');
      } else {
        setScanStatus('No item detected — try again');
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
        setScanStatus('Capture failed — try again');
      }
    } finally {
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
    }
  }, [cameraReady]);

  const resetDetection = useCallback((mode: ScanMode) => {
    scanModeRef.current = mode;
    foundRef.current = false;
    setIsScanning(false);
    setSheetOpen(false);
    setReceiptSheetOpen(false);
    setReceiptItems([]);
    setAccumulatedReceiptItems([]);
    setReceiptTotal(null);

    setReceiptNameSuggestions([]);

    setReceiptScanPass(0);
    setReceiptComplete(false);
    setDetected(null);
    setChoices({ names: [], prices: [] });
    setScanStatus('Tap Scan to capture');
  }, []);

  const handleModeChange = useCallback((mode: ScanMode) => {
    scanModeRef.current = mode;
    setScanMode(mode);
    resetDetection(mode);
  }, [resetDetection]);

  useEffect(() => {
    if (!hasPermission) return;

    setCameraReady(false);
    const readyTimer = setTimeout(() => {
      if (mountedRef.current && focusedRef.current) {
        setCameraReady(true);
        setScanStatus('Tap Scan to capture');
      }
    }, 1000);

    return () => clearTimeout(readyTimer);
  }, [hasPermission]);

  const handleConfirm = useCallback((name: string, price: number, quantity: number, category: BudgetCategoryId) => {
    addItem({
      name,
      price,
      quantity,
      isScanned: true,
      category,
    });
    setAddedDialog({ title: 'Item added', message: 'Product added to cart.' });
    setAddedToCartDialogOpen(true);
    setSheetOpen(false);
    setDetected(null);
    setChoices({ names: [], prices: [] });
    router.dismiss();
  }, [addItem, detected]);

  const handleCancelDetected = useCallback(() => {
    setSheetOpen(false);
    setDetected(null);
    setChoices({ names: [], prices: [] });
    foundRef.current = false;
    setScanStatus('Tap Scan to capture');
  }, []);

  const handleConfirmReceipt = useCallback((items: ReceiptParsedItem[]) => {
    addItems(items.map(receiptItemToCartItem));
    setReceiptSheetOpen(false);
    setReceiptItems([]);
    setAccumulatedReceiptItems([]);
    setReceiptTotal(null);

    setReceiptNameSuggestions([]);

    setReceiptScanPass(0);
    setReceiptComplete(false);
    setAddedDialog({
      title: 'Receipt imported',
      message: `${items.length} item${items.length === 1 ? '' : 's'} added to cart.`,
    });
    setAddedToCartDialogOpen(true);
    router.dismiss();
  }, [addItems]);

  const handleScanMoreReceipt = useCallback((currentDraft: ReceiptParsedItem[]) => {
    setAccumulatedReceiptItems(currentDraft);
    setReceiptSheetOpen(false);
    setReceiptItems([]);
    setReceiptTotal(null);

    setReceiptNameSuggestions([]);

    setReceiptComplete(false);
    foundRef.current = false;
    setScanStatus('Tap Scan to capture next part');
  }, [receiptScanPass]);

  const handleCancelReceipt = useCallback(() => {
    setReceiptSheetOpen(false);
    setReceiptItems([]);
    setAccumulatedReceiptItems([]);
    setReceiptTotal(null);

    setReceiptNameSuggestions([]);

    setReceiptScanPass(0);
    setReceiptComplete(false);
    foundRef.current = false;
    setScanStatus('Tap Scan to capture');
  }, []);

  if (!permissionChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.title}>Opening Camera</Text>
        <Text style={styles.text}>Cany is preparing the scanner.</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={56} color="rgba(0,0,0,0.34)" />
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.text}>Enable camera access in your phone settings to scan price tags.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.permBtnText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.dismiss()}>
          <Text style={styles.cancelText}>Go Back</Text>
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
          setScanStatus('Camera is not ready');
        }}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.dismiss()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.topMask}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'priceTag' && styles.modeButtonActive]}
              onPress={() => handleModeChange('priceTag')}
              activeOpacity={0.8}>
              <View style={[styles.modeIconWrap, scanMode === 'priceTag' && styles.modeIconWrapActive]}>
                <Ionicons name="pricetag-outline" size={16} color={scanMode === 'priceTag' ? '#FFF' : 'rgba(255,255,255,0.7)'} />
              </View>
              <Text style={[styles.modeText, scanMode === 'priceTag' && styles.modeTextActive]}>Price Tag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'receipt' && styles.modeButtonActive]}
              onPress={() => handleModeChange('receipt')}
              activeOpacity={0.8}>
              <View style={[styles.modeIconWrap, scanMode === 'receipt' && styles.modeIconWrapActive]}>
                <Ionicons name="receipt-outline" size={16} color={scanMode === 'receipt' ? '#FFF' : 'rgba(255,255,255,0.7)'} />
              </View>
              <Text style={[styles.modeText, scanMode === 'receipt' && styles.modeTextActive]}>Receipt</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topBadge}>
            <View style={styles.topBadgeIconWrap}>
              <Ionicons
                name={scanMode === 'receipt' ? 'receipt-outline' : 'pricetag-outline'}
                size={15}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.hint}>
              {scanMode === 'receipt'
                ? 'Align receipt top-to-bottom & tap Scan'
                : 'Position price tag inside frame & tap Scan'}
            </Text>
          </View>
        </View>

        <View style={styles.scanRow}>
          <View style={styles.sideMask} />
          <View
style={[
                styles.viewfinder,
                scanMode === 'receipt' && styles.receiptViewfinder,
              ]}>
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
          <View style={styles.sideMask} />
        </View>

        <View style={styles.bottomMask}>
          <View style={styles.statusPill}>
            {isScanning ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons
                name={scanMode === 'receipt' ? 'receipt-outline' : 'pricetag-outline'}
                size={17}
                color="#FFF"
              />
            )}
            <Text style={styles.statusText}>{scanStatus}</Text>
          </View>
          <TouchableOpacity
            style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
            disabled={isScanning || !cameraReady}
            onPress={handleCapture}
            activeOpacity={0.8}>
            <View style={styles.captureIconWrap}>
              <Ionicons
                name={scanMode === 'receipt' ? 'receipt-outline' : 'camera'}
                size={22}
                color="#FFF"
              />
            </View>
            <Text style={styles.captureText}>
              {isScanning ? 'Processing…' : scanMode === 'receipt' ? 'Scan Receipt' : 'Scan Price Tag'}
            </Text>
          </TouchableOpacity>
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
      <ReceiptReviewSheet
        open={receiptSheetOpen}
        items={accumulatedReceiptItems.length > 0 ? accumulatedReceiptItems : receiptItems}
        receiptTotal={receiptTotal}
        nameSuggestions={receiptNameSuggestions}
        scanPass={receiptScanPass}
        totalDetected={receiptComplete}
        onScanMore={receiptComplete ? undefined : handleScanMoreReceipt}
        onConfirm={handleConfirmReceipt}
        onCancel={handleCancelReceipt}
      />
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
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 16 },
  text: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  permBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: colors.soft, fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject },
  closeBtn: { position: 'absolute', top: 52, right: 20, zIndex: 3, backgroundColor: 'rgba(20,20,20,0.75)', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  topMask: { flex: 1, backgroundColor: 'rgba(10,12,16,0.78)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 22, paddingTop: 60 },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 20, 28, 0.95)',
    borderRadius: 24,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  modeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modeIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  modeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(18, 22, 32, 0.92)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  topBadgeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scanRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' },
  sideMask: { flex: 1, backgroundColor: 'rgba(10,12,16,0.78)' },
  viewfinder: { width: 320, height: 180, position: 'relative', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 16, backgroundColor: 'transparent' },
  receiptViewfinder: { width: 260, height: 420, borderRadius: 20 },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: colors.primary, borderWidth: 3 },
  topLeft: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 14 },
  topRight: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 14 },
  bottomLeft: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 14 },
  bottomRight: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 14 },
  scanLine: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  scanLineActive: {
    height: 4,
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 10,
  },
  scanLineGlow: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    height: 32,
    backgroundColor: colors.primary,
    opacity: 0.18,
    borderRadius: 16,
  },
  bottomMask: { flex: 1, backgroundColor: 'rgba(10,12,16,0.78)', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 26, paddingBottom: 48, paddingHorizontal: 22, gap: 18 },
  statusPill: { minHeight: 46, maxWidth: '90%', borderRadius: 20, backgroundColor: 'rgba(20,24,33,0.92)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statusText: { color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  captureButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 60, backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 32, minWidth: 260, shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  captureButtonDisabled: { opacity: 0.6 },
  captureIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  captureText: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
});
