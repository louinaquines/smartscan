import { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
  PermissionsAndroid,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parsePriceTag } from '../lib/ocrParser';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detected, setDetected] = useState<{ name: string; price: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cameraRef = useRef<any>(null);
  const addItem = useCartStore((s) => s.addItem);

  const requestPermission = useCallback(async () => {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'SmartScan needs camera access to scan price tags.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    setHasPermission(result === PermissionsAndroid.RESULTS.GRANTED);
    setPermissionChecked(true);
  }, []);

  const handleScan = useCallback(async () => {
    if (isScanning || !cameraRef.current) return;
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.capture();
      if (!photo?.uri) throw new Error('No photo');

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      const result = await TextRecognition.recognize(photo.uri);
      const parsed = parsePriceTag(result.text);

      if (parsed) {
        setDetected(parsed);
        setSheetOpen(true);
      } else {
        Alert.alert(
          'Could not read tag',
          'Make sure the price tag is clear and well-lit, then try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  const handleConfirm = useCallback((name: string, price: number, quantity: number) => {
    addItem({ name, price, quantity, isScanned: true });
    setSheetOpen(false);
    setDetected(null);
    router.dismiss();
  }, [addItem]);

  // Permission request screen
  if (!permissionChecked) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={56} color="rgba(255,255,255,0.4)" />
        <Text style={styles.title}>Camera Access</Text>
        <Text style={styles.text}>SmartScan needs camera access to scan price tags.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.dismiss()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={56} color="rgba(255,255,255,0.3)" />
        <Text style={styles.title}>Permission Denied</Text>
        <Text style={styles.text}>Enable camera access in your phone settings.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.dismiss()}>
          <Text style={styles.cancelText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Lazy load Camera component
  const { Camera, CameraType } = require('react-native-camera-kit');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        cameraType={CameraType.Back}
        flashMode="auto"
        onError={(e: any) => console.error('Camera error:', e)}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.dismiss()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.hint}>Point at a shelf price tag</Text>

        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <View style={styles.scanLine} />
        </View>

        <Text style={styles.subHint}>Align the price label inside the frame</Text>

        <TouchableOpacity
          style={[styles.scanBtn, isScanning && styles.scanBtnDisabled]}
          onPress={handleScan}
          disabled={isScanning}>
          {isScanning
            ? <ActivityIndicator color="white" size="small" />
            : <>
              <Ionicons name="scan" size={22} color="white" />
              <Text style={styles.scanBtnText}>Scan Tag</Text>
            </>}
        </TouchableOpacity>
      </View>

      {detected && (
        <VerifySheet
          open={sheetOpen}
          name={detected.name}
          price={detected.price}
          onConfirm={handleConfirm}
          onCancel={() => { setSheetOpen(false); setDetected(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  title: { color: 'white', fontSize: 20, fontWeight: '600', marginTop: 16 },
  text: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: '#378ADD', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  permBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 52 },
  closeBtn: { position: 'absolute', top: 52, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  hint: { color: 'white', fontSize: 14, fontWeight: '500', letterSpacing: 0.3, marginTop: 60 },
  subHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  viewfinder: { width: 300, height: 160, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#378ADD', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine: { width: '85%', height: 2, backgroundColor: 'rgba(55,138,221,0.7)', borderRadius: 1 },
  scanBtn: { backgroundColor: '#378ADD', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanBtnDisabled: { opacity: 0.5 },
  scanBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
});