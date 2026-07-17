import { CartItem, ShoppingSession } from '../store/useCartStore';

export type PriceComparison = {
  previousPrice: number;
  currentPrice: number;
  difference: number;
  direction: 'higher' | 'lower' | 'same';
  previousDate: string;
};

export type PreviousPrice = {
  previousPrice: number;
  previousDate: string;
};

export function findPreviousBarcodePurchase(sessions: ShoppingSession[], barcode: string): PreviousPrice | null {
  if (!barcode) return null;

  const previous = sessions
    .flatMap((session) =>
      session.items
        .filter((item: CartItem) => item.barcode === barcode)
        .map((item) => ({ item, date: session.date }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!previous) return null;
  return {
    previousPrice: previous.item.price,
    previousDate: previous.date,
  };
}

export function findPreviousBarcodePrice(
  sessions: ShoppingSession[],
  barcode: string,
  currentPrice: number
): PriceComparison | null {
  const previous = findPreviousBarcodePurchase(sessions, barcode);
  if (!previous) return null;
  if (currentPrice <= 0) return null;

  const difference = currentPrice - previous.previousPrice;
  return {
    previousPrice: previous.previousPrice,
    currentPrice,
    difference,
    direction: difference > 0 ? 'higher' : difference < 0 ? 'lower' : 'same',
    previousDate: previous.previousDate,
  };
}
