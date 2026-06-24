import { StyleSheet, Text, View } from 'react-native';
import type { BusinessSummary, TaxSettings } from '@/domain/types';
import { hasActiveTaxes } from '@/domain/calculations/taxes';
import { formatCurrency, formatPercent } from '@/format/currency';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';

interface BusinessSummaryCardProps {
  summary: BusinessSummary;
  taxSettings: TaxSettings;
}

export function BusinessSummaryCard({ summary, taxSettings }: BusinessSummaryCardProps) {
  const { colors } = useTheme();
  const showTaxes = hasActiveTaxes(taxSettings) && summary.taxLineTotals.length > 0;

  return (
    <Card variant="accent">
      <Text style={[styles.heading, { color: colors.brand }]}>Resumen mensual del negocio</Text>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <StatCard label="Ingresos proyectados" value={formatCurrency(summary.totalRevenue)} />
        </View>
        <View style={styles.gridItem}>
          <StatCard label="Utilidad bruta" value={formatCurrency(summary.totalGrossProfit)} variant="accent" />
        </View>
        <View style={styles.gridItem}>
          <StatCard label="Gastos indirectos" value={formatCurrency(summary.totalIndirectCost)} variant="warning" />
        </View>
        <View style={styles.gridItem}>
          <StatCard label="Margen promedio" value={formatPercent(summary.averageGrossMargin)} />
        </View>
      </View>

      {showTaxes ? (
        <View style={[styles.taxes, { borderTopColor: colors.accentBorder }]}>
          {summary.taxLineTotals.map((line) => (
            <View key={line.id} style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.brandForeground }]}>{line.name}</Text>
              <Text style={[styles.taxValue, { color: colors.brandForeground }]}>
                -{formatCurrency(line.amount)}
              </Text>
            </View>
          ))}
          <View style={styles.taxRow}>
            <Text style={[styles.taxLabel, { color: colors.foreground, fontWeight: '800' }]}>
              Utilidad neta estimada
            </Text>
            <Text style={[styles.taxValue, { color: colors.foreground, fontWeight: '800' }]}>
              {formatCurrency(summary.totalNetProfit)}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={[styles.note, { color: colors.brand }]}>
        {summary.productCount > 0 && summary.totalRevenue === 0
          ? 'Indica unidades/mes en cada producto para ver proyecciones mensuales.'
          : 'Basado en las unidades de venta configuradas por producto.'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },
  taxes: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 6 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  taxLabel: { flex: 1, lineHeight: 20 },
  taxValue: { flexShrink: 0, fontVariant: ['tabular-nums'] },
  note: { fontSize: 11, marginTop: 10, opacity: 0.7 },
});
