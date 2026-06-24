import type {
  DistributionCriteria,
  GlobalFundSettings,
  MovementType,
  TaxSettings,
  WarehouseType,
} from './types';
import { DEFAULT_EXCHANGE_RATE_SETTINGS } from './exchange-rates';
import { getPresetLines } from './tax-presets';

export { DEFAULT_EXCHANGE_RATE_SETTINGS };

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  sector: 'mipyme',
  lines: getPresetLines('mipyme'),
};

export const DEFAULT_GLOBAL_FUND_SETTINGS: GlobalFundSettings = {
  enabled: false,
  name: 'Fondo global',
  percent: 0,
};

export const DISTRIBUTION_CRITERIA_LABELS: Record<DistributionCriteria, string> = {
  units: 'Por unidades vendidas',
  'direct-cost': 'Por costo directo',
  weight: 'Por peso o volumen',
  manual: 'Manual (unidades fijas)',
};

export const DISTRIBUTION_CRITERIA_SHORT: Record<DistributionCriteria, string> = {
  units: 'Unidades',
  'direct-cost': 'Costo directo',
  weight: 'Peso/vol.',
  manual: 'Manual',
};

export const MARGIN_TYPE_LABELS = {
  markup: 'Sobre costo (recargo)',
  margin: 'Sobre venta (margen bruto)',
} as const;

export const STORAGE_KEYS = {
  inventory: 'costify_inventory_v2',
  globalCosts: 'costify_global_costs_v2',
  taxSettings: 'costify_tax_settings_v3',
  rawMaterials: 'costify_raw_materials_v2',
  globalFund: 'costify_global_fund_v2',
  unitSettings: 'costify_unit_settings_v1',
  warehouses: 'costify_warehouses_v1',
  stockMovements: 'costify_stock_movements_v1',
  stockThresholds: 'costify_stock_thresholds_v1',
  theme: 'costify_theme_v1',
  syncWorkspaceId: 'costify_workspace_id_v1',
  syncMetadata: 'costify_sync_metadata_v1',
  exchangeRates: 'costify_exchange_rates_v1',
} as const;

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  principal: 'Bodega principal',
  venta: 'Punto de venta',
  produccion: 'Producción',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  inventario_inicial: 'Inventario inicial',
  entrada: 'Entrada',
  salida: 'Salida',
  transferencia: 'Transferencia',
  merma: 'Merma',
  ajuste: 'Ajuste',
  produccion: 'Producción',
};

export const PRODUCT_TYPE_LABELS = {
  simple: 'Producto simple',
  elaborated: 'Producto elaborado',
} as const;
