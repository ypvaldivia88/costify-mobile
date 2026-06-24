export type UnitType = string;

export type UnitFamily = 'count' | 'weight' | 'volume';

export interface UnitDefinition {
  id: string;
  label: string;
  shortLabel: string;
  family: UnitFamily;
  /** Factor respecto a la unidad base (gr para peso, ml para volumen) */
  factor: number;
  builtin?: boolean;
}

export interface UnitSettings {
  units: UnitDefinition[];
}

export type DistributionCriteria = 'units' | 'direct-cost' | 'weight' | 'manual';

export type MarginType = 'markup' | 'margin';

export type ProductType = 'simple' | 'elaborated';

/** Moneda en que se registró el precio de compra */
export type PurchaseCurrency = 'CUP' | 'USD' | 'EUR' | 'MLC';

/** Metadata de conversión cuando la compra fue en divisa */
export interface PurchaseCurrencyMeta {
  originalCurrency: Exclude<PurchaseCurrency, 'CUP'>;
  originalAmount: number;
  /** Tasa real aplicada en esta compra (CUP por 1 unidad de divisa) */
  exchangeRateUsed: number;
  /** TRMI de elTOQUE al momento del registro, solo como referencia */
  trmiReferenceRate?: number;
  rateDate: string;
  rateFetchedAt: number;
}

export interface RawMaterialInput {
  name: string;
  purchasePrice: number;
  unitType: UnitType;
  packageQuantity: number;
  stockQuantity: number;
  /** Presente si el precio de compra se ingresó en divisa */
  purchaseMeta?: PurchaseCurrencyMeta;
}

export interface RawMaterial extends RawMaterialInput {
  id: string;
  unitCost: number;
  timestamp: number;
}

export interface RecipeItem {
  rawMaterialId: string;
  quantity: number;
  /** Unidad en que se ingresa la cantidad en la receta (ej. gr aunque la compra sea en kg) */
  unitType?: UnitType;
}

export interface RecipeItemBreakdown {
  rawMaterialId: string;
  name: string;
  quantity: number;
  unitType: UnitType;
  unitCost: number;
  lineCost: number;
}

export interface IndirectCost {
  id: string;
  name: string;
  amount: number;
  distributionCriteria: DistributionCriteria;
  distributionUnits?: number;
}

export interface ProductInput {
  name: string;
  productType: ProductType;
  purchasePrice: number;
  /** Etiqueta libre: unidad, caja, bolsa, kg, par, etc. */
  purchaseUnit: string;
  packageQuantity: number;
  recipe?: RecipeItem[];
  productionUnits: number;
  productWeight?: number;
  indirectCosts: IndirectCost[];
  profitMargin: number;
  marginType: MarginType;
  /** Presente si el precio de compra se ingresó en divisa (productos simples) */
  purchaseMeta?: PurchaseCurrencyMeta;
}

export interface IndirectCostBreakdown {
  name: string;
  assigned: number;
  perUnit: number;
  criteria: DistributionCriteria;
}

export interface ProductCalculation extends ProductInput {
  id: string;
  unitCost: number;
  totalIndirectPerUnit: number;
  totalUnitCost: number;
  suggestedPrice: number;
  profitPerUnit: number;
  grossMarginPercent: number;
  indirectBreakdown: IndirectCostBreakdown[];
  recipeBreakdown?: RecipeItemBreakdown[];
  timestamp: number;
}

/** Sector tributario en Cuba (referencia normativa; tasas editables en la app) */
export type TaxSector = 'none' | 'tcp' | 'mipyme' | 'cna' | 'custom';

/** Base sobre la que se aplica cada línea de impuesto */
export type TaxLineBase = 'revenue' | 'revenueExcess' | 'remainingProfit';

export interface TaxLine {
  id: string;
  name: string;
  enabled: boolean;
  /** Porcentaje (ej. 10 = 10%) */
  ratePercent: number;
  base: TaxLineBase;
  /** Umbral mensual en CUP (p. ej. TCP: ingresos exentos hasta ~3 270 CUP/mes) */
  monthlyThresholdCup?: number;
}

export interface TaxSettings {
  /** Si false, no se aplican impuestos en proyecciones */
  enabled: boolean;
  sector: TaxSector;
  lines: TaxLine[];
}

export interface TaxLineAmount {
  id: string;
  name: string;
  amount: number;
}

export interface TaxProjection {
  taxLines: TaxLineAmount[];
  totalTaxes: number;
  netProfit: number;
}

export interface GlobalFundSettings {
  enabled: boolean;
  name: string;
  /** Porcentaje del costo directo unitario */
  percent: number;
}

export interface MonthlyProductProjection {
  revenue: number;
  directCost: number;
  indirectCost: number;
  grossProfit: number;
  taxLines: TaxLineAmount[];
  totalTaxes: number;
  netProfit: number;
}

export interface BusinessSummary {
  totalRevenue: number;
  totalDirectCost: number;
  totalIndirectCost: number;
  totalGrossProfit: number;
  taxLineTotals: TaxLineAmount[];
  totalTaxes: number;
  totalNetProfit: number;
  /** Suma de precio sugerido × unidades/mes (proyección, no stock físico) */
  totalProjectedRevenue: number;
  productCount: number;
  averageGrossMargin: number;
  /** @deprecated Usar totalProjectedRevenue */
  totalStockValue: number;
}

export interface ProductAllocationContext {
  purchasePrice: number;
  packageQuantity: number;
  productionUnits: number;
  productWeight?: number;
  unitDirectCost?: number;
}

/** Tipo de almacén (presets cubanos) */
export type WarehouseType = 'principal' | 'venta' | 'produccion';

export interface Warehouse {
  id: string;
  name: string;
  type: WarehouseType;
  active: boolean;
  timestamp: number;
}

export type StockRefType = 'raw_material' | 'product';

export type MovementType =
  | 'inventario_inicial'
  | 'entrada'
  | 'salida'
  | 'transferencia'
  | 'merma'
  | 'ajuste'
  | 'produccion';

export interface MovementLine {
  refType: StockRefType;
  refId: string;
  /** Cantidad positiva; en ajustes puede ser delta con signo */
  quantity: number;
  unitType?: UnitType;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  warehouseId: string;
  /** Origen en transferencias */
  sourceWarehouseId?: string;
  lines: MovementLine[];
  note?: string;
  /** Producto elaborado asociado a movimientos de producción */
  productId?: string;
  /** Tasa usada si la entrada implicó compra en divisa */
  purchaseMeta?: PurchaseCurrencyMeta;
  timestamp: number;
}

export interface StockThreshold {
  id: string;
  refType: StockRefType;
  refId: string;
  /** Si se omite, aplica al stock total en todos los almacenes */
  warehouseId?: string;
  minQuantity: number;
}

export interface StockLevel {
  refType: StockRefType;
  refId: string;
  warehouseId: string;
  quantity: number;
}

export interface StockAlert {
  refType: StockRefType;
  refId: string;
  name: string;
  warehouseId?: string;
  warehouseName?: string;
  currentQuantity: number;
  minQuantity: number;
  unitLabel: string;
}
