import type { RawMaterial, RecipeItem, RecipeItemBreakdown, UnitSettings } from '../types';
import { DEFAULT_UNIT_SETTINGS } from '../unit-settings';
import {
  materialUnitCostInRecipeUnit,
  recipeQuantityInMaterialUnit,
  resolveRecipeUnit,
} from '../units';

function lineCostForRecipeItem(
  item: RecipeItem,
  material: RawMaterial,
  unitSettings: UnitSettings
): number {
  const recipeUnit = resolveRecipeUnit(item, material.unitType, unitSettings);
  const quantityInMaterialUnit = recipeQuantityInMaterialUnit(
    item.quantity,
    recipeUnit,
    material.unitType,
    unitSettings
  );
  return material.unitCost * quantityInMaterialUnit;
}

export function calculateRecipeUnitCost(
  recipe: RecipeItem[],
  rawMaterials: RawMaterial[],
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): { unitCost: number; breakdown: RecipeItemBreakdown[] } {
  const breakdown: RecipeItemBreakdown[] = [];
  let unitCost = 0;

  for (const item of recipe) {
    if (item.quantity <= 0) continue;

    const material = rawMaterials.find((m) => m.id === item.rawMaterialId);
    if (!material) continue;

    const recipeUnit = resolveRecipeUnit(item, material.unitType, unitSettings);
    const lineCost = lineCostForRecipeItem(item, material, unitSettings);
    unitCost += lineCost;
    breakdown.push({
      rawMaterialId: material.id,
      name: material.name,
      quantity: item.quantity,
      unitType: recipeUnit,
      unitCost: materialUnitCostInRecipeUnit(
        material.unitCost,
        material.unitType,
        recipeUnit,
        unitSettings
      ),
      lineCost,
    });
  }

  return { unitCost, breakdown };
}

export function estimateRecipeConsumption(
  recipe: RecipeItem[],
  rawMaterials: RawMaterial[],
  productionUnits: number,
  unitSettings: UnitSettings = DEFAULT_UNIT_SETTINGS
): Array<{ rawMaterialId: string; quantity: number }> {
  return recipe
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const material = rawMaterials.find((m) => m.id === item.rawMaterialId);
      const perUnit =
        material != null
          ? recipeQuantityInMaterialUnit(
              item.quantity,
              resolveRecipeUnit(item, material.unitType, unitSettings),
              material.unitType,
              unitSettings
            )
          : item.quantity;
      return {
        rawMaterialId: item.rawMaterialId,
        quantity: perUnit * productionUnits,
      };
    });
}
