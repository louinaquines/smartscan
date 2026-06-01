import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Mascot from '../../components/Mascot';
import { formatMoney } from '../../lib/format';
import { colors, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { useCartStore } from '../../store/useCartStore';

export default function Cart() {
    const { items, addItem, removeItem, updateQuantity, saveSession, clearCart, total } = useCartStore();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const screenPadding = useScreenPadding();

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

    let mascotMessage = "Let's fill up the cart!";
    if (items.length > 0) {
        mascotMessage = `You've got ${itemCount} item${itemCount > 1 ? 's' : ''} here. Looking good!`;
    }

    return (
        <View style={styles.screen}>
            <View style={styles.ambientTop} />

            {/* Floating Glass Header */}
            <View style={styles.stickyHeader}>
                <View style={[styles.headerContent, { paddingTop: screenPadding.paddingTop || 40, paddingHorizontal: screenPadding.paddingHorizontal }]}>
                    <View>
                        <Text style={styles.kicker}>Current shop</Text>
                        <Text style={styles.title}>Cart</Text>
                    </View>
                    <View style={styles.headerTotalBox}>
                        <Text style={styles.headerTotalLabel}>Total</Text>
                        <Text style={styles.headerTotalValue}>{formatMoney(cartTotal)}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingTop: (screenPadding.paddingTop || 40) + 100, paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">
                <View style={{ paddingHorizontal: screenPadding.paddingHorizontal }}>
                    <Mascot message={mascotMessage} type={items.length === 0 ? 'alert' : 'happy'} />

                    <View style={styles.form}>
                        <Text style={styles.sectionTitle}>Manual item</Text>
                        <Text style={styles.formHint}>Quick add anything OCR misses.</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Item name"
                            placeholderTextColor={colors.soft}
                        />
                        <View style={styles.formRow}>
                            <TextInput
                                style={[styles.input, styles.priceInput]}
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="decimal-pad"
                                placeholder="Price"
                                placeholderTextColor={colors.soft}
                            />
                            <TextInput
                                style={[styles.input, styles.quantityInput]}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="number-pad"
                                placeholder="Qty"
                                placeholderTextColor={colors.soft}
                            />
                            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                                <Ionicons name="add" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Items ({itemCount})</Text>
                        <TouchableOpacity onPress={confirmClear}>
                            <Text style={styles.clearText}>Clear Cart</Text>
                        </TouchableOpacity>
                    </View>

                    {items.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="cart-outline" size={32} color={colors.accent} />
                            </View>
                            <Text style={styles.emptyTitle}>Cart is empty</Text>
                            <Text style={styles.emptyText}>Add an item manually or scan a price tag.</Text>
                            <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/scan')}>
                                <Ionicons name="scan" size={18} color="#FFF" />
                                <Text style={styles.emptyActionText}>Scan item</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={[styles.itemAccent, { backgroundColor: item.isScanned ? colors.accent : colors.primary }]} />
                                <View style={styles.itemMain}>
                                    <View style={styles.itemText}>
                                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.itemMeta}>{formatMoney(item.price)} each{item.isScanned ? ' · Scanned' : ''}</Text>
                                    </View>
                                    <Text style={styles.itemTotal}>{formatMoney(item.price * item.quantity)}</Text>
                                </View>
                                <View style={styles.itemControls}>
                                    <View style={styles.qtyControls}>
                                        <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                                            <Ionicons name="remove" size={18} color={colors.text} />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                        <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                                            <Ionicons name="add" size={18} color={colors.text} />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity style={styles.deleteButton} onPress={() => removeItem(item.id)}>
                                        <Ionicons name="trash-outline" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}

                    <TouchableOpacity style={[styles.checkoutButton, items.length === 0 && styles.disabled]} onPress={handleSaveSession} disabled={items.length === 0}>
                        <View style={styles.checkoutFill} />
                        <Ionicons name="checkmark-done" size={22} color="#FFF" />
                        <Text style={styles.checkoutText}>Save Session</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    ambientTop: { ...StyleSheet.absoluteFillObject, height: 320, backgroundColor: '#FFFFFF' },
    stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, backgroundColor: 'rgba(255,255,255,0.9)' },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 },
    kicker: { color: colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 2 },
    headerTotalBox: { alignItems: 'flex-end' },
    headerTotalLabel: { color: colors.soft, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    headerTotalValue: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
    
    content: {},
    form: { backgroundColor: colors.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 20, overflow: 'hidden' },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    formHint: { color: colors.soft, fontSize: 13, marginTop: 4 },
    input: { height: 50, backgroundColor: colors.glass, borderRadius: 16, paddingHorizontal: 16, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, marginTop: 12, fontSize: 15 },
    formRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    priceInput: { flex: 1 },
    quantityInput: { width: 74 },
    addButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 12, ...shadow },
    
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    clearText: { color: colors.danger, fontWeight: '800' },
    
    emptyState: { backgroundColor: colors.card, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
    emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
    emptyTitle: { color: colors.text, fontWeight: '800', marginTop: 16, fontSize: 17 },
    emptyText: { color: colors.soft, marginTop: 6, textAlign: 'center', fontSize: 14 },
    emptyAction: { marginTop: 18, height: 46, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow },
    emptyActionText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    
    itemRow: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12, overflow: 'hidden' },
    itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, opacity: 0.9 },
    itemMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 6 },
    itemText: { flex: 1, paddingRight: 12 },
    itemName: { color: colors.text, fontSize: 16, fontWeight: '900' },
    itemMeta: { color: colors.muted, fontSize: 13, marginTop: 4 },
    itemTotal: { color: colors.primary, fontSize: 18, fontWeight: '900' },
    itemControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginLeft: 6 },
    qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.glass, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.glassBorder },
    qtyButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' },
    qtyText: { minWidth: 24, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '900' },
    deleteButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    
    checkoutButton: { marginTop: 12, height: 56, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadow, overflow: 'hidden' },
    checkoutFill: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.success },
    checkoutText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    disabled: { opacity: 0.45 },
});
