import { CurrencyId, DEFAULT_CURRENCY, getCurrency } from './currencies';

let activeCurrencyId: CurrencyId = DEFAULT_CURRENCY;

export const setActiveCurrency = (currencyId: CurrencyId) => {
    activeCurrencyId = currencyId;
};

export const formatMoney = (amount: number, currencyId: CurrencyId = activeCurrencyId) => {
    const currency = getCurrency(currencyId);
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currency.symbol} ${formatted}`;
};

export const formatShortDate = (iso: string) =>
    new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));
