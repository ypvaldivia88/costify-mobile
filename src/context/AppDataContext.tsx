import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type {
  GlobalFundSettings,
  IndirectCost,
  ProductCalculation,
  RawMaterial,
  RawMaterialInput,
  StockMovement,
  TaxSettings,
  UnitSettings,
  Warehouse,
} from '@/domain/types';
import {
  calculateStockLevels,
  calculateStockValuation,
  createInitialStockMovements,
  createProductionMovement,
  createStockAdjustmentMovement,
  DEFAULT_WAREHOUSE_PRESETS,
  estimateRecipeConsumption,
  getStockAlerts,
  getStockQuantity,
  syncRawMaterialStockFromLevels,
} from '@/domain/calculations';
import type { ExchangeRateSettings } from '@/domain/exchange-rates';
import type { StockThreshold } from '@/domain/types';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { useGlobalCosts } from '@/hooks/use-global-costs';
import { useGlobalFund } from '@/hooks/use-global-fund';
import { useInventory } from '@/hooks/use-inventory';
import { useRawMaterials } from '@/hooks/use-raw-materials';
import { useStockMovements } from '@/hooks/use-stock-movements';
import { useStockThresholds } from '@/hooks/use-stock-thresholds';
import { useTaxSettings } from '@/hooks/use-tax-settings';
import { useUnitSettings } from '@/hooks/use-unit-settings';
import { useWarehouses } from '@/hooks/use-warehouses';

interface AppDataContextValue {
  hydrated: boolean;
  inventory: ProductCalculation[];
  materials: RawMaterial[];
  globalCosts: IndirectCost[];
  globalFund: GlobalFundSettings;
  taxSettings: TaxSettings;
  unitSettings: UnitSettings;
  warehouses: Warehouse[];
  stockMovements: StockMovement[];
  stockThresholds: StockThreshold[];
  stockLevels: ReturnType<typeof calculateStockLevels>;
  stockValuation: ReturnType<typeof calculateStockValuation>;
  stockAlerts: ReturnType<typeof getStockAlerts>;
  exchangeSettings: ExchangeRateSettings;
  saveProduct: (
    product: ProductCalculation,
    rawMaterials?: RawMaterial[],
    globalFund?: GlobalFundSettings,
    unitSettings?: UnitSettings
  ) => void;
  deleteProduct: (id: string) => void;
  recalculateAll: () => void;
  saveMaterial: (input: RawMaterialInput, id?: string, timestamp?: number) => RawMaterial;
  deleteMaterial: (id: string) => void;
  updateStock: (id: string, stockQuantity: number) => void;
  saveCosts: (costs: IndirectCost[]) => void;
  updateGlobalFund: (updates: Partial<GlobalFundSettings>) => void;
  updateTaxSettings: (updates: Partial<TaxSettings>) => void;
  saveUnitSettings: (settings: UnitSettings) => void;
  resetUnitSettings: () => void;
  saveWarehouse: (
    input: Omit<Warehouse, 'id' | 'timestamp'>,
    id?: string,
    timestamp?: number
  ) => Warehouse;
  deleteWarehouse: (id: string) => void;
  registerMovement: (input: Omit<StockMovement, 'id' | 'timestamp'>) => StockMovement;
  deleteMovement: (id: string) => void;
  saveStockThreshold: (input: Omit<StockThreshold, 'id'>, id?: string) => void;
  deleteStockThreshold: (id: string) => void;
  registerProduction: (
    product: ProductCalculation,
    productionQuantity: number,
    warehouseId?: string,
    note?: string
  ) => StockMovement;
  registerProductMovement: (
    product: ProductCalculation,
    input: {
      type: StockMovement['type'];
      warehouseId: string;
      sourceWarehouseId?: string;
      quantity: number;
      note?: string;
    }
  ) => StockMovement;
  registerProductInitialStock: (
    product: ProductCalculation,
    quantity: number,
    warehouseId: string
  ) => StockMovement | undefined;
  getDefaultWarehouse: () => Warehouse | undefined;
  reloadFromBackup: (backup: {
    inventory: ProductCalculation[];
    rawMaterials: RawMaterial[];
    globalCosts: IndirectCost[];
    globalFund: GlobalFundSettings;
    taxSettings: TaxSettings;
    unitSettings?: UnitSettings;
    warehouses?: Warehouse[];
    stockMovements?: StockMovement[];
    stockThresholds?: StockThreshold[];
    exchangeRateSettings?: ExchangeRateSettings;
  }) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const inventoryState = useInventory();
  const rawMaterialsState = useRawMaterials();
  const globalCostsState = useGlobalCosts();
  const globalFundState = useGlobalFund();
  const taxSettingsState = useTaxSettings();
  const unitSettingsState = useUnitSettings();
  const warehousesState = useWarehouses();
  const stockMovementsState = useStockMovements();
  const stockThresholdsState = useStockThresholds();
  const exchangeRatesState = useExchangeRates();
  const migrationDone = useRef(false);

  const hydrated =
    inventoryState.hydrated &&
    rawMaterialsState.hydrated &&
    globalCostsState.hydrated &&
    globalFundState.hydrated &&
    taxSettingsState.hydrated &&
    unitSettingsState.hydrated &&
    warehousesState.hydrated &&
    stockMovementsState.hydrated &&
    stockThresholdsState.hydrated &&
    exchangeRatesState.hydrated;

  const stockLevels = useMemo(
    () => calculateStockLevels(stockMovementsState.movements),
    [stockMovementsState.movements]
  );

  const stockValuation = useMemo(
    () =>
      calculateStockValuation(
        stockLevels,
        rawMaterialsState.materials,
        inventoryState.inventory
      ),
    [stockLevels, rawMaterialsState.materials, inventoryState.inventory]
  );

  const stockAlerts = useMemo(
    () =>
      getStockAlerts(
        stockLevels,
        stockThresholdsState.thresholds,
        rawMaterialsState.materials,
        inventoryState.inventory,
        warehousesState.warehouses,
        unitSettingsState.unitSettings
      ),
    [
      stockLevels,
      stockThresholdsState.thresholds,
      rawMaterialsState.materials,
      inventoryState.inventory,
      warehousesState.warehouses,
      unitSettingsState.unitSettings,
    ]
  );

  const getDefaultWarehouse = useCallback((): Warehouse | undefined => {
    const active = warehousesState.warehouses.filter((w) => w.active);
    return (
      active.find((w) => w.type === 'principal') ??
      active[0] ??
      warehousesState.warehouses[0]
    );
  }, [warehousesState.warehouses]);

  useEffect(() => {
    if (!hydrated || migrationDone.current) return;

    if (warehousesState.warehouses.length === 0) {
      const warehouse = warehousesState.saveWarehouse(DEFAULT_WAREHOUSE_PRESETS[0]);
      const initialMovements = createInitialStockMovements(
        rawMaterialsState.materials,
        warehouse.id
      );
      if (initialMovements.length > 0) {
        stockMovementsState.setMovementsDirect([
          ...initialMovements,
          ...stockMovementsState.movements,
        ]);
      }
      migrationDone.current = true;
      return;
    }

    const hasInitialMigration = stockMovementsState.movements.some(
      (m) => m.type === 'inventario_inicial'
    );
    const hasLegacyStock = rawMaterialsState.materials.some((m) => m.stockQuantity > 0);

    if (!hasInitialMigration && hasLegacyStock && stockMovementsState.movements.length === 0) {
      const warehouse = getDefaultWarehouse();
      if (warehouse) {
        const initialMovements = createInitialStockMovements(
          rawMaterialsState.materials,
          warehouse.id
        );
        stockMovementsState.setMovementsDirect(initialMovements);
      }
    }

    migrationDone.current = true;
  }, [hydrated, warehousesState, rawMaterialsState.materials, stockMovementsState, getDefaultWarehouse]);

  useEffect(() => {
    if (!hydrated || stockMovementsState.movements.length === 0) return;

    const synced = syncRawMaterialStockFromLevels(rawMaterialsState.materials, stockLevels);
    const changed = synced.some(
      (m, i) => m.stockQuantity !== rawMaterialsState.materials[i]?.stockQuantity
    );
    if (changed) {
      synced.forEach((material) => {
        rawMaterialsState.saveMaterial(material, material.id, material.timestamp);
      });
    }
  }, [stockLevels, hydrated]);

  useEffect(() => {
    if (!hydrated || inventoryState.inventory.length === 0) return;
    inventoryState.recalculateAll(
      rawMaterialsState.materials,
      globalFundState.globalFund,
      unitSettingsState.unitSettings
    );
  }, [
    globalFundState.globalFund.enabled,
    globalFundState.globalFund.percent,
    unitSettingsState.unitSettings,
    hydrated,
  ]);

  const registerMovement = useCallback(
    (input: Omit<StockMovement, 'id' | 'timestamp'>) => stockMovementsState.addMovement(input),
    [stockMovementsState]
  );

  const updateStock = useCallback(
    (id: string, stockQuantity: number) => {
      const warehouse = getDefaultWarehouse();
      if (!warehouse) {
        rawMaterialsState.updateStock(id, stockQuantity);
        return;
      }

      const current = getStockQuantity(stockLevels, 'raw_material', id, warehouse.id);
      const adjustment = createStockAdjustmentMovement(
        'raw_material',
        id,
        warehouse.id,
        current,
        stockQuantity,
        rawMaterialsState.materials.find((m) => m.id === id)?.unitType,
        'Ajuste desde insumos'
      );

      if (adjustment.lines[0]?.quantity !== 0) {
        stockMovementsState.addMovement(adjustment);
      }
    },
    [getDefaultWarehouse, stockLevels, rawMaterialsState, stockMovementsState]
  );

  const registerProduction = useCallback(
    (
      product: ProductCalculation,
      productionQuantity: number,
      warehouseId?: string,
      note?: string
    ) => {
      if (!product.recipe || product.recipe.length === 0) {
        throw new Error('El producto no tiene receta definida.');
      }

      const warehouse = warehouseId
        ? warehousesState.warehouses.find((w) => w.id === warehouseId)
        : getDefaultWarehouse();

      if (!warehouse) throw new Error('No hay almacén disponible.');

      const consumption = estimateRecipeConsumption(
        product.recipe,
        rawMaterialsState.materials,
        productionQuantity,
        unitSettingsState.unitSettings
      );

      const movement = createProductionMovement(
        product,
        consumption.map((c) => ({
          refType: 'raw_material' as const,
          refId: c.rawMaterialId,
          quantity: c.quantity,
        })),
        warehouse.id,
        productionQuantity,
        note
      );

      return stockMovementsState.addMovement(movement);
    },
    [
      warehousesState.warehouses,
      getDefaultWarehouse,
      rawMaterialsState.materials,
      unitSettingsState.unitSettings,
      stockMovementsState,
    ]
  );

  const registerProductMovement = useCallback(
    (
      product: ProductCalculation,
      input: {
        type: StockMovement['type'];
        warehouseId: string;
        sourceWarehouseId?: string;
        quantity: number;
        note?: string;
      }
    ) => {
      const { type, warehouseId, sourceWarehouseId, quantity, note } = input;

      return stockMovementsState.addMovement({
        type,
        warehouseId,
        sourceWarehouseId,
        note,
        lines: [
          {
            refType: 'product',
            refId: product.id,
            quantity,
            unitType: product.purchaseUnit,
          },
        ],
      });
    },
    [stockMovementsState]
  );

  const registerProductInitialStock = useCallback(
    (product: ProductCalculation, quantity: number, warehouseId: string) => {
      if (quantity <= 0) return;

      return stockMovementsState.addMovement({
        type: 'inventario_inicial',
        warehouseId,
        note: `Stock inicial: ${product.name}`,
        lines: [
          {
            refType: 'product',
            refId: product.id,
            quantity,
            unitType: product.purchaseUnit,
          },
        ],
      });
    },
    [stockMovementsState]
  );

  const purgeStockReferences = useCallback(
    (refType: 'raw_material' | 'product', refId: string) => {
      stockMovementsState.setMovementsDirect(
        stockMovementsState.movements.filter(
          (movement) =>
            movement.productId !== refId &&
            !movement.lines.some((line) => line.refType === refType && line.refId === refId)
        )
      );
      stockThresholdsState.setThresholdsDirect(
        stockThresholdsState.thresholds.filter(
          (threshold) => !(threshold.refType === refType && threshold.refId === refId)
        )
      );
    },
    [stockMovementsState, stockThresholdsState]
  );

  const saveMaterial = useCallback(
    (input: RawMaterialInput, id?: string, timestamp?: number) => {
      const isNew = !id;
      const previous = id
        ? rawMaterialsState.materials.find((material) => material.id === id)
        : undefined;
      const material = rawMaterialsState.saveMaterial(input, id, timestamp);

      const warehouse = getDefaultWarehouse();
      if (!warehouse) return material;

      if (isNew && input.stockQuantity > 0) {
        stockMovementsState.addMovement({
          type: 'inventario_inicial',
          warehouseId: warehouse.id,
          note: `Stock inicial: ${material.name}`,
          lines: [
            {
              refType: 'raw_material',
              refId: material.id,
              quantity: input.stockQuantity,
              unitType: material.unitType,
            },
          ],
        });
      } else if (previous && input.stockQuantity !== previous.stockQuantity) {
        const current = getStockQuantity(stockLevels, 'raw_material', material.id, warehouse.id);
        const adjustment = createStockAdjustmentMovement(
          'raw_material',
          material.id,
          warehouse.id,
          current,
          input.stockQuantity,
          material.unitType,
          'Ajuste desde insumos'
        );
        if (adjustment.lines[0]?.quantity !== 0) {
          stockMovementsState.addMovement(adjustment);
        }
      }

      return material;
    },
    [rawMaterialsState, getDefaultWarehouse, stockMovementsState, stockLevels]
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      rawMaterialsState.deleteMaterial(id);
      purgeStockReferences('raw_material', id);
    },
    [rawMaterialsState, purgeStockReferences]
  );

  const saveProduct = useCallback(
    (
      product: ProductCalculation,
      rawMaterials: RawMaterial[] = rawMaterialsState.materials,
      globalFund: GlobalFundSettings = globalFundState.globalFund,
      unitSettings: UnitSettings = unitSettingsState.unitSettings
    ) => {
      inventoryState.saveProduct(product, rawMaterials, globalFund, unitSettings);
    },
    [inventoryState, rawMaterialsState.materials, globalFundState.globalFund, unitSettingsState.unitSettings]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      inventoryState.deleteProduct(
        id,
        rawMaterialsState.materials,
        globalFundState.globalFund,
        unitSettingsState.unitSettings
      );
      purgeStockReferences('product', id);
    },
    [inventoryState, rawMaterialsState.materials, globalFundState.globalFund, unitSettingsState.unitSettings, purgeStockReferences]
  );

  const recalculateAll = useCallback(() => {
    inventoryState.recalculateAll(
      rawMaterialsState.materials,
      globalFundState.globalFund,
      unitSettingsState.unitSettings
    );
  }, [inventoryState, rawMaterialsState.materials, globalFundState.globalFund, unitSettingsState.unitSettings]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      hydrated,
      inventory: inventoryState.inventory,
      materials: rawMaterialsState.materials,
      globalCosts: globalCostsState.globalCosts,
      globalFund: globalFundState.globalFund,
      taxSettings: taxSettingsState.taxSettings,
      unitSettings: unitSettingsState.unitSettings,
      warehouses: warehousesState.warehouses,
      stockMovements: stockMovementsState.movements,
      stockThresholds: stockThresholdsState.thresholds,
      stockLevels,
      stockValuation,
      stockAlerts,
      exchangeSettings: exchangeRatesState.exchangeSettings,
      saveProduct,
      deleteProduct,
      recalculateAll,
      saveMaterial,
      deleteMaterial,
      updateStock,
      saveCosts: globalCostsState.saveCosts,
      updateGlobalFund: globalFundState.updateGlobalFund,
      updateTaxSettings: taxSettingsState.updateTaxSettings,
      saveUnitSettings: unitSettingsState.updateUnitSettings,
      resetUnitSettings: unitSettingsState.resetUnitSettings,
      saveWarehouse: warehousesState.saveWarehouse,
      deleteWarehouse: warehousesState.deleteWarehouse,
      registerMovement,
      deleteMovement: stockMovementsState.deleteMovement,
      saveStockThreshold: stockThresholdsState.saveThreshold,
      deleteStockThreshold: stockThresholdsState.deleteThreshold,
      registerProduction,
      registerProductMovement,
      registerProductInitialStock,
      getDefaultWarehouse,
      reloadFromBackup: (backup) => {
        inventoryState.replaceInventory(backup.inventory);
        rawMaterialsState.replaceMaterials(backup.rawMaterials);
        globalCostsState.saveCosts(backup.globalCosts);
        globalFundState.replaceGlobalFund(backup.globalFund);
        taxSettingsState.replaceTaxSettings(backup.taxSettings);
        if (backup.unitSettings) {
          unitSettingsState.replaceUnitSettings(backup.unitSettings);
        }
        warehousesState.setWarehousesDirect(backup.warehouses ?? []);
        stockMovementsState.setMovementsDirect(backup.stockMovements ?? []);
        stockThresholdsState.setThresholdsDirect(backup.stockThresholds ?? []);
        if (backup.exchangeRateSettings) {
          exchangeRatesState.replaceSettings(backup.exchangeRateSettings);
        }
      },
    }),
    [
      hydrated,
      inventoryState,
      rawMaterialsState,
      globalCostsState,
      globalFundState,
      taxSettingsState,
      unitSettingsState,
      warehousesState,
      stockMovementsState,
      stockThresholdsState,
      exchangeRatesState,
      stockLevels,
      stockValuation,
      stockAlerts,
      saveProduct,
      deleteProduct,
      recalculateAll,
      saveMaterial,
      deleteMaterial,
      updateStock,
      registerMovement,
      registerProduction,
      registerProductMovement,
      registerProductInitialStock,
      getDefaultWarehouse,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
