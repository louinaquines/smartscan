import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/useCartStore';
import { router } from 'expo-router';

const fmt = (n: number) =>
    '₱' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function Dashboard() {
    const { items, budget, setBudget, removeItem, total, remaining } = useCartStore();
    const [budgetInput, setBudgetInput] = useState('');

    const spent = total();
    const rem = remaining();
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const isOver = rem < 0;
    const isWarn = !isOver && budget > 0 && rem < budget * 0.15;

    const handleSetBudget = () => {
        const val = parseFloat(budgetInput);
        if (isNaN(val) || val <= 0) { Alert.alert('Invalid', 'Enter a valid budget amount'); return; }
        setBudget(val);
        setBudgetInput('');
    };

    const barColor = isOver ? '#E24B4A' : isWarn ? '#EF9F27' : '#1D9E75';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.heading}>SmartScan</Text>

            {/* Budget setup */}
            <View style={styles.card}>
                <Text style={styles.label}>Set grocery budget</Text>
                <View style={styles.row}>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 1500"
                        keyboardType="numeric"
                        value={budgetInput}
                        onChangeText={setBudgetInput}
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity style={styles.setBtn} onPress={handleSetBudget}>
                        <Text style={styles.setBtnText}>Set</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Budget overview */}
            <View style={styles.card}>
                <View style={styles.budgetRow}>
                    <View>
                        <Text style={styles.label}>Budget</Text>
                        <Text style={styles.bigNum}>{fmt(budget)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Remaining</Text>
                        <Text style={[styles.bigNum, { color: barColor }]}>{fmt(Math.abs(rem))}</Text>
                    </View>
                </View>
                <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
                <View style={styles.budgetRow}>
                    <Text style={styles.meta}>Spent: {fmt(spent)}</Text>
                    <Text style={styles.meta}>{budget > 0 ? Math.round(pct) + '% used' : '—'}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Items</Text>
                    <Text style={styles.statNum}>{items.length}</Text>
                </View>
                <View style={[styles.statCard, { flex: 1 }]}>
                    <Text style={styles.label}>Scanned</Text>
                    <Text style={styles.statNum}>{items.filter(i => i.isScanned).length}</Text>
                </View>
            </View>

            {/* Item list */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Items</Text>
            </View>

            {items.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="basket-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>No items yet. Scan a tag or add manually.</Text>
                </View>
            ) : (
                items.map(item => (
                    <View key={item.id} style={styles.itemRow}>
                        <View style={[styles.itemIcon, item.isScanned ? styles.iconScanned : styles.iconManual]}>
                            <Ionicons name={item.isScanned ? 'scan' : 'list'} size={16} color={item.isScanned ? '#0F6E56' : '#378ADD'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.itemMeta}>{item.isScanned ? 'Scanned' : 'Manual'}{item.quantity > 1 ? ` · ×${item.quantity}` : ''}</Text>
                        </View>
                        <Text style={styles.itemPrice}>{fmt(item.price * item.quantity)}</Text>
                        <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 6 }}>
                            <Ionicons name="trash-outline" size={18} color="#aaa" />
                        </TouchableOpacity>
                    </View>
                ))
            )}

            {/* Scan button */}
            <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/scan')}>
                <Ionicons name="scan" size={22} color="white" />
                <Text style={styles.scanBtnText}>Point & Scan Price Tag</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { padding: 16, paddingBottom: 40 },
    heading: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginBottom: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 0.5, borderColor: '#e0e0e0' },
    label: { fontSize: 12, color: '#888', marginBottom: 4 },
    row: { flexDirection: 'row', gap: 8 },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, fontSize: 15, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#e0e0e0' },
    setBtn: { backgroundColor: '#EBF4FF', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
    setBtnText: { color: '#378ADD', fontWeight: '500', fontSize: 14 },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    bigNum: { fontSize: 26, fontWeight: '500', color: '#1a1a1a' },
    progressBg: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', borderRadius: 99 },
    meta: { fontSize: 12, color: '#888' },
    statsRow: { flexDirection: 'row', marginBottom: 14 },
    statCard: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12 },
    statNum: { fontSize: 26, fontWeight: '500', color: '#1a1a1a' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#aaa', fontSize: 14, marginTop: 10, textAlign: 'center' },
    itemRow: { backgroundColor: '#fff', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 0.5, borderColor: '#e0e0e0' },
    itemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    iconScanned: { backgroundColor: '#E1F5EE' },
    iconManual: { backgroundColor: '#EBF4FF' },
    itemName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
    itemMeta: { fontSize: 11, color: '#999', marginTop: 1 },
    itemPrice: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
    scanBtn: { backgroundColor: '#378ADD', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    scanBtnText: { color: 'white', fontSize: 15, fontWeight: '500' },
});