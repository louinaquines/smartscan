import { CartItem } from '../store/useCartStore';
import { formatMoney } from './format';

export function buildCartShareText(items: CartItem[], total: number) {
  const lines = items.map((item) => {
    const qty = item.quantity > 1 ? `${item.quantity} x ` : '';
    return `- ${qty}${item.name}: ${formatMoney(item.price * item.quantity)}`;
  });

  return [
    'Cany cart',
    ...lines,
    '',
    `Total: ${formatMoney(total)}`,
  ].join('\n');
}
