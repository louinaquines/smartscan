import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
    BUDGET: 'budget',
    CURRENCY: 'currency',
} as const;

export const storage = {
    set: async (key: string, value: number | string) => {
        await AsyncStorage.setItem(key, String(value));
    },
    getNumber: async (key: string): Promise<number | null> => {
        const val = await AsyncStorage.getItem(key);
        return val ? parseFloat(val) : null;
    },
    getString: async (key: string): Promise<string | null> => {
        return await AsyncStorage.getItem(key);
    },
};