import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OcrTextChoice, ReceiptParsedItem } from '../lib/receiptParser';
import { formatMoney } from '../lib/format';
import { colors } from '../lib/theme';

interface DraftItem {
  name: string;
  price: string;
  quantity: string;
}

type Props = {
  open: boolean;
  items: ReceiptParsedItem[];
  receiptTotal?: number | null;
  nameSuggestions?: OcrTextChoice[];
  scanPass?: number;
  totalDetected?: boolean;
  onScanMore?: (draft: ReceiptParsedItem[]) => void;
  onConfirm: (items: ReceiptParsedItem[]) => void;
  onCancel: () => void;
};

function toParsed(item: DraftItem): ReceiptParsedItem {
  return {
    name: item.name,
    price: Number(item.price.replace(',', '.')) || 0,
    quantity: Number(item.quantity.replace(',', '.')) || 0,
  };
}

function toDraft(item: ReceiptParsedItem): DraftItem {
  return {
    name: item.name,
    price: item.price ? String(item.price) : '',
    quantity: item.quantity ? String(item.quantity) : '1',
  };
}

const subtitleText = (totalDetected: boolean, items: ReceiptParsedItem[], cleanCount: number, scanPass: number) =>
  totalDetected ? `Receipt complete — ${cleanCount} item${cleanCount === 1 ? '' : 's'}`
    : items.length === 0 ? 'No items auto-detected'
      : scanPass > 0 ? `Part ${scanPass} — ${cleanCount} item${cleanCount === 1 ? '' : 's'} total`
        : `${cleanCount} item${cleanCount === 1 ? '' : 's'} detected`;

export default function ReceiptReviewSheet({
  open, items, receiptTotal = null,
  nameSuggestions = [],
  scanPass = 0, totalDetected = false,
  onScanMore, onConfirm, onCancel
}: Props) {
  const [draftItems, setDraftItems] = useState<DraftItem[]>(items.map(toDraft));
  const [showSuccess, setShowSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const successScale = useRef(new Animated.Value(0));
  const successOpacity = useRef(new Animated.Value(0));
  const checkScale = useRef(new Animated.Value(0));
  const textOpacity = useRef(new Animated.Value(0));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -40) setExpanded(true);
        else if (gs.dy > 40) setExpanded(false);
      },
    })
  ).current;

  useEffect(() => {
    if (open) {
      setDraftItems(items.map(toDraft));
      setExpanded(false);
    }
  }, [open, items]);

  const updateItem = (index: number, updates: Partial<DraftItem>) => {
    setDraftItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  };

  const addEmptyItem = () => {
    setDraftItems((current) => [...current, { name: '', price: '', quantity: '1' }]);
  };

  const cleanItems = draftItems
    .map((item) => {
      const price = Number(item.price.replace(',', '.')) || 0;
      const quantity = Number(item.quantity.replace(',', '.')) || 1;
      return { name: item.name.trim() || 'Receipt item', price, quantity };
    })
    .filter((item) => item.price > 0);
  const total = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalMismatch = receiptTotal != null && receiptTotal > 0 && Math.abs(total - receiptTotal) > 0.2;

  const handleConfirm = () => {
    setConfirmedTotal(total);
    setShowSuccess(true);

    successScale.current.setValue(0);
    successOpacity.current.setValue(0);
    checkScale.current.setValue(0);
    textOpacity.current.setValue(0);

    Animated.parallel([
      Animated.timing(successOpacity.current, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(successScale.current, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(checkScale.current, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(textOpacity.current, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });

    setTimeout(() => {
      setShowSuccess(false);
      onConfirm(cleanItems);
    }, 1500);
  };

  const pickNameForItem = (index: number, value: string) => {
    updateItem(index, { name: value });
  };

  const renderItem = (item: DraftItem, index: number) => {
    const price = Number(item.price.replace(',', '.')) || 0;
    const qty = Number(item.quantity.replace(',', '.')) || 1;
    return (
      <View key={`item-${index}`} style={styles.itemCard}>
        <View style={styles.itemTop}>
          <TextInput style={styles.nameInput} value={item.name} onChangeText={(name) => updateItem(index, { name })} placeholder="Item name" placeholderTextColor={colors.soft} />
          <TouchableOpacity style={styles.removeButton} onPress={() => setDraftItems((current) => current.filter((_, i) => i !== index))}>
            <Ionicons name="trash-outline" size={17} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.qtyInput]} value={item.quantity} onChangeText={(v) => updateItem(index, { quantity: v })} keyboardType="decimal-pad" placeholder="Qty" placeholderTextColor={colors.soft} />
          <TextInput style={[styles.input, styles.priceInput]} value={item.price} onChangeText={(v) => updateItem(index, { price: v })} keyboardType="decimal-pad" placeholder="Price" placeholderTextColor={colors.soft} />
          <Text style={styles.lineTotal}>{formatMoney(price * qty)}</Text>
        </View>
        {nameSuggestions.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardSuggestions}>
            {nameSuggestions.map((s) => (
              <TouchableOpacity key={s.value} style={styles.cardChip} onPress={() => pickNameForItem(index, s.value)}>
                <Text style={styles.cardChipText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  };

  const headerSection = (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Review Receipt</Text>
          <Text style={styles.subtitle}>{subtitleText(totalDetected, items, cleanItems.length, scanPass)}</Text>
        </View>
        <Text style={styles.total}>{formatMoney(total)}</Text>
      </View>
      {receiptTotal != null && receiptTotal > 0 ? (
        <Text style={[styles.receiptTotalHint, totalMismatch && styles.receiptTotalMismatch]}>
          Receipt total: {formatMoney(receiptTotal)}{totalMismatch ? ' — review items before importing' : ''}
        </Text>
      ) : null}
      {totalDetected ? (
        <View style={styles.completeBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.completeBannerText}>Total detected — receipt fully scanned</Text>
        </View>
      ) : null}
    </>
  );

  const actionsSection = (
    <>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.addButton} onPress={addEmptyItem}>
          <Ionicons name="add" size={18} color={colors.text} />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        {onScanMore && !totalDetected ? (
          <TouchableOpacity style={[styles.actionButton, styles.scanMoreButton]} onPress={() => onScanMore(draftItems.map(toParsed))}>
            <Ionicons name="camera-outline" size={16} color={colors.text} />
            <Text style={styles.cancelText}>Scan Next Part</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.cancelText}>Scan Again</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionButton, styles.confirmButton, cleanItems.length === 0 && styles.disabled]} disabled={cleanItems.length === 0} onPress={handleConfirm}>
          <Text style={styles.confirmText}>{totalDetected || scanPass === 0 ? 'Add Items' : 'Finish & Add'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, expanded && styles.sheetExpanded]}>
          <View style={styles.handle} {...panResponder.panHandlers}>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={14} color={colors.muted} />
          </View>
          {expanded ? (
            <ScrollView style={styles.expandedBody} contentContainerStyle={styles.expandedBodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {headerSection}
              {draftItems.map(renderItem)}
              {actionsSection}
            </ScrollView>
          ) : (
            <>
              {headerSection}
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {draftItems.map(renderItem)}
              </ScrollView>
              {actionsSection}
            </>
          )}
        </View>
        {showSuccess && (
          <Animated.View style={[styles.successOverlay, { opacity: successOpacity.current }]}>
            <Animated.View style={[styles.successContent, { transform: [{ scale: successScale.current }] }]}>
              <Animated.View style={[styles.successCheckCircle, { transform: [{ scale: checkScale.current }] }]}>
                <Ionicons name="checkmark" size={38} color="#FFF" />
              </Animated.View>
              <Animated.View style={{ opacity: textOpacity.current }}>
                <Text style={styles.successTitle}>Receipt imported</Text>
                <Text style={styles.successPrice}>{formatMoney(confirmedTotal)}</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.36)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 38 : 22, maxHeight: '86%' },
  sheetExpanded: { maxHeight: '100%', flex: 1 },
  handle: { alignSelf: 'center', width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceBlue, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  expandedBody: { flex: 1 },
  expandedBodyContent: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 3 },
  total: { color: colors.text, fontSize: 20, fontWeight: '900' },
  receiptTotalHint: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  receiptTotalMismatch: { color: colors.warning },
  list: { maxHeight: 420 },
  itemCard: { backgroundColor: colors.surfaceBlue, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, minHeight: 46, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, fontSize: 15, fontWeight: '800' },
  removeButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.glassBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: { height: 44, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, fontSize: 14, fontWeight: '800' },
  qtyInput: { width: 72 },
  priceInput: { flex: 1 },
  lineTotal: { width: 82, color: colors.text, fontSize: 13, fontWeight: '900', textAlign: 'right' },
  addButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 14, backgroundColor: colors.surfaceBlue, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  addButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  cardSuggestions: { marginTop: 10 },
  cardChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card, borderRadius: 99, borderWidth: 1, borderColor: colors.glassBorder, marginRight: 6 },
  cardChipText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  completeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  completeBannerText: { color: colors.text, fontSize: 13, fontWeight: '800', flex: 1 },
  scanMoreButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 52, borderRadius: 16, backgroundColor: colors.surfaceBlue, borderWidth: 1, borderColor: colors.glassBorder },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: colors.surfaceBlue, borderWidth: 1, borderColor: colors.glassBorder },
  confirmButton: { backgroundColor: colors.primary },
  cancelText: { color: colors.text, fontSize: 15, fontWeight: '900' },
  confirmText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  successContent: { alignItems: 'center', gap: 16 },
  successCheckCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  successTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 4 },
  successPrice: { fontSize: 22, fontWeight: '900', color: colors.primary, textAlign: 'center' },
});
