import { useCallback, useEffect, useState } from 'react';
import type {
  GlobalFundSettings,
  ProductCalculation,
  RawMaterial,
  UnitSettings,
} from '@/domain/types';
import { recalculateInventory } from '@/domain/calculations';
import { DEFAULT_UNIT_SETTINGS } from '@/domain/unit-settings';
import { STORAGE_KEYS } from '@/domain/constants';
import {
  loadFromStorage,
  migrateLegacyInventory,
  saveToStorage,
} from '@/storage/async-storage';

export function useInventory() {
  const [inventory, setInventory] = useState<ProductCalculation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<
        Array<ProductCalculation & { unitsPerPackage?: number; unitType?: string }>
      >(STORAGE_KEYS.inventory, []);
      const legacy =
        saved.length > 0 ? saved : ((await migrateLegacyInventory()) as ProductCalculation[]);
      if (mounted) {
        setInventory(recalculateInventory(legacy));
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.inventory, inventory);
  }, [inventory, hydrated]);

  const saveProduct = useCallback(
    (
      product: ProductCalculation,
      rawMaterials: RawMaterial[] = [],
      globalFund?: GlobalFundSettings,
      unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
    ) => {
      setInventory((prev) => {
        const exists = prev.some((item) => item.id === product.id);
        const updated = exists
          ? prev.map((item) => (item.id === product.id ? product : item))
          : [product, ...prev];
        return recalculateInventory(updated, rawMaterials, globalFund, unitSettings);
      });
    },
    []
  );

  const deleteProduct = useCallback(
    (
      id: string,
      rawMaterials: RawMaterial[] = [],
      globalFund?: GlobalFundSettings,
      unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
    ) => {
      setInventory((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        return recalculateInventory(filtered, rawMaterials, globalFund, unitSettings);
      });
    },
    []
  );

  const recalculateAll = useCallback(
    (
      rawMaterials: RawMaterial[] = [],
      globalFund?: GlobalFundSettings,
      unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
    ) => {
      setInventory((prev) => recalculateInventory(prev, rawMaterials, globalFund, unitSettings));
    },
    []
  );

  const replaceInventory = useCallback((items: ProductCalculation[]) => {
    setInventory(recalculateInventory(items));
  }, []);

  return {
    inventory,
    hydrated,
    saveProduct,
    deleteProduct,
    recalculateAll,
    replaceInventory,
  };
}
