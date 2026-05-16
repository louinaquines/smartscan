import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
  PermissionsAndroid, Platform, Linking, NativeModules,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parsePriceTag } from '../lib/ocrParser';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';
import { colors } from '../lib/theme';

const AUTO_SCAN_INTERVAL_MS = 1800;

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState(Platform.OS === 'ios');
  const [permissionChecked, setPermissionChecked] = useState(Platform.OS === 'ios');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanStatus, setScanStatus] = useState('Looking for item name and price');
  const [detected, setDetected] = useState<{ name: string; price: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cameraRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const foundRef = useRef(false);
  const mountedRef = useRef(true);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      foundRef.current = true;
    };
  }, []);

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
          message: 'CANY needs camera access to scan price tags.',
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
    if (isScanningRef.current || foundRef.current || !cameraReady || !cameraRef.current) return;

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

      if (parsed) {
        foundRef.current = true;
        if (!mountedRef.current) return;
        setDetected(parsed);
        setSheetOpen(true);
        setScanStatus('Item found');
      } else {
        if (mountedRef.current) setScanStatus('Align bold item name and peso price');
      }
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      if (mountedRef.current && !message.toLowerCase().includes('camera is closed')) {
        setScanStatus('Still looking...');
      }
    } finally {
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
    }
  }, [cameraReady]);

  useEffect(() => {
    if (!hasPermission) return;

    setCameraReady(false);
    const readyTimer = setTimeout(() => {
      if (mountedRef.current) {
        setCameraReady(true);
        setScanStatus('Looking for item name and price');
      }
    }, 1200);

    return () => clearTimeout(readyTimer);
  }, [hasPermission]);

  useEffect(() => {
    if (!hasPermission || !cameraReady || sheetOpen) return;

    const timer = setInterval(recognizeCurrentFrame, AUTO_SCAN_INTERVAL_MS);
    const initialTimer = setTimeout(recognizeCurrentFrame, 700);

    return () => {
      clearInterval(timer);
      clearTimeout(initialTimer);
    };
  }, [hasPermission, cameraReady, recognizeCurrentFrame, sheetOpen]);

  const handleConfirm = useCallback((name: string, price: number, quantity: number) => {
    addItem({ name, price, quantity, isScanned: true });
    setSheetOpen(false);
    setDetected(null);
    router.dismiss();
  }, [addItem]);

  const handleCancelDetected = useCallback(() => {
    setSheetOpen(false);
    setDetected(null);
    foundRef.current = false;
    setScanStatus('Looking for item name and price');
  }, []);

  if (!permissionChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.title}>Opening Camera</Text>
        <Text style={styles.text}>CANY is preparing the scanner.</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={56} color="rgba(255,255,255,0.3)" />
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

        <View style={styles.topBadge}>
          <Ionicons name="sparkles" size={15} color="white" />
          <Text style={styles.hint}>Auto scanning</Text>
        </View>

        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <View style={[styles.scanLine, isScanning && styles.scanLineActive]} />
        </View>

        <View style={styles.statusPill}>
          {isScanning ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="text" size={17} color="white" />}
          <Text style={styles.statusText}>{scanStatus}</Text>
        </View>
      </View>

      {detected && (
        <VerifySheet
          open={sheetOpen}
          name={detected.name}
          price={detected.price}
          onConfirm={handleConfirm}
          onCancel={handleCancelDetected}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  title: { color: 'white', fontSize: 20, fontWeight: '700', marginTop: 16 },
  text: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: colors.accent, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  permBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 52 },
  closeBtn: { position: 'absolute', top: 52, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: 8 },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(244,142,173,0.92)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, marginTop: 54 },
  hint: { color: 'white', fontSize: 13, fontWeight: '800' },
  viewfinder: { width: 310, height: 172, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: colors.accent, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { width: '86%', height: 2, backgroundColor: 'rgba(244,142,173,0.75)', borderRadius: 1 },
  scanLineActive: { height: 3, backgroundColor: colors.accent },
  statusPill: { minHeight: 48, maxWidth: '88%', borderRadius: 18, backgroundColor: 'rgba(19,40,58,0.82)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  statusText: { color: 'white', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
