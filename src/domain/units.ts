import type { UnitSettings, UnitType } from './types';
import {
  DEFAULT_UNIT_SETTINGS,
  getUnitDefinition,
  getUnitFactor,
  getUnitsByFamily,
} from './unit-settings';

export function getUnitFamily(
  unit: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): 'weight' | 'volume' | 'count' {
  const definition = getUnitDefinition(settings, unit);
  if (!definition) return 'count';
  return definition.family;
}

export function areUnitsCompatible(
  a: UnitType,
  b: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): boolean {
  return getUnitFamily(a, settings) === getUnitFamily(b, settings);
}

/** Unidades disponibles al confeccionar una receta a partir de la unidad de compra */
export function getRecipeUnitOptions(
  materialUnit: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): UnitType[] {
  const family = getUnitFamily(materialUnit, settings);
  if (family === 'weight') return getUnitsByFamily(settings, 'weight').map((unit) => unit.id);
  if (family === 'volume') return getUnitsByFamily(settings, 'volume').map((unit) => unit.id);
  return getUnitsByFamily(settings, 'count').map((unit) => unit.id);
}

export function convertQuantity(
  value: number,
  from: UnitType,
  to: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): number {
  if (from === to) return value;
  if (!areUnitsCompatible(from, to, settings)) return value;

  const fromFactor = getUnitFactor(settings, from);
  const toFactor = getUnitFactor(settings, to);
  if (fromFactor === undefined || toFactor === undefined) return value;

  return (value * fromFactor) / toFactor;
}

export function resolveRecipeUnit(
  item: { unitType?: UnitType },
  materialUnit: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): UnitType {
  const unit = item.unitType ?? materialUnit;
  return areUnitsCompatible(unit, materialUnit, settings) ? unit : materialUnit;
}

/** Cantidad de la receta expresada en la unidad de la materia prima (para costo y stock) */
export function recipeQuantityInMaterialUnit(
  quantity: number,
  recipeUnit: UnitType,
  materialUnit: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): number {
  return convertQuantity(quantity, recipeUnit, materialUnit, settings);
}

/** Costo unitario de la materia prima expresado en la unidad de la receta */
export function materialUnitCostInRecipeUnit(
  unitCost: number,
  materialUnit: UnitType,
  recipeUnit: UnitType,
  settings: UnitSettings = DEFAULT_UNIT_SETTINGS
): number {
  const factor = recipeQuantityInMaterialUnit(1, recipeUnit, materialUnit, settings);
  return unitCost * factor;
}
