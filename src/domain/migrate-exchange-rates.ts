import {
  DEFAULT_EXCHANGE_RATE_SETTINGS,
  type ExchangeRateSettings,
  type ExchangeRateSnapshot,
} from './exchange-rates';
import type { PurchaseCurrency } from './types';

function isDisplayCurrency(value: unknown): value is Exclude<PurchaseCurrency, 'CUP'> {
  return value === 'USD' || value === 'EUR' || value === 'MLC';
}

function migrateSnapshot(value: unknown): ExchangeRateSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ExchangeRateSnapshot>;
  if (!raw.rates || typeof raw.rates !== 'object') return null;
  const rates = raw.rates as Partial<ExchangeRateSnapshot['rates']>;
  if (typeof rates.USD !== 'number' || typeof rates.MLC !== 'number') return null;

  return {
    rates: {
      USD: rates.USD,
      EUR: typeof rates.EUR === 'number' ? rates.EUR : rates.USD,
      MLC: rates.MLC,
    },
    date: typeof raw.date === 'string' ? raw.date : '',
    hour: typeof raw.hour === 'number' ? raw.hour : 0,
    minutes: typeof raw.minutes === 'number' ? raw.minutes : 0,
    seconds: typeof raw.seconds === 'number' ? raw.seconds : 0,
    fetchedAt: typeof raw.fetchedAt === 'number' ? raw.fetchedAt : Date.now(),
    stale: raw.stale === true,
  };
}

export function migrateExchangeRateSettings(value: unknown): ExchangeRateSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_EXCHANGE_RATE_SETTINGS };
  }

  const raw = value as Partial<ExchangeRateSettings>;

  return {
    displayCurrency: isDisplayCurrency(raw.displayCurrency)
      ? raw.displayCurrency
      : DEFAULT_EXCHANGE_RATE_SETTINGS.displayCurrency,
    lastSnapshot: migrateSnapshot(raw.lastSnapshot),
    alertThresholdPercent:
      typeof raw.alertThresholdPercent === 'number' && raw.alertThresholdPercent > 0
        ? raw.alertThresholdPercent
        : DEFAULT_EXCHANGE_RATE_SETTINGS.alertThresholdPercent,
    lastCostingRateUsd:
      typeof raw.lastCostingRateUsd === 'number' ? raw.lastCostingRateUsd : undefined,
    lastCostingAt: typeof raw.lastCostingAt === 'number' ? raw.lastCostingAt : undefined,
  };
}
