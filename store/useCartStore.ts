import { create } from 'zustand';
import { BudgetCategoryId, CategoryBudgets, DEFAULT_CATEGORY, createEmptyCategoryBudgets } from '../lib/budgetCategories';
import { buildWidgetSnapshot } from '../lib/backup';
import { CurrencyId, DEFAULT_CURRENCY } from '../lib/currencies';
import { setActiveCurrency } from '../lib/format';
import { stringSimilarity } from '../lib/stringMatch';
import { storage, StorageKeys } from '../lib/storage';

export type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
isScanned: boolean;
    isRecurring?: boolean;
    addedByMemberId?: string;
    brand?: string;
    category: BudgetCategoryId;
    productCategory?: string;
    productImageUrl?: string;
    createdAt: string;
};

export type HouseholdMember = {
    id: string;
    name: string;
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
    createdAt: string;
};

export type ShoppingSession = {
    id: string;
    date: string;
    items: CartItem[];
    total: number;
    budget: number;
    storeName?: string;
};

export type ThemeMode = 'light' | 'dark';

type CartStore = {
    items: CartItem[];
    sessions: ShoppingSession[];
    shoppingList: ShoppingListItem[];
    householdMembers: HouseholdMember[];
    activeMemberId: string | null;
    budget: number;
    categoryBudgets: CategoryBudgets;
    currencyId: CurrencyId;
    themeMode: ThemeMode;
    sessionId: string | null;
    isHydrated: boolean;
    total: () => number;
    remaining: () => number;
    setBudget: (amount: number) => Promise<void>;
    setCategoryBudget: (category: BudgetCategoryId, amount: number) => Promise<void>;
    setCurrency: (currencyId: CurrencyId) => Promise<void>;
    setThemeMode: (themeMode: ThemeMode) => Promise<void>;
    setSessionId: (id: string) => void;
    addHouseholdMember: (name: string) => void;
    removeHouseholdMember: (id: string) => void;
    setActiveMember: (id: string | null) => void;
    addItem: (item: Omit<CartItem, 'id' | 'createdAt' | 'category'> & { category?: BudgetCategoryId }) => CartItem;
    addItems: (items: Array<Omit<CartItem, 'id' | 'createdAt' | 'category'> & { category?: BudgetCategoryId }>) => CartItem[];
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Pick<CartItem, 'name' | 'price' | 'quantity'> & { category?: BudgetCategoryId }) => void;
    updateQuantity: (id: string, quantity: number) => void;
    toggleRecurringItem: (id: string) => void;
    addRecurringItemsToCart: () => number;
    addShoppingListItem: (item: Pick<ShoppingListItem, 'name' | 'estimatedPrice' | 'quantity'>) => void;
    toggleShoppingListItem: (id: string) => void;
    removeShoppingListItem: (id: string) => void;
    matchShoppingListItem: (item: CartItem) => void;
    saveSession: (storeName?: string) => Promise<boolean>;
    deleteSession: (id: string) => void;
    clearCart: () => void;
    refreshWidgetSnapshot: () => Promise<void>;
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

const persistHouseholdMembers = async (householdMembers: HouseholdMember[]) => {
    await storage.set(StorageKeys.HOUSEHOLD_MEMBERS, householdMembers);
};

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    sessions: [],
    shoppingList: [],
    householdMembers: [],
    activeMemberId: null,
    budget: 0,
    categoryBudgets: createEmptyCategoryBudgets(),
    currencyId: DEFAULT_CURRENCY,
    themeMode: 'light',
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

    setCurrency: async (currencyId) => {
        setActiveCurrency(currencyId);
        await storage.set(StorageKeys.CURRENCY, currencyId);
        set({ currencyId });
    },

    setThemeMode: async (themeMode) => {
        await storage.set(StorageKeys.THEME_MODE, themeMode);
        set({ themeMode });
    },

    setSessionId: (id) => set({ sessionId: id }),

    addHouseholdMember: (name) => {
        const cleanName = name.trim();
        if (!cleanName) return;
        const member: HouseholdMember = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            name: cleanName,
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const householdMembers = [...state.householdMembers, member];
            persistHouseholdMembers(householdMembers);
            storage.set(StorageKeys.ACTIVE_MEMBER_ID, member.id);
            return { householdMembers, activeMemberId: member.id };
        });
    },

    removeHouseholdMember: (id) => {
        set((state) => {
            const householdMembers = state.householdMembers.filter((m) => m.id !== id);
            persistHouseholdMembers(householdMembers);
            const activeMemberId = state.activeMemberId === id ? null : state.activeMemberId;
            if (activeMemberId === null) {
                storage.set(StorageKeys.ACTIVE_MEMBER_ID, '');
            }
            return { householdMembers, activeMemberId };
        });
    },

    setActiveMember: (id) => {
        storage.set(StorageKeys.ACTIVE_MEMBER_ID, id ?? '');
        set({ activeMemberId: id });
    },

    addItem: (item) => {
        const newItem: CartItem = {
            ...item,
            category: item.category ?? DEFAULT_CATEGORY,
            addedByMemberId: item.addedByMemberId ?? get().activeMemberId ?? undefined,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const items = [...state.items, newItem];
            persistItems(items);
            get().refreshWidgetSnapshot();
            return { items };
        });
        get().matchShoppingListItem(newItem);
        return newItem;
    },

    addItems: (incomingItems) => {
        const newItems: CartItem[] = incomingItems.map((item) => ({
            ...item,
            category: item.category ?? DEFAULT_CATEGORY,
            addedByMemberId: item.addedByMemberId ?? get().activeMemberId ?? undefined,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
        }));
        set((state) => {
            const items = [...state.items, ...newItems];
            persistItems(items);
            get().refreshWidgetSnapshot();
            return { items };
        });
        newItems.forEach((item) => get().matchShoppingListItem(item));
        return newItems;
    },

    removeItem: (id) =>
        set((state) => {
            const items = state.items.filter((i) => i.id !== id);
            persistItems(items);
            get().refreshWidgetSnapshot();
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
            get().refreshWidgetSnapshot();
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
                    score: stringSimilarity(item.name, cartItem.name),
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
            get().refreshWidgetSnapshot();
            return { items };
        }),

    toggleRecurringItem: (id) =>
        set((state) => {
            const items = state.items.map((item) => item.id === id ? { ...item, isRecurring: !item.isRecurring } : item);
            persistItems(items);
            return { items };
        }),

    addRecurringItemsToCart: () => {
        const existingNames = new Set(get().items.map((item) => item.name.toLowerCase()));
        const recurring = get().sessions
            .flatMap((session) => session.items)
            .filter((item) => item.isRecurring)
            .filter((item, index, all) => all.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index)
            .filter((item) => !existingNames.has(item.name.toLowerCase()));

        if (recurring.length === 0) return 0;
        get().addItems(recurring.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
isScanned: false,
            isRecurring: true,
            category: item.category,
            brand: item.brand,
            productCategory: item.productCategory,
            productImageUrl: item.productImageUrl,
            addedByMemberId: get().activeMemberId ?? item.addedByMemberId,
        })));
        return recurring.length;
    },

    saveSession: async (storeName) => {
        const { items, total, budget, sessions } = get();
        if (items.length === 0) return false;

        const session: ShoppingSession = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            date: new Date().toISOString(),
            items,
            total: total(),
            budget,
            storeName: storeName?.trim() || undefined,
        };
        const nextSessions = [session, ...sessions].slice(0, 20);
        await persistSessions(nextSessions);
        await persistItems([]);
        set({ sessions: nextSessions, items: [], sessionId: null });
        await get().refreshWidgetSnapshot();
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
        get().refreshWidgetSnapshot();
    },

    refreshWidgetSnapshot: async () => {
        const state = get();
        await storage.set(StorageKeys.WIDGET_SNAPSHOT, buildWidgetSnapshot(state.total(), state.remaining(), state.items.length));
    },

    loadState: async () => {
        const [savedBudget, savedCategoryBudgets, savedCurrency, savedThemeMode, items, sessions, shoppingList, householdMembers, activeMemberId] = await Promise.all([
            storage.getNumber(StorageKeys.BUDGET),
            storage.getJson<Partial<CategoryBudgets> | null>(StorageKeys.CATEGORY_BUDGETS, null),
            storage.getString(StorageKeys.CURRENCY),
            storage.getString(StorageKeys.THEME_MODE),
            storage.getJson<CartItem[]>(StorageKeys.CART_ITEMS, []),
            storage.getJson<ShoppingSession[]>(StorageKeys.SESSIONS, []),
            storage.getJson<ShoppingListItem[]>(StorageKeys.SHOPPING_LIST, []),
            storage.getJson<HouseholdMember[]>(StorageKeys.HOUSEHOLD_MEMBERS, []),
            storage.getString(StorageKeys.ACTIVE_MEMBER_ID),
        ]);
        const categoryBudgets = { ...createEmptyCategoryBudgets(), ...(savedCategoryBudgets ?? {}) };
        const budget = savedBudget ?? Object.values(categoryBudgets).reduce((sum, value) => sum + value, 0);
        if (!savedCategoryBudgets && budget > 0) {
            categoryBudgets.others = budget;
        }
        const currencyId = (savedCurrency && ['PHP', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED', 'JPY', 'KRW', 'SAR', 'MYR', 'THB'].includes(savedCurrency)
            ? savedCurrency
            : DEFAULT_CURRENCY) as CurrencyId;
        const themeMode: ThemeMode = savedThemeMode === 'dark' ? 'dark' : 'light';
        setActiveCurrency(currencyId);
        set({
            budget,
            categoryBudgets,
            currencyId,
            themeMode,
            items: items.map((item) => ({ ...item, category: item.category ?? DEFAULT_CATEGORY })),
            sessions: sessions.map((session) => ({
                ...session,
                storeName: session.storeName,
                items: session.items.map((item) => ({ ...item, category: item.category ?? DEFAULT_CATEGORY })),
            })),
            shoppingList,
            householdMembers,
            activeMemberId: activeMemberId || (householdMembers[0]?.id ?? null),
            isHydrated: true,
        });
        await get().refreshWidgetSnapshot();
    },
}));
