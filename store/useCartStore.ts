import { create } from 'zustand';
import { storage, StorageKeys } from '../lib/storage';

export type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    isScanned: boolean;
    createdAt: string;
};

export type ShoppingSession = {
    id: string;
    date: string;
    items: CartItem[];
    total: number;
    budget: number;
};

type CartStore = {
    items: CartItem[];
    sessions: ShoppingSession[];
    budget: number;
    sessionId: string | null;
    isHydrated: boolean;
    total: () => number;
    remaining: () => number;
    setBudget: (amount: number) => Promise<void>;
    setSessionId: (id: string) => void;
    addItem: (item: Omit<CartItem, 'id' | 'createdAt'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    saveSession: () => Promise<boolean>;
    clearCart: () => void;
    loadState: () => Promise<void>;
};

const persistItems = async (items: CartItem[]) => {
    await storage.set(StorageKeys.CART_ITEMS, items);
};

const persistSessions = async (sessions: ShoppingSession[]) => {
    await storage.set(StorageKeys.SESSIONS, sessions);
};

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    sessions: [],
    budget: 0,
    sessionId: null,
    isHydrated: false,

    total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    remaining: () => get().budget - get().total(),

    setBudget: async (amount) => {
        await storage.set(StorageKeys.BUDGET, amount);
        set({ budget: amount });
    },

    setSessionId: (id) => set({ sessionId: id }),

    addItem: (item) => {
        const newItem: CartItem = {
            ...item,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const items = [...state.items, newItem];
            persistItems(items);
            return { items };
        });
    },

    removeItem: (id) =>
        set((state) => {
            const items = state.items.filter((i) => i.id !== id);
            persistItems(items);
            return { items };
        }),

    updateQuantity: (id, quantity) =>
        set((state) => {
            const nextQuantity = Math.max(1, Math.floor(quantity || 1));
            const items = state.items.map((i) => (i.id === id ? { ...i, quantity: nextQuantity } : i));
            persistItems(items);
            return { items };
        }),

    saveSession: async () => {
        const { items, total, budget, sessions } = get();
        if (items.length === 0) return false;

        const session: ShoppingSession = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            date: new Date().toISOString(),
            items,
            total: total(),
            budget,
        };
        const nextSessions = [session, ...sessions].slice(0, 20);
        await persistSessions(nextSessions);
        await persistItems([]);
        set({ sessions: nextSessions, items: [], sessionId: null });
        return true;
    },

    clearCart: () => {
        persistItems([]);
        set({ items: [], sessionId: null });
    },

    loadState: async () => {
        const [savedBudget, items, sessions] = await Promise.all([
            storage.getNumber(StorageKeys.BUDGET),
            storage.getJson<CartItem[]>(StorageKeys.CART_ITEMS, []),
            storage.getJson<ShoppingSession[]>(StorageKeys.SESSIONS, []),
        ]);
        set({
            budget: savedBudget ?? 0,
            items,
            sessions,
            isHydrated: true,
        });
    },
}));
