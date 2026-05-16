import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BudgetDonut from '../../components/BudgetDonut';
import Skeleton from '../../components/Skeleton';
import { formatMoney } from '../../lib/format';
import { colors, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { useCartStore } from '../../store/useCartStore';

export default function Dashboard() {
    const { items, budget, sessions, setBudget, total, remaining, isHydrated } = useCartStore();
    const [budgetInput, setBudgetInput] = useState(budget > 0 ? String(budget) : '');
    const screenPadding = useScreenPadding();

    const spent = total();
    const rem = remaining();
    const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const scannedCount = items.filter((item) => item.isScanned).length;
    const manualCount = items.length - scannedCount;
    const statusColor = rem < 0 ? colors.danger : progress > 85 ? colors.warning : colors.success;
    const budgetMessage = budget <= 0
        ? 'Set a budget to track your trip'
        : rem < 0
            ? 'You are over budget'
            : progress > 85
                ? 'Close to your budget'
                : 'Budget is on track';

    const handleBudgetSave = async () => {
        const value = Number(budgetInput.replace(/,/g, ''));
        if (!Number.isFinite(value) || value <= 0) {
            Alert.alert('Invalid budget', 'Enter a budget greater than zero.');
            return;
        }
        await setBudget(value);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, screenPadding]}>
            <View style={styles.header}>
                <View style={styles.brandRow}>
                    <Image source={require('../../assets/cany-logo.png')} style={styles.brandLogo} />
                    <View>
                        <Text style={styles.kicker}>Today</Text>
                        <Text style={styles.title}>CANY</Text>
                    </View>
                </View>
                <View style={styles.headerPill}>
                    <Ionicons name="sparkles" size={14} color={colors.accentDeep} />
                    <Text style={styles.headerPillText}>Smart cart</Text>
                </View>
            </View>

            {!isHydrated ? (
                <DashboardSkeleton />
            ) : (
                <>
            <View style={styles.budgetPanel}>
                <View style={styles.panelGlow} />
                <View style={styles.budgetTop}>
                    <View style={styles.budgetCopy}>
                        <Text style={styles.label}>Budget</Text>
                        <Text style={styles.budgetAmount}>{budget > 0 ? formatMoney(budget) : 'Set amount'}</Text>
                        <Text style={styles.budgetMessage}>{budgetMessage}</Text>
                        <Text style={[styles.remaining, { color: statusColor }]}>
                            {rem < 0 ? `${formatMoney(Math.abs(rem))} over` : `${formatMoney(rem)} left`}
                        </Text>
                    </View>
                    <BudgetDonut spent={spent} budget={budget} />
                </View>

                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
                </View>

                <View style={styles.budgetInputRow}>
                    <TextInput
                        style={styles.budgetInput}
                        value={budgetInput}
                        onChangeText={setBudgetInput}
                        keyboardType="decimal-pad"
                        placeholder="Budget amount"
                        placeholderTextColor="#94A0AC"
                    />
                    <TouchableOpacity style={styles.saveButton} onPress={handleBudgetSave}>
                        <Ionicons name="checkmark" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.metrics}>
                <View style={styles.metric}>
                    <View style={styles.metricIconBlue}>
                        <Ionicons name="bag-handle-outline" size={18} color={colors.primaryDeep} />
                    </View>
                    <Text style={styles.metricValue}>{items.length}</Text>
                    <Text style={styles.metricLabel}>Items</Text>
                </View>
                <View style={styles.metric}>
                    <View style={styles.metricIconPink}>
                        <Ionicons name="wallet-outline" size={18} color={colors.accentDeep} />
                    </View>
                    <Text style={styles.metricValue}>{formatMoney(spent)}</Text>
                    <Text style={styles.metricLabel}>Cart total</Text>
                </View>
                <View style={styles.metric}>
                    <View style={styles.metricIconBlue}>
                        <Ionicons name="receipt-outline" size={18} color={colors.primaryDeep} />
                    </View>
                    <Text style={styles.metricValue}>{sessions.length}</Text>
                    <Text style={styles.metricLabel}>Sessions</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Current cart</Text>
                <TouchableOpacity onPress={() => router.push('/cart')}>
                    <Text style={styles.sectionAction}>Edit</Text>
                </TouchableOpacity>
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="basket-outline" size={32} color={colors.accentDeep} />
                    </View>
                    <Text style={styles.emptyTitle}>No items yet</Text>
                    <Text style={styles.emptyText}>Scan a tag or add an item from the cart tab.</Text>
                    <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/cart')}>
                        <Text style={styles.emptyActionText}>Add manually</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                items.slice(0, 5).map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                        <View style={[styles.itemIcon, item.isScanned ? styles.scannedIcon : styles.manualIcon]}>
                            <Ionicons name={item.isScanned ? 'scan' : 'create-outline'} size={16} color={item.isScanned ? colors.accentDeep : colors.primaryDeep} />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.itemMeta}>{item.quantity} x {formatMoney(item.price)}</Text>
                        </View>
                        <Text style={styles.itemPrice}>{formatMoney(item.price * item.quantity)}</Text>
                    </View>
                ))
            )}

            <View style={styles.splitMetrics}>
                <View style={styles.splitItem}>
                    <Text style={styles.splitValue}>{scannedCount}</Text>
                    <Text style={styles.splitLabel}>Scanned</Text>
                </View>
                <View style={styles.splitItem}>
                    <Text style={styles.splitValue}>{manualCount}</Text>
                    <Text style={styles.splitLabel}>Manual</Text>
                </View>
            </View>
                </>
            )}
        </ScrollView>
    );
}

function DashboardSkeleton() {
    return (
        <View>
            <View style={styles.skeletonBudget}>
                <View style={styles.skeletonBudgetTop}>
                    <View style={styles.skeletonBudgetCopy}>
                        <Skeleton width={72} height={13} radius={7} />
                        <Skeleton width="82%" height={34} radius={10} style={styles.skeletonGap} />
                        <Skeleton width="64%" height={16} radius={8} style={styles.skeletonGapSmall} />
                        <Skeleton width="52%" height={20} radius={8} style={styles.skeletonGapSmall} />
                    </View>
                    <Skeleton width={132} height={132} radius={66} />
                </View>
                <Skeleton height={9} radius={99} style={styles.skeletonGap} />
                <View style={styles.skeletonInputRow}>
                    <Skeleton height={48} radius={14} style={styles.skeletonInput} />
                    <Skeleton width={50} height={48} radius={14} />
                </View>
            </View>

            <View style={styles.metrics}>
                <Skeleton height={104} radius={18} style={styles.skeletonMetric} />
                <Skeleton height={104} radius={18} style={styles.skeletonMetric} />
                <Skeleton height={104} radius={18} style={styles.skeletonMetric} />
            </View>

            <View style={styles.sectionHeader}>
                <Skeleton width={130} height={22} radius={8} />
                <Skeleton width={42} height={18} radius={8} />
            </View>

            <View style={styles.skeletonCartItem}>
                <Skeleton width={36} height={36} radius={13} />
                <View style={styles.skeletonCartCopy}>
                    <Skeleton width="88%" height={17} radius={8} />
                    <Skeleton width="50%" height={13} radius={7} style={styles.skeletonGapSmall} />
                </View>
                <Skeleton width={82} height={18} radius={8} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: {},
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brandLogo: { width: 52, height: 52, borderRadius: 16 },
    kicker: { fontSize: 13, color: colors.muted, fontWeight: '700' },
    title: { fontSize: 31, color: colors.text, fontWeight: '900', marginTop: 2 },
    headerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentSoft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.borderPink },
    headerPillText: { color: colors.accentDeep, fontSize: 11, fontWeight: '900' },
    budgetPanel: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14, overflow: 'hidden', ...shadow },
    panelGlow: { position: 'absolute', top: -60, right: -42, width: 150, height: 150, borderRadius: 75, backgroundColor: colors.accentSoft, opacity: 0.75 },
    budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
    budgetCopy: { flex: 1 },
    label: { fontSize: 12, color: colors.muted, fontWeight: '800', textTransform: 'uppercase' },
    budgetAmount: { fontSize: 26, color: colors.text, fontWeight: '800', marginTop: 6 },
    budgetMessage: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
    remaining: { fontSize: 15, fontWeight: '700', marginTop: 8 },
    progressTrack: { height: 9, backgroundColor: colors.surfaceMuted, borderRadius: 99, overflow: 'hidden', marginTop: 14 },
    progressFill: { height: '100%', borderRadius: 99 },
    budgetInputRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    budgetInput: { flex: 1, height: 48, backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
    saveButton: { width: 50, height: 48, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    metrics: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    metric: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border, minHeight: 104, justifyContent: 'center' },
    metricIconBlue: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    metricIconPink: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    metricValue: { fontSize: 18, color: colors.text, fontWeight: '800', marginTop: 8 },
    metricLabel: { fontSize: 12, color: colors.muted, marginTop: 5 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 17, color: colors.text, fontWeight: '800' },
    sectionAction: { color: colors.primary, fontWeight: '800' },
    emptyState: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 18, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, color: colors.text, fontWeight: '800', marginTop: 12 },
    emptyText: { color: colors.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
    emptyAction: { marginTop: 16, height: 42, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.primaryDeep, justifyContent: 'center' },
    emptyActionText: { color: 'white', fontWeight: '800' },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    itemIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    scannedIcon: { backgroundColor: colors.accentSoft },
    manualIcon: { backgroundColor: colors.primarySoft },
    itemInfo: { flex: 1 },
    itemName: { color: colors.text, fontSize: 14, fontWeight: '800' },
    itemMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    itemPrice: { color: colors.text, fontSize: 14, fontWeight: '800' },
    splitMetrics: { flexDirection: 'row', gap: 8, marginTop: 10 },
    splitItem: { flex: 1, backgroundColor: colors.surfaceBlue, borderRadius: 18, padding: 14 },
    splitValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
    splitLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
    skeletonBudget: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14, ...shadow },
    skeletonBudgetTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    skeletonBudgetCopy: { flex: 1 },
    skeletonGap: { marginTop: 14 },
    skeletonGapSmall: { marginTop: 9 },
    skeletonInputRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    skeletonInput: { flex: 1 },
    skeletonMetric: { flex: 1 },
    skeletonCartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border },
    skeletonCartCopy: { flex: 1, marginLeft: 10 },
});
