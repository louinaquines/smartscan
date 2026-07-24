import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatMoney } from '../lib/format';
import { getTheme } from '../lib/theme';
import { useCartStore } from '../store/useCartStore';

type BudgetDonutProps = {
    spent: number;
    budget: number;
    categories?: { id: string; spent: number; budget: number }[];
};

export default function BudgetDonut({ spent, budget, categories = [] }: BudgetDonutProps) {
    const { themeMode } = useCartStore();
    const darkMode = themeMode === 'dark';
    const t = getTheme(darkMode);

    const size = 132;
    const stroke = 13;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedPct = budget > 0 ? Math.min(spent / budget, 1) : 0;
    const filledStroke = clampedPct * circumference;
    const isOver = budget > 0 && spent > budget;
    const color = isOver ? t.danger : clampedPct > 0.85 ? t.warning : t.text;
    const label = budget <= 0 ? 'set budget' : isOver ? 'over' : clampedPct > 0.85 ? 'caution' : 'on track';
    const visibleSegments = categories.filter((category) => category.spent > 0 && spent > 0);
    let segmentOffset = 0;

    return (
        <View style={styles.wrap}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={darkMode ? '#2c2c2c' : '#F7F7F4'}
                    strokeWidth={stroke}
                    fill="transparent"
                />
                {isOver ? (
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={t.text}
                        strokeWidth={stroke}
                        fill="transparent"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={0}
                        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                    />
                ) : visibleSegments.length > 0 ? (
                    visibleSegments.map((category, index) => {
                        const segmentLength = budget > 0 ? (category.spent / budget) * circumference : 0;
                        const dashOffset = segmentOffset;
                        segmentOffset += segmentLength;
                        return (
                            <Circle
                                key={category.id}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke={t.text}
                                strokeWidth={stroke}
                                fill="transparent"
                                strokeDasharray={`${segmentLength} ${circumference}`}
                                strokeDashoffset={-dashOffset}
                                transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                            />
                        );
                    })
                ) : (
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={t.text}
                        strokeWidth={stroke}
                        fill="transparent"
                        strokeDasharray={`${filledStroke} ${circumference}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                    />
                )}

            </Svg>
            <View style={styles.center}>
                <Text style={[styles.percent, { color }]}>{budget > 0 ? `${Math.round(clampedPct * 100)}%` : '0%'}</Text>
                <Text style={[styles.caption, { color: t.muted }]}>{label}</Text>
            </View>
            <Text style={[styles.total, { color }]}>{formatMoney(spent)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
    center: { position: 'absolute', top: 48, alignItems: 'center' },
    percent: { fontSize: 24, fontWeight: '900' },
    caption: { fontSize: 10, marginTop: 1, fontWeight: '800', textTransform: 'uppercase' },
    total: { marginTop: 8, fontSize: 12, fontWeight: '800' },
});
