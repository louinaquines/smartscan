import { create } from 'zustand';
import { BudgetCategoryId, CategoryBudgets, DEFAULT_CATEGORY, createEmptyCategoryBudgets } from '../lib/budgetCategories';
import { stringSimilarity } from '../lib/stringMatch';
import { storage, StorageKeys } from '../lib/storage';

export type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    isScanned: boolean;
    barcode?: string;
    brand?: string;
    category: BudgetCategoryId;
    productCategory?: string;
    productImageUrl?: string;
    createdAt: string;
};

export type ShoppingListItem = {
    id: string;
    name: string;
    estimatedPrice: number;
    quantity: number;
    checked: boolean;
    actualPrice?: number;
    matchedCartItemId?: string;
    barcode?: string;
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
    shoppingList: ShoppingListItem[];
    budget: number;
    categoryBudgets: CategoryBudgets;
    sessionId: string | null;
    isHydrated: boolean;
    total: () => number;
    remaining: () => number;
    setBudget: (amount: number) => Promise<void>;
    setCategoryBudget: (category: BudgetCategoryId, amount: number) => Promise<void>;
    setSessionId: (id: string) => void;
    addItem: (item: Omit<CartItem, 'id' | 'createdAt' | 'category'> & { category?: BudgetCategoryId }) => CartItem;
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Pick<CartItem, 'name' | 'price' | 'quantity'> & { category?: BudgetCategoryId }) => void;
    updateQuantity: (id: string, quantity: number) => void;
    addShoppingListItem: (item: Pick<ShoppingListItem, 'name' | 'estimatedPrice' | 'quantity'>) => void;
    toggleShoppingListItem: (id: string) => void;
    removeShoppingListItem: (id: string) => void;
    matchShoppingListItem: (item: CartItem) => void;
    saveSession: () => Promise<boolean>;
    deleteSession: (id: string) => void;
    clearCart: () => void;
    loadState: () => Promise<void>;
};

const persistItems = async (items: CartItem[]) => {
    await storage.set(StorageKeys.CART_ITEMS, items);
};

const persistSessions = async (sessions: ShoppingSession[]) => {
    await storage.set(StorageKeys.SESSIONS, sessions);
};

const persistShoppingList = async (shoppingList: ShoppingListItem[]) => {
    await storage.set(StorageKeys.SHOPPING_LIST, shoppingList);
};

const persistCategoryBudgets = async (categoryBudgets: CategoryBudgets) => {
    await storage.set(StorageKeys.CATEGORY_BUDGETS, categoryBudgets);
};

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    sessions: [],
    shoppingList: [],
    budget: 0,
    categoryBudgets: createEmptyCategoryBudgets(),
    sessionId: null,
    isHydrated: false,

    total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    remaining: () => get().budget - get().total(),

    setBudget: async (amount) => {
        await storage.set(StorageKeys.BUDGET, amount);
        const categoryBudgets = { ...createEmptyCategoryBudgets(), others: amount };
        await persistCategoryBudgets(categoryBudgets);
        set({ budget: amount, categoryBudgets });
    },

    setCategoryBudget: async (category, amount) => {
        const nextAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
        const categoryBudgets = { ...get().categoryBudgets, [category]: nextAmount };
        const budget = Object.values(categoryBudgets).reduce((sum, value) => sum + value, 0);
        await persistCategoryBudgets(categoryBudgets);
        await storage.set(StorageKeys.BUDGET, budget);
        set({ categoryBudgets, budget });
    },

    setSessionId: (id) => set({ sessionId: id }),

    addItem: (item) => {
        const newItem: CartItem = {
            ...item,
            category: item.category ?? DEFAULT_CATEGORY,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const items = [...state.items, newItem];
            persistItems(items);
            return { items };
        });
        get().matchShoppingListItem(newItem);
        return newItem;
    },

    removeItem: (id) =>
        set((state) => {
            const items = state.items.filter((i) => i.id !== id);
            persistItems(items);
            return { items };
        }),

    updateItem: (id, updates) =>
        set((state) => {
            const cleanName = updates.name.trim() || 'Product';
            const cleanPrice = Number.isFinite(updates.price) && updates.price > 0 ? updates.price : 0;
            const cleanQuantity = Math.max(1, Math.floor(updates.quantity || 1));
            const items = state.items.map((i) =>
                i.id === id
                    ? { ...i, name: cleanName, price: cleanPrice, quantity: cleanQuantity, category: updates.category ?? i.category ?? DEFAULT_CATEGORY }
                    : i
            );
            persistItems(items);
            return { items };
        }),

    addShoppingListItem: (item) => {
        const cleanName = item.name.trim();
        if (!cleanName) return;
        const newItem: ShoppingListItem = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            name: cleanName,
            estimatedPrice: Number.isFinite(item.estimatedPrice) && item.estimatedPrice > 0 ? item.estimatedPrice : 0,
            quantity: Math.max(1, Math.floor(item.quantity || 1)),
            checked: false,
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const shoppingList = [newItem, ...state.shoppingList];
            persistShoppingList(shoppingList);
            return { shoppingList };
        });
    },

    toggleShoppingListItem: (id) =>
        set((state) => {
            const shoppingList = state.shoppingList.map((item) =>
                item.id === id ? { ...item, checked: !item.checked } : item
            );
            persistShoppingList(shoppingList);
            return { shoppingList };
        }),

    removeShoppingListItem: (id) =>
        set((state) => {
            const shoppingList = state.shoppingList.filter((item) => item.id !== id);
            persistShoppingList(shoppingList);
            return { shoppingList };
        }),

    matchShoppingListItem: (cartItem) =>
        set((state) => {
            const candidate = state.shoppingList
                .filter((item) => !item.checked)
                .map((item) => ({
                    item,
                    score: item.barcode && cartItem.barcode && item.barcode === cartItem.barcode ? 1 : stringSimilarity(item.name, cartItem.name),
                }))
                .sort((a, b) => b.score - a.score)[0];

            if (!candidate || candidate.score < 0.45) return state;

            const shoppingList = state.shoppingList.map((item) =>
                item.id === candidate.item.id
                    ? {
                        ...item,
                        checked: true,
                        actualPrice: cartItem.price,
                        matchedCartItemId: cartItem.id,
                        barcode: cartItem.barcode ?? item.barcode,
                    }
                    : item
            );
            persistShoppingList(shoppingList);
            return { shoppingList };
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

    deleteSession: (id) =>
        set((state) => {
            const sessions = state.sessions.filter((session) => session.id !== id);
            persistSessions(sessions);
            return { sessions };
        }),

    clearCart: () => {
        persistItems([]);
        set({ items: [], sessionId: null });
    },

    loadState: async () => {
        const [savedBudget, savedCategoryBudgets, items, sessions, shoppingList] = await Promise.all([
            storage.getNumber(StorageKeys.BUDGET),
            storage.getJson<Partial<CategoryBudgets> | null>(StorageKeys.CATEGORY_BUDGETS, null),
            storage.getJson<CartItem[]>(StorageKeys.CART_ITEMS, []),
            storage.getJson<ShoppingSession[]>(StorageKeys.SESSIONS, []),
            storage.getJson<ShoppingListItem[]>(StorageKeys.SHOPPING_LIST, []),
        ]);
        const categoryBudgets = { ...createEmptyCategoryBudgets(), ...(savedCategoryBudgets ?? {}) };
        const budget = savedBudget ?? Object.values(categoryBudgets).reduce((sum, value) => sum + value, 0);
        if (!savedCategoryBudgets && budget > 0) {
            categoryBudgets.others = budget;
        }
        set({
            budget,
            categoryBudgets,
            items: items.map((item) => ({ ...item, category: item.category ?? DEFAULT_CATEGORY })),
            sessions: sessions.map((session) => ({
                ...session,
                items: session.items.map((item) => ({ ...item, category: item.category ?? DEFAULT_CATEGORY })),
            })),
            shoppingList,
            isHydrated: true,
        });
    },
}));
