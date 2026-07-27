export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

export interface WeightCalculationResult {
  totalPrice: number;
  pricePerKg: number;
  weightInKg: number;
}

/**
 * Converts a weight from the given unit to kilograms.
 */
export function convertToKg(weight: number, unit: WeightUnit): number {
  if (!weight || weight <= 0) return 0;
  switch (unit) {
    case 'kg':
      return weight;
    case 'g':
      return weight / 1000;
    case 'lb':
      return weight * 0.45359237;
    case 'oz':
      return weight * 0.028349523125;
    default:
      return weight;
  }
}

/**
 * Calculates the total item price based on unit price per kg and item weight/unit.
 */
export function calculateTotalPriceByWeight(
  pricePerKg: number,
  weight: number,
  unit: WeightUnit
): number {
  const weightInKg = convertToKg(weight, unit);
  const total = pricePerKg * weightInKg;
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : 0;
}

/**
 * Calculates the price per kg from a total price and item weight/unit.
 */
export function calculatePricePerKg(
  totalPrice: number,
  weight: number,
  unit: WeightUnit
): number {
  const weightInKg = convertToKg(weight, unit);
  if (weightInKg <= 0) return 0;
  const pricePerKg = totalPrice / weightInKg;
  return Number.isFinite(pricePerKg) ? Math.round(pricePerKg * 100) / 100 : 0;
}

/**
 * Formats weight badge text (e.g., "500g @ ₱200/kg")
 */
export function formatWeightBadge(
  weight: number,
  unit: WeightUnit,
  pricePerKg: number,
  currencySymbol: string
): string {
  if (!weight || weight <= 0 || !pricePerKg || pricePerKg <= 0) return '';
  return `${weight}${unit} @ ${currencySymbol}${pricePerKg.toFixed(2)}/kg`;
}
