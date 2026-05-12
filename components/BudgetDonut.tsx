import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatMoney } from '../lib/format';
import { colors } from '../lib/theme';

type BudgetDonutProps = {
    spent: number;
    budget: number;
};

export default function BudgetDonut({ spent, budget }: BudgetDonutProps) {
    const size = 148;
    const stroke = 16;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
    const remainingStroke = circumference - pct * circumference;
    const isOver = budget > 0 && spent > budget;
    const color = isOver ? colors.danger : pct > 0.85 ? colors.warning : colors.success;

    return (
        <View style={styles.wrap}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={colors.surfaceMuted}
                    strokeWidth={stroke}
                    fill="transparent"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={stroke}
                    fill="transparent"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={remainingStroke}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={styles.center}>
                <Text style={styles.percent}>{budget > 0 ? `${Math.round(pct * 100)}%` : '0%'}</Text>
                <Text style={styles.caption}>used</Text>
            </View>
            <Text style={[styles.total, isOver && styles.over]}>{formatMoney(spent)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center' },
    center: { position: 'absolute', top: 47, alignItems: 'center' },
    percent: { fontSize: 26, fontWeight: '800', color: colors.text },
    caption: { fontSize: 11, color: colors.muted, marginTop: 1 },
    total: { marginTop: 8, fontSize: 13, fontWeight: '700', color: colors.text },
    over: { color: colors.danger },
});
