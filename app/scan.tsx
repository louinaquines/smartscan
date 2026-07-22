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
import { parseReceiptItemsLenient, parseReceiptTotal, receiptItemToCartItem, ReceiptParsedItem, getRawOcrLines, getReceiptOcrSuggestions, OcrTextChoice } from '../lib/receiptParser';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';
import ReceiptReviewSheet from '../components/ReceiptReviewSheet';
import AppDialog from '../components/AppDialog';
import { colors } from '../lib/theme';

type ScanMode = 'priceTag' | 'barcode' | 'receipt';

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
  const [detected, setDetected] = useState<{ name: string; price: number; product?: ProductLookupResult } | null>(null);
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
  const lastBarcodeRef = useRef<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const addItems = useCartStore((s) => s.addItems);
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
    lastBarcodeRef.current = null;
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
      barcode: detected?.product?.barcode,
      brand: detected?.product?.brand,
      productCategory: detected?.product?.category,
      productImageUrl: detected?.product?.imageUrl,
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
    lastBarcodeRef.current = null;
    setScanStatus('Tap Scan to capture');
  }, [scanMode]);

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
              onPress={() => handleModeChange('priceTag')}
              activeOpacity={0.7}>
              <View style={[styles.modeIconWrap, scanMode === 'priceTag' && styles.modeIconWrapActive]}>
                <Ionicons name="pricetag-outline" size={15} color={scanMode === 'priceTag' ? '#FFF' : 'rgba(255,255,255,0.7)'} />
              </View>
              <Text style={[styles.modeText, scanMode === 'priceTag' && styles.modeTextActive]}>Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
              onPress={() => handleModeChange('barcode')}
              activeOpacity={0.7}>
              <View style={[styles.modeIconWrap, scanMode === 'barcode' && styles.modeIconWrapActive]}>
                <Ionicons name="barcode-outline" size={15} color={scanMode === 'barcode' ? '#FFF' : 'rgba(255,255,255,0.7)'} />
              </View>
              <Text style={[styles.modeText, scanMode === 'barcode' && styles.modeTextActive]}>Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'receipt' && styles.modeButtonActive]}
              onPress={() => handleModeChange('receipt')}
              activeOpacity={0.7}>
              <View style={[styles.modeIconWrap, scanMode === 'receipt' && styles.modeIconWrapActive]}>
                <Ionicons name="receipt-outline" size={15} color={scanMode === 'receipt' ? '#FFF' : 'rgba(255,255,255,0.7)'} />
              </View>
              <Text style={[styles.modeText, scanMode === 'receipt' && styles.modeTextActive]}>Receipt</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topBadge}>
            <Ionicons name={scanMode === 'barcode' ? 'barcode-outline' : scanMode === 'receipt' ? 'receipt-outline' : 'sparkles'} size={15} color="white" />
            <Text style={styles.hint}>{scanMode === 'barcode' ? 'Point camera at barcode, then tap Scan' : scanMode === 'receipt' ? 'Point camera at receipt, then tap Scan' : 'Point camera at price tag, then tap Scan'}</Text>
          </View>
        </View>

        <View style={styles.scanRow}>
          <View style={styles.sideMask} />
          <View style={[styles.viewfinder, scanMode === 'receipt' && styles.receiptViewfinder]}>
            <View style={[styles.scanLine, isScanning && styles.scanLineActive]} />
          </View>
          <View style={styles.sideMask} />
        </View>

        <View style={styles.bottomMask}>
          <View style={styles.statusPill}>
            {isScanning ? <ActivityIndicator color="white" size="small" /> : <Ionicons name={scanMode === 'barcode' ? 'barcode-outline' : scanMode === 'receipt' ? 'receipt-outline' : 'text'} size={17} color="white" />}
            <Text style={styles.statusText}>{scanStatus}</Text>
          </View>
          <TouchableOpacity
            style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
            disabled={isScanning || !cameraReady}
            onPress={handleCapture}
            activeOpacity={0.75}>
            <View style={styles.captureIconWrap}>
              <Ionicons name={scanMode === 'barcode' ? 'barcode-outline' : scanMode === 'receipt' ? 'receipt-outline' : 'camera-outline'} size={24} color={colors.primary} />
            </View>
            <Text style={styles.captureText}>
              {isScanning ? 'Processing…' : scanMode === 'receipt' ? 'Scan Receipt' : scanMode === 'barcode' ? 'Scan Barcode' : 'Scan Price Tag'}
            </Text>
          </TouchableOpacity>
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
  closeBtn: { position: 'absolute', top: 52, right: 20, zIndex: 3, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.36)' },
  topMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, paddingTop: 66 },
  modeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modeButton: { flex: 1, minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  modeButtonActive: { backgroundColor: colors.primary, shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  modeIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  modeIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  modeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800' },
  modeTextActive: { color: '#FFF' },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  hint: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  scanRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)' },
  viewfinder: { width: 322, height: 190, position: 'relative', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', borderRadius: 10, backgroundColor: 'transparent' },
  receiptViewfinder: { width: 220, height: 430, borderRadius: 16 },
  scanLine: { width: '86%', height: 2, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 1 },
  scanLineActive: { height: 3, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 6 },
  bottomMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', paddingTop: 24, paddingBottom: 52, paddingHorizontal: 22 },
  statusPill: { minHeight: 48, maxWidth: '88%', borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.82)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' },
  statusText: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  captureButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 66, marginTop: 18, backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 36, minWidth: 240, shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  captureButtonDisabled: { opacity: 0.5 },
  captureIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  captureText: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
});
