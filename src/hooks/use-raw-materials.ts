import { useCallback, useEffect, useState } from 'react';
import type { RawMaterial, RawMaterialInput } from '@/domain/types';
import {
  buildRawMaterial,
  migrateRawMaterialInput,
  recalculateRawMaterial,
} from '@/domain/calculations';
import { STORAGE_KEYS } from '@/domain/constants';
import { loadFromStorage, saveToStorage } from '@/storage/async-storage';

export function useRawMaterials() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<
        Array<RawMaterial & { unitsPerPackage?: number; stockUnits?: number }>
      >(STORAGE_KEYS.rawMaterials, []);
      const normalized = saved.map((material) =>
        buildRawMaterial(migrateRawMaterialInput(material), material.id, material.timestamp)
      );
      if (mounted) {
        setMaterials(normalized);
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.rawMaterials, materials);
  }, [materials, hydrated]);

  const saveMaterial = useCallback((input: RawMaterialInput, id?: string, timestamp?: number) => {
    const material = buildRawMaterial(input, id, timestamp);
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === material.id);
      return exists
        ? prev.map((m) => (m.id === material.id ? material : m))
        : [material, ...prev];
    });
    return material;
  }, []);

  const deleteMaterial = useCallback((id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateStock = useCallback((id: string, stockQuantity: number) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? recalculateRawMaterial({ ...m, stockQuantity }) : m))
    );
  }, []);

  const replaceMaterials = useCallback((items: RawMaterial[]) => {
    setMaterials(items);
  }, []);

  return {
    materials,
    hydrated,
    saveMaterial,
    deleteMaterial,
    updateStock,
    replaceMaterials,
  };
}
