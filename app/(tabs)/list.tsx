import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppDialog from '../../components/AppDialog';
import { formatMoney } from '../../lib/format';
import { getTheme, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { useCartStore } from '../../store/useCartStore';

export default function ShoppingList() {
  const { shoppingList, addShoppingListItem, toggleShoppingListItem, removeShoppingListItem, themeMode } = useCartStore();
  const [name, setName] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dialogOpen, setDialogOpen] = useState(false);
  const screenPadding = useScreenPadding();

  const darkMode = themeMode === 'dark';
  const t = useMemo(() => getTheme(darkMode), [darkMode]);
  const styles = useMemo(() => getStyles(t), [t]);

  const estimateTotal = useMemo(
    () => shoppingList.reduce((sum, item) => sum + item.estimatedPrice * item.quantity, 0),
    [shoppingList]
  );
  const actualTotal = useMemo(
    () => shoppingList.reduce((sum, item) => sum + (item.actualPrice ?? 0) * item.quantity, 0),
    [shoppingList]
  );
  const checkedCount = shoppingList.filter((item) => item.checked).length;

  const handleAdd = () => {
    const cleanName = name.trim();
    const price = Number(estimatedPrice.replace(',', '.')) || 0;
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!cleanName) {
      setDialogOpen(true);
      return;
    }
    addShoppingListItem({ name: cleanName, estimatedPrice: price, quantity: qty });
    setName('');
    setEstimatedPrice('');
    setQuantity('1');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, screenPadding]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Before shopping</Text>
          <Text style={styles.title}>List</Text>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/scan')}>
          <Ionicons name="scan" size={20} color={darkMode ? '#111' : '#FFF'} />
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{checkedCount}/{shoppingList.length}</Text>
          <Text style={styles.summaryLabel}>Checked</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatMoney(estimateTotal)}</Text>
          <Text style={styles.summaryLabel}>Estimate</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatMoney(actualTotal)}</Text>
          <Text style={styles.summaryLabel}>Actual</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Add planned item</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor={t.soft} />
        <View style={styles.formRow}>
          <TextInput style={[styles.input, styles.priceInput]} value={estimatedPrice} onChangeText={setEstimatedPrice} keyboardType="decimal-pad" placeholder="Estimate" placeholderTextColor={t.soft} />
          <TextInput style={[styles.input, styles.qtyInput]} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="Qty" placeholderTextColor={t.soft} />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Ionicons name="add" size={24} color={darkMode ? '#111' : '#FFF'} />
          </TouchableOpacity>
        </View>
      </View>

      {shoppingList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={34} color={t.text} />
          <Text style={styles.emptyTitle}>No planned items</Text>
          <Text style={styles.emptyText}>Add items here before shopping. Scans can check them off automatically.</Text>
        </View>
      ) : (
        shoppingList.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <TouchableOpacity style={[styles.checkBox, item.checked && styles.checkBoxActive]} onPress={() => toggleShoppingListItem(item.id)}>
              {item.checked && <Ionicons name="checkmark" size={18} color={darkMode ? '#111' : '#FFF'} />}
            </TouchableOpacity>
            <View style={styles.itemMain}>
              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} x est. {formatMoney(item.estimatedPrice)}
                {item.actualPrice !== undefined ? ` - actual ${formatMoney(item.actualPrice)}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removeShoppingListItem(item.id)}>
              <Ionicons name="trash-outline" size={18} color={t.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 100 }} />
      <AppDialog
        visible={dialogOpen}
        title="Missing item"
        message="Enter an item name before adding it to your list."
        icon="create-outline"
        onDismiss={() => setDialogOpen(false)}
        actions={[{ label: 'OK', onPress: () => setDialogOpen(false) }]}
      />
    </ScrollView>
  );
}

const getStyles = (t: ReturnType<typeof getTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: {},
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  kicker: { color: t.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: t.text, fontSize: 30, fontWeight: '900' },
  scanButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', ...shadow },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryItem: { flex: 1, backgroundColor: t.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: t.glassBorder, minHeight: 88, justifyContent: 'center' },
  summaryValue: { color: t.text, fontSize: 16, fontWeight: '900' },
  summaryLabel: { color: t.muted, fontSize: 12, marginTop: 5, fontWeight: '700' },
  form: { backgroundColor: t.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: t.glassBorder, marginBottom: 18 },
  sectionTitle: { color: t.text, fontSize: 18, fontWeight: '900' },
  input: { height: 50, backgroundColor: t.glass, borderRadius: 16, paddingHorizontal: 16, color: t.text, borderWidth: 1, borderColor: t.glassBorder, marginTop: 12, fontSize: 15 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: { flex: 1 },
  qtyInput: { width: 74 },
  addButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  emptyState: { backgroundColor: t.card, alignItems: 'center', paddingVertical: 42, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: t.glassBorder },
  emptyTitle: { color: t.text, fontWeight: '900', marginTop: 12, fontSize: 17 },
  emptyText: { color: t.soft, marginTop: 6, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: t.glassBorder, marginBottom: 10 },
  checkBox: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: t.glass, marginRight: 12 },
  checkBoxActive: { backgroundColor: t.primary, borderColor: t.primary },
  itemMain: { flex: 1, minWidth: 0 },
  itemName: { color: t.text, fontSize: 16, fontWeight: '900' },
  itemNameChecked: { color: t.soft, textDecorationLine: 'line-through' },
  itemMeta: { color: t.muted, fontSize: 12, marginTop: 4 },
  deleteButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: t.dangerSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
