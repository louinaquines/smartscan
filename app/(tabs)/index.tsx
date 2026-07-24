import { useState, useEffect, useRef, useMemo } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppDialog from '../../components/AppDialog';
import BudgetDonut from '../../components/BudgetDonut';
import Mascot from '../../components/Mascot';
import { BUDGET_CATEGORIES, BudgetCategoryId, DEFAULT_CATEGORY, getCategoryLabel } from '../../lib/budgetCategories';
import { formatMoney } from '../../lib/format';
import { getTheme, shadow } from '../../lib/theme';
import { useScreenPadding } from '../../lib/useScreenPadding';
import { useCartStore } from '../../store/useCartStore';
import SettingsSheet from '../../components/SettingsSheet';
import { getCurrency } from '../../lib/currencies';

export default function Dashboard() {
    const { items, budget, categoryBudgets, sessions, shoppingList, setBudget, setCategoryBudget, total, remaining, isHydrated, currencyId, setCurrency, themeMode, setThemeMode } = useCartStore();
    const isDark = themeMode === 'dark';
    const colors = useMemo(() => getTheme(isDark), [isDark]);
    
    const [budgetInput, setBudgetInput] = useState(budget > 0 ? String(budget) : '');
    const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [budgetSavedDialogOpen, setBudgetSavedDialogOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<BudgetCategoryId | null>(null);
    const screenPadding = useScreenPadding();
    const activeCurrency = useMemo(() => getCurrency(currencyId), [currencyId]);

    const styles = useMemo(() => StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.bg },
        ambientTop: { ...StyleSheet.absoluteFillObject, height: 360, backgroundColor: isDark ? colors.bg : '#FFFFFF' },
        ambientBlob: { position: 'absolute', top: -126, right: -84, width: 276, height: 276, borderRadius: 138, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
        headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.glassBorder },
        headerPillText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
        budgetGlassCard: {
            backgroundColor: colors.card,
            borderRadius: 26,
            padding: 22,
            marginBottom: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.glassBorder,
            ...shadow
        },
        smartPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 18 },
        smartIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
        smartCopy: { flex: 1, minWidth: 0 },
        smartTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
        smartText: { color: colors.muted, fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 3 },
        statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
        label: { fontSize: 12, color: colors.soft, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
        budgetAmount: { fontSize: 34, color: colors.text, fontWeight: '900', marginTop: 2, flexShrink: 1 },
        spentLine: { fontSize: 13, color: colors.muted, marginTop: 5, fontWeight: '700' },
        budgetMessage: { fontSize: 13, color: colors.soft, marginTop: 4 },
        progressTrack: { height: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', marginTop: 22, borderWidth: 1, borderColor: colors.glassBorder },
        budgetInput: { flex: 1, height: 50, backgroundColor: colors.glass, borderRadius: 16, paddingHorizontal: 16, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, fontSize: 15 },
        saveButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
        metric: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 14, paddingRight: 24, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.card, overflow: 'hidden' },
        metricIconBlue: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
        metricIconPink: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
        metricValue: { fontSize: 20, color: colors.text, fontWeight: '900' },
        metricLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
        sectionTitle: { fontSize: 18, color: colors.text, fontWeight: '900' },
        sectionAction: { color: colors.primary, fontWeight: '800' },
        sectionMeta: { color: colors.muted, fontSize: 13, fontWeight: '800' },
        categoryChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: colors.glassBorder,
        },
        categoryChipActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        chipIcon: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        chipIconActive: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
        },
        chipText: { minWidth: 0 },
        chipLabel: { color: colors.text, fontSize: 13, fontWeight: '900' },
        chipLabelActive: { color: isDark ? '#111' : '#FFF' },
        chipAmount: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1 },
        chipAmountActive: { color: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' },
        chipAmountOver: { color: colors.danger },
        categoryDetail: {
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 18,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.glassBorder,
        },
        detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        detailIconWrap: {
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.glassBorder,
        },
        detailTitleBlock: { flex: 1, minWidth: 0 },
        detailName: { color: colors.text, fontSize: 16, fontWeight: '900' },
        detailStatus: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
        detailStatusOver: { color: colors.danger },
        detailStatValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
        detailStatLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
        detailDivider: { width: 1, height: 32, backgroundColor: colors.glassBorder },
        detailStats: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 16,
            marginBottom: 14,
            gap: 0,
        },
        detailStat: { flex: 1, alignItems: 'center' },
        categoryTrack: { height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', marginTop: 8 },
        categoryFill: { height: '100%', borderRadius: 99 },
        categoryInput: { flex: 1, height: 44, backgroundColor: colors.glass, borderRadius: 14, paddingHorizontal: 14, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, fontSize: 14 },
        categoryInputRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
        categorySave: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
        emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.card, overflow: 'hidden' },
        emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
        emptyTitle: { fontSize: 17, color: colors.text, fontWeight: '800', marginTop: 16 },
        emptyText: { color: colors.soft, marginTop: 6, textAlign: 'center', fontSize: 14 },
        recentList: {
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            overflow: 'hidden',
        },
        recentItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderTopWidth: 1,
            borderTopColor: colors.glassBorder,
        },
        recentItemFirst: { borderTopWidth: 0 },
        itemInfo: { flex: 1, minWidth: 0 },
        itemIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
        itemName: { color: colors.text, fontSize: 15, fontWeight: '800' },
        itemMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
        itemPrice: { color: colors.primary, fontSize: 16, fontWeight: '900' },
        viewAllButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: colors.glassBorder,
        },
        viewAllText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
        trendPanel: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
        trendValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
        trendLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 3, textTransform: 'uppercase' },
        trendDivider: { width: 1, height: 34, backgroundColor: colors.glassBorder },
        trendEmpty: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
        trendStore: { width: 72, color: colors.text, fontSize: 12, fontWeight: '800' },
        trendTrack: { flex: 1, height: 10, backgroundColor: colors.surfaceBlue, borderRadius: 99, overflow: 'hidden' },
        trendFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
        trendAmount: { width: 78, color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'right' },
        budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
        budgetCopy: { flex: 1 },
        statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, marginBottom: 12 },
        statusDot: { width: 7, height: 7, borderRadius: 4 },
        budgetAmountContainer: { flexDirection: 'row', alignItems: 'baseline', minWidth: 0, maxWidth: '100%' },
        remaining: { fontSize: 14, fontWeight: '800', marginTop: 6 },
        progressFill: { height: '100%', borderRadius: 99 },
        budgetInputRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
        content: {},
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
        brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        brandLogo: { width: 48, height: 48, borderRadius: 14 },
        metricsWrapper: { marginBottom: 24 },
        metrics: { gap: 12, flexDirection: 'row' },
        sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
        chipScrollWrapper: { marginBottom: 12 },
        chipScroll: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
        trendSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
        trendSummaryItem: { flex: 1, alignItems: 'center' },
        trendBars: { gap: 10 },
        trendBarRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
        title: { fontSize: 30, color: colors.text, fontWeight: '900', marginTop: 2 },
        scannedIcon: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.glassBorder },
        manualIcon: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.glassBorder },
    }), [colors, isDark]);

    const spent = total();
    const rem = remaining();
    const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const scannedCount = items.filter((item) => item.isScanned).length;
    const manualCount = items.length - scannedCount;
    const statusColor = rem < 0 ? colors.danger : progress > 85 ? colors.warning : colors.success;
    const statusBg = rem < 0 ? colors.dangerSoft : progress > 85 ? colors.warningSoft : colors.successSoft;
    const statusText = budget <= 0 ? 'Set your budget' : rem < 0 ? 'Over budget' : progress > 85 ? 'Almost full' : 'On track';

    const progressAnim = useRef(new Animated.Value(0));
    const recentItems = items.slice(-5).reverse();
    const recentSessions = sessions.slice(0, 6).reverse();
    const now = Date.now();
    const weekSpent = sessions
        .filter((session) => now - new Date(session.date).getTime() <= 7 * 24 * 60 * 60 * 1000)
        .reduce((sum, session) => sum + session.total, 0);
    const monthSpent = sessions
        .filter((session) => now - new Date(session.date).getTime() <= 30 * 24 * 60 * 60 * 1000)
        .reduce((sum, session) => sum + session.total, 0);
    const maxTrendTotal = Math.max(1, ...recentSessions.map((session) => session.total));
    const openListCount = shoppingList.filter((item) => !item.checked).length;
    const storeVisits = sessions.reduce<Record<string, number>>((acc, s) => {
        if (s.storeName) acc[s.storeName] = (acc[s.storeName] || 0) + 1;
        return acc;
    }, {});
    const topStoreEntry = Object.entries(storeVisits).sort((a, b) => b[1] - a[1])[0];
    const topStoreName = topStoreEntry?.[0];
    const topStoreSessions = topStoreName
        ? sessions.filter((s) => s.storeName === topStoreName)
        : [];
    const topStoreAverage = topStoreSessions.length > 0
        ? topStoreSessions.reduce((sum, s) => sum + s.total, 0) / topStoreSessions.length
        : 0;
    const cartVsAverage = topStoreAverage > 0 ? spent - topStoreAverage : 0;
    const smartSuggestion = topStoreName && topStoreAverage > 0
        ? cartVsAverage > 0
            ? `Your cart (${formatMoney(spent)}) is ${formatMoney(Math.round(cartVsAverage))} above your usual ${formatMoney(Math.round(topStoreAverage))} at ${topStoreName}. ${rem < 0 ? 'You\'re over budget.' : openListCount > 0 ? `You still have ${openListCount} item${openListCount === 1 ? '' : 's'} on your list.` : 'Consider trimming before checkout.'}`
            : `Your cart (${formatMoney(spent)}) is ${formatMoney(Math.round(Math.abs(cartVsAverage)))} below your usual ${formatMoney(Math.round(topStoreAverage))} at ${topStoreName}. ${openListCount > 0 ? `You have ${openListCount} item${openListCount === 1 ? '' : 's'} left to grab.` : 'You\'re in good shape.'}`
        : openListCount > 0
            ? `${openListCount} shopping list item${openListCount === 1 ? '' : 's'} still to pick up.`
            : budget > 0
                ? `Budget is ${formatMoney(budget)} — you've spent ${formatMoney(spent)} so far.`
                : 'Set a budget and save a few sessions to get personalized suggestions.';
    const categorySpend = BUDGET_CATEGORIES.map((category) => {
        const spent = items
            .filter((item) => (item.category ?? DEFAULT_CATEGORY) === category.id)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
        const categoryBudget = categoryBudgets[category.id] ?? 0;
        return { ...category, spent, budget: categoryBudget, remaining: categoryBudget - spent };
    });

    useEffect(() => {
        Animated.spring(progressAnim.current, {
            toValue: progress,
            useNativeDriver: false,
            friction: 7,
            tension: 40,
        }).start();
    }, [progress, progressAnim]);

    const activeCategoryData = activeCategory
        ? categorySpend.find((c) => c.id === activeCategory) ?? null
        : null;

    const handleBudgetSave = async () => {
        const value = Number(budgetInput.replace(/,/g, ''));
        if (!Number.isFinite(value) || value <= 0) {
            setDialogOpen(true);
            return;
        }
        await setBudget(value);
        setBudgetSavedDialogOpen(true);
    };

    const handleCategoryBudgetSave = async (category: BudgetCategoryId) => {
        const raw = categoryInputs[category] ?? String(categoryBudgets[category] || '');
        const value = Number(raw.replace(/,/g, ''));
        if (!Number.isFinite(value) || value < 0) {
            setDialogOpen(true);
            return;
        }
        await setCategoryBudget(category, value);
        setCategoryInputs((current) => ({ ...current, [category]: '' }));
        setBudgetSavedDialogOpen(true);
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

    if (!isHydrated) return null;

    return (
        <View style={styles.screen}>
            <View style={styles.ambientTop} />
            <View style={styles.ambientBlob} />

            <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <Image source={require('../../assets/cany-logo2.png')} style={styles.brandLogo} />
                        <View>
                            <Text style={styles.title}>Cany</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => setSettingsOpen(true)} hitSlop={10}>
                        <Ionicons name="settings-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <Mascot message={mascotMessage} type={mascotType} />

                <View style={styles.smartPanel}>
                    <View style={styles.smartIcon}>
                        <Ionicons name="bulb-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.smartCopy}>
                        <Text style={styles.smartTitle}>Smart suggestion</Text>
                        <Text style={styles.smartText}>{smartSuggestion}</Text>
                    </View>
                </View>

                {/* Glassmorphic Budget Panel */}
                <View style={styles.budgetGlassCard}>
                    <View style={styles.budgetTop}>
                        <View style={styles.budgetCopy}>
                            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                            </View>
                            <Text style={styles.label}>Budget</Text>
                            <View style={styles.budgetAmountContainer}>
                                <Text style={styles.budgetAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45}>{budget > 0 ? formatMoney(budget) : '₱ 0.00'}</Text>
                            </View>
                            <Text style={styles.spentLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>Spent {formatMoney(spent)}</Text>
                            {budget > 0 ? (
                                <Text style={[styles.remaining, { color: statusColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                    {rem < 0 ? `${formatMoney(Math.abs(rem))} over budget` : `${formatMoney(rem)} left`}
                                </Text>
                            ) : (
                                <Text style={styles.budgetMessage}>No budget set</Text>
                            )}
                        </View>
                        <BudgetDonut spent={spent} budget={budget} categories={categorySpend.map((category) => ({ id: category.id, spent: category.spent, budget: category.budget }))} />
                    </View>

                    {/* Animated Progress Track */}
                    <View style={styles.progressTrack}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    backgroundColor: statusColor,
                                    width: progressAnim.current.interpolate({
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
                            <Ionicons name="checkmark" size={20} color={isDark ? '#111' : '#FFF'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <Text style={styles.sectionMeta}>{formatMoney(budget)} total</Text>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.chipScrollWrapper, { marginHorizontal: -screenPadding.paddingHorizontal }]}
                    contentContainerStyle={[styles.chipScroll, { paddingHorizontal: screenPadding.paddingHorizontal }]}>
                    {categorySpend.map((category) => {
                        const isActive = activeCategory === category.id;
                        const over = category.budget > 0 && category.remaining < 0;
                        return (
                            <TouchableOpacity
                                key={category.id}
                                activeOpacity={0.7}
                                onPress={() => setActiveCategory(isActive ? null : category.id)}
                                style={[styles.categoryChip, isActive && styles.categoryChipActive]}>
                                <View style={[styles.chipIcon, isActive && styles.chipIconActive]}>
                                    <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={15} color={isActive ? (isDark ? '#111' : '#FFF') : colors.primary} />
                                </View>
                                <View style={styles.chipText}>
                                    <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]} numberOfLines={1}>{getCategoryLabel(category.id)}</Text>
                                    <Text style={[styles.chipAmount, isActive && styles.chipAmountActive, over && styles.chipAmountOver]} numberOfLines={1}>{formatMoney(category.spent)}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {activeCategoryData && (() => {
                    const pct = activeCategoryData.budget > 0 ? Math.min(activeCategoryData.spent / activeCategoryData.budget, 1) : 0;
                    const over = activeCategoryData.budget > 0 && activeCategoryData.remaining < 0;
                    return (
                        <View style={styles.categoryDetail}>
                            <View style={styles.detailHeader}>
                                <View style={styles.detailIconWrap}>
                                    <Ionicons name={activeCategoryData.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
                                </View>
                                <View style={styles.detailTitleBlock}>
                                    <Text style={styles.detailName}>{getCategoryLabel(activeCategoryData.id)}</Text>
                                    <Text style={[styles.detailStatus, over && styles.detailStatusOver]}>
                                        {activeCategoryData.budget > 0
                                            ? over
                                                ? `${formatMoney(Math.abs(activeCategoryData.remaining))} over budget`
                                                : `${formatMoney(activeCategoryData.remaining)} remaining`
                                            : 'No budget set'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setActiveCategory(null)} hitSlop={12}>
                                    <Ionicons name="close" size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.detailStats}>
                                <View style={styles.detailStat}>
                                    <Text style={styles.detailStatValue}>{formatMoney(activeCategoryData.spent)}</Text>
                                    <Text style={styles.detailStatLabel}>Spent</Text>
                                </View>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailStat}>
                                    <Text style={styles.detailStatValue}>{formatMoney(activeCategoryData.budget)}</Text>
                                    <Text style={styles.detailStatLabel}>Budget</Text>
                                </View>
                            </View>

                            <View style={styles.categoryTrack}>
                                <View style={[styles.categoryFill, { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : colors.primary }]} />
                            </View>

                            <View style={styles.categoryInputRow}>
                                <TextInput
                                    style={styles.categoryInput}
                                    value={categoryInputs[activeCategoryData.id] ?? ''}
                                    onChangeText={(value) => setCategoryInputs((current) => ({ ...current, [activeCategoryData.id]: value }))}
                                    keyboardType="decimal-pad"
                                    placeholder={activeCategoryData.budget > 0 ? `Budget: ₱${activeCategoryData.budget}` : 'Set budget...'}
                                    placeholderTextColor={colors.soft}
                                />
                                <TouchableOpacity style={styles.categorySave} onPress={() => handleCategoryBudgetSave(activeCategoryData.id)}>
                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })()}

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
                    <Text style={styles.sectionTitle}>Trends</Text>
                    <Text style={styles.sectionMeta}>{sessions.length} trips</Text>
                </View>

                <View style={styles.trendPanel}>
                    <View style={styles.trendSummaryRow}>
                        <View style={styles.trendSummaryItem}>
                            <Text style={styles.trendValue}>{formatMoney(weekSpent)}</Text>
                            <Text style={styles.trendLabel}>This week</Text>
                        </View>
                        <View style={styles.trendDivider} />
                        <View style={styles.trendSummaryItem}>
                            <Text style={styles.trendValue}>{formatMoney(monthSpent)}</Text>
                            <Text style={styles.trendLabel}>30 days</Text>
                        </View>
                    </View>
                    {recentSessions.length === 0 ? (
                        <Text style={styles.trendEmpty}>Save sessions to see grocery trip trends.</Text>
                    ) : (
                        <View style={styles.trendBars}>
                            {recentSessions.map((session) => (
                                <View key={session.id} style={styles.trendBarRow}>
                                    <Text style={styles.trendStore} numberOfLines={1}>{session.storeName || 'Store'}</Text>
                                    <View style={styles.trendTrack}>
                                        <View style={[styles.trendFill, { width: `${Math.max(8, (session.total / maxTrendTotal) * 100)}%` }]} />
                                    </View>
                                    <Text style={styles.trendAmount}>{formatMoney(session.total)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

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
                    <View style={styles.recentList}>
                        {recentItems.map((item, index) => (
                            <View key={item.id} style={[styles.recentItem, index === 0 && styles.recentItemFirst]}>
                                <View style={[styles.itemIcon, item.isScanned ? styles.scannedIcon : styles.manualIcon]}>
                                    <Ionicons name={item.isScanned ? 'scan' : 'create-outline'} size={16} color={item.isScanned ? colors.accent : colors.primary} />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.itemMeta}>{item.quantity} × {formatMoney(item.price)}</Text>
                                </View>
                                <Text style={styles.itemPrice}>{formatMoney(item.price * item.quantity)}</Text>
                            </View>
                        ))}
                        {items.length > 5 && (
                            <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/cart')}>
                                <Text style={styles.viewAllText}>View all {items.length} items</Text>
                                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                
                {/* Spacer for floating FAB */}
                <View style={{ height: 100 }} />
            </ScrollView>
            <AppDialog
                visible={dialogOpen}
                title="Invalid budget"
                message="Enter a budget greater than zero."
                icon="wallet-outline"
                onDismiss={() => setDialogOpen(false)}
                actions={[{ label: 'OK', onPress: () => setDialogOpen(false) }]}
            />
            <AppDialog
                visible={budgetSavedDialogOpen}
                title="Budget set"
                message="Your budget has been updated."
                icon="checkmark-done-outline"
                onDismiss={() => setBudgetSavedDialogOpen(false)}
                actions={[{ label: 'OK', onPress: () => setBudgetSavedDialogOpen(false) }]}
            />
            <SettingsSheet
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                currencyId={currencyId}
                setCurrency={setCurrency}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                activeCurrency={activeCurrency}
            />
        </View>
    );
}