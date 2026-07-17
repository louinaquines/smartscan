const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function stringSimilarity(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.82;

  const leftWords = new Set(left.split(' ').filter((word) => word.length > 1));
  const rightWords = new Set(right.split(' ').filter((word) => word.length > 1));
  if (leftWords.size === 0 || rightWords.size === 0) return 0;

  let shared = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) shared += 1;
  });

  return shared / Math.max(leftWords.size, rightWords.size);
}
