import { useState, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDialog from '../../components/AppDialog';
import Mascot from '../../components/Mascot';
import { formatMoney, formatShortDate } from '../../lib/format';
import { getProductHistory, getProductHistorySummary } from '../../lib/productHistory';
import { getTheme, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { ShoppingSession, useCartStore } from '../../store/useCartStore';

type SessionCardProps = {
    session: ShoppingSession;
    sessions: ShoppingSession[];
    onOpen: (session: ShoppingSession) => void;
    onDelete: (id: string) => void;
    darkMode: boolean;
};

function getComparablePrices(sessions: ShoppingSession[], itemName: string) {
    const keyName = itemName.toLowerCase();
    return sessions
        .flatMap((session) => session.items.map((item) => ({ item, session })))
        .filter(({ item }) => item.name.toLowerCase() === keyName)
        .filter(({ session }) => session.storeName)
        .reduce<Record<string, number[]>>((stores, { item, session }) => {
            const store = session.storeName ?? 'Unknown';
            stores[store] = [...(stores[store] ?? []), item.price];
            return stores;
        }, {});
}

function SessionCard({ session, sessions, onOpen, onDelete, darkMode }: SessionCardProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const unitCount = session.items.reduce((sum, item) => sum + item.quantity, 0);
    const budgetDiff = session.budget - session.total;
    const over = session.budget > 0 && budgetDiff < 0;
    const t = getTheme(darkMode);
    const styles = useMemo(() => getStyles(t), [t]);

    return (
        <View style={styles.cardContainer}>
            <Pressable style={styles.sessionCard} onPress={() => onOpen(session)}>
                <View style={styles.sessionTop}>
                    <View style={styles.sessionIcon}>
                        <Ionicons name="bag-check-outline" size={20} color={t.text} />
                    </View>
                    <View style={styles.sessionTitleBlock}>
                        <Text style={styles.sessionDate}>{formatShortDate(session.date)}</Text>
                        <Text style={styles.sessionMeta}>
                            {session.storeName ? `${session.storeName} • ` : ''}{session.items.length} item{session.items.length === 1 ? '' : 's'} ({unitCount} unit{unitCount === 1 ? '' : 's'})
                        </Text>
                    </View>
                    <View style={styles.sessionRightBlock}>
                        <Text style={styles.sessionTotal}>{formatMoney(session.total)}</Text>
                        <TouchableOpacity
                            style={styles.deleteIconButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                setConfirmOpen(true);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Delete session"
                        >
                            <Ionicons name="trash-outline" size={17} color={t.muted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {session.budget > 0 && (
                    <View style={styles.budgetBadgeWrap}>
                        <View style={[styles.budgetBadge, over ? styles.budgetBadgeOver : styles.budgetBadgeUnder]}>
                            <Ionicons
                                name={over ? "alert-circle-outline" : "checkmark-circle-outline"}
                                size={13}
                                color={over ? t.danger : t.text}
                            />
                            <Text style={[styles.budgetLine, over && styles.overText]}>
                                {over ? `${formatMoney(Math.abs(budgetDiff))} over budget` : `${formatMoney(budgetDiff)} under budget`}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.itemList}>
                    {session.items.slice(0, 3).map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                            <Text style={styles.historyItemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.historyItemPrice}>{item.isRecurring ? 'Repeat • ' : ''}{item.quantity} × {formatMoney(item.price)}</Text>
                        </View>
                    ))}
                    {session.items.length > 3 && (
                        <Text style={styles.moreText}>+{session.items.length - 3} more items</Text>
                    )}
                </View>
            </Pressable>

            <AppDialog
                visible={confirmOpen}
                title="Delete history?"
                message="This removes this saved shopping session from your history."
                icon="trash-outline"
                onDismiss={() => setConfirmOpen(false)}
                actions={[
                    { label: 'Cancel', onPress: () => setConfirmOpen(false), variant: 'soft' },
                    {
                        label: 'Delete',
                        onPress: () => {
                            setConfirmOpen(false);
                            onDelete(session.id);
                        },
                        variant: 'danger',
                    },
                ]}
            />
        </View>
    );
}

export default function History() {
    const { sessions, deleteSession, themeMode } = useCartStore();
    const [selectedSession, setSelectedSession] = useState<ShoppingSession | null>(null);
    const screenPadding = useScreenPadding();

    const darkMode = themeMode === 'dark';
    const t = useMemo(() => getTheme(darkMode), [darkMode]);
    const styles = useMemo(() => getStyles(t), [t]);

    const totalSpent = useMemo(() => sessions.reduce((sum, s) => sum + s.total, 0), [sessions]);
    const totalItemsCount = useMemo(() => sessions.reduce((sum, s) => sum + s.items.reduce((isum, i) => isum + i.quantity, 0), 0), [sessions]);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, screenPadding]} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <View>
                    <Text style={styles.kicker}>Log & archive</Text>
                    <Text style={styles.title}>History</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="time-outline" size={22} color={t.text} />
                </View>
            </View>

            <View style={styles.summary}>
                <View style={styles.summaryItem}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="receipt-outline" size={15} color={t.text} />
                        <Text style={styles.summaryLabel}>Trips</Text>
                    </View>
                    <Text style={styles.summaryValue}>{sessions.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="wallet-outline" size={15} color={t.text} />
                        <Text style={styles.summaryLabel}>Total Spent</Text>
                    </View>
                    <Text style={styles.summaryValue}>{formatMoney(totalSpent)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="basket-outline" size={15} color={t.text} />
                        <Text style={styles.summaryLabel}>Units</Text>
                    </View>
                    <Text style={styles.summaryValue}>{totalItemsCount}</Text>
                </View>
            </View>

            {sessions.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="time-outline" size={28} color={t.text} />
                    </View>
                    <Text style={styles.emptyTitle}>No saved shopping trips</Text>
                    <Text style={styles.emptyText}>Complete and save a cart session to archive your shopping history and track prices.</Text>
                </View>
            ) : (
                sessions.slice().reverse().map((session) => (
                    <SessionCard
                        key={session.id}
                        session={session}
                        sessions={sessions}
                        onOpen={setSelectedSession}
                        onDelete={deleteSession}
                        darkMode={darkMode}
                    />
                ))
            )}

            <View style={{ height: 100 }} />

            {/* Session Detail Modal */}
            <Modal visible={selectedSession !== null} transparent animationType="fade" onRequestClose={() => setSelectedSession(null)}>
                <View style={styles.modalBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedSession(null)} />
                    {selectedSession && (
                        <View style={styles.detailSheet}>
                            <View style={styles.detailHeader}>
                                <View>
                                    <Text style={styles.detailKicker}>{formatShortDate(selectedSession.date)}</Text>
                                    <Text style={styles.detailTitle}>{selectedSession.storeName || 'Shopping Trip'}</Text>
                                </View>
                                <View style={styles.detailHeaderActions}>
                                    <TouchableOpacity
                                        style={styles.deleteModalButton}
                                        onPress={() => {
                                            deleteSession(selectedSession.id);
                                            setSelectedSession(null);
                                        }}>
                                        <Ionicons name="trash-outline" size={18} color={t.danger} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedSession(null)}>
                                        <Ionicons name="close" size={20} color={t.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.detailSummary}>
                                <Text style={styles.detailTotal}>{formatMoney(selectedSession.total)}</Text>
                                <Text style={styles.detailMeta}>
                                    {selectedSession.items.length} items • Budget: {selectedSession.budget > 0 ? formatMoney(selectedSession.budget) : 'None'}
                                </Text>
                            </View>

                            <ScrollView style={styles.detailItems} showsVerticalScrollIndicator={false}>
                                {selectedSession.items.map((item) => {
                                    const comparable = getComparablePrices(sessions, item.name);
                                    const stores = Object.entries(comparable);
                                    return (
                                        <View key={item.id} style={styles.detailItem}>
                                            <View style={styles.detailItemText}>
                                                <Text style={styles.detailItemName}>{item.name}</Text>
                                                <Text style={styles.detailItemMeta}>
                                                    {item.quantity} × {formatMoney(item.price)} {item.isRecurring ? '• Recurring' : ''}
                                                </Text>
                                                {stores.length > 0 && (
                                                    <View style={styles.storeCompareRow}>
                                                        {stores.map(([store, prices]) => {
                                                            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                                                            return (
                                                                <Text key={store} style={styles.storeComparePill}>
                                                                    {store}: {formatMoney(avg)}
                                                                </Text>
                                                            );
                                                        })}
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.detailItemPrice}>{formatMoney(item.price * item.quantity)}</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </Modal>
        </ScrollView>
    );
}

const getStyles = (t: ReturnType<typeof getTheme>) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    content: { paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    kicker: { color: t.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
    title: { color: t.text, fontSize: 30, fontWeight: '900' },
    headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: t.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.glassBorder },
    summary: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    summaryItem: { flex: 1, backgroundColor: t.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: t.glassBorder, minHeight: 84, justifyContent: 'space-between', ...shadow },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    summaryValue: { color: t.text, fontSize: 17, fontWeight: '900' },
    summaryLabel: { color: t.muted, fontSize: 12, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 18, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.glassBorder, marginBottom: 16 },
    emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: t.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.glassBorder },
    emptyTitle: { color: t.text, fontWeight: '800', marginTop: 12, fontSize: 16 },
    emptyText: { color: t.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
    cardContainer: { marginBottom: 12 },
    sessionCard: { backgroundColor: t.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: t.glassBorder, ...shadow },
    sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sessionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: t.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.glassBorder },
    sessionTitleBlock: { flex: 1 },
    sessionDate: { color: t.text, fontSize: 16, fontWeight: '800' },
    sessionMeta: { color: t.muted, fontSize: 12, marginTop: 3, fontWeight: '600' },
    sessionRightBlock: { alignItems: 'flex-end', gap: 6 },
    sessionTotal: { color: t.text, fontSize: 17, fontWeight: '900' },
    deleteIconButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: t.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.glassBorder },
    budgetBadgeWrap: { marginTop: 10, flexDirection: 'row' },
    budgetBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    budgetBadgeUnder: { backgroundColor: t.surfaceBlue, borderColor: t.glassBorder },
    budgetBadgeOver: { backgroundColor: t.dangerSoft, borderColor: t.danger },
    budgetLine: { color: t.text, fontSize: 12, fontWeight: '700' },
    overText: { color: t.danger, fontWeight: '800' },
    itemList: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.glassBorder, gap: 6 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    historyItemName: { flex: 1, color: t.text, fontSize: 13, fontWeight: '600' },
    historyItemPrice: { color: t.muted, fontSize: 13, fontWeight: '600' },
    moreText: { color: t.soft, fontSize: 12, fontWeight: '800', marginTop: 2 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    detailSheet: { width: '100%', maxHeight: '78%', backgroundColor: t.card, borderRadius: 24, borderWidth: 1, borderColor: t.glassBorder, padding: 18, ...shadow },
    detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    detailKicker: { color: t.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    detailTitle: { color: t.text, fontSize: 22, fontWeight: '900', marginTop: 2 },
    detailHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteModalButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: t.dangerSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.danger },
    closeButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: t.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.glassBorder },
    detailSummary: { marginTop: 16, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder },
    detailTotal: { color: t.text, fontSize: 28, fontWeight: '900' },
    detailMeta: { color: t.muted, fontSize: 13, marginTop: 4 },
    detailItems: { marginTop: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.glassBorder },
    detailItemText: { flex: 1 },
    detailItemName: { color: t.text, fontSize: 15, fontWeight: '800' },
    detailItemMeta: { color: t.muted, fontSize: 12, marginTop: 4 },
    storeCompareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    storeComparePill: { color: t.text, fontSize: 11, fontWeight: '800', backgroundColor: t.surfaceBlue, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: t.glassBorder },
    priceHistoryBox: { marginTop: 8, padding: 10, borderRadius: 14, backgroundColor: t.surfaceBlue, borderWidth: 1, borderColor: t.glassBorder },
    priceHistoryTitle: { color: t.text, fontSize: 12, fontWeight: '900' },
    priceHistoryText: { color: t.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
    priceDots: { flexDirection: 'row', gap: 6, marginTop: 8 },
    priceDotWrap: { flex: 1, height: 8, borderRadius: 99, backgroundColor: t.surfaceBlue, overflow: 'hidden' },
    priceDot: { height: '100%', width: '70%', borderRadius: 99, backgroundColor: t.muted },
    priceDotHigh: { backgroundColor: t.danger },
    priceDotLow: { backgroundColor: t.primary },
    detailItemPrice: { color: t.text, fontSize: 15, fontWeight: '900' },
});
