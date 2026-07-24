import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppDialog from '../../components/AppDialog';
import Mascot from '../../components/Mascot';
import { BUDGET_CATEGORIES, BudgetCategoryId, DEFAULT_CATEGORY, getCategoryLabel } from '../../lib/budgetCategories';
import { buildCartShareText } from '../../lib/cartShare';
import { formatMoney } from '../../lib/format';
import { getTheme, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { CartItem, useCartStore } from '../../store/useCartStore';

export default function Cart() {
    const { items, budget, householdMembers, activeMemberId, addHouseholdMember, removeHouseholdMember, setActiveMember, addItem, removeItem, updateItem, updateQuantity, toggleRecurringItem, addRecurringItemsToCart, saveSession, clearCart, total, themeMode } = useCartStore();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [storeName, setStoreName] = useState('');
    const [memberName, setMemberName] = useState('');
    const [category, setCategory] = useState<BudgetCategoryId>(DEFAULT_CATEGORY);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editQuantity, setEditQuantity] = useState('1');
    const [editCategory, setEditCategory] = useState<BudgetCategoryId>(DEFAULT_CATEGORY);
    const [dialog, setDialog] = useState<{ title: string; message: string; icon?: keyof typeof Ionicons.glyphMap; actions?: { label: string; onPress: () => void; variant?: 'primary' | 'soft' }[] } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [addedItemPrice, setAddedItemPrice] = useState(0);
    const successScale = useRef(new Animated.Value(0));
    const successOpacity = useRef(new Animated.Value(0));
    const checkScale = useRef(new Animated.Value(0));
    const textOpacity = useRef(new Animated.Value(0));
    const screenPadding = useScreenPadding();

    const darkMode = themeMode === 'dark';
    const t = useMemo(() => getTheme(darkMode), [darkMode]);
    const styles = useMemo(() => getStyles(t), [t]);

    const cartTotal = total();
    const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
    const getMemberName = (id?: string) => householdMembers.find((member) => member.id === id)?.name;

    const handleAddMember = () => {
        addHouseholdMember(memberName);
        setMemberName('');
    };

    const handleShare = async () => {
        if (items.length === 0) {
            setDialog({ title: 'Empty cart', message: 'Add items before sharing your cart.', icon: 'share-outline' });
            return;
        }
        await Share.share({ message: buildCartShareText(items, cartTotal) });
    };

    const handleAddRecurring = () => {
        const added = addRecurringItemsToCart();
        setDialog({
            title: added > 0 ? 'Recurring items added' : 'No recurring items yet',
            message: added > 0 ? `${added} recurring item${added === 1 ? '' : 's'} added to your cart.` : 'Mark items as recurring after adding them, then they can be suggested next time.',
            icon: 'repeat-outline',
        });
    };

    const handleAdd = () => {
        const cleanName = name.trim();
        const parsedPrice = Number(price.replace(',', '.'));
        const parsedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

        if (!cleanName) {
            setDialog({ title: 'Missing name', message: 'Enter the item name before adding it to your cart.', icon: 'create-outline' });
            return;
        }
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            setDialog({ title: 'Invalid price', message: 'Enter a price greater than zero.', icon: 'cash-outline' });
            return;
        }

        addItem({ name: cleanName, price: parsedPrice, quantity: parsedQuantity, category, isScanned: false });
        const itemTotal = parsedPrice * parsedQuantity;
        setAddedItemPrice(itemTotal);
        setShowSuccess(true);

        successScale.current.setValue(0);
        successOpacity.current.setValue(0);
        checkScale.current.setValue(0);
        textOpacity.current.setValue(0);

        Animated.parallel([
            Animated.timing(successOpacity.current, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(successScale.current, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
        ]).start(() => {
            Animated.parallel([
                Animated.spring(checkScale.current, {
                    toValue: 1,
                    friction: 4,
                    tension: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(textOpacity.current, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        setTimeout(() => {
            setShowSuccess(false);
        }, 1500);

        setName('');
        setPrice('');
        setQuantity('1');
    };

    const handleSaveSession = async () => {
        if (items.length === 0) {
            setDialog({ title: 'Empty cart', message: 'Add items before saving a shopping session.', icon: 'bag-outline' });
            return;
        }
        const success = await saveSession(storeName.trim() || undefined);
        if (success) {
            setDialog({
                title: 'Session saved',
                message: 'Your shopping trip has been saved to history and price trends have been updated.',
                icon: 'checkmark-circle-outline',
            });
            setStoreName('');
        }
    };

    const openEditModal = (item: CartItem) => {
        setEditingItem(item);
        setEditName(item.name);
        setEditPrice(String(item.price));
        setEditQuantity(String(item.quantity));
        setEditCategory(item.category ?? DEFAULT_CATEGORY);
    };

    const handleSaveEdit = () => {
        if (!editingItem) return;
        const cleanName = editName.trim() || 'Product';
        const parsedPrice = Number(editPrice.replace(',', '.')) || 0;
        const parsedQty = Math.max(1, Math.floor(Number(editQuantity) || 1));
        updateItem(editingItem.id, { name: cleanName, price: parsedPrice, quantity: parsedQty, category: editCategory });
        setEditingItem(null);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, screenPadding]} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <View>
                    <Text style={styles.kicker}>Current trip</Text>
                    <Text style={styles.title}>Cart</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleShare} activeOpacity={0.78}>
                        <Ionicons name="share-outline" size={20} color={t.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryTop}>
                    <View>
                        <Text style={styles.summaryLabel}>Cart Total</Text>
                        <Text style={styles.summaryValue}>{formatMoney(cartTotal)}</Text>
                        <Text style={styles.summarySub}>{itemCount} item{itemCount === 1 ? '' : 's'} • {items.length} unique</Text>
                    </View>
                    <View style={styles.badgeWrap}>
                        <View style={styles.badge}>
                            <Ionicons name="cart" size={16} color={t.text} />
                            <Text style={styles.badgeText}>{itemCount}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.quickActionsRow}>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={handleAddRecurring} activeOpacity={0.78}>
                        <Ionicons name="repeat-outline" size={16} color={t.text} />
                        <Text style={styles.quickActionText}>Add Recurring</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={handleShare} activeOpacity={0.78}>
                        <Ionicons name="paper-plane-outline" size={16} color={t.text} />
                        <Text style={styles.quickActionText}>Share Cart</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Household / Shared Budget Members */}
            <View style={styles.householdPanel}>
                <View style={styles.householdHeader}>
                    <Ionicons name="people-outline" size={18} color={t.text} />
                    <Text style={styles.householdTitle}>Household / Shopping Buddies</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRail}>
                    <TouchableOpacity
                        style={[styles.memberChip, activeMemberId === null && styles.memberChipActive]}
                        onPress={() => setActiveMember(null)}
                        activeOpacity={0.78}>
                        <Text style={[styles.memberText, activeMemberId === null && styles.memberTextActive]}>Everyone</Text>
                    </TouchableOpacity>
                    {householdMembers.map((member) => {
                        const selected = activeMemberId === member.id;
                        return (
                            <TouchableOpacity
                                key={member.id}
                                style={[styles.memberChip, selected && styles.memberChipActive]}
                                onPress={() => setActiveMember(member.id)}
                                activeOpacity={0.78}>
                                <Text style={[styles.memberText, selected && styles.memberTextActive]}>{member.name}</Text>
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        removeHouseholdMember(member.id);
                                    }}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    style={styles.memberDeleteBtn}
                                    accessibilityLabel={`Remove ${member.name}`}
                                >
                                    <Ionicons name="close-circle" size={16} color={selected ? (darkMode ? '#111' : '#FFF') : t.muted} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <View style={styles.memberAddRow}>
                    <TextInput
                        style={styles.memberInput}
                        placeholder="Add family member..."
                        placeholderTextColor={t.soft}
                        value={memberName}
                        onChangeText={setMemberName}
                    />
                    <TouchableOpacity style={styles.memberAddBtn} onPress={handleAddMember} activeOpacity={0.8}>
                        <Ionicons name="add" size={18} color={darkMode ? '#111' : '#FFF'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Manual item entry form */}
            <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Add item manually</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Product name"
                    placeholderTextColor={t.soft}
                    value={name}
                    onChangeText={setName}
                />
                <View style={styles.formGrid}>
                    <TextInput
                        style={[styles.input, styles.priceInput]}
                        placeholder="Price"
                        placeholderTextColor={t.soft}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="decimal-pad"
                    />
                    <TextInput
                        style={[styles.input, styles.quantityInput]}
                        placeholder="Qty"
                        placeholderTextColor={t.soft}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="number-pad"
                    />
                </View>

                {/* Category selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {BUDGET_CATEGORIES.map((cat) => {
                        const selected = category === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryChip, selected && styles.categoryChipActive]}
                                onPress={() => setCategory(cat.id)}
                                activeOpacity={0.78}>
                                <Ionicons name={cat.icon as any} size={15} color={selected ? (darkMode ? '#111' : '#FFF') : t.text} />
                                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.82}>
                    <Ionicons name="add" size={20} color={darkMode ? '#111' : '#FFF'} />
                    <Text style={{ color: darkMode ? '#111' : '#FFF', fontWeight: '900', fontSize: 16 }}>Add to Cart</Text>
                </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cart Items ({items.length})</Text>
                {items.length > 0 && (
                    <TouchableOpacity onPress={clearCart}>
                        <Text style={styles.clearText}>Clear all</Text>
                    </TouchableOpacity>
                )}
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="cart-outline" size={30} color={t.text} />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptyText}>Scan price tags or add items manually to track your spending instantly.</Text>
                    <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/scan')} activeOpacity={0.82}>
                        <Ionicons name="scan" size={18} color={darkMode ? '#111' : '#FFF'} />
                        <Text style={styles.emptyActionText}>Start Scanning</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.recurringAction} onPress={handleAddRecurring} activeOpacity={0.82}>
                        <Ionicons name="repeat-outline" size={16} color={t.text} />
                        <Text style={styles.recurringActionText}>Add Recurring Items</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                items.map((item) => {
                    const memberName = getMemberName(item.addedByMemberId);
                    return (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={[styles.itemAccent, { backgroundColor: item.isScanned ? t.text : t.muted }]} />
                            <View style={styles.itemMain}>
                                <View style={styles.itemText}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.itemMeta}>
                                        {getCategoryLabel(item.category)} • {item.isScanned ? 'Scanned' : 'Manual'}
                                        {memberName ? ` • ${memberName}` : ''}
                                    </Text>
                                </View>
                                <Text style={styles.itemTotal}>{formatMoney(item.price * item.quantity)}</Text>
                            </View>

                            <View style={styles.itemControls}>
                                <View style={styles.qtyControls}>
                                    <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                                        <Ionicons name="remove" size={15} color={t.text} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                                        <Ionicons name="add" size={15} color={t.text} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        style={[styles.editButton, item.isRecurring && styles.recurringButtonActive]}
                                        onPress={() => toggleRecurringItem(item.id)}
                                        accessibilityLabel="Toggle recurring">
                                        <Ionicons name="repeat" size={17} color={item.isRecurring ? (darkMode ? '#111' : '#FFF') : t.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)} accessibilityLabel="Edit item">
                                        <Ionicons name="create-outline" size={17} color={t.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteButton} onPress={() => removeItem(item.id)} accessibilityLabel="Remove item">
                                        <Ionicons name="trash-outline" size={17} color={t.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}

            {/* Store & Checkout Section */}
            {items.length > 0 && (
                <View style={styles.storeBox}>
                    <Text style={styles.storeLabel}>Store Name (optional)</Text>
                    <TextInput
                        style={styles.storeInput}
                        placeholder="e.g. Supermarket, Grocery, Mall..."
                        placeholderTextColor={t.soft}
                        value={storeName}
                        onChangeText={setStoreName}
                    />
                    <TouchableOpacity style={styles.checkoutButton} onPress={handleSaveSession} activeOpacity={0.88}>
                        <View style={styles.checkoutFill} />
                        <Ionicons name="checkmark-done-circle-outline" size={20} color={darkMode ? '#111' : '#FFF'} />
                        <Text style={[styles.checkoutText, { color: darkMode ? '#111' : '#FFF' }]}>Complete & Save Session</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ height: 100 }} />

            {/* Edit Item Modal */}
            <Modal visible={editingItem !== null} transparent animationType="slide" onRequestClose={() => setEditingItem(null)}>
                <View style={styles.editModalRoot}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditingItem(null)} />
                    <View style={styles.editSheet}>
                        <View style={styles.editHandle} />
                        <Text style={styles.editTitle}>Edit Item</Text>

                        <Text style={styles.editLabel}>Name</Text>
                        <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Product name" placeholderTextColor={t.soft} />

                        <View style={styles.editGrid}>
                            <View style={styles.editGridItem}>
                                <Text style={styles.editLabel}>Price</Text>
                                <TextInput style={styles.input} value={editPrice} onChangeText={setEditPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={t.soft} />
                            </View>
                            <View style={styles.editGridQty}>
                                <Text style={styles.editLabel}>Qty</Text>
                                <TextInput style={styles.input} value={editQuantity} onChangeText={setEditQuantity} keyboardType="number-pad" placeholder="1" placeholderTextColor={t.soft} />
                            </View>
                        </View>

                        <Text style={styles.editLabel}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {BUDGET_CATEGORIES.map((cat) => {
                                const selected = editCategory === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.categoryChip, selected && styles.categoryChipActive]}
                                        onPress={() => setEditCategory(cat.id)}
                                        activeOpacity={0.78}>
                                        <Ionicons name={cat.icon as any} size={15} color={selected ? (darkMode ? '#111' : '#FFF') : t.text} />
                                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.editActions}>
                            <TouchableOpacity style={[styles.editActionButton, styles.editCancel]} onPress={() => setEditingItem(null)}>
                                <Text style={styles.editCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.editActionButton, styles.editSave]} onPress={handleSaveEdit}>
                                <Text style={styles.editSaveText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Dialog */}
            <AppDialog
                visible={dialog !== null}
                title={dialog?.title ?? ''}
                message={dialog?.message ?? ''}
                icon={dialog?.icon ?? 'alert-circle-outline'}
                onDismiss={() => setDialog(null)}
                actions={dialog?.actions ?? [{ label: 'OK', onPress: () => setDialog(null) }]}
            />

            {/* Success Overlay */}
            {showSuccess && (
                <Animated.View style={[styles.successOverlay, { opacity: successOpacity.current }]}>
                    <Animated.View style={[styles.successContent, { transform: [{ scale: successScale.current }] }]}>
                        <Animated.View style={[styles.successCheckCircle, { transform: [{ scale: checkScale.current }] }]}>
                            <Ionicons name="checkmark" size={38} color={darkMode ? '#111' : '#FFF'} />
                        </Animated.View>
                        <Animated.View style={{ opacity: textOpacity.current }}>
                            <Text style={styles.successTitle}>Added to cart</Text>
                            <Text style={styles.successPrice}>{formatMoney(addedItemPrice)}</Text>
                        </Animated.View>
                    </Animated.View>
                </Animated.View>
            )}
        </ScrollView>
    );
}

const getStyles = (t: ReturnType<typeof getTheme>) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    content: {},
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    kicker: { color: t.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: t.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 10 },
    iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center', ...shadow },

    summaryCard: { backgroundColor: t.card, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: t.glassBorder, ...shadow },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    summaryLabel: { color: t.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    summaryValue: { color: t.text, fontSize: 32, fontWeight: '900', marginTop: 2 },
    summarySub: { color: t.muted, fontSize: 13, fontWeight: '700', marginTop: 4 },
    badgeWrap: {},
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surfaceBlue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: t.glassBorder },
    badgeText: { color: t.text, fontSize: 13, fontWeight: '900' },
    quickActionsRow: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.glassBorder },
    quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14, backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder },
    quickActionText: { color: t.text, fontSize: 13, fontWeight: '800' },

    householdPanel: { backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: t.glassBorder },
    householdHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    householdTitle: { color: t.text, fontSize: 14, fontWeight: '900' },
    memberRail: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
    memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, paddingRight: 10, paddingVertical: 8, borderRadius: 99, backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder },
    memberChipActive: { backgroundColor: t.primary, borderColor: t.primary },
    memberText: { color: t.text, fontSize: 13, fontWeight: '800' },
    memberTextActive: { color: t.bg === '#111111' ? '#111' : '#FFF' },
    memberDeleteBtn: { alignItems: 'center', justifyContent: 'center' },
    memberAddRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    memberInput: { flex: 1, height: 42, backgroundColor: t.glass, borderRadius: 12, paddingHorizontal: 12, color: t.text, borderWidth: 1, borderColor: t.glassBorder, fontSize: 13 },
    memberAddBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },

    formCard: { backgroundColor: t.card, borderRadius: 24, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: t.glassBorder, ...shadow },
    sectionTitle: { color: t.text, fontSize: 18, fontWeight: '900' },
    input: { height: 48, backgroundColor: t.glass, borderRadius: 14, paddingHorizontal: 14, color: t.text, borderWidth: 1, borderColor: t.glassBorder, marginTop: 10, fontSize: 15 },
    formGrid: { flexDirection: 'row', gap: 10 },
    categoryScroll: { flexDirection: 'row', gap: 8, marginTop: 12, paddingVertical: 2 },
    categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surfaceBlue, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: t.glassBorder },
    categoryChipActive: { backgroundColor: t.primary, borderColor: t.primary },
    categoryChipText: { color: t.text, fontSize: 12, fontWeight: '800' },
    categoryChipTextActive: { color: t.bg === '#111111' ? '#111' : '#FFF' },
    priceInput: { flex: 1 },
    quantityInput: { width: 84 },
    addButton: { marginTop: 14, height: 50, borderRadius: 16, backgroundColor: t.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    clearText: { color: t.danger, fontWeight: '800', fontSize: 13 },

    emptyState: { backgroundColor: t.card, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: t.glassBorder, overflow: 'hidden' },
    emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: t.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.glassBorder },
    emptyTitle: { color: t.text, fontWeight: '800', marginTop: 16, fontSize: 17 },
    emptyText: { color: t.soft, marginTop: 6, textAlign: 'center', fontSize: 14 },
    emptyAction: { marginTop: 18, height: 46, paddingHorizontal: 20, borderRadius: 16, backgroundColor: t.primary, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow },
    emptyActionText: { color: t.bg === '#111111' ? '#111' : '#FFF', fontWeight: '800', fontSize: 15 },
    recurringAction: { marginTop: 10, height: 42, paddingHorizontal: 18, borderRadius: 15, backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder, flexDirection: 'row', alignItems: 'center', gap: 8 },
    recurringActionText: { color: t.text, fontWeight: '800', fontSize: 14 },

    itemRow: { backgroundColor: t.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.glassBorder, marginBottom: 12, overflow: 'hidden' },
    itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, opacity: 0.9 },
    itemMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 6 },
    itemText: { flex: 1, paddingRight: 12 },
    itemName: { color: t.text, fontSize: 16, fontWeight: '900' },
    itemMeta: { color: t.muted, fontSize: 13, marginTop: 4 },
    itemTotal: { color: t.text, fontSize: 18, fontWeight: '900' },
    itemControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginLeft: 6 },
    qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.glass, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: t.glassBorder },
    qtyButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: t.glass, alignItems: 'center', justifyContent: 'center' },
    qtyText: { minWidth: 24, textAlign: 'center', color: t.text, fontSize: 16, fontWeight: '900' },
    editButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },
    recurringButtonActive: { backgroundColor: t.primary, borderColor: t.primary },
    deleteButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: t.dangerSoft, borderWidth: 1, borderColor: t.danger, alignItems: 'center', justifyContent: 'center' },

    storeBox: { backgroundColor: t.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.glassBorder, marginTop: 8 },
    storeLabel: { color: t.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
    storeInput: { height: 48, backgroundColor: t.glass, borderRadius: 15, paddingHorizontal: 14, color: t.text, borderWidth: 1, borderColor: t.glassBorder, marginTop: 10, fontSize: 15 },

    checkoutButton: { marginTop: 12, height: 56, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadow, overflow: 'hidden' },
    checkoutFill: { ...StyleSheet.absoluteFillObject, backgroundColor: t.success },
    checkoutText: { fontSize: 17, fontWeight: '900' },
    editModalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.34)' },
    editSheet: { backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 38 : 22, borderWidth: 1, borderColor: t.glassBorder },
    editHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: t.muted, marginBottom: 16 },
    editTitle: { color: t.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
    editLabel: { color: t.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginTop: 10 },
    editGrid: { flexDirection: 'row', gap: 10 },
    editGridItem: { flex: 1 },
    editGridQty: { width: 94 },
    editActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    editActionButton: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    editCancel: { backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder },
    editSave: { backgroundColor: t.primary },
    editCancelText: { color: t.text, fontSize: 16, fontWeight: '900' },
    editSaveText: { color: t.bg === '#111111' ? '#111' : '#FFF', fontSize: 16, fontWeight: '900' },

    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: t.bg === '#111111' ? 'rgba(17,17,17,0.92)' : 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
    },
    successContent: {
        alignItems: 'center',
        gap: 16,
    },
    successCheckCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: t.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    successTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: t.text,
        textAlign: 'center',
        marginTop: 4,
    },
    successPrice: {
        fontSize: 22,
        fontWeight: '900',
        color: t.text,
        textAlign: 'center',
    },
});
