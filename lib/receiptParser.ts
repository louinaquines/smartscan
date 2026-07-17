import { DEFAULT_CATEGORY } from './budgetCategories';

export type ReceiptParsedItem = {
  name: string;
  price: number;
  quantity: number;
};

const PESO_MARK = String.fromCharCode(0x20b1);
const pricePattern = new RegExp(`(?:${PESO_MARK}|â‚±|P)?\\s*(\\d{1,5}(?:[,.]\\d{2}))\\s*$`, 'i');

const cleanupName = (value: string) =>
  value
    .replace(/\b(?:subtotal|total|cash|change|vat|amount|qty|price|receipt|invoice)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s&\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function parseReceiptItems(input: string | any): ReceiptParsedItem[] {
  const rawText = typeof input === 'string'
    ? input
    : String(input?.text ?? input?.blocks?.map((block: any) => block?.text).join('\n') ?? '');

  return rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(pricePattern);
      if (!match) return null;

      const price = Number(match[1].replace(',', '.'));
      const name = cleanupName(line.replace(match[0], ' '));
      if (!name || !Number.isFinite(price) || price <= 0) return null;
      if (/^(total|subtotal|cash|change|vat)$/i.test(name)) return null;

      const qtyMatch = name.match(/\b(\d+)\s*x\s+/i);
      const quantity = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;
      const cleanName = qtyMatch ? cleanupName(name.replace(qtyMatch[0], ' ')) : name;

      return {
        name: cleanName || 'Receipt item',
        price,
        quantity,
      };
    })
    .filter((item): item is ReceiptParsedItem => Boolean(item))
    .slice(0, 60);
}

export const receiptItemToCartItem = (item: ReceiptParsedItem) => ({
  name: item.name,
  price: item.price,
  quantity: item.quantity,
  isScanned: true,
  category: DEFAULT_CATEGORY,
});
