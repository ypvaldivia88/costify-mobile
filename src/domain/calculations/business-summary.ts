import type { BusinessSummary, ProductCalculation, TaxSettings } from '../types';
import { calculateMonthlyTaxProjection, mergeTaxLineTotals } from './taxes';

export function calculateBusinessSummary(
  products: ProductCalculation[],
  taxSettings: TaxSettings
): BusinessSummary {
  const taxTotalsMap = new Map<string, { id: string; name: string; amount: number }>();

  const base = products.reduce(
    (acc, product) => {
      const revenue = product.suggestedPrice * product.productionUnits;
      const directCost = product.unitCost * product.productionUnits;
      const indirectCost = product.totalIndirectPerUnit * product.productionUnits;
      const grossProfit = product.profitPerUnit * product.productionUnits;
      const taxes = calculateMonthlyTaxProjection(revenue, grossProfit, taxSettings);

      mergeTaxLineTotals(taxTotalsMap, taxes.taxLines);

      return {
        totalRevenue: acc.totalRevenue + revenue,
        totalDirectCost: acc.totalDirectCost + directCost,
        totalIndirectCost: acc.totalIndirectCost + indirectCost,
        totalGrossProfit: acc.totalGrossProfit + grossProfit,
        totalTaxes: acc.totalTaxes + taxes.totalTaxes,
        totalNetProfit: acc.totalNetProfit + taxes.netProfit,
        totalProjectedRevenue:
          acc.totalProjectedRevenue + product.suggestedPrice * product.productionUnits,
        grossMarginSum: acc.grossMarginSum + product.grossMarginPercent,
      };
    },
    {
      totalRevenue: 0,
      totalDirectCost: 0,
      totalIndirectCost: 0,
      totalGrossProfit: 0,
      totalTaxes: 0,
      totalNetProfit: 0,
      totalProjectedRevenue: 0,
      grossMarginSum: 0,
    }
  );

  return {
    totalRevenue: base.totalRevenue,
    totalDirectCost: base.totalDirectCost,
    totalIndirectCost: base.totalIndirectCost,
    totalGrossProfit: base.totalGrossProfit,
    taxLineTotals: Array.from(taxTotalsMap.values()),
    totalTaxes: base.totalTaxes,
    totalNetProfit: base.totalNetProfit,
    totalProjectedRevenue: base.totalProjectedRevenue,
    totalStockValue: base.totalProjectedRevenue,
    productCount: products.length,
    averageGrossMargin:
      products.length > 0 ? base.grossMarginSum / products.length : 0,
  };
}
