import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ExchangeRateSettings, ExchangeRateSnapshot } from '@/domain/exchange-rates';
import {
  fromCup,
  getPriceReviewAlerts,
  PURCHASE_CURRENCY_LABELS,
} from '@/domain/exchange-rates';
import type { ProductCalculation, PurchaseCurrency, RawMaterial } from '@/domain/types';
import { formatCurrency } from '@/format/currency';

export interface ExchangeRatesContextValue {
  snapshot: ExchangeRateSnapshot | null;
  settings: ExchangeRateSettings;
  refreshing: boolean;
  error: string | null;
  refreshRates: (force?: boolean) => Promise<ExchangeRateSnapshot | null>;
  updateSettings: (updates: Partial<ExchangeRateSettings>) => void;
  markCostingRate: (usdRate: number) => void;
  formatEquivalents: (cupAmount: number) => string | null;
  formatDual: (cupAmount: number) => string;
}

const ExchangeRatesContext = createContext<ExchangeRatesContextValue | null>(null);

interface ExchangeRatesProviderProps {
  snapshot: ExchangeRateSnapshot | null;
  settings: ExchangeRateSettings;
  refreshing: boolean;
  error: string | null;
  refreshRates: (force?: boolean) => Promise<ExchangeRateSnapshot | null>;
  updateSettings: (updates: Partial<ExchangeRateSettings>) => void;
  markCostingRate: (usdRate: number) => void;
  materials?: RawMaterial[];
  products?: ProductCalculation[];
  children: ReactNode;
}

export function ExchangeRatesProvider({
  snapshot,
  settings,
  refreshing,
  error,
  refreshRates,
  updateSettings,
  markCostingRate,
  children,
}: ExchangeRatesProviderProps) {
  const value = useMemo<ExchangeRatesContextValue>(() => {
    const formatEquivalents = (cupAmount: number): string | null => {
      if (!snapshot || cupAmount <= 0) return null;

      const parts: string[] = [];
      const display = settings.displayCurrency;
      const primary = fromCup(cupAmount, display, snapshot);
      if (primary != null) {
        parts.push(`≈ ${primary.toFixed(2)} ${PURCHASE_CURRENCY_LABELS[display]}`);
      }

      const secondaryCurrencies: Exclude<PurchaseCurrency, 'CUP'>[] = ['USD', 'MLC', 'EUR'].filter(
        (c) => c !== display
      ) as Exclude<PurchaseCurrency, 'CUP'>[];

      for (const currency of secondaryCurrencies) {
        const amount = fromCup(cupAmount, currency, snapshot);
        if (amount != null) {
          parts.push(`${amount.toFixed(2)} ${PURCHASE_CURRENCY_LABELS[currency]}`);
        }
      }

      return parts.length > 0 ? parts.join(' · ') : null;
    };

    const formatDual = (cupAmount: number): string => {
      const equiv = formatEquivalents(cupAmount);
      return equiv ? `${formatCurrency(cupAmount)} (${equiv})` : formatCurrency(cupAmount);
    };

    return {
      snapshot,
      settings,
      refreshing,
      error,
      refreshRates,
      updateSettings,
      markCostingRate,
      formatEquivalents,
      formatDual,
    };
  }, [snapshot, settings, refreshing, error, refreshRates, updateSettings, markCostingRate]);

  return (
    <ExchangeRatesContext.Provider value={value}>{children}</ExchangeRatesContext.Provider>
  );
}

export function useExchangeRatesContext(): ExchangeRatesContextValue {
  const ctx = useContext(ExchangeRatesContext);
  if (!ctx) {
    throw new Error('useExchangeRatesContext debe usarse dentro de ExchangeRatesProvider');
  }
  return ctx;
}

export function useOptionalExchangeRates(): ExchangeRatesContextValue | null {
  return useContext(ExchangeRatesContext);
}

export function usePriceReviewAlerts(materials: RawMaterial[], products: ProductCalculation[]) {
  const ctx = useOptionalExchangeRates();
  return useMemo(() => {
    if (!ctx) return [];
    return getPriceReviewAlerts(materials, products, ctx.snapshot, ctx.settings);
  }, [ctx, materials, products]);
}
