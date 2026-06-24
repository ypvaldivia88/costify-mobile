import { useCallback, useEffect, useState } from 'react';
import type { StockThreshold } from '@/domain/types';
import { STORAGE_KEYS } from '@/domain/constants';
import { loadFromStorage, saveToStorage } from '@/storage/async-storage';
import { createId } from '@/utils/uuid';

export function useStockThresholds() {
  const [thresholds, setThresholds] = useState<StockThreshold[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<StockThreshold[]>(STORAGE_KEYS.stockThresholds, []);
      if (mounted) {
        setThresholds(saved);
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.stockThresholds, thresholds);
  }, [thresholds, hydrated]);

  const saveThreshold = useCallback((input: Omit<StockThreshold, 'id'>, id?: string) => {
    const threshold: StockThreshold = { ...input, id: id ?? createId() };
    setThresholds((prev) => {
      const exists = prev.some((t) => t.id === threshold.id);
      return exists
        ? prev.map((t) => (t.id === threshold.id ? threshold : t))
        : [threshold, ...prev];
    });
    return threshold;
  }, []);

  const deleteThreshold = useCallback((id: string) => {
    setThresholds((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setThresholdsDirect = useCallback((next: StockThreshold[]) => {
    setThresholds(next);
  }, []);

  return {
    thresholds,
    hydrated,
    saveThreshold,
    deleteThreshold,
    setThresholdsDirect,
  };
}
