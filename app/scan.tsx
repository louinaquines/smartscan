import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parsePriceTag } from '../lib/ocrParser';
import { useCartStore } from '../store/useCartStore';
import VerifySheet from '../components/VerifySheet';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [detected, setDetected] = useState<{ name: string; price: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const addItem = useCartStore((s) => s.addItem);

  const handleScan = async () => {
    if (isScanning || !cameraRef.current) return;
    setIsScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo?.uri) throw new Error('No photo captured');

      const result = await TextRecognition.recognize(photo.uri);
      const parsed = parsePriceTag(result.text);

      if (parsed) {
        setDetected(parsed);
        setSheetOpen(true);
      } else {
        Alert.alert(
          'Could not read tag',
          'Make sure the price tag is clear and well-lit, then try again.'
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = (name: string, price: number, quantity: number) => {
    addItem({ name, price, quantity, isScanned: true });
    setSheetOpen(false);
    setDetected(null);
    router.dismiss();
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={styles.text}>Camera permission required</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.dismiss()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.hint}>Point at a shelf price tag</Text>

        {/* Viewfinder */}
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
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="scan" size={22} color="white" />
              <Text style={styles.scanBtnText}>Scan Tag</Text>
            </>
          )}
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
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  permBtn: { backgroundColor: '#378ADD', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  permBtnText: { color: 'white', fontWeight: '500', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 52 },
  closeBtn: { position: 'absolute', top: 52, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 },
  hint: { color: 'white', fontSize: 14, fontWeight: '500', letterSpacing: 0.3 },
  subHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  viewfinder: { width: 300, height: 160, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: '#378ADD', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine: { width: '90%', height: 2, backgroundColor: 'rgba(55,138,221,0.6)', borderRadius: 1 },
  scanBtn: { backgroundColor: '#378ADD', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnText: { color: 'white', fontSize: 15, fontWeight: '500' },
});