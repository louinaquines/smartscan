import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
    BUDGET: 'budget',
    CART_ITEMS: 'cartItems',
    SESSIONS: 'sessions',
    CURRENCY: 'currency',
    ONBOARDING_COMPLETE: 'onboardingComplete',
} as const;

export const storage = {
    set: async (key: string, value: number | string | object) => {
        const stored = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await AsyncStorage.setItem(key, stored);
    },
    getNumber: async (key: string): Promise<number | null> => {
        const val = await AsyncStorage.getItem(key);
        return val ? parseFloat(val) : null;
    },
    getString: async (key: string): Promise<string | null> => {
        return await AsyncStorage.getItem(key);
    },
    getJson: async <T>(key: string, fallback: T): Promise<T> => {
        const val = await AsyncStorage.getItem(key);
        if (!val) return fallback;
        try {
            return JSON.parse(val) as T;
        } catch {
            return fallback;
        }
    },
};

