import { useMemo, useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppDialog from '../../components/AppDialog';
import Skeleton from '../../components/Skeleton';
import { formatMoney } from '../../lib/format';
import { getTheme, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { useCartStore } from '../../store/useCartStore';
import { useTranslation } from '../../lib/i18n';

export default function ShoppingList() {
  const { shoppingList, addShoppingListItem, toggleShoppingListItem, removeShoppingListItem, themeMode, loadState } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dialogOpen, setDialogOpen] = useState(false);
  const screenPadding = useScreenPadding();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadState();
    setRefreshing(false);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 600);
  }, [loadState]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const darkMode = themeMode === 'dark';
  const theme = useMemo(() => getTheme(darkMode), [darkMode]);
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

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

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, screenPadding]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Skeleton width={120} height={36} radius={12} />
          <Skeleton width={40} height={40} radius={20} />
        </View>
        <Skeleton width="100%" height={100} radius={20} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={150} radius={24} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={70} radius={18} style={{ marginBottom: 10 }} />
        <Skeleton width="100%" height={70} radius={18} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, screenPadding]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{t('beforeShopping')}</Text>
          <Text style={styles.title}>{t('list')}</Text>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/scan')}>
          <Ionicons name="scan" size={20} color={darkMode ? '#111' : '#FFF'} />
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{checkedCount}/{shoppingList.length}</Text>
          <Text style={styles.summaryLabel}>{t('checked')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatMoney(estimateTotal)}</Text>
          <Text style={styles.summaryLabel}>{t('estimate')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatMoney(actualTotal)}</Text>
          <Text style={styles.summaryLabel}>{t('actual')}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>{t('addPlannedItem')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('itemName')} placeholderTextColor={theme.soft} />
        <View style={styles.formRow}>
          <TextInput style={[styles.input, styles.priceInput]} value={estimatedPrice} onChangeText={setEstimatedPrice} keyboardType="decimal-pad" placeholder={t('estimateShort')} placeholderTextColor={theme.soft} />
          <TextInput style={[styles.input, styles.qtyInput]} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder={t('qty')} placeholderTextColor={theme.soft} />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Ionicons name="add" size={24} color={darkMode ? '#111' : '#FFF'} />
          </TouchableOpacity>
        </View>
      </View>

      {shoppingList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={34} color={theme.text} />
          <Text style={styles.emptyTitle}>{t('noPlannedItems')}</Text>
          <Text style={styles.emptyText}>{t('listEmptyMsg')}</Text>
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
                {item.quantity} x {t('estLabel')} {formatMoney(item.estimatedPrice)}
                {item.actualPrice !== undefined ? ` - ${t('actualLabel')} ${formatMoney(item.actualPrice)}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removeShoppingListItem(item.id)}>
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 100 }} />
      <AppDialog
        visible={dialogOpen}
        title={t('missingItem')}
        message={t('enterItemNameBefore')}
        icon="create-outline"
        onDismiss={() => setDialogOpen(false)}
        actions={[{ label: t('ok'), onPress: () => setDialogOpen(false) }]}
      />
    </ScrollView>
  );
}

const getStyles = (theme: ReturnType<typeof getTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: {},
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  kicker: { color: theme.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: theme.text, fontSize: 30, fontWeight: '900' },
  scanButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', ...shadow },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryItem: { flex: 1, backgroundColor: theme.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: theme.glassBorder, minHeight: 88, justifyContent: 'center' },
  summaryValue: { color: theme.text, fontSize: 16, fontWeight: '900' },
  summaryLabel: { color: theme.muted, fontSize: 12, marginTop: 5, fontWeight: '700' },
  form: { backgroundColor: theme.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: theme.glassBorder, marginBottom: 18 },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  input: { height: 50, backgroundColor: theme.glass, borderRadius: 16, paddingHorizontal: 16, color: theme.text, borderWidth: 1, borderColor: theme.glassBorder, marginTop: 12, fontSize: 15 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: { flex: 1 },
  qtyInput: { width: 74 },
  addButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  emptyState: { backgroundColor: theme.card, alignItems: 'center', paddingVertical: 42, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.glassBorder },
  emptyTitle: { color: theme.text, fontWeight: '900', marginTop: 12, fontSize: 17 },
  emptyText: { color: theme.soft, marginTop: 6, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: theme.glassBorder, marginBottom: 10 },
  checkBox: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: theme.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.glass, marginRight: 12 },
  checkBoxActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  itemMain: { flex: 1, minWidth: 0 },
  itemName: { color: theme.text, fontSize: 16, fontWeight: '900' },
  itemNameChecked: { color: theme.soft, textDecorationLine: 'line-through' },
  itemMeta: { color: theme.muted, fontSize: 12, marginTop: 4 },
  deleteButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.dangerSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
