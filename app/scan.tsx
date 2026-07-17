import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator,
  PermissionsAndroid, Platform, Linking, NativeModules,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOcrSelectionChoices, OcrChoice, OcrPriceChoice, parsePriceTag } from '../lib/ocrParser';
import { lookupProductByBarcode, ProductLookupResult } from '../lib/productLookup';
import { BudgetCategoryId, DEFAULT_CATEGORY } from '../lib/budgetCategories';
import { findPreviousBarcodePurchase } from '../lib/priceHistory';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';
import AppDialog from '../components/AppDialog';
import { colors } from '../lib/theme';

const AUTO_SCAN_INTERVAL_MS = 1000;
type ScanMode = 'priceTag' | 'barcode';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState(Platform.OS === 'ios');
  const [permissionChecked, setPermissionChecked] = useState(Platform.OS === 'ios');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('priceTag');
  const [scanStatus, setScanStatus] = useState('Looking for item name and price');
  const [detected, setDetected] = useState<{ name: string; price: number; product?: ProductLookupResult } | null>(null);
  const [choices, setChoices] = useState<{ names: OcrChoice[]; prices: OcrPriceChoice[] }>({ names: [], prices: [] });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addedToCartDialogOpen, setAddedToCartDialogOpen] = useState(false);
  const cameraRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const foundRef = useRef(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const scanModeRef = useRef<ScanMode>('priceTag');
  const lastBarcodeRef = useRef<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const sessions = useCartStore((s) => s.sessions);

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

  const recognizeCurrentFrame = useCallback(async () => {
    if (
      isScanningRef.current ||
      foundRef.current ||
      !mountedRef.current ||
      !focusedRef.current ||
      scanModeRef.current !== 'priceTag' ||
      !cameraReady ||
      !cameraRef.current
    ) return;

    isScanningRef.current = true;
    if (mountedRef.current) {
      setIsScanning(true);
      setScanStatus('Reading shelf tag...');
    }

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
        setScanStatus('Item found');
      } else {
        if (mountedRef.current) setScanStatus('Align bold item name and peso price');
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
        setScanStatus('Still looking...');
      }
    } finally {
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
    }
  }, [cameraReady]);

  const resetDetection = useCallback((mode: ScanMode) => {
    scanModeRef.current = mode;
    foundRef.current = false;
    lastBarcodeRef.current = null;
    setIsScanning(false);
    setSheetOpen(false);
    setDetected(null);
    setChoices({ names: [], prices: [] });
    setScanStatus(mode === 'barcode' ? 'Looking for barcode' : 'Looking for item name and price');
  }, []);

  const handleModeChange = useCallback((mode: ScanMode) => {
    scanModeRef.current = mode;
    setScanMode(mode);
    resetDetection(mode);
  }, [resetDetection]);

  const readBarcodeFromEvent = (event: any) => {
    const native = event?.nativeEvent ?? event;
    return String(
      native?.codeStringValue ??
      native?.code ??
      native?.data ??
      native?.value ??
      ''
    ).trim();
  };

  const handleReadCode = useCallback(async (event: any) => {
    if (
      scanMode !== 'barcode' ||
      foundRef.current ||
      isScanningRef.current ||
      !mountedRef.current ||
      !focusedRef.current
    ) return;

    const barcode = readBarcodeFromEvent(event);
    if (!barcode || barcode === lastBarcodeRef.current) return;

    lastBarcodeRef.current = barcode;
    isScanningRef.current = true;
    setIsScanning(true);
    setScanStatus('Checking product...');

    try {
      const product = await lookupProductByBarcode(barcode);
      foundRef.current = true;
      if (!mountedRef.current) return;

      const fallbackProduct: ProductLookupResult = {
        barcode,
        name: `Barcode ${barcode}`,
      };

      setChoices({ names: [], prices: [] });
      setDetected({
        name: product?.name ?? fallbackProduct.name,
        price: 0,
        product: product ?? fallbackProduct,
      });
      setSheetOpen(true);
      setScanStatus(product ? 'Product found' : 'Barcode found');
    } catch (e) {
      console.error(e);
      if (mountedRef.current) {
        lastBarcodeRef.current = null;
        setScanStatus('Lookup failed. Try again.');
      }
    } finally {
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
    }
  }, [scanMode]);

  useEffect(() => {
    if (!hasPermission) return;

    setCameraReady(false);
    const readyTimer = setTimeout(() => {
      if (mountedRef.current && focusedRef.current) {
        setCameraReady(true);
        setScanStatus(scanMode === 'barcode' ? 'Looking for barcode' : 'Looking for item name and price');
      }
    }, 1000);

    return () => clearTimeout(readyTimer);
  }, [hasPermission, scanMode]);

  useEffect(() => {
    if (!hasPermission || !cameraReady || sheetOpen || !focusedRef.current || scanMode !== 'priceTag') return;

    const timer = setInterval(recognizeCurrentFrame, AUTO_SCAN_INTERVAL_MS);
    const initialTimer = setTimeout(recognizeCurrentFrame, 500);

    return () => {
      clearInterval(timer);
      clearTimeout(initialTimer);
    };
  }, [hasPermission, cameraReady, recognizeCurrentFrame, sheetOpen, scanMode]);

  const handleConfirm = useCallback((name: string, price: number, quantity: number, category: BudgetCategoryId) => {
    addItem({
      name,
      price,
      quantity,
      isScanned: true,
      category,
      barcode: detected?.product?.barcode,
      brand: detected?.product?.brand,
      productCategory: detected?.product?.category,
      productImageUrl: detected?.product?.imageUrl,
    });
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
    lastBarcodeRef.current = null;
    setScanStatus(scanMode === 'barcode' ? 'Looking for barcode' : 'Looking for item name and price');
  }, [scanMode]);

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
        scanBarcode={scanMode === 'barcode'}
        onReadCode={handleReadCode}
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
              onPress={() => handleModeChange('priceTag')}>
              <Ionicons name="text" size={16} color={scanMode === 'priceTag' ? colors.primary : 'white'} />
              <Text style={[styles.modeText, scanMode === 'priceTag' && styles.modeTextActive]}>Price Tag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
              onPress={() => handleModeChange('barcode')}>
              <Ionicons name="barcode-outline" size={17} color={scanMode === 'barcode' ? colors.primary : 'white'} />
              <Text style={[styles.modeText, scanMode === 'barcode' && styles.modeTextActive]}>Barcode</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topBadge}>
            <Ionicons name={scanMode === 'barcode' ? 'barcode-outline' : 'sparkles'} size={15} color="white" />
            <Text style={styles.hint}>{scanMode === 'barcode' ? 'Place the barcode inside the frame' : 'Place the price tag inside the frame'}</Text>
          </View>
        </View>

        <View style={styles.scanRow}>
          <View style={styles.sideMask} />
          <View style={styles.viewfinder}>
            <View style={[styles.scanLine, isScanning && styles.scanLineActive]} />
          </View>
          <View style={styles.sideMask} />
        </View>

        <View style={styles.bottomMask}>
          <View style={styles.statusPill}>
            {isScanning ? <ActivityIndicator color="white" size="small" /> : <Ionicons name={scanMode === 'barcode' ? 'barcode-outline' : 'text'} size={17} color="white" />}
            <Text style={styles.statusText}>{scanStatus}</Text>
          </View>
          <Text style={styles.scanHelp}>
            {scanMode === 'barcode' ? 'Cany can fill the product name. You still enter the store price.' : 'Keep the product name and peso price inside the box.'}
          </Text>
        </View>
      </View>

      {detected && (
        <VerifySheet
          open={sheetOpen}
          name={detected.name}
          price={detected.price}
          barcode={detected.product?.barcode}
          brand={detected.product?.brand}
          initialCategory={DEFAULT_CATEGORY}
          previousPrice={detected.product?.barcode ? findPreviousBarcodePurchase(sessions, detected.product.barcode) : null}
          nameChoices={choices.names}
          priceChoices={choices.prices}
          onConfirm={handleConfirm}
          onCancel={handleCancelDetected}
        />
      )}
      <AppDialog
        visible={addedToCartDialogOpen}
        title="Item added"
        message="Product added to cart."
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
  closeBtn: { position: 'absolute', top: 52, right: 20, zIndex: 3, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.36)' },
  topMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, paddingTop: 66 },
  modeToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 18, padding: 5, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  modeButton: { minWidth: 112, minHeight: 42, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  modeButtonActive: { backgroundColor: 'white' },
  modeText: { color: 'white', fontSize: 13, fontWeight: '900' },
  modeTextActive: { color: colors.primary },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  hint: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  scanRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)' },
  viewfinder: { width: 322, height: 190, position: 'relative', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', borderRadius: 10, backgroundColor: 'transparent' },
  scanLine: { width: '86%', height: 2, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 1 },
  scanLineActive: { height: 3, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 6 },
  bottomMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', paddingTop: 24, paddingBottom: 52, paddingHorizontal: 22 },
  statusPill: { minHeight: 48, maxWidth: '88%', borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.82)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' },
  statusText: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  scanHelp: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
