import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

type SkeletonProps = {
    width?: number | `${number}%` | 'auto';
    height: number;
    radius?: number;
    style?: ViewStyle;
};

export default function Skeleton({ width = '100%', height, radius = 8, style }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 760,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 760,
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.base,
                { width, height, borderRadius: radius, opacity },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: colors.skeleton,
    },
});
