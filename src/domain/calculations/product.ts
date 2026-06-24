import { createId } from '@/utils/uuid';
import type { GlobalFundSettings, ProductCalculation, ProductInput, RawMaterial, UnitSettings } from '../types';
import { DEFAULT_UNIT_SETTINGS } from '../unit-settings';
import { calculateUnitDirectCost } from './direct-cost';
import { calculateGlobalFundPerUnit } from './global-fund';
import { allocateIndirectCosts } from './indirect-allocation';
import { migrateProductInput } from './product-migration';
import {
  calculateGrossMarginPercent,
  calculateProfitPerUnit,
  calculateSuggestedPrice,
} from './pricing';
import { calculateRecipeUnitCost } from './recipe-cost';

export { migrateProductInput } from './product-migration';

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
      purchaseUnit: input.purchaseUnit?.trim() || 'unidad',
      packageQuantity: 1,
      recipeBreakdown: breakdown,
    };
  }

  const unitCost = calculateUnitDirectCost(input.purchasePrice, input.packageQuantity);
  return {
    unitCost,
    purchasePrice: input.purchasePrice,
    purchaseUnit: input.purchaseUnit?.trim() || 'unidad',
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
    id: id ?? createId(),
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
