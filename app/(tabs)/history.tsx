import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Mascot from '../../components/Mascot';
import { formatMoney, formatShortDate } from '../../lib/format';
import { colors, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { useCartStore } from '../../store/useCartStore';

export default function History() {
    const sessions = useCartStore((state) => state.sessions);
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
                sessions.map((session) => {
                    const unitCount = session.items.reduce((sum, item) => sum + item.quantity, 0);
                    const budgetDiff = session.budget - session.total;
                    const over = session.budget > 0 && budgetDiff < 0;

                    return (
                        <View key={session.id} style={styles.sessionCard}>
                            <View style={styles.sessionTop}>
                                <View style={styles.sessionIcon}>
                                    <Ionicons name="bag-check-outline" size={19} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.sessionDate}>{formatShortDate(session.date)}</Text>
                                    <Text style={styles.sessionMeta}>{unitCount} unit{unitCount === 1 ? '' : 's'} in {session.items.length} item{session.items.length === 1 ? '' : 's'}</Text>
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
                                        <Text style={styles.historyItemPrice}>{item.quantity} x {formatMoney(item.price)}</Text>
                                    </View>
                                ))}
                                {session.items.length > 4 && (
                                    <Text style={styles.moreText}>+{session.items.length - 4} more</Text>
                                )}
                            </View>
                        </View>
                    );
                })
            )}
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
    sessionCard: { backgroundColor: colors.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 10, ...shadow },
    sessionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    sessionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primarySoft },
    sessionDate: { color: colors.text, fontSize: 16, fontWeight: '800' },
    sessionMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    sessionTotal: { marginLeft: 'auto', color: colors.text, fontSize: 17, fontWeight: '800' },
    budgetLine: { color: colors.success, fontSize: 12, fontWeight: '800', marginTop: 10 },
    overText: { color: colors.danger },
    itemList: { marginTop: 10, gap: 6 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    historyItemName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
    historyItemPrice: { color: colors.muted, fontSize: 13 },
    moreText: { color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 2 },
});
