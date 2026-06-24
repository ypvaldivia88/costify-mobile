import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UnitSettings } from '@/domain/types';
import { createUnitCatalog, DEFAULT_UNIT_SETTINGS, type UnitCatalog } from '@/domain/unit-settings';

const UnitCatalogContext = createContext<UnitCatalog>(createUnitCatalog(DEFAULT_UNIT_SETTINGS));

interface UnitCatalogProviderProps {
  settings: UnitSettings;
  children: ReactNode;
}

export function UnitCatalogProvider({ settings, children }: UnitCatalogProviderProps) {
  const catalog = useMemo(() => createUnitCatalog(settings), [settings]);
  return <UnitCatalogContext.Provider value={catalog}>{children}</UnitCatalogContext.Provider>;
}

export function useUnitCatalog(): UnitCatalog {
  return useContext(UnitCatalogContext);
}
