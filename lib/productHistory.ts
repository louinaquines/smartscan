import { CartItem, ShoppingSession } from '../store/useCartStore';

export type ProductHistoryPoint = {
  date: string;
  storeName?: string;
  price: number;
};

export function getProductHistory(sessions: ShoppingSession[], item: Pick<CartItem, 'name'>): ProductHistoryPoint[] {
  const keyName = item.name.toLowerCase();
  return sessions
    .flatMap((session) =>
      session.items
        .filter((sessionItem) => sessionItem.name.toLowerCase() === keyName)
        .map((sessionItem) => ({
          date: session.date,
          storeName: session.storeName,
          price: sessionItem.price,
        }))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getProductHistorySummary(points: ProductHistoryPoint[]) {
  if (points.length === 0) return null;
  const prices = points.map((point) => point.price);
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    latest,
    previous,
    change: previous ? latest.price - previous.price : 0,
  };
}
