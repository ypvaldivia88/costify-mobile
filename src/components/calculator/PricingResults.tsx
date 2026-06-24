import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProductCalculation, RawMaterial, TaxSettings } from '@/domain/types';
import {
  getIndirectCoverage,
  getTotalMonthlyIndirectCosts,
} from '@/domain/calculations';
import { calculateMonthlyTaxProjection, hasActiveTaxes } from '@/domain/calculations/taxes';
import { DISTRIBUTION_CRITERIA_SHORT, MARGIN_TYPE_LABELS } from '@/domain/constants';
import { formatCurrency, formatPercent } from '@/format/currency';
import { Card } from '@/components/ui/Card';
import { CurrencyEquivalents } from '@/components/ui/CurrencyEquivalents';
import { MarginSensitivityTable } from '@/components/ui/MarginSensitivityTable';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface PricingResultsProps {
  result: ProductCalculation;
  rawMaterials: RawMaterial[];
  taxSettings: TaxSettings;
}

export function PricingResults({
  result,
  rawMaterials,
  taxSettings,
}: PricingResultsProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const [expanded, setExpanded] = useState(false);

  const totalMonthlyIndirect = getTotalMonthlyIndirectCosts(result.indirectCosts);
  const coverage = getIndirectCoverage(
    result.totalIndirectPerUnit,
    result.productionUnits,
    totalMonthlyIndirect
  );

  const monthlyRevenue = result.suggestedPrice * result.productionUnits;
  const monthlyGrossProfit = result.profitPerUnit * result.productionUnits;
  const taxes = calculateMonthlyTaxProjection(monthlyRevenue, monthlyGrossProfit, taxSettings);

  const hasMonthlyProjection = result.productionUnits > 0;
  const hasUnallocatedIndirect = result.indirectCosts.length > 0 && !hasMonthlyProjection;

  const hasDetails =
    (result.recipeBreakdown && result.recipeBreakdown.length > 0) ||
    result.indirectBreakdown.length > 0 ||
    totalMonthlyIndirect > 0 ||
    hasMonthlyProjection;

  return (
    <View style={styles.wrap}>
      <Card variant="accent" style={styles.priceCard}>
        <Text style={[styles.priceLabel, { color: colors.brandForeground }]}>Precio sugerido</Text>
        <Text style={[styles.priceValue, { color: colors.foreground }]}>
          {formatCurrency(result.suggestedPrice)}
        </Text>
        <CurrencyEquivalents cupAmount={result.suggestedPrice} style={styles.equiv} />
        <View style={styles.priceMeta}>
          <Text style={{ color: colors.muted }}>
            Costo: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatCurrency(result.totalUnitCost)}</Text>
          </Text>
          <Text style={{ color: colors.muted }}>
            Utilidad: <Text style={{ color: colors.brand, fontWeight: '700' }}>{formatCurrency(result.profitPerUnit)}</Text>
          </Text>
          <Text style={{ color: colors.muted }}>
            Margen: <Text style={{ color: colors.brand, fontWeight: '700' }}>{formatPercent(result.grossMarginPercent)}</Text>
          </Text>
        </View>
        {hasUnallocatedIndirect ? (
          <Text style={[styles.unallocatedNote, { color: colors.muted }]}>
            Los gastos indirectos mensuales no se incluyen en este precio. Indica un volumen en
            proyección mensual para repartirlos por unidad.
          </Text>
        ) : null}
      </Card>

      {hasDetails ? (
        <Card style={styles.detailsCard}>
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <Text style={[styles.detailsTitle, { color: colors.foreground }]}>
              {expanded ? 'Ocultar desglose completo' : 'Ver desglose completo'}
            </Text>
          </Pressable>

          {expanded ? (
            <View style={styles.detailsBody}>
              {result.recipeBreakdown && result.recipeBreakdown.length > 0 ? (
                <Card variant="muted" style={styles.subCard}>
                  <Text style={[styles.subCardTitle, { color: colors.muted }]}>Materias primas</Text>
                  {result.recipeBreakdown.map((item) => (
                    <View key={item.rawMaterialId} style={styles.row}>
                      <Text style={[styles.rowLabel, { color: colors.muted }]} numberOfLines={2}>
                        {item.name}
                        <Text style={{ fontSize: 11, opacity: 0.7 }}>
                          {' '}
                          ({item.quantity} {unitCatalog.getShortLabel(item.unitType)} ×{' '}
                          {formatCurrency(item.unitCost)}/{unitCatalog.getShortLabel(item.unitType)})
                        </Text>
                      </Text>
                      <Text style={[styles.rowValue, { color: colors.foreground }]}>
                        {formatCurrency(item.lineCost)}
                      </Text>
                    </View>
                  ))}
                </Card>
              ) : null}

              <View style={styles.statsGrid}>
                <StatCard label="Costo directo" value={formatCurrency(result.unitCost)} />
                <StatCard label="Gastos indirectos" value={formatCurrency(result.totalIndirectPerUnit)} />
              </View>

              {result.indirectBreakdown.length > 0 ? (
                <Card variant="muted" style={styles.subCard}>
                  <Text style={[styles.subCardTitle, { color: colors.muted }]}>Gastos indirectos</Text>
                  {result.indirectBreakdown.map((item, idx) => (
                    <View key={idx} style={styles.row}>
                      <Text style={[styles.rowLabel, { color: colors.muted }]}>
                        {item.name || `Gasto ${idx + 1}`}
                        <Text style={{ fontSize: 11, opacity: 0.7 }}>
                          {' '}
                          ({DISTRIBUTION_CRITERIA_SHORT[item.criteria]})
                        </Text>
                      </Text>
                      <Text style={[styles.rowValue, { color: colors.foreground }]}>
                        {formatCurrency(item.perUnit)}/u
                      </Text>
                    </View>
                  ))}
                </Card>
              ) : null}

              {totalMonthlyIndirect > 0 && hasMonthlyProjection ? (
                <Card variant="muted" style={styles.subCard}>
                  <Text style={[styles.subCardTitle, { color: colors.muted }]}>Cobertura de gastos fijos</Text>
                  <View style={styles.coverageWrap}>
                    <View style={[styles.coverageBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.coverageFill, { width: `${coverage.percent}%`, backgroundColor: colors.brand }]}
                      />
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>
                      {coverage.percent.toFixed(0)}%
                    </Text>
                  </View>
                </Card>
              ) : null}

              {hasMonthlyProjection ? (
                <Card style={styles.subCard}>
                  <Text style={[styles.subCardTitle, { color: colors.muted }]}>
                    Proyección mensual ({result.productionUnits} uds.)
                  </Text>
                  <View style={styles.statsGrid}>
                    <StatCard label="Ingresos" value={formatCurrency(monthlyRevenue)} variant="accent" />
                    <StatCard label="Utilidad bruta" value={formatCurrency(monthlyGrossProfit)} variant="accent" />
                  </View>
                  {hasActiveTaxes(taxSettings) && taxes.totalTaxes > 0 ? (
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                      Utilidad estimada después de impuestos:{' '}
                      <Text style={{ color: colors.brand, fontWeight: '700' }}>
                        {formatCurrency(taxes.netProfit)}
                      </Text>
                    </Text>
                  ) : null}
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                    {MARGIN_TYPE_LABELS[result.marginType]}: {result.profitMargin}%
                  </Text>
                </Card>
              ) : null}

              <Card variant="muted" style={styles.subCard}>
                <Text style={[styles.subCardTitle, { color: colors.muted }]}>
                  Sensibilidad cambiaria
                </Text>
                <MarginSensitivityTable product={result} materials={rawMaterials} />
              </Card>
            </View>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  priceCard: { alignItems: 'center', paddingVertical: 24 },
  priceLabel: { fontSize: 14, fontWeight: '600' },
  priceValue: { fontSize: 40, fontWeight: '900', marginTop: 4 },
  equiv: { marginTop: 4 },
  priceMeta: { marginTop: 12, gap: 4, alignItems: 'center' },
  unallocatedNote: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18, maxWidth: 320 },
  detailsCard: { gap: 12 },
  detailsTitle: { fontSize: 14, fontWeight: '700' },
  detailsBody: { gap: 12, marginTop: 8 },
  subCard: { padding: 12, gap: 8 },
  subCardTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  coverageWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coverageBar: { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  coverageFill: { height: '100%', borderRadius: 999 },
});
