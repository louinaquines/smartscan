type OcrLine = {
  text: string;
  top?: number;
  left?: number;
  height?: number;
};

type ParsedPrice = {
  price: number;
  text: string;
  line?: OcrLine;
};

const PESO_MARK = String.fromCharCode(0x20b1);
const DECIMAL_PRICE_RE = new RegExp(`(?:${PESO_MARK}|₱|P)?\\s*(\\d{1,4}(?:[,.]\\d{2}))`, 'i');
const DECIMAL_PRICE_WITH_MARK_RE = new RegExp(`(?:${PESO_MARK}|₱|P)\\s*(\\d{1,4}(?:[,.]\\d{2}))`, 'i');
const SPLIT_PRICE_RE = new RegExp(`(?:${PESO_MARK}|₱|P)?\\s*(\\d{1,4})\\s+(\\d{2})(?=\\s*(?:/\\s*PC|PC|EA|EACH|$))`, 'i');
const SPLIT_PRICE_WITH_MARK_RE = new RegExp(`(?:${PESO_MARK}|₱|P)\\s*(\\d{1,4})\\s*(\\d{2})?`, 'i');
const DOT_CENTS_PRICE_RE = new RegExp(`(?:${PESO_MARK}|₱|P)?\\s*(\\d{1,4})\\s*[,.]\\s*(\\d{2})(?=\\s*(?:/\\s*PC|PC|EA|EACH|$))`, 'i');
const DOT_CENTS_PRICE_WITH_MARK_RE = new RegExp(`(?:${PESO_MARK}|₱|P)\\s*(\\d{1,4})\\s*[,.]\\s*(\\d{2})`, 'i');
const UNMARKED_SPLIT_PRICE_RE = /\b(\d{1,4})\s+(\d{2})\b/i;
const COMPACT_CENTS_RE = /\b(\d{1,4})(?:º|°|o|O){2}\b/;
const GENERIC_PRICE_RE = /\b(\d{1,4}(?:[,.]\d{2}))\b/;

const normalizeOcrText = (value: string) =>
  value
    .replace(/[₱]/g, PESO_MARK)
    .replace(COMPACT_CENTS_RE, '$1 00')
    .replace(/\b(?:P|₱)\s*([0-9])/gi, `${PESO_MARK} $1`)
    .replace(/\s+/g, ' ')
    .trim();

const cleanName = (value: string) =>
  normalizeOcrText(value)
    .replace(DECIMAL_PRICE_RE, ' ')
    .replace(SPLIT_PRICE_RE, ' ')
    .replace(DOT_CENTS_PRICE_RE, ' ')
    .replace(/\b(?:SM|BONUS|PUREGOLD|ROYAL|NA|PC|EA|EACH)\b/gi, ' ')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/\b\d+\s*(?:KL|ML|G|KG|L)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s&\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toPrice = (whole: string, cents?: string) => {
  const normalized = cents === undefined
    ? whole.replace(',', '.')
    : `${whole}.${cents}`;
  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
};

const parsePriceFromText = (value: string): ParsedPrice | null => {
  const text = normalizeOcrText(value);

  const decimalMatch = text.match(DECIMAL_PRICE_WITH_MARK_RE) ?? text.match(DECIMAL_PRICE_RE);
  if (decimalMatch) {
    const price = toPrice(decimalMatch[1]);
    if (price !== null) return { price, text: decimalMatch[0] };
  }

  const dotCentsMatch = text.match(DOT_CENTS_PRICE_WITH_MARK_RE) ?? text.match(DOT_CENTS_PRICE_RE);
  if (dotCentsMatch) {
    const price = toPrice(dotCentsMatch[1], dotCentsMatch[2]);
    if (price !== null) return { price, text: dotCentsMatch[0] };
  }

  const splitMatch = text.match(SPLIT_PRICE_RE);
  if (splitMatch) {
    const price = toPrice(splitMatch[1], splitMatch[2]);
    if (price !== null) return { price, text: splitMatch[0] };
  }

  const unmarkedSplitMatch = text.match(UNMARKED_SPLIT_PRICE_RE);
  if (unmarkedSplitMatch) {
    const price = toPrice(unmarkedSplitMatch[1], unmarkedSplitMatch[2]);
    const hasLongNumber = /\b\d{5,}\b/.test(text);
    const looksLikeShelfTag = text.length <= 52 || /[a-zA-Z]/.test(text);
    if (price !== null && price >= 1 && price <= 9999 && !hasLongNumber && looksLikeShelfTag) {
      return { price, text: unmarkedSplitMatch[0] };
    }
  }

  const markedSplitMatch = text.match(SPLIT_PRICE_WITH_MARK_RE);
  if (markedSplitMatch) {
    const whole = markedSplitMatch[1];
    const cents = markedSplitMatch[2];
    const price = toPrice(whole, cents ?? '00');
    if (price !== null) return { price, text: markedSplitMatch[0] };
  }

  // Generic price detection: any number with optional decimal/cents
  const genericMatch = text.match(GENERIC_PRICE_RE);
  if (genericMatch) {
    const price = toPrice(genericMatch[1]);
    if (price !== null && price >= 1 && price <= 9999) {
      // Additional filter: avoid matching likely codes (e.g., long integers without context)
      // If the matched text is the whole line and line length <= 5, treat as unlikely price
      if (genericMatch[0].length >= 2 && !(genericMatch[0].length <= 3 && !/[.,]/.test(genericMatch[0]))) {
        return { price, text: genericMatch[0] };
      }
    }
  }

  return null;
};

const findPrice = (lines: OcrLine[]): ParsedPrice | null => {
  for (const line of lines) {
    const parsed = parsePriceFromText(line.text);
    if (parsed) return { ...parsed, line };
  }

  const joined = lines.map((line) => line.text).join(' ');
  return parsePriceFromText(joined);
};

const combinedNameNearPrice = (lines: OcrLine[], priceLine?: OcrLine) => {
  if (!priceLine?.left) return '';
  const priceLeft = priceLine.left;

  return lines
    .filter((line) => line !== priceLine)
    .filter((line) => parsePriceFromText(line.text) === null)
    .filter((line) => line.left === undefined || line.left < priceLeft)
    .filter((line) => {
      const text = cleanName(line.text);
      return text.length >= 2 && /[a-zA-Z]/.test(text);
    })
    .sort((a, b) => (a.top ?? 0) - (b.top ?? 0))
    .map((line) => cleanName(line.text))
    .filter((text) => text.length >= 2)
    .slice(0, 3)
    .join(' ')
    .trim();
};

const isWeakName = (name: string) => {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 4) return true;
  if (/^\d/.test(name)) return true;
  if (/\b(?:PUREGOLD|SM BONUS|BONUS|NA|PC|EA|EACH)\b/i.test(name)) return true;
  return false;
};

const lineScore = (line: OcrLine, priceLine?: OcrLine) => {
  const text = cleanName(line.text);
  if (text.length < 3 || parsePriceFromText(line.text) !== null) return -1;

  const letters = text.replace(/[^a-zA-Z]/g, '');
  const upperLetters = letters.replace(/[^A-Z]/g, '');
  const uppercaseRatio = letters.length > 0 ? upperLetters.length / letters.length : 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lengthScore = Math.min(text.length / 22, 1);
  const wordScore = wordCount >= 2 ? 1 : 0.35;
  const heightScore = Math.min((line.height ?? 0) / 44, 1);
  const proximityScore =
    priceLine?.top !== undefined && line.top !== undefined
      ? Math.max(0, 1 - Math.abs(priceLine.top - line.top) / 190)
      : 0;
  const leftSideScore =
    priceLine?.left !== undefined && line.left !== undefined && line.left < priceLine.left
      ? 0.9
      : 0;

  return lengthScore * 2 + uppercaseRatio * 1.4 + wordScore + heightScore + proximityScore + leftSideScore;
};

export type OcrChoice = {
  label: string;
  value: string;
};

export type OcrPriceChoice = {
  label: string;
  value: number;
};

const uniqueBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function extractOcrLines(result: any): OcrLine[] {
  const rawBlocks = result?.blocks ?? result?.textBlocks ?? [];
  const linesFromBlocks = rawBlocks.flatMap((block: any) => {
    const blockLines = block?.lines ?? block?.textLines;
    if (Array.isArray(blockLines) && blockLines.length > 0) {
      return blockLines.map((line: any) => ({
        text: String(line?.text ?? ''),
        top: line?.frame?.top ?? line?.bounding?.top ?? line?.cornerPoints?.[0]?.y,
        left: line?.frame?.left ?? line?.bounding?.left ?? line?.cornerPoints?.[0]?.x,
        height: line?.frame?.height ?? line?.bounding?.height,
      }));
    }

    return [{
      text: String(block?.text ?? ''),
      top: block?.frame?.top ?? block?.bounding?.top,
      left: block?.frame?.left ?? block?.bounding?.left,
      height: block?.frame?.height ?? block?.bounding?.height,
    }];
  });

  if (linesFromBlocks.length > 0) {
    return linesFromBlocks.filter((line: OcrLine) => line.text.trim().length > 0);
  }

  return String(result?.text ?? '')
    .split(/\n+/)
    .map((text) => ({ text }))
    .filter((line) => line.text.trim().length > 0);
}

export function parsePriceTag(input: string | any): { name: string; price: number } | null {
  const lines = typeof input === 'string'
    ? input.split(/\n+/).map((text) => ({ text }))
    : extractOcrLines(input);

  const parsedPrice = findPrice(lines);
  if (!parsedPrice) return null;

  const nameLine = [...lines]
    .filter((line) => line !== parsedPrice.line)
    .sort((a, b) => lineScore(b, parsedPrice.line) - lineScore(a, parsedPrice.line))[0];

  const leftSideName = combinedNameNearPrice(lines, parsedPrice.line);

  const fallbackName = cleanName(
    lines
      .map((line) => line.text)
      .join(' ')
      .replace(parsedPrice.text, ' ')
  );

  const candidateName = leftSideName || cleanName(nameLine?.text ?? '') || fallbackName;
  const name = candidateName && !isWeakName(candidateName) ? candidateName : 'Product';
  return { name, price: parsedPrice.price };
}

export function getOcrSelectionChoices(input: string | any): { names: OcrChoice[]; prices: OcrPriceChoice[] } {
  const lines = typeof input === 'string'
    ? input.split(/\n+/).map((text) => ({ text }))
    : extractOcrLines(input);

  const priceChoices = uniqueBy(
    lines
      .map((line) => parsePriceFromText(line.text))
      .filter((price): price is ParsedPrice => Boolean(price))
      .map((price) => ({
        label: `₱ ${price.price.toFixed(2)}`,
        value: price.price,
      })),
    (price) => price.label
  ).slice(0, 6);

  const nameChoices = uniqueBy(
    lines
      .map((line) => cleanName(line.text))
      .filter((text) => text.length >= 3 && /[a-zA-Z]/.test(text) && !isWeakName(text))
      .map((text) => ({ label: text, value: text })),
    (choice) => choice.value
  ).slice(0, 8);

  return { names: nameChoices, prices: priceChoices };
}
