import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useScreenPadding = () => {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const horizontal = width < 360 ? 14 : width > 430 ? 22 : 18;

    return {
        paddingTop: Math.max(14, insets.top + 8),
        paddingHorizontal: horizontal,
        paddingBottom: insets.bottom + 112,
    };
};
