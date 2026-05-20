import { useState, useEffect, useRef } from 'react';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BudgetDonut from '../../components/BudgetDonut';
import Mascot from '../../components/Mascot';
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
    const statusBg = rem < 0 ? colors.dangerSoft : progress > 85 ? colors.warningSoft : colors.successSoft;
    const statusText = budget <= 0 ? 'Set your budget' : rem < 0 ? 'Over budget' : progress > 85 ? 'Almost full' : 'On track';

    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(progressAnim, {
            toValue: progress,
            useNativeDriver: false,
            friction: 7,
            tension: 40,
        }).start();
    }, [progress, progressAnim]);

    const handleBudgetSave = async () => {
        const value = Number(budgetInput.replace(/,/g, ''));
        if (!Number.isFinite(value) || value <= 0) {
            Alert.alert('Invalid budget', 'Enter a budget greater than zero.');
            return;
        }
        await setBudget(value);
    };

    let mascotMessage = "Ready to start scanning? Set a budget and let's go.";
    let mascotType: 'neutral' | 'happy' | 'alert' = 'neutral';
    if (budget > 0) {
        if (rem < 0) {
            mascotMessage = "You are over budget. Review the cart before saving.";
            mascotType = 'alert';
        } else if (progress > 85) {
            mascotMessage = "You are close to your limit. Scan carefully.";
            mascotType = 'alert';
        } else if (spent > 0) {
            mascotMessage = "Nice progress. Your budget is still in a healthy range.";
            mascotType = 'happy';
        }
    }

    if (!isHydrated) return null; // Wait for hydration before showing animated elements

    return (
        <View style={styles.screen}>
            <View style={styles.ambientTop} />
            <View style={styles.ambientBlob} />

            <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <Image source={require('../../assets/cany-logo.jpg')} style={styles.brandLogo} />
                        <View>
                            <Text style={styles.title}>Cany</Text>
                        </View>
                    </View>
                    <View style={styles.headerPill}>
                        <Ionicons name="sparkles" size={14} color={colors.primary} />
                        <Text style={styles.headerPillText}>Smart cart</Text>
                    </View>
                </View>

                <Mascot message={mascotMessage} type={mascotType} />

                {/* Glassmorphic Budget Panel */}
                <View style={styles.budgetGlassCard}>
                    <View style={styles.glassShine} />
                    <View style={styles.cardGlowBlue} />
                    <View style={styles.cardGlowPink} />
                    
                    <View style={styles.budgetTop}>
                        <View style={styles.budgetCopy}>
                            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                            </View>
                            <Text style={styles.label}>Budget</Text>
                            <Text style={styles.budgetAmount}>{budget > 0 ? formatMoney(budget) : 'PHP 0.00'}</Text>
                            <Text style={styles.spentLine}>Spent {formatMoney(spent)}</Text>
                            {budget > 0 ? (
                                <Text style={[styles.remaining, { color: statusColor }]}>
                                    {rem < 0 ? `${formatMoney(Math.abs(rem))} over budget` : `${formatMoney(rem)} left`}
                                </Text>
                            ) : (
                                <Text style={styles.budgetMessage}>No budget set</Text>
                            )}
                        </View>
                        <BudgetDonut spent={spent} budget={budget} />
                    </View>

                    {/* Animated Progress Track */}
                    <View style={styles.progressTrack}>
                        <Animated.View 
                            style={[
                                styles.progressFill, 
                                { 
                                    backgroundColor: statusColor, 
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    })
                                }
                            ]} 
                        />
                    </View>

                    <View style={styles.budgetInputRow}>
                        <TextInput
                            style={styles.budgetInput}
                            value={budgetInput}
                            onChangeText={setBudgetInput}
                            keyboardType="decimal-pad"
                            placeholder="Set budget..."
                            placeholderTextColor={colors.soft}
                        />
                        <TouchableOpacity style={styles.saveButton} onPress={handleBudgetSave}>
                            <Ionicons name="checkmark" size={20} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Metric Pills (Scrollable) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.metricsWrapper, { marginHorizontal: -screenPadding.paddingHorizontal }]}
                    contentContainerStyle={[styles.metrics, { paddingHorizontal: screenPadding.paddingHorizontal }]}>
                    <View style={styles.metric}>
                        <View style={styles.metricIconBlue}>
                            <Ionicons name="bag-handle-outline" size={18} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.metricValue}>{items.length}</Text>
                            <Text style={styles.metricLabel}>Items</Text>
                        </View>
                    </View>
                    <View style={styles.metric}>
                        <View style={styles.metricIconPink}>
                            <Ionicons name="scan" size={18} color={colors.accent} />
                        </View>
                        <View>
                            <Text style={styles.metricValue}>{scannedCount}</Text>
                            <Text style={styles.metricLabel}>Scanned</Text>
                        </View>
                    </View>
                    <View style={styles.metric}>
                        <View style={styles.metricIconBlue}>
                            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.metricValue}>{sessions.length}</Text>
                            <Text style={styles.metricLabel}>Sessions</Text>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Items</Text>
                    <TouchableOpacity onPress={() => router.push('/cart')}>
                        <Text style={styles.sectionAction}>View Cart</Text>
                    </TouchableOpacity>
                </View>

                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="basket-outline" size={32} color={colors.accent} />
                        </View>
                        <Text style={styles.emptyTitle}>Your cart is empty</Text>
                        <Text style={styles.emptyText}>Tap the scanner below to begin!</Text>
                    </View>
                ) : (
                    items.slice(0, 4).map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={[styles.itemIcon, item.isScanned ? styles.scannedIcon : styles.manualIcon]}>
                                <Ionicons name={item.isScanned ? 'scan' : 'create-outline'} size={16} color={item.isScanned ? colors.accent : colors.primary} />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.itemMeta}>{item.quantity} x {formatMoney(item.price)}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{formatMoney(item.price * item.quantity)}</Text>
                        </View>
                    ))
                )}
                
                {/* Spacer for floating FAB */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    ambientTop: { ...StyleSheet.absoluteFillObject, height: 360, backgroundColor: '#101E33' },
    ambientBlob: { position: 'absolute', top: -126, right: -84, width: 276, height: 276, borderRadius: 138, backgroundColor: 'rgba(244,142,173,0.18)' },
    content: {},
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brandLogo: { width: 48, height: 48, borderRadius: 16, borderColor: colors.glassBorder, borderWidth: 1 },
    kicker: { fontSize: 13, color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 30, color: colors.text, fontWeight: '900', marginTop: 2 },
    headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.glassBorder },
    headerPillText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
    
    budgetGlassCard: {
        backgroundColor: 'rgba(18,27,42,0.94)',
        borderRadius: 26,
        padding: 22,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadow
    },
    glassShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 96, backgroundColor: 'rgba(255,255,255,0.05)' },
    cardGlowBlue: { position: 'absolute', top: -44, left: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(142,190,244,0.14)' },
    cardGlowPink: { position: 'absolute', bottom: -58, right: -42, width: 146, height: 146, borderRadius: 73, backgroundColor: 'rgba(244,142,173,0.14)' },
    budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    budgetCopy: { flex: 1 },
    statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, marginBottom: 12 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    label: { fontSize: 12, color: colors.soft, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    budgetAmount: { fontSize: 34, color: colors.text, fontWeight: '900', marginTop: 2 },
    spentLine: { fontSize: 13, color: colors.muted, marginTop: 5, fontWeight: '700' },
    budgetMessage: { fontSize: 13, color: colors.soft, marginTop: 4 },
    remaining: { fontSize: 14, fontWeight: '800', marginTop: 6 },
    
    progressTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', marginTop: 22, borderWidth: 1, borderColor: colors.glassBorder },
    progressFill: { height: '100%', borderRadius: 99 },
    
    budgetInputRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    budgetInput: { flex: 1, height: 50, backgroundColor: colors.glass, borderRadius: 16, paddingHorizontal: 16, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, fontSize: 15 },
    saveButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    
    metricsWrapper: { marginBottom: 24 },
    metrics: { gap: 12, flexDirection: 'row' },
    metric: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 14, paddingRight: 24, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: 'rgba(18,27,42,0.8)', overflow: 'hidden' },
    metricIconBlue: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
    metricIconPink: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
    metricValue: { fontSize: 20, color: colors.text, fontWeight: '900' },
    metricLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
    
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontSize: 18, color: colors.text, fontWeight: '900' },
    sectionAction: { color: colors.primary, fontWeight: '800' },
    
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: 'rgba(18,27,42,0.8)', overflow: 'hidden' },
    emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
    emptyTitle: { fontSize: 17, color: colors.text, fontWeight: '800', marginTop: 16 },
    emptyText: { color: colors.soft, marginTop: 6, textAlign: 'center', fontSize: 14 },
    
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 10 },
    itemIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    scannedIcon: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.glassBorder },
    manualIcon: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.glassBorder },
    itemInfo: { flex: 1 },
    itemName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    itemMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    itemPrice: { color: colors.primary, fontSize: 16, fontWeight: '900' },
});
