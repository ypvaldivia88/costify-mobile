const currencyFormatter = new Intl.NumberFormat('es-CU', {
  style: 'currency',
  currency: 'CUP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('es-CU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCurrencyCompact(value: number): string {
  return `$${compactFormatter.format(value)}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

const foreignFormatter = new Intl.NumberFormat('es-CU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatForeignCurrency(amount: number, currency: string): string {
  return `${foreignFormatter.format(amount)} ${currency}`;
}
