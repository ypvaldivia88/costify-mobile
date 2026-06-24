import type {
  IndirectCost,
  IndirectCostBreakdown,
  ProductAllocationContext,
  ProductCalculation,
} from '../types';
import { migrateProductInput } from './product-migration';

export interface IndirectAllocationResult {
  totalPerUnit: number;
  breakdown: IndirectCostBreakdown[];
}

function getUnitDirectCost(product: ProductAllocationContext): number {
  if (product.unitDirectCost !== undefined && product.unitDirectCost >= 0) {
    return product.unitDirectCost;
  }
  return product.purchasePrice / (product.packageQuantity > 0 ? product.packageQuantity : 1);
}

function getProductDirectCostTotal(product: ProductAllocationContext): number {
  return getUnitDirectCost(product) * product.productionUnits;
}

function allocateSingleCost(
  cost: IndirectCost,
  currentProduct: ProductAllocationContext,
  allProducts: ProductAllocationContext[]
): { assigned: number; perUnit: number } {
  const criteria = cost.distributionCriteria ?? 'manual';
  const productionUnits = currentProduct.productionUnits || 0;

  if (productionUnits <= 0) {
    return { assigned: 0, perUnit: 0 };
  }

  switch (criteria) {
    case 'units': {
      const totalUnits = allProducts.reduce((sum, p) => sum + (p.productionUnits || 0), 0);
      if (totalUnits <= 0) return { assigned: 0, perUnit: 0 };
      const perUnit = cost.amount / totalUnits;
      return { assigned: perUnit * productionUnits, perUnit };
    }

    case 'direct-cost': {
      const totalDirect = allProducts.reduce((sum, p) => sum + getProductDirectCostTotal(p), 0);
      const productDirect = getProductDirectCostTotal(currentProduct);
      if (totalDirect <= 0) return { assigned: 0, perUnit: 0 };
      const assigned = cost.amount * (productDirect / totalDirect);
      const perUnit = productionUnits > 0 ? assigned / productionUnits : 0;
      return { assigned, perUnit };
    }

    case 'weight': {
      const totalWeight = allProducts.reduce(
        (sum, p) => sum + (p.productWeight || 0) * (p.productionUnits || 0),
        0
      );
      const productWeight = (currentProduct.productWeight || 0) * productionUnits;
      if (totalWeight <= 0) return { assigned: 0, perUnit: 0 };
      const assigned = cost.amount * (productWeight / totalWeight);
      const perUnit = productionUnits > 0 ? assigned / productionUnits : 0;
      return { assigned, perUnit };
    }

    case 'manual':
    default: {
      const units = cost.distributionUnits && cost.distributionUnits > 0 ? cost.distributionUnits : 1;
      const perUnit = cost.amount / units;
      return { assigned: perUnit * productionUnits, perUnit };
    }
  }
}

/**
 * Distribuye costos indirectos (gastos fijos del período) entre productos
 * según el criterio configurado para cada gasto.
 */
export function allocateIndirectCosts(
  currentProduct: ProductAllocationContext,
  otherProducts: ProductCalculation[],
  indirectCosts: IndirectCost[]
): IndirectAllocationResult {
  const allProducts: ProductAllocationContext[] = [
    ...otherProducts.map((p) => {
      const migrated = migrateProductInput(p);
      return {
        purchasePrice: migrated.purchasePrice,
        packageQuantity: migrated.packageQuantity,
        productionUnits: migrated.productionUnits,
        productWeight: migrated.productWeight,
        unitDirectCost: p.unitCost,
      };
    }),
    currentProduct,
  ];

  const breakdown: IndirectCostBreakdown[] = [];
  let totalPerUnit = 0;

  for (const cost of indirectCosts) {
    const { assigned, perUnit } = allocateSingleCost(cost, currentProduct, allProducts);
    totalPerUnit += perUnit;
    breakdown.push({
      name: cost.name,
      assigned,
      perUnit,
      criteria: cost.distributionCriteria ?? 'manual',
    });
  }

  return { totalPerUnit, breakdown };
}

export function getTotalMonthlyIndirectCosts(indirectCosts: IndirectCost[]): number {
  return indirectCosts.reduce((sum, cost) => sum + cost.amount, 0);
}

export function getIndirectCoverage(
  totalIndirectPerUnit: number,
  productionUnits: number,
  totalMonthlyIndirectCosts: number
): { covered: number; percent: number; gap: number } {
  const covered = totalIndirectPerUnit * productionUnits;
  const percent =
    totalMonthlyIndirectCosts > 0
      ? Math.min((covered / totalMonthlyIndirectCosts) * 100, 100)
      : 0;
  const gap = Math.max(totalMonthlyIndirectCosts - covered, 0);
  return { covered, percent, gap };
}
