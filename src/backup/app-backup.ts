import { Buffer } from 'buffer';
import type {
  GlobalFundSettings,
  IndirectCost,
  ProductCalculation,
  RawMaterial,
  StockMovement,
  StockThreshold,
  TaxSettings,
  UnitSettings,
  Warehouse,
} from '@/domain/types';
import type { ExchangeRateSettings } from '@/domain/exchange-rates';
import { migrateExchangeRateSettings } from '@/domain/migrate-exchange-rates';
import { migrateGlobalFundSettings } from '@/domain/calculations/global-fund';
import { migrateTaxSettings } from '@/domain/migrate-tax-settings';
import { migrateUnitSettings } from '@/domain/unit-settings';
import {
  DEFAULT_GLOBAL_FUND_SETTINGS,
  DEFAULT_TAX_SETTINGS,
  STORAGE_KEYS,
} from '@/domain/constants';
import { saveToStorage } from '@/storage/async-storage';

export const BACKUP_PREFIX = 'costify1:';

export interface AppBackupV1 {
  v: 1;
  at: number;
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
}

export interface AppBackupInput {
  inventory: ProductCalculation[];
  rawMaterials: RawMaterial[];
  globalCosts: IndirectCost[];
  globalFund: GlobalFundSettings;
  taxSettings: TaxSettings;
  unitSettings: UnitSettings;
  warehouses: Warehouse[];
  stockMovements: StockMovement[];
  stockThresholds: StockThreshold[];
  exchangeRateSettings: ExchangeRateSettings;
}

function toBase64Url(text: string): string {
  const base64 = Buffer.from(text, 'utf8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function createBackupPayload(input: AppBackupInput): string {
  const backup: AppBackupV1 = {
    v: 1,
    at: Date.now(),
    inventory: input.inventory,
    rawMaterials: input.rawMaterials,
    globalCosts: input.globalCosts,
    globalFund: input.globalFund,
    taxSettings: input.taxSettings,
    unitSettings: input.unitSettings,
    warehouses: input.warehouses,
    stockMovements: input.stockMovements,
    stockThresholds: input.stockThresholds,
    exchangeRateSettings: input.exchangeRateSettings,
  };
  return BACKUP_PREFIX + toBase64Url(JSON.stringify(backup));
}

export function parseBackupPayload(raw: string): AppBackupV1 {
  const trimmed = raw.trim();
  const payload = trimmed.startsWith(BACKUP_PREFIX)
    ? trimmed.slice(BACKUP_PREFIX.length)
    : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(payload));
  } catch {
    throw new Error('El código de respaldo no es válido o está incompleto.');
  }

  if (!parsed || typeof parsed !== 'object' || (parsed as AppBackupV1).v !== 1) {
    throw new Error('Versión de respaldo no compatible.');
  }

  const backup = parsed as AppBackupV1;
  if (!Array.isArray(backup.inventory) || !Array.isArray(backup.rawMaterials)) {
    throw new Error('El respaldo no contiene datos válidos.');
  }

  return {
    v: 1,
    at: backup.at ?? Date.now(),
    inventory: backup.inventory,
    rawMaterials: backup.rawMaterials,
    globalCosts: Array.isArray(backup.globalCosts) ? backup.globalCosts : [],
    globalFund: migrateGlobalFundSettings(backup.globalFund ?? DEFAULT_GLOBAL_FUND_SETTINGS),
    taxSettings: migrateTaxSettings(backup.taxSettings ?? DEFAULT_TAX_SETTINGS),
    unitSettings: migrateUnitSettings(backup.unitSettings),
    warehouses: Array.isArray(backup.warehouses) ? backup.warehouses : [],
    stockMovements: Array.isArray(backup.stockMovements) ? backup.stockMovements : [],
    stockThresholds: Array.isArray(backup.stockThresholds) ? backup.stockThresholds : [],
    exchangeRateSettings: migrateExchangeRateSettings(backup.exchangeRateSettings),
  };
}

export async function applyBackupToStorage(backup: AppBackupV1): Promise<void> {
  await saveToStorage(STORAGE_KEYS.inventory, backup.inventory);
  await saveToStorage(STORAGE_KEYS.rawMaterials, backup.rawMaterials);
  await saveToStorage(STORAGE_KEYS.globalCosts, backup.globalCosts);
  await saveToStorage(STORAGE_KEYS.globalFund, backup.globalFund);
  await saveToStorage(STORAGE_KEYS.taxSettings, migrateTaxSettings(backup.taxSettings));
  await saveToStorage(STORAGE_KEYS.unitSettings, migrateUnitSettings(backup.unitSettings));
  await saveToStorage(STORAGE_KEYS.warehouses, backup.warehouses ?? []);
  await saveToStorage(STORAGE_KEYS.stockMovements, backup.stockMovements ?? []);
  await saveToStorage(STORAGE_KEYS.stockThresholds, backup.stockThresholds ?? []);
  await saveToStorage(
    STORAGE_KEYS.exchangeRates,
    migrateExchangeRateSettings(backup.exchangeRateSettings)
  );
}

export function parseBackupFileContent(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith(BACKUP_PREFIX)) {
    return trimmed;
  }

  const json = JSON.parse(text) as AppBackupV1 | { payload?: string };
  if (typeof (json as { payload?: string }).payload === 'string') {
    return (json as { payload: string }).payload;
  }
  if ((json as AppBackupV1).v === 1) {
    const backup = json as AppBackupV1;
    return createBackupPayload({
      inventory: backup.inventory,
      rawMaterials: backup.rawMaterials,
      globalCosts: backup.globalCosts ?? [],
      globalFund: migrateGlobalFundSettings(backup.globalFund ?? DEFAULT_GLOBAL_FUND_SETTINGS),
      taxSettings: migrateTaxSettings(backup.taxSettings ?? DEFAULT_TAX_SETTINGS),
      unitSettings: migrateUnitSettings(backup.unitSettings),
      warehouses: backup.warehouses ?? [],
      stockMovements: backup.stockMovements ?? [],
      stockThresholds: backup.stockThresholds ?? [],
      exchangeRateSettings: migrateExchangeRateSettings(backup.exchangeRateSettings),
    });
  }
  throw new Error('Archivo de respaldo no reconocido.');
}

export function buildBackupFileContent(payload: string): string {
  return JSON.stringify(
    {
      app: 'Costify',
      version: 1,
      exportedAt: new Date().toISOString(),
      payload,
    },
    null,
    2
  );
}
