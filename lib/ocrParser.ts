type OcrLine = {
  text: string;
  top?: number;
  left?: number;
  height?: number;
};

const PRICE_RE = /(?:₱|PHP|P)?\s*(\d{1,4}(?:[,.]\d{2}))/i;
const PRICE_WITH_SYMBOL_RE = /(?:₱|PHP|P)\s*(\d{1,4}(?:[,.]\d{2}))/i;

const cleanName = (value: string) =>
  value
    .replace(PRICE_RE, ' ')
    .replace(/[^a-zA-Z0-9\s&\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parsePrice = (value: string) => {
  const match = value.match(PRICE_WITH_SYMBOL_RE) ?? value.match(PRICE_RE);
  if (!match) return null;
  const price = Number(match[1].replace(',', '.'));
  return Number.isFinite(price) ? price : null;
};

const lineScore = (line: OcrLine, priceLine?: OcrLine) => {
  const text = cleanName(line.text);
  if (text.length < 3 || parsePrice(line.text) !== null) return -1;

  const letters = text.replace(/[^a-zA-Z]/g, '');
  const upperLetters = letters.replace(/[^A-Z]/g, '');
  const uppercaseRatio = letters.length > 0 ? upperLetters.length / letters.length : 0;
  const lengthScore = Math.min(text.length / 24, 1);
  const heightScore = Math.min((line.height ?? 0) / 44, 1);
  const proximityScore =
    priceLine?.top !== undefined && line.top !== undefined
      ? Math.max(0, 1 - Math.abs(priceLine.top - line.top) / 180)
      : 0;

  return lengthScore * 2 + uppercaseRatio * 1.5 + heightScore + proximityScore;
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

  const priceLine =
    lines.find((line) => PRICE_WITH_SYMBOL_RE.test(line.text)) ??
    lines.find((line) => PRICE_RE.test(line.text));

  if (!priceLine) return null;

  const price = parsePrice(priceLine.text);
  if (price === null) return null;

  const nameLine = [...lines]
    .filter((line) => line !== priceLine)
    .sort((a, b) => lineScore(b, priceLine) - lineScore(a, priceLine))[0];

  const fallbackName = cleanName(
    lines
      .map((line) => line.text)
      .join(' ')
      .replace(priceLine.text, ' ')
  );

  const name = cleanName(nameLine?.text ?? '') || fallbackName || 'Product';
  return { name, price };
}
