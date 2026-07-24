export type CurrencyId =
  | 'PHP'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'SGD'
  | 'AED'
  | 'JPY'
  | 'KRW'
  | 'SAR'
  | 'MYR'
  | 'THB';

export type CurrencyOption = {
  id: CurrencyId;
  name: string;
  symbol: string;
  flag: string;
  country: string;
};

export const CURRENCIES: CurrencyOption[] = [
  { id: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', country: 'Philippines' },
  { id: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', country: 'United States' },
  { id: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', country: 'European Union' },
  { id: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', country: 'United Kingdom' },
  { id: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦', country: 'Canada' },
  { id: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺', country: 'Australia' },
  { id: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', country: 'Singapore' },
  { id: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪', country: 'United Arab Emirates' },
  { id: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', country: 'Japan' },
  { id: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', country: 'South Korea' },
  { id: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦', country: 'Saudi Arabia' },
  { id: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', country: 'Malaysia' },
  { id: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', country: 'Thailand' },
];

export const DEFAULT_CURRENCY: CurrencyId = 'PHP';

export const getCurrency = (id?: string | null) =>
  CURRENCIES.find((currency) => currency.id === id) ?? CURRENCIES[0];
