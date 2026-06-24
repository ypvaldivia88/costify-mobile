import type { ProductInput, UnitSettings } from '../types';
import { DEFAULT_UNIT_SETTINGS, getUnitLabel } from '../unit-settings';

type LegacyProductInput = Partial<ProductInput> & {
  unitsPerPackage?: number;
  unitType?: string;
};

function normalizePurchaseUnit(
  value: string | undefined,
  legacyUnitType?: string,
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  if (legacyUnitType) return getUnitLabel(unitSettings, legacyUnitType);
  return 'unidad';
}

export function migrateProductInput(
  product: LegacyProductInput,
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): ProductInput {
  return {
    name: product.name ?? '',
    productType: product.productType ?? 'simple',
    purchasePrice: product.purchasePrice ?? 0,
    purchaseUnit: normalizePurchaseUnit(product.purchaseUnit, product.unitType, unitSettings),
    packageQuantity: product.packageQuantity ?? product.unitsPerPackage ?? 1,
    recipe: product.recipe,
    productionUnits: product.productionUnits ?? 0,
    productWeight: product.productWeight,
    indirectCosts: product.indirectCosts ?? [],
    profitMargin: product.profitMargin ?? 0,
    marginType: product.marginType ?? 'markup',
    purchaseMeta: product.purchaseMeta,
  };
}
