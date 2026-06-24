import type { GlobalFundSettings, ProductCalculation, ProductInput, RawMaterial, UnitSettings } from '../types';
import { calculateUnitDirectCost } from './direct-cost';
import { calculateGlobalFundPerUnit } from './global-fund';
import { allocateIndirectCosts } from './indirect-allocation';
import {
  calculateGrossMarginPercent,
  calculateProfitPerUnit,
  calculateSuggestedPrice,
} from './pricing';
import { calculateRecipeUnitCost } from './recipe-cost';
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

function resolveDirectCost(
  input: ProductInput,
  rawMaterials: RawMaterial[],
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): {
  unitCost: number;
  purchasePrice: number;
  purchaseUnit: string;
  packageQuantity: number;
  recipeBreakdown?: ProductCalculation['recipeBreakdown'];
} {
  if (input.productType === 'elaborated' && input.recipe && input.recipe.length > 0) {
    const { unitCost, breakdown } = calculateRecipeUnitCost(input.recipe, rawMaterials, unitSettings);
    return {
      unitCost,
      purchasePrice: unitCost,
      purchaseUnit: normalizePurchaseUnit(input.purchaseUnit, undefined, unitSettings),
      packageQuantity: 1,
      recipeBreakdown: breakdown,
    };
  }

  const unitCost = calculateUnitDirectCost(input.purchasePrice, input.packageQuantity);
  return {
    unitCost,
    purchasePrice: input.purchasePrice,
    purchaseUnit: normalizePurchaseUnit(input.purchaseUnit, undefined, unitSettings),
    packageQuantity: input.packageQuantity,
  };
}

export function calculateProduct(
  input: ProductInput,
  otherProducts: ProductCalculation[],
  rawMaterials: RawMaterial[] = [],
  globalFund?: GlobalFundSettings,
  id?: string,
  timestamp?: number,
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): ProductCalculation {
  const direct = resolveDirectCost(input, rawMaterials, unitSettings);

  const allocation = allocateIndirectCosts(
    {
      purchasePrice: direct.purchasePrice,
      packageQuantity: direct.packageQuantity,
      productionUnits: input.productionUnits,
      productWeight: input.productWeight,
      unitDirectCost: direct.unitCost,
    },
    otherProducts,
    input.indirectCosts
  );

  const globalFundPerUnit = calculateGlobalFundPerUnit(direct.unitCost, globalFund);
  const totalIndirectPerUnit = allocation.totalPerUnit + globalFundPerUnit;

  const indirectBreakdown = [...allocation.breakdown];
  if (globalFundPerUnit > 0 && globalFund?.enabled) {
    indirectBreakdown.unshift({
      name: globalFund.name.trim() || 'Fondo global',
      assigned: globalFundPerUnit * input.productionUnits,
      perUnit: globalFundPerUnit,
      criteria: 'direct-cost',
    });
  }

  const totalUnitCost = direct.unitCost + totalIndirectPerUnit;
  const suggestedPrice = calculateSuggestedPrice(
    totalUnitCost,
    input.profitMargin,
    input.marginType
  );
  const profitPerUnit = calculateProfitPerUnit(suggestedPrice, totalUnitCost);
  const grossMarginPercent = calculateGrossMarginPercent(suggestedPrice, totalUnitCost);

  return {
    ...input,
    productType: input.productType ?? 'simple',
    purchasePrice: direct.purchasePrice,
    purchaseUnit: direct.purchaseUnit,
    packageQuantity: direct.packageQuantity,
    id: id ?? crypto.randomUUID(),
    unitCost: direct.unitCost,
    totalIndirectPerUnit,
    totalUnitCost,
    suggestedPrice,
    profitPerUnit,
    grossMarginPercent,
    indirectBreakdown,
    recipeBreakdown: direct.recipeBreakdown,
    timestamp: timestamp ?? Date.now(),
  };
}

export function recalculateInventory(
  products: ProductCalculation[],
  rawMaterials: RawMaterial[] = [],
  globalFund?: GlobalFundSettings,
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): ProductCalculation[] {
  return products.map((product) => {
    const others = products.filter((p) => p.id !== product.id);
    return calculateProduct(
      migrateProductInput(product, unitSettings),
      others,
      rawMaterials,
      globalFund,
      product.id,
      product.timestamp,
      unitSettings
    );
  });
}
