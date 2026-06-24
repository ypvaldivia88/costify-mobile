import { useCallback, useEffect, useState } from 'react';
import type { StockMovement } from '@/domain/types';
import { buildStockMovement, validateMovementStock } from '@/domain/calculations';
import { STORAGE_KEYS } from '@/domain/constants';
import { loadFromStorage, saveToStorage } from '@/storage/async-storage';

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<StockMovement[]>(STORAGE_KEYS.stockMovements, []);
      if (mounted) {
        setMovements(saved);
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.stockMovements, movements);
  }, [movements, hydrated]);

  const addMovement = useCallback(
    (input: Omit<StockMovement, 'id' | 'timestamp'>, id?: string, timestamp?: number) => {
      const error = validateMovementStock(input, movements);
      if (error) throw new Error(error);

      const movement = buildStockMovement(input, id, timestamp);
      setMovements((prev) => [movement, ...prev].sort((a, b) => b.timestamp - a.timestamp));
      return movement;
    },
    [movements]
  );

  const setMovementsDirect = useCallback((next: StockMovement[]) => {
    setMovements(next.sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const deleteMovement = useCallback((id: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return {
    movements,
    hydrated,
    addMovement,
    deleteMovement,
    setMovementsDirect,
  };
}
