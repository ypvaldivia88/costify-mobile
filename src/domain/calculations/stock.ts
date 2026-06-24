import type {
  MovementLine,
  ProductCalculation,
  RawMaterial,
  StockAlert,
  StockLevel,
  StockMovement,
  StockRefType,
  StockThreshold,
  UnitSettings,
  Warehouse,
} from '../types';
import { DEFAULT_UNIT_SETTINGS } from '../unit-settings';
import { getUnitShortLabel } from '../unit-settings';

function stockKey(refType: StockRefType, refId: string, warehouseId: string): string {
  return `${refType}:${refId}:${warehouseId}`;
}

function parseStockKey(key: string): StockLevel {
  const [refType, refId, warehouseId] = key.split(':') as [StockRefType, string, string];
  return { refType, refId, warehouseId, quantity: 0 };
}

export function calculateStockLevels(
  movements: StockMovement[],
  warehouseIds?: string[]
): StockLevel[] {
  const balances = new Map<string, number>();

  const sorted = [...movements].sort((a, b) => a.timestamp - b.timestamp);

  for (const movement of sorted) {
    applyMovementToBalances(balances, movement);
  }

  const levels: StockLevel[] = [];
  for (const [key, quantity] of balances.entries()) {
    if (quantity === 0) continue;
    const level = parseStockKey(key);
    if (warehouseIds && !warehouseIds.includes(level.warehouseId)) continue;
    levels.push({ ...level, quantity });
  }

  return levels;
}

function applyMovementToBalances(
  balances: Map<string, number>,
  movement: StockMovement
): void {
  const add = (refType: StockRefType, refId: string, warehouseId: string, delta: number) => {
    if (!warehouseId || delta === 0) return;
    const key = stockKey(refType, refId, warehouseId);
    balances.set(key, (balances.get(key) ?? 0) + delta);
  };

  switch (movement.type) {
    case 'inventario_inicial':
    case 'entrada':
      for (const line of movement.lines) {
        add(line.refType, line.refId, movement.warehouseId, line.quantity);
      }
      break;
    case 'salida':
    case 'merma':
      for (const line of movement.lines) {
        add(line.refType, line.refId, movement.warehouseId, -line.quantity);
      }
      break;
    case 'ajuste':
      for (const line of movement.lines) {
        add(line.refType, line.refId, movement.warehouseId, line.quantity);
      }
      break;
    case 'transferencia':
      if (!movement.sourceWarehouseId) break;
      for (const line of movement.lines) {
        add(line.refType, line.refId, movement.sourceWarehouseId!, -line.quantity);
        add(line.refType, line.refId, movement.warehouseId, line.quantity);
      }
      break;
    case 'produccion':
      for (const line of movement.lines) {
        if (line.refType === 'raw_material') {
          add(line.refType, line.refId, movement.warehouseId, -line.quantity);
        } else {
          add(line.refType, line.refId, movement.warehouseId, line.quantity);
        }
      }
      break;
  }
}

export function getStockQuantity(
  levels: StockLevel[],
  refType: StockRefType,
  refId: string,
  warehouseId?: string
): number {
  return levels
    .filter(
      (l) =>
        l.refType === refType &&
        l.refId === refId &&
        (warehouseId == null || l.warehouseId === warehouseId)
    )
    .reduce((sum, l) => sum + l.quantity, 0);
}

export function validateMovementStock(
  movement: Omit<StockMovement, 'id' | 'timestamp'>,
  existingMovements: StockMovement[]
): string | null {
  const projected = calculateStockLevels([
    ...existingMovements,
    { ...movement, id: '__preview__', timestamp: Date.now() + 1 },
  ]);

  for (const level of projected) {
    if (level.quantity < -0.0001) {
      return 'Stock insuficiente para completar el movimiento.';
    }
  }

  return null;
}

export function buildStockMovement(
  input: Omit<StockMovement, 'id' | 'timestamp'>,
  id?: string,
  timestamp?: number
): StockMovement {
  return {
    ...input,
    id: id ?? crypto.randomUUID(),
    timestamp: timestamp ?? Date.now(),
  };
}

export function buildWarehouse(
  input: Omit<Warehouse, 'id' | 'timestamp'>,
  id?: string,
  timestamp?: number
): Warehouse {
  return {
    ...input,
    id: id ?? crypto.randomUUID(),
    timestamp: timestamp ?? Date.now(),
  };
}

export const DEFAULT_WAREHOUSE_PRESETS: Array<Omit<Warehouse, 'id' | 'timestamp'>> = [
  { name: 'Bodega principal', type: 'principal', active: true },
];

export function createInitialStockMovements(
  rawMaterials: RawMaterial[],
  warehouseId: string
): StockMovement[] {
  const now = Date.now();
  return rawMaterials
    .filter((m) => m.stockQuantity > 0)
    .map((material, index) =>
      buildStockMovement(
        {
          type: 'inventario_inicial',
          warehouseId,
          note: 'Migración desde stock de insumos',
          lines: [
            {
              refType: 'raw_material',
              refId: material.id,
              quantity: material.stockQuantity,
              unitType: material.unitType,
            },
          ],
        },
        undefined,
        now + index
      )
    );
}

export function createProductionMovement(
  product: ProductCalculation,
  consumptionLines: MovementLine[],
  warehouseId: string,
  productionQuantity: number,
  note?: string
): Omit<StockMovement, 'id' | 'timestamp'> {
  const lines: MovementLine[] = [
    ...consumptionLines.map((line) => ({
      ...line,
      refType: 'raw_material' as const,
    })),
    {
      refType: 'product',
      refId: product.id,
      quantity: productionQuantity,
      unitType: product.purchaseUnit,
    },
  ];

  return {
    type: 'produccion',
    warehouseId,
    productId: product.id,
    note: note ?? `Producción: ${product.name}`,
    lines,
  };
}

export function calculateStockValuation(
  levels: StockLevel[],
  rawMaterials: RawMaterial[],
  products: ProductCalculation[]
): { rawMaterialsValue: number; productsValue: number; totalValue: number } {
  let rawMaterialsValue = 0;
  let productsValue = 0;

  for (const level of levels) {
    if (level.quantity <= 0) continue;
    if (level.refType === 'raw_material') {
      const material = rawMaterials.find((m) => m.id === level.refId);
      if (material) rawMaterialsValue += material.unitCost * level.quantity;
    } else {
      const product = products.find((p) => p.id === level.refId);
      if (product) productsValue += product.totalUnitCost * level.quantity;
    }
  }

  return {
    rawMaterialsValue,
    productsValue,
    totalValue: rawMaterialsValue + productsValue,
  };
}

export function getStockAlerts(
  levels: StockLevel[],
  thresholds: StockThreshold[],
  rawMaterials: RawMaterial[],
  products: ProductCalculation[],
  warehouses: Warehouse[],
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): StockAlert[] {
  const alerts: StockAlert[] = [];

  for (const threshold of thresholds) {
    const currentQuantity = getStockQuantity(
      levels,
      threshold.refType,
      threshold.refId,
      threshold.warehouseId
    );

    if (currentQuantity > threshold.minQuantity) continue;

    const name =
      threshold.refType === 'raw_material'
        ? rawMaterials.find((m) => m.id === threshold.refId)?.name
        : products.find((p) => p.id === threshold.refId)?.name;

    if (!name) continue;

    const unitLabel =
      threshold.refType === 'raw_material'
        ? getUnitShortLabel(
            unitSettings,
            rawMaterials.find((m) => m.id === threshold.refId)?.unitType ?? 'ud'
          )
        : products.find((p) => p.id === threshold.refId)?.purchaseUnit ?? 'ud';

    const warehouse = threshold.warehouseId
      ? warehouses.find((w) => w.id === threshold.warehouseId)
      : undefined;

    alerts.push({
      refType: threshold.refType,
      refId: threshold.refId,
      name,
      warehouseId: threshold.warehouseId,
      warehouseName: warehouse?.name,
      currentQuantity,
      minQuantity: threshold.minQuantity,
      unitLabel,
    });
  }

  return alerts.sort((a, b) => a.currentQuantity - b.currentQuantity);
}

export function syncRawMaterialStockFromLevels(
  materials: RawMaterial[],
  levels: StockLevel[]
): RawMaterial[] {
  return materials.map((material) => ({
    ...material,
    stockQuantity: Math.max(
      0,
      getStockQuantity(levels, 'raw_material', material.id)
    ),
  }));
}

export function createStockAdjustmentMovement(
  refType: StockRefType,
  refId: string,
  warehouseId: string,
  currentQuantity: number,
  targetQuantity: number,
  unitType?: string,
  note?: string
): Omit<StockMovement, 'id' | 'timestamp'> {
  const delta = targetQuantity - currentQuantity;
  return {
    type: 'ajuste',
    warehouseId,
    note: note ?? 'Ajuste de stock',
    lines: [{ refType, refId, quantity: delta, unitType }],
  };
}
