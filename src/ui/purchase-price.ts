export type PurchasePriceMode = 'per-unit' | 'per-package';

export function toTotalPurchasePrice(
  value: number,
  mode: PurchasePriceMode,
  packageQuantity: number
): number {
  if (mode === 'per-package') return value;
  const quantity = packageQuantity > 0 ? packageQuantity : 1;
  return value * quantity;
}

export function fromTotalPurchasePrice(
  totalPrice: number,
  mode: PurchasePriceMode,
  packageQuantity: number
): number {
  if (mode === 'per-package') return totalPrice;
  const quantity = packageQuantity > 0 ? packageQuantity : 1;
  return totalPrice / quantity;
}

export function switchPurchasePriceMode(
  value: number,
  fromMode: PurchasePriceMode,
  toMode: PurchasePriceMode,
  packageQuantity: number
): number {
  if (fromMode === toMode) return value;
  const total = toTotalPurchasePrice(value, fromMode, packageQuantity);
  return fromTotalPurchasePrice(total, toMode, packageQuantity);
}
