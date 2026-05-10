import { create } from 'zustand';
import { storage, StorageKeys } from '../lib/storage';

export type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    isScanned: boolean;
};

type CartStore = {
    items: CartItem[];
    budget: number;
    sessionId: string | null;
    total: () => number;
    remaining: () => number;
    setBudget: (amount: number) => Promise<void>;
    setSessionId: (id: string) => void;
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    loadBudget: () => Promise<void>;
};

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    budget: 0,
    sessionId: null,

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
        };
        set((state) => ({ items: [...state.items, newItem] }));
    },

    removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

    updateQuantity: (id, quantity) =>
        set((state) => ({
            items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),

    clearCart: () => set({ items: [], sessionId: null }),

    loadBudget: async () => {
        const saved = await storage.getNumber(StorageKeys.BUDGET);
        if (saved !== null) set({ budget: saved });
    },
}));