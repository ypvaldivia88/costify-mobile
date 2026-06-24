import type {
  ProductCalculation,
  RawMaterial,
  UnitDefinition,
  UnitFamily,
  UnitSettings,
  UnitType,
} from './types';

export const DEFAULT_UNIT_SETTINGS: UnitSettings = {
  units: [
    { id: 'ud', label: 'Unidad básica', shortLabel: 'ud', family: 'count', factor: 1, builtin: true },
    { id: 'gr', label: 'gr', shortLabel: 'gr', family: 'weight', factor: 1, builtin: true },
    { id: 'kg', label: 'kg', shortLabel: 'kg', family: 'weight', factor: 1000, builtin: true },
    { id: 'lb', label: 'libra', shortLabel: 'lb', family: 'weight', factor: 453.592, builtin: true },
    { id: 'lt', label: 'lt', shortLabel: 'lt', family: 'volume', factor: 1000, builtin: true },
    { id: 'ml', label: 'ml', shortLabel: 'ml', family: 'volume', factor: 1, builtin: true },
  ],
};

const UNIT_FAMILY_LABELS: Record<UnitFamily, string> = {
  count: 'Conteo',
  weight: 'Peso',
  volume: 'Volumen',
};

const EXTRA_PURCHASE_UNIT_SUGGESTIONS = [
  'unidad',
  'caja',
  'bolsa',
  'saco',
  'paquete',
  'docena',
  'par',
  'rollo',
] as const;

function isUnitFamily(value: unknown): value is UnitFamily {
  return value === 'count' || value === 'weight' || value === 'volume';
}

function normalizeUnitDefinition(raw: unknown): UnitDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const unit = raw as Partial<UnitDefinition>;
  if (!unit.id?.trim() || !unit.label?.trim() || !unit.shortLabel?.trim()) return null;
  if (!isUnitFamily(unit.family)) return null;
  const factor = unit.family === 'count' ? 1 : Number(unit.factor);
  if (!Number.isFinite(factor) || factor <= 0) return null;

  return {
    id: unit.id.trim(),
    label: unit.label.trim(),
    shortLabel: unit.shortLabel.trim(),
    family: unit.family,
    factor,
    builtin: unit.builtin === true,
  };
}

export function migrateUnitSettings(value: unknown): UnitSettings {
  if (!value || typeof value !== 'object') return DEFAULT_UNIT_SETTINGS;
  const raw = value as { units?: unknown };
  if (!Array.isArray(raw.units) || raw.units.length === 0) return DEFAULT_UNIT_SETTINGS;

  const units = raw.units
    .map(normalizeUnitDefinition)
    .filter((unit): unit is UnitDefinition => unit != null);

  if (units.length === 0) return DEFAULT_UNIT_SETTINGS;

  const ids = new Set<string>();
  const uniqueUnits = units.filter((unit) => {
    if (ids.has(unit.id)) return false;
    ids.add(unit.id);
    return true;
  });

  return { units: uniqueUnits };
}

export function getUnitFamilyLabels(): Record<UnitFamily, string> {
  return UNIT_FAMILY_LABELS;
}

export function getUnitDefinition(
  settings: UnitSettings,
  unitId: UnitType
): UnitDefinition | undefined {
  return settings.units.find((unit) => unit.id === unitId);
}

export function getUnitLabel(settings: UnitSettings, unitId: UnitType): string {
  return getUnitDefinition(settings, unitId)?.label ?? unitId;
}

export function getUnitShortLabel(settings: UnitSettings, unitId: UnitType): string {
  return getUnitDefinition(settings, unitId)?.shortLabel ?? unitId;
}

export function getSelectableUnitIds(settings: UnitSettings): UnitType[] {
  return settings.units.map((unit) => unit.id);
}

export function getUnitsByFamily(settings: UnitSettings, family: UnitFamily): UnitDefinition[] {
  return settings.units.filter((unit) => unit.family === family);
}

export function isValidUnitType(settings: UnitSettings, value: unknown): value is UnitType {
  return typeof value === 'string' && settings.units.some((unit) => unit.id === value);
}

export function getPurchaseUnitSuggestions(settings: UnitSettings): string[] {
  const fromUnits = settings.units.flatMap((unit) => [unit.label, unit.shortLabel]);
  return [...new Set([...EXTRA_PURCHASE_UNIT_SUGGESTIONS, ...fromUnits])];
}

export function getUnitFactor(settings: UnitSettings, unitId: UnitType): number | undefined {
  const unit = getUnitDefinition(settings, unitId);
  if (!unit) return undefined;
  if (unit.family === 'count') return 1;
  return unit.factor;
}

export function createCustomUnitId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `custom-${slug}-${Date.now()}` : `custom-${Date.now()}`;
}

export function collectUsedUnitIds(
  rawMaterials: RawMaterial[],
  inventory: ProductCalculation[]
): Set<string> {
  const used = new Set<string>();

  for (const material of rawMaterials) {
    if (material.unitType) used.add(material.unitType);
  }

  for (const product of inventory) {
    for (const item of product.recipe ?? []) {
      if (item.unitType) used.add(item.unitType);
    }
    for (const item of product.recipeBreakdown ?? []) {
      if (item.unitType) used.add(item.unitType);
    }
  }

  return used;
}

export function canDeleteUnit(
  unit: UnitDefinition,
  usedUnitIds: Set<string>
): { allowed: boolean; reason?: string } {
  if (unit.builtin) {
    return { allowed: false, reason: 'Las unidades predeterminadas no se pueden eliminar.' };
  }
  if (usedUnitIds.has(unit.id)) {
    return { allowed: false, reason: 'La unidad está en uso en insumos o recetas.' };
  }
  return { allowed: true };
}

export interface UnitCatalog {
  settings: UnitSettings;
  getLabel: (unitId: UnitType) => string;
  getShortLabel: (unitId: UnitType) => string;
  getSelectableUnitIds: () => UnitType[];
  getPurchaseUnitSuggestions: () => string[];
}

export function createUnitCatalog(settings: UnitSettings): UnitCatalog {
  return {
    settings,
    getLabel: (unitId) => getUnitLabel(settings, unitId),
    getShortLabel: (unitId) => getUnitShortLabel(settings, unitId),
    getSelectableUnitIds: () => getSelectableUnitIds(settings),
    getPurchaseUnitSuggestions: () => getPurchaseUnitSuggestions(settings),
  };
}
