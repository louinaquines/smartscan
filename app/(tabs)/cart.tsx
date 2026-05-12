import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatMoney } from '../../lib/format';
import { colors, shadow } from '../../lib/theme';
import { useCartStore } from '../../store/useCartStore';

export default function Cart() {
    const { items, addItem, removeItem, updateQuantity, saveSession, clearCart, total } = useCartStore();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');

    const cartTotal = total();
    const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    const handleAdd = () => {
        const cleanName = name.trim();
        const parsedPrice = Number(price.replace(',', '.'));
        const parsedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

        if (!cleanName) {
            Alert.alert('Missing name', 'Enter the item name.');
            return;
        }
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            Alert.alert('Invalid price', 'Enter a price greater than zero.');
            return;
        }

        addItem({ name: cleanName, price: parsedPrice, quantity: parsedQuantity, isScanned: false });
        setName('');
        setPrice('');
        setQuantity('1');
    };

    const handleSaveSession = async () => {
        const saved = await saveSession();
        if (!saved) {
            Alert.alert('Empty cart', 'Add at least one item before saving.');
            return;
        }
        Alert.alert('Session saved', 'Your cart was moved to history.');
    };

    const confirmClear = () => {
        if (items.length === 0) return;
        Alert.alert('Clear cart?', 'This removes all current items.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearCart },
        ]);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <View>
                    <Text style={styles.kicker}>Current shop</Text>
                    <Text style={styles.title}>Cart</Text>
                </View>
                <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/scan')}>
                    <Ionicons name="scan" size={20} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.totalPanel}>
                <View>
                    <Text style={styles.totalLabel}>Running total</Text>
                    <Text style={styles.totalValue}>{formatMoney(cartTotal)}</Text>
                    <Text style={styles.totalMeta}>{itemCount} unit{itemCount === 1 ? '' : 's'} across {items.length} item{items.length === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.totalIcon}>
                    <Ionicons name="calculator-outline" size={24} color="white" />
                </View>
            </View>

            <View style={styles.form}>
                <Text style={styles.sectionTitle}>Manual item</Text>
                <Text style={styles.formHint}>Quick add anything OCR misses.</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Item name"
                    placeholderTextColor="#94A0AC"
                />
                <View style={styles.formRow}>
                    <TextInput
                        style={[styles.input, styles.priceInput]}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="decimal-pad"
                        placeholder="Price"
                        placeholderTextColor="#94A0AC"
                    />
                    <TextInput
                        style={[styles.input, styles.quantityInput]}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="number-pad"
                        placeholder="Qty"
                        placeholderTextColor="#94A0AC"
                    />
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Ionicons name="add" size={22} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Items</Text>
                <TouchableOpacity onPress={confirmClear}>
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="cart-outline" size={32} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Cart is empty</Text>
                    <Text style={styles.emptyText}>Add an item manually or scan a price tag.</Text>
                    <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/scan')}>
                        <Ionicons name="scan" size={18} color="white" />
                        <Text style={styles.emptyActionText}>Scan item</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemMain}>
                            <View style={[styles.itemIcon, item.isScanned ? styles.scannedIcon : styles.manualIcon]}>
                                <Ionicons name={item.isScanned ? 'scan' : 'create-outline'} size={16} color={item.isScanned ? colors.success : colors.primary} />
                            </View>
                            <View style={styles.itemText}>
                                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.itemMeta}>{formatMoney(item.price)} each</Text>
                            </View>
                            <Text style={styles.itemTotal}>{formatMoney(item.price * item.quantity)}</Text>
                        </View>
                        <View style={styles.itemControls}>
                            <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                                <Ionicons name="remove" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                                <Ionicons name="add" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteButton} onPress={() => removeItem(item.id)}>
                                <Ionicons name="trash-outline" size={19} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

            <TouchableOpacity style={[styles.checkoutButton, items.length === 0 && styles.disabled]} onPress={handleSaveSession} disabled={items.length === 0}>
                <Ionicons name="checkmark-done" size={20} color="white" />
                <Text style={styles.checkoutText}>Save Session</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 18, paddingBottom: 34 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    kicker: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    title: { color: colors.text, fontSize: 30, fontWeight: '800' },
    scanButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow },
    totalPanel: { backgroundColor: colors.ink, borderRadius: 8, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow },
    totalIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    totalLabel: { color: '#B9C8D6', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    totalValue: { color: 'white', fontSize: 31, fontWeight: '800', marginTop: 6 },
    totalMeta: { color: '#B9C8D6', fontSize: 13, marginTop: 4 },
    form: { backgroundColor: colors.surface, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16, ...shadow },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
    formHint: { color: colors.muted, fontSize: 13, marginTop: 4 },
    input: { height: 46, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 12, color: colors.text, borderWidth: 1, borderColor: colors.border, marginTop: 10 },
    formRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priceInput: { flex: 1 },
    quantityInput: { width: 74 },
    addButton: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    clearText: { color: colors.danger, fontWeight: '800' },
    emptyState: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 18, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: colors.text, fontWeight: '800', marginTop: 12, fontSize: 16 },
    emptyText: { color: colors.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
    emptyAction: { marginTop: 16, height: 42, paddingHorizontal: 18, borderRadius: 8, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 8 },
    emptyActionText: { color: 'white', fontWeight: '800' },
    itemRow: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
    itemMain: { flexDirection: 'row', alignItems: 'center' },
    itemIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    scannedIcon: { backgroundColor: colors.successSoft },
    manualIcon: { backgroundColor: colors.primarySoft },
    itemText: { flex: 1 },
    itemName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    itemMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    itemTotal: { color: colors.text, fontSize: 15, fontWeight: '800' },
    itemControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
    qtyButton: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    qtyText: { minWidth: 28, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '800' },
    deleteButton: { width: 38, height: 34, borderRadius: 8, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
    checkoutButton: { marginTop: 8, height: 52, borderRadius: 8, backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow },
    checkoutText: { color: 'white', fontSize: 16, fontWeight: '800' },
    disabled: { opacity: 0.45 },
});
