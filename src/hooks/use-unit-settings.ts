import { useCallback, useEffect, useState } from 'react';
import type { UnitSettings } from '@/domain/types';
import { STORAGE_KEYS } from '@/domain/constants';
import { DEFAULT_UNIT_SETTINGS, migrateUnitSettings } from '@/domain/unit-settings';
import { loadFromStorage, saveToStorage } from '@/storage/async-storage';

export function useUnitSettings() {
  const [unitSettings, setUnitSettings] = useState<UnitSettings>(DEFAULT_UNIT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadFromStorage<unknown>(STORAGE_KEYS.unitSettings, null);
      if (mounted) {
        setUnitSettings(saved ? migrateUnitSettings(saved) : DEFAULT_UNIT_SETTINGS);
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveToStorage(STORAGE_KEYS.unitSettings, unitSettings);
  }, [unitSettings, hydrated]);

  const updateUnitSettings = useCallback((settings: UnitSettings) => {
    setUnitSettings(migrateUnitSettings(settings));
  }, []);

  const replaceUnitSettings = useCallback((settings: UnitSettings) => {
    setUnitSettings(migrateUnitSettings(settings));
  }, []);

  const resetUnitSettings = useCallback(() => {
    setUnitSettings(DEFAULT_UNIT_SETTINGS);
  }, []);

  return {
    unitSettings,
    hydrated,
    updateUnitSettings,
    replaceUnitSettings,
    resetUnitSettings,
  };
}
