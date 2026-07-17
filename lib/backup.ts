export function buildWidgetSnapshot(total: number, remaining: number, itemCount: number) {
  return {
    updatedAt: new Date().toISOString(),
    total,
    remaining,
    itemCount,
  };
}
