import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatMoney } from '../lib/format';
import { colors } from '../lib/theme';

type BudgetDonutProps = {
    spent: number;
    budget: number;
};

export default function BudgetDonut({ spent, budget }: BudgetDonutProps) {
    const size = 132;
    const stroke = 13;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
    const remainingStroke = circumference - pct * circumference;
    const isOver = budget > 0 && spent > budget;
    const color = isOver ? colors.danger : pct > 0.85 ? colors.warning : colors.success;
    const label = budget <= 0 ? 'set budget' : isOver ? 'over' : pct > 0.85 ? 'caution' : 'on track';

    return (
        <View style={styles.wrap}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(0,0,0,0.08)"
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
                <Text style={[styles.percent, { color }]}>{budget > 0 ? `${Math.round(pct * 100)}%` : '0%'}</Text>
                <Text style={styles.caption}>{label}</Text>
            </View>
            <Text style={[styles.total, { color }]}>{formatMoney(spent)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center' },
    center: { position: 'absolute', top: 42, alignItems: 'center' },
    percent: { fontSize: 24, fontWeight: '900' },
    caption: { fontSize: 10, color: colors.muted, marginTop: 1, fontWeight: '800', textTransform: 'uppercase' },
    total: { marginTop: 8, fontSize: 12, fontWeight: '800' },
});
