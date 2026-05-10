/**
 * Parse OCR text from a price tag image
 * Looks for patterns like "Product Name" and "$XX.XX" or "XX.XX"
 */
export function parsePriceTag(text: string): { name: string; price: number } | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Look for price pattern: $XX.XX or XX.XX
  const priceMatch = text.match(/\$?(\d+\.\d{2})/);
  if (!priceMatch) {
    return null;
  }

  const price = parseFloat(priceMatch[1]);

  // Extract product name (everything before the price)
  const priceIndex = text.indexOf(priceMatch[0]);
  let name = text.substring(0, priceIndex).trim();

  // Clean up name - remove common artifacts
  name = name
    .replace(/[^\w\s&\-]/g, '') // Remove special characters except &, -
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // If we couldn't extract a name, use a generic one
  if (!name || name.length === 0) {
    name = 'Product';
  }

  return { name, price };
}
