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

export type LanguageId = CurrencyId;

export type LanguageOption = {
  id: LanguageId;
  name: string;
  flag: string;
};

export const LANGUAGES: LanguageOption[] = [
  { id: 'USD', name: 'English', flag: '🇺🇸' },
  { id: 'PHP', name: 'Filipino', flag: '🇵🇭' },
  { id: 'AED', name: 'Arabic', flag: '🇦🇪' },
  { id: 'JPY', name: 'Japanese', flag: '🇯🇵' },
  { id: 'KRW', name: 'Korean', flag: '🇰🇷' },
  { id: 'MYR', name: 'Malay', flag: '🇲🇾' },
  { id: 'THB', name: 'Thai', flag: '🇹🇭' },
];

export const DEFAULT_LANGUAGE: LanguageId = 'PHP';

export const getLanguage = (id?: string | null) =>
  LANGUAGES.find((lang) => lang.id === id) ?? LANGUAGES[0];

export const getCurrency = (id?: string | null) =>
  CURRENCIES.find((currency) => currency.id === id) ?? CURRENCIES[0];

// Build regex pattern for all currency marks (symbols + text prefixes + Peso abbreviation)
const SYMBOL_CHARS_SET = new Set<string>();
const TEXT_PREFIX_SET = new Set<string>();

CURRENCIES.forEach((c) => {
  const sym = c.symbol;
  if (sym.length === 1 && /[^\w\s]/.test(sym)) {
    SYMBOL_CHARS_SET.add(sym);
  } else {
    TEXT_PREFIX_SET.add(sym);
  }
});

export const CURRENCY_SYMBOL_CHARS = [...SYMBOL_CHARS_SET].join('');
const _escapedSymbols = CURRENCY_SYMBOL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const _escapedTextPrefixes = [...TEXT_PREFIX_SET]
  .sort((a, b) => b.length - a.length)
  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

export const CURRENCY_MARK_SOURCE = `(?:[${_escapedSymbols}]|${_escapedTextPrefixes.join('|')}|P)`;

// Regex to normalize/remove any currency mark from text (for name cleaning)
export const CURRENCY_MARK_CLEAN_RE = new RegExp(
  `[${_escapedSymbols.replace(/[$]/g, '\\$')}]|${_escapedTextPrefixes.join('|')}|\\bP(?=\\s*\\d)`,
  'gi'
);
