import type { PurchaseCurrency, PurchaseCurrencyMeta } from './types';
import type { ExchangeRateSnapshot } from './exchange-rates';
import {
  buildPurchaseMeta,
  getRateForCurrency,
  toCupWithRate,
} from './exchange-rates';
import type { PurchasePriceMode } from '@/ui/purchase-price';
import { toTotalPurchasePrice } from '@/ui/purchase-price';

export interface ResolvedPurchasePrice {
  purchasePriceCup: number;
  purchaseMeta?: PurchaseCurrencyMeta;
}

export function resolvePurchasePrice(
  value: number,
  mode: PurchasePriceMode,
  packageQuantity: number,
  currency: PurchaseCurrency,
  exchangeRate: number,
  snapshot: ExchangeRateSnapshot | null
): ResolvedPurchasePrice {
  const totalForeignOrCup = toTotalPurchasePrice(value, mode, packageQuantity);

  if (currency === 'CUP') {
    return { purchasePriceCup: totalForeignOrCup };
  }

  if (exchangeRate <= 0) {
    throw new Error('Ingresa la tasa real que pagaste (CUP por 1 unidad de divisa).');
  }

  const originalAmount =
    mode === 'per-package' ? value : value * (packageQuantity > 0 ? packageQuantity : 1);

  return {
    purchasePriceCup: toCupWithRate(totalForeignOrCup, exchangeRate),
    purchaseMeta: buildPurchaseMeta(originalAmount, currency, exchangeRate, snapshot),
  };
}

export function getSuggestedRate(
  snapshot: ExchangeRateSnapshot | null,
  currency: PurchaseCurrency
): number {
  if (currency === 'CUP') return 1;
  return getRateForCurrency(snapshot, currency) ?? 0;
}

export function getPurchaseFormValuesFromMeta(
  purchasePriceCup: number,
  packageQuantity: number,
  purchaseMeta?: PurchaseCurrencyMeta
): {
  value: number;
  currency: PurchaseCurrency;
  mode: PurchasePriceMode;
  exchangeRate: number;
} {
  if (!purchaseMeta) {
    return {
      value: packageQuantity > 0 ? purchasePriceCup / packageQuantity : purchasePriceCup,
      currency: 'CUP',
      mode: 'per-unit',
      exchangeRate: 0,
    };
  }

  const perUnitForeign =
    purchaseMeta.originalAmount / (packageQuantity > 0 ? packageQuantity : 1);

  return {
    value: perUnitForeign,
    currency: purchaseMeta.originalCurrency,
    mode: 'per-unit',
    exchangeRate: purchaseMeta.exchangeRateUsed,
  };
}
