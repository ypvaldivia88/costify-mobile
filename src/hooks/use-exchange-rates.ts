import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_EXCHANGE_RATE_SETTINGS,
  type ExchangeRateSettings,
  type ExchangeRateSnapshot,
  mapTrmiResponse,
  type TrmiApiResponse,
} from '@/domain/exchange-rates';
import { migrateExchangeRateSettings } from '@/domain/migrate-exchange-rates';
import { STORAGE_KEYS } from '@/domain/constants';
import { loadFromStorage, saveToStorage } from '@/storage/async-storage';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const ELTOQUE_API_URL = 'https://tasas.eltoque.com/v1/trmi';

const MANUAL_ONLY_ERROR =
  'Sin token de elTOQUE configurado. Ingresa las tasas manualmente o define EXPO_PUBLIC_ELTOQUE_API_TOKEN.';

async function fetchRemoteSnapshot(): Promise<ExchangeRateSnapshot> {
  const token = process.env.EXPO_PUBLIC_ELTOQUE_API_TOKEN;
  if (!token) {
    throw new Error(MANUAL_ONLY_ERROR);
  }

  const response = await fetch(ELTOQUE_API_URL, {
    method: 'GET',
    headers: {
      accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`elTOQUE respondió con estado ${response.status}.`);
  }

  const data = (await response.json()) as TrmiApiResponse;
  return mapTrmiResponse(data);
}

export function useExchangeRates() {
  const [settings, setSettings] = useState<ExchangeRateSettings>(DEFAULT_EXCHANGE_RATE_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<unknown>(STORAGE_KEYS.exchangeRates, null);
      if (mounted) {
        setSettings(saved ? migrateExchangeRateSettings(saved) : { ...DEFAULT_EXCHANGE_RATE_SETTINGS });
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.exchangeRates, settings);
  }, [settings, hydrated]);

  const refreshRates = useCallback(async (force = false) => {
    if (refreshInFlight.current) return settings.lastSnapshot;
    refreshInFlight.current = true;
    setRefreshing(true);
    setError(null);

    try {
      const last = settings.lastSnapshot;
      const isFresh =
        last && !last.stale && Date.now() - last.fetchedAt < REFRESH_INTERVAL_MS;

      if (!force && isFresh) {
        return last;
      }

      const snapshot = await fetchRemoteSnapshot();
      setSettings((prev) => ({ ...prev, lastSnapshot: snapshot }));
      return snapshot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar tasas.';
      setError(message);

      if (settings.lastSnapshot) {
        return { ...settings.lastSnapshot, stale: true };
      }

      return null;
    } finally {
      setRefreshing(false);
      refreshInFlight.current = false;
    }
  }, [settings.lastSnapshot]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshRates();
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated) return;

    const interval = setInterval(() => {
      void refreshRates();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hydrated, refreshRates]);

  const updateSettings = useCallback((updates: Partial<ExchangeRateSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const replaceSettings = useCallback((next: ExchangeRateSettings) => {
    setSettings(migrateExchangeRateSettings(next));
  }, []);

  const markCostingRate = useCallback((usdRate: number) => {
    setSettings((prev) => ({
      ...prev,
      lastCostingRateUsd: usdRate,
      lastCostingAt: Date.now(),
    }));
  }, []);

  const applyLocalSnapshot = useCallback((snapshot: ExchangeRateSnapshot) => {
    setSettings((prev) => ({ ...prev, lastSnapshot: snapshot }));
  }, []);

  return {
    exchangeSettings: settings,
    snapshot: settings.lastSnapshot,
    hydrated,
    refreshing,
    error,
    refreshRates,
    updateSettings,
    replaceSettings,
    markCostingRate,
    applyLocalSnapshot,
  };
}

/** Para tests o importación offline de snapshot crudo de la API */
export function parseTrmiApiResponse(data: unknown): ExchangeRateSnapshot {
  return mapTrmiResponse(data as Parameters<typeof mapTrmiResponse>[0]);
}
