import { DEFAULT_CATEGORY } from './budgetCategories';

export type ReceiptParsedItem = {
  name: string;
  price: number;
  quantity: number;
};

export type OcrTextChoice = {
  label: string;
  value: string;
};

export type ReceiptOcrPriceChoice = {
  label: string;
  value: number;
};

const PESO_MARK = String.fromCharCode(0x20b1);

const NOISE_LINE =
  /\b(?:subtotal|total tender|change due|^\s*total\b|^\s*cash\b|vatable|vat amt|vat exempt|zero rated|customer copy|sold to|business style|^\s*tin\b|permit|supplier|invoice|summary|member|scan qr|metro rewards|pos supplier|sales invoice|this serves|issued|si no|till\b|qty of|items purchased|item\(s\)|purchased|retail stores|mandaue|cebu|estancia|barangay|universal information|rewards club|vat registration|business name|opencode|claude|google|gemini|chatgpt|open\s*ai|ai\s*model|anthropic|deepseek|llama|gpt|bard|copilot)\b/i;

const DETAIL_LINE = /^\s*\d{3,}\s+(\d+(?:[,.]\d+)?)\s*@\s*(\d{1,5}(?:[,.]\d{2}))\s*$/i;
const DETAIL_LINE_LOOSE = /(\d+(?:[,.]\d+)?)\s*@\s*(\d{1,5}(?:[,.]\d{2}))/i;
const TRAILING_PRICE = /(\d{1,5}(?:[,.]\d{1,2}))\s*(?:[VEZ])?\s*$/i;
const PACKAGING_SUFFIX = /\b\d{1,3}\s*\/\s*\d+(?:\.\d+)?\s*(?:lt|l|ml|g|kg|pc|pcs)?\b/gi;

const normalizeLine = (line: string) =>
  line
    .replace(/[₱]/g, PESO_MARK)
    .replace(/\(\s*(\d+(?:[,.]\d{2})?\s*)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const getRawText = (input: string | any) => {
  if (typeof input === 'string') return input;
  const blockText = input?.blocks?.map((block: any) => block?.text).filter(Boolean).join('\n');
  return String(input?.text ?? blockText ?? '');
};

const toNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const alphaCount = (value: string) => (value.match(/[a-zA-Z]/g) ?? []).length;

const cleanupName = (value: string) =>
  value
    .replace(PACKAGING_SUFFIX, ' ')
    .replace(TRAILING_PRICE, ' ')
    .replace(DETAIL_LINE_LOOSE, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/\b(?:pc|pcs|ea|v|e|z)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s&\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isNoiseLine = (line: string) => {
  if (!line || line.length < 3) return true;
  if (NOISE_LINE.test(line)) return true;
  if (/^\d{8,}$/.test(line.replace(/\s/g, ''))) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) return true;
  if (/^\d{1,2}:\d{2}/.test(line)) return true;
  if (/^\*+$/.test(line)) return true;
  if (/purchas/i.test(line)) return true;
  return false;
};

const isDetailLine = (line: string) => DETAIL_LINE.test(line) || (/^\s*\d{3,}/.test(line) && DETAIL_LINE_LOOSE.test(line));

const parseDetailLine = (line: string) => {
  const match = line.match(DETAIL_LINE) ?? line.match(DETAIL_LINE_LOOSE);
  if (!match) return null;
  const quantity = Math.max(0.01, toNumber(match[1]));
  const price = toNumber(match[2]);
  if (price <= 0) return null;
  return { quantity, price };
};

const parseItemHeaderLine = (line: string) => {
  const priceMatch = line.match(TRAILING_PRICE);
  if (!priceMatch) return null;

  const lineTotal = toNumber(priceMatch[1]);
  if (lineTotal <= 0 || lineTotal > 99999) return null;

  const beforePrice = line.slice(0, line.lastIndexOf(priceMatch[1])).trim();
  const name = cleanupName(beforePrice);
  if (!name || name.length < 2 || alphaCount(name) < 1) return null;
  if (/^\d+(?:\s+\d+)*$/.test(name)) return null;
  if (/\b(?:total|cash|change|tender|vat|qty|purchased|amount)\b/i.test(name)) return null;

  return { name, lineTotal };
};

export function parseReceiptTotal(input: string | any): number | null {
  const lines = getRawText(input)
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  for (const line of lines) {
    if (!/^\s*total\b/i.test(line)) continue;
    const match = line.match(TRAILING_PRICE);
    if (match) return toNumber(match[1]);
  }
  return null;
}

export function parseReceiptItems(input: string | any): ReceiptParsedItem[] {
  const lines = getRawText(input)
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  const items: ReceiptParsedItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isNoiseLine(line)) continue;
    if (isDetailLine(line)) continue;

    const header = parseItemHeaderLine(line);
    if (!header) continue;

    const nextLine = lines[index + 1];
    const detail = nextLine && isDetailLine(nextLine) ? parseDetailLine(nextLine) : null;

    let quantity = detail?.quantity ?? 1;
    let price = detail?.price ?? header.lineTotal;

    if (detail) {
      const expectedTotal = Number((quantity * price).toFixed(2));
      const delta = Math.abs(expectedTotal - header.lineTotal);
      if (delta > 0.15 && header.lineTotal > 0) {
        quantity = 1;
        price = header.lineTotal;
      }
      index += 1;
    }

    if (price <= 0 || price > 99999) continue;

    items.push({
      name: header.name,
      price,
      quantity,
    });
  }

  return dedupeItems(items).slice(0, 60);
}

export function parseReceiptItemsLenient(input: string | any): ReceiptParsedItem[] {
  const exactItems = parseReceiptItems(input);
  if (exactItems.length >= 2) return exactItems;

  const lines = getRawText(input)
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  const fallbackItems: ReceiptParsedItem[] = [];

  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    if (isDetailLine(line)) continue;

    const header = parseItemHeaderLine(line);
    if (header) {
      fallbackItems.push({ name: header.name, price: header.lineTotal, quantity: 1 });
      continue;
    }

    const anyPrice = line.match(/(\d{1,5}(?:[,.]\d{1,2}))/);
    if (!anyPrice) continue;

    const cleaned = cleanupName(line);
    if (!cleaned || cleaned.length < 2 || alphaCount(cleaned) < 1) continue;
    if (/^\d+(?:\s+\d+)*$/.test(cleaned)) continue;

    fallbackItems.push({ name: cleaned, price: toNumber(anyPrice[1]), quantity: 1 });
  }

  if (fallbackItems.length > 0) return dedupeItems(fallbackItems).slice(0, 60);

  const deepFallbackItems: ReceiptParsedItem[] = [];
  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    const priceMatch = line.match(/(\d{1,5}(?:[,.]\d{1,2}))/);
    if (!priceMatch || priceMatch.index === undefined) continue;
    const beforePrice = line.slice(0, priceMatch.index).trim();
    const name = cleanupName(beforePrice);
    if (!name || name.length < 2) continue;
    deepFallbackItems.push({ name, price: toNumber(priceMatch[1]), quantity: 1 });
  }
  if (deepFallbackItems.length > 0) return dedupeItems(deepFallbackItems).slice(0, 60);

  return exactItems.length > 0 ? exactItems : fallbackItems;
}

export function getRawOcrLines(input: string | any): string[] {
  const text = getRawText(input);
  return text
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);
}

export function getReceiptOcrSuggestions(input: string | any): { names: OcrTextChoice[]; prices: ReceiptOcrPriceChoice[] } {
  const lines = getRawOcrLines(input);
  const nameSet = new Set<string>();
  const priceSet = new Set<string>();

  const names: OcrTextChoice[] = [];
  const prices: ReceiptOcrPriceChoice[] = [];

  for (const line of lines) {
    const cleaned = cleanupName(line);
    if (cleaned && cleaned.length >= 3 && alphaCount(cleaned) >= 2 && !isNoiseLine(cleaned)) {
      const key = cleaned.toLowerCase();
      if (!nameSet.has(key)) {
        nameSet.add(key);
        names.push({ label: cleaned, value: cleaned });
      }
    }

    const priceMatch = line.match(TRAILING_PRICE);
    if (priceMatch) {
      const priceKey = priceMatch[1];
      if (!priceSet.has(priceKey)) {
        priceSet.add(priceKey);
        prices.push({ label: `₱ ${toNumber(priceKey).toFixed(2)}`, value: toNumber(priceKey) });
      }
    }
  }

  return { names: names.slice(0, 12), prices: prices.slice(0, 8) };
}

const dedupeItems = (items: ReceiptParsedItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}|${item.price}|${item.quantity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const receiptItemToCartItem = (item: ReceiptParsedItem) => ({
  name: item.name,
  price: item.price,
  quantity: item.quantity,
  isScanned: true,
  category: DEFAULT_CATEGORY,
});
