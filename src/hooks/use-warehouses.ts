import { useCallback, useEffect, useState } from 'react';
import type { Warehouse } from '@/domain/types';
import { buildWarehouse } from '@/domain/calculations';
import { STORAGE_KEYS } from '@/domain/constants';
import { loadFromStorage, saveToStorage } from '@/storage/async-storage';

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<Warehouse[]>(STORAGE_KEYS.warehouses, []);
      if (mounted) {
        setWarehouses(saved);
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.warehouses, warehouses);
  }, [warehouses, hydrated]);

  const saveWarehouse = useCallback(
    (input: Omit<Warehouse, 'id' | 'timestamp'>, id?: string, timestamp?: number) => {
      const warehouse = buildWarehouse(input, id, timestamp);
      setWarehouses((prev) => {
        const exists = prev.some((w) => w.id === warehouse.id);
        return exists
          ? prev.map((w) => (w.id === warehouse.id ? warehouse : w))
          : [warehouse, ...prev];
      });
      return warehouse;
    },
    []
  );

  const deleteWarehouse = useCallback((id: string) => {
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const setWarehousesDirect = useCallback((next: Warehouse[]) => {
    setWarehouses(next);
  }, []);

  return {
    warehouses,
    hydrated,
    saveWarehouse,
    deleteWarehouse,
    setWarehousesDirect,
  };
}
