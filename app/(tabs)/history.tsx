import { useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDialog from '../../components/AppDialog';
import Mascot from '../../components/Mascot';
import { formatMoney, formatShortDate } from '../../lib/format';
import { getProductHistory, getProductHistorySummary } from '../../lib/productHistory';
import { colors, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { ShoppingSession, useCartStore } from '../../store/useCartStore';

type SessionCardProps = {
    session: ShoppingSession;
    sessions: ShoppingSession[];
    onOpen: (session: ShoppingSession) => void;
    onDelete: (id: string) => void;
};

function getComparablePrices(sessions: ShoppingSession[], itemName: string, barcode?: string) {
    const keyName = itemName.toLowerCase();
    return sessions
        .flatMap((session) => session.items.map((item) => ({ item, session })))
        .filter(({ item }) => barcode ? item.barcode === barcode : item.name.toLowerCase() === keyName)
        .filter(({ session }) => session.storeName)
        .reduce<Record<string, number[]>>((stores, { item, session }) => {
            const store = session.storeName ?? 'Unknown';
            stores[store] = [...(stores[store] ?? []), item.price];
            return stores;
        }, {});
}

function SessionCard({ session, sessions, onOpen, onDelete }: SessionCardProps) {
    const translateX = useRef(new Animated.Value(0));
    const [confirmOpen, setConfirmOpen] = useState(false);
    const unitCount = session.items.reduce((sum, item) => sum + item.quantity, 0);
    const budgetDiff = session.budget - session.total;
    const over = session.budget > 0 && budgetDiff < 0;

    const closeActions = () => {
        Animated.spring(translateX.current, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 70,
        }).start();
    };

    const openActions = () => {
        Animated.spring(translateX.current, {
            toValue: -78,
            useNativeDriver: true,
            friction: 8,
            tension: 70,
        }).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
            onPanResponderMove: (_, gesture) => {
                const nextX = Math.max(-86, Math.min(0, gesture.dx));
                translateX.current.setValue(nextX);
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx < -42) openActions();
                else closeActions();
            },
        })
    );

    return (
        <View style={styles.swipeWrap}>
            <TouchableOpacity style={styles.deleteAction} onPress={() => setConfirmOpen(true)} activeOpacity={0.84}>
                <Ionicons name="trash-outline" size={23} color="#FFF" />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ translateX: translateX.current }] }} {...panResponder.current.panHandlers}>
                <Pressable style={styles.sessionCard} onPress={() => onOpen(session)}>
                    <View style={styles.sessionTop}>
                        <View style={styles.sessionIcon}>
                            <Ionicons name="bag-check-outline" size={19} color={colors.primary} />
                        </View>
                        <View style={styles.sessionTitleBlock}>
                            <Text style={styles.sessionDate}>{formatShortDate(session.date)}</Text>
                            <Text style={styles.sessionMeta}>{session.storeName ? `${session.storeName} - ` : ''}{unitCount} unit{unitCount === 1 ? '' : 's'} in {session.items.length} item{session.items.length === 1 ? '' : 's'}</Text>
                        </View>
                        <Text style={styles.sessionTotal}>{formatMoney(session.total)}</Text>
                    </View>

                    {session.budget > 0 && (
                        <Text style={[styles.budgetLine, over && styles.overText]}>
                            {over ? `${formatMoney(Math.abs(budgetDiff))} over budget` : `${formatMoney(budgetDiff)} under budget`}
                        </Text>
                    )}

                    <View style={styles.itemList}>
                        {session.items.slice(0, 4).map((item) => (
                            <View key={item.id} style={styles.historyItem}>
                                <Text style={styles.historyItemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.historyItemPrice}>{item.isRecurring ? 'Repeat - ' : ''}{item.quantity} x {formatMoney(item.price)}</Text>
                            </View>
                        ))}
                        {session.items.length > 4 && (
                            <Text style={styles.moreText}>+{session.items.length - 4} more</Text>
                        )}
                    </View>
                </Pressable>
            </Animated.View>
            <AppDialog
                visible={confirmOpen}
                title="Delete history?"
                message="This removes this saved shopping session."
                icon="trash-outline"
                onDismiss={() => { setConfirmOpen(false); closeActions(); }}
                actions={[
                    { label: 'Cancel', variant: 'soft', onPress: () => { setConfirmOpen(false); closeActions(); } },
                    { label: 'Delete', onPress: () => { setConfirmOpen(false); onDelete(session.id); } },
                ]}
            />
        </View>
    );
}

export default function History() {
    const sessions = useCartStore((state) => state.sessions);
    const deleteSession = useCartStore((state) => state.deleteSession);
    const [selectedSession, setSelectedSession] = useState<ShoppingSession | null>(null);
    const screenPadding = useScreenPadding();
    const lifetimeTotal = sessions.reduce((sum, session) => sum + session.total, 0);
    const lifetimeItems = sessions.reduce((sum, session) => sum + session.items.reduce((count, item) => count + item.quantity, 0), 0);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={[styles.content, screenPadding]}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.kicker}>Saved trips</Text>
                    <Text style={styles.title}>History</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="time-outline" size={23} color={colors.primary} />
                </View>
            </View>

            <View style={styles.summary}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{sessions.length}</Text>
                    <Text style={styles.summaryLabel}>Sessions</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{lifetimeItems}</Text>
                    <Text style={styles.summaryLabel}>Units</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{formatMoney(lifetimeTotal)}</Text>
                    <Text style={styles.summaryLabel}>Spent</Text>
                </View>
            </View>

            {sessions.length === 0 ? (
                <>
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="receipt-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No sessions yet</Text>
                        <Text style={styles.emptyText}>Save a cart session when you finish shopping.</Text>
                    </View>
                    <Mascot message="Once you finish shopping and save a session, it will show up here!" type="neutral" />
                </>
            ) : (
                sessions.map((session) => (
                    <SessionCard
                        key={session.id}
                        session={session}
                        sessions={sessions}
                        onOpen={setSelectedSession}
                        onDelete={deleteSession}
                    />
                ))
            )}

            <Modal
                visible={Boolean(selectedSession)}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedSession(null)}>
                <View style={styles.modalBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedSession(null)} />
                    {selectedSession && (
                        <View style={styles.detailSheet}>
                            <View style={styles.detailHeader}>
                                <View>
                                    <Text style={styles.detailKicker}>Shopping session</Text>
                                    <Text style={styles.detailTitle}>{formatShortDate(selectedSession.date)}</Text>
                                </View>
                                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedSession(null)}>
                                    <Ionicons name="close" size={22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.detailSummary}>
                                <Text style={styles.detailTotal}>{formatMoney(selectedSession.total)}</Text>
                                <Text style={styles.detailMeta}>
                                    {selectedSession.storeName ? `${selectedSession.storeName} - ` : ''}{selectedSession.items.reduce((sum, item) => sum + item.quantity, 0)} units in {selectedSession.items.length} items
                                </Text>
                            </View>

                            <ScrollView style={styles.detailItems} showsVerticalScrollIndicator={false}>
                                {selectedSession.items.map((item) => (
                                    <View key={item.id} style={styles.detailItem}>
                                        <View style={styles.detailItemText}>
                                            <Text style={styles.detailItemName}>{item.name}</Text>
                                            <Text style={styles.detailItemMeta}>{item.quantity} x {formatMoney(item.price)}{item.isRecurring ? ' - recurring' : ''}</Text>
                                            {(() => {
                                                const history = getProductHistory(sessions, item);
                                                const summary = getProductHistorySummary(history);
                                                if (!summary || history.length <= 1) return null;
                                                return (
                                                    <View style={styles.priceHistoryBox}>
                                                        <Text style={styles.priceHistoryTitle}>Price history</Text>
                                                        <Text style={styles.priceHistoryText}>
                                                            Low {formatMoney(summary.min)} - High {formatMoney(summary.max)} - Latest {formatMoney(summary.latest.price)}
                                                        </Text>
                                                        <View style={styles.priceDots}>
                                                            {history.slice(-6).map((point) => (
                                                                <View key={`${point.date}-${point.price}`} style={styles.priceDotWrap}>
                                                                    <View style={[styles.priceDot, point.price === summary.max && styles.priceDotHigh, point.price === summary.min && styles.priceDotLow]} />
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                );
                                            })()}
                                            {(() => {
                                                const stores = getComparablePrices(sessions, item.name, item.barcode);
                                                const entries = Object.entries(stores)
                                                    .map(([store, prices]) => ({ store, avg: prices.reduce((sum, price) => sum + price, 0) / prices.length }))
                                                    .sort((a, b) => a.avg - b.avg)
                                                    .slice(0, 3);
                                                if (entries.length <= 1) return null;
                                                return (
                                                    <View style={styles.storeCompareRow}>
                                                        {entries.map((entry) => (
                                                            <Text key={entry.store} style={styles.storeComparePill}>{entry.store}: {formatMoney(entry.avg)}</Text>
                                                        ))}
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                        <Text style={styles.detailItemPrice}>{formatMoney(item.price * item.quantity)}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: {},
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    kicker: { color: colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
    title: { color: colors.text, fontSize: 30, fontWeight: '800' },
    headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primarySoft },
    summary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    summaryItem: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.glassBorder, minHeight: 92, justifyContent: 'center', ...shadow },
    summaryValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
    summaryLabel: { color: colors.muted, fontSize: 12, marginTop: 5 },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 18, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.glassBorder },
    emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryDeep },
    emptyTitle: { color: colors.text, fontWeight: '800', marginTop: 12, fontSize: 16 },
    emptyText: { color: colors.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
    swipeWrap: { marginBottom: 10, borderRadius: 20 },
    deleteAction: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 78, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sessionCard: { backgroundColor: colors.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.glassBorder, ...shadow },
    sessionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    sessionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primarySoft },
    sessionTitleBlock: { flex: 1, paddingRight: 8 },
    sessionDate: { color: colors.text, fontSize: 16, fontWeight: '800' },
    sessionMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    sessionTotal: { color: colors.text, fontSize: 17, fontWeight: '800' },
    budgetLine: { color: colors.success, fontSize: 12, fontWeight: '800', marginTop: 10 },
    overText: { color: colors.danger },
    itemList: { marginTop: 10, gap: 6 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    historyItemName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
    historyItemPrice: { color: colors.muted, fontSize: 13 },
    moreText: { color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 2 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    detailSheet: { width: '100%', maxHeight: '78%', backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.glassBorder, padding: 18, ...shadow },
    detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    detailKicker: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    detailTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 2 },
    closeButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
    detailSummary: { marginTop: 16, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surfaceBlue, borderWidth: 1, borderColor: colors.glassBorder },
    detailTotal: { color: colors.text, fontSize: 28, fontWeight: '900' },
    detailMeta: { color: colors.muted, fontSize: 13, marginTop: 4 },
    detailItems: { marginTop: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    detailItemText: { flex: 1 },
    detailItemName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    detailItemMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    storeCompareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    storeComparePill: { color: colors.text, fontSize: 11, fontWeight: '800', backgroundColor: colors.surfaceBlue, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: colors.glassBorder },
    priceHistoryBox: { marginTop: 8, padding: 10, borderRadius: 14, backgroundColor: colors.surfaceBlue, borderWidth: 1, borderColor: colors.glassBorder },
    priceHistoryTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
    priceHistoryText: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
    priceDots: { flexDirection: 'row', gap: 6, marginTop: 8 },
    priceDotWrap: { flex: 1, height: 8, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
    priceDot: { height: '100%', width: '70%', borderRadius: 99, backgroundColor: colors.muted },
    priceDotHigh: { backgroundColor: colors.danger },
    priceDotLow: { backgroundColor: colors.primary },
    detailItemPrice: { color: colors.text, fontSize: 15, fontWeight: '900' },
});
