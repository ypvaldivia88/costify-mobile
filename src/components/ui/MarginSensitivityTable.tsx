import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProductCalculation, RawMaterial } from '@/domain/types';
import { calculateMarginSensitivity } from '@/domain/exchange-rates';
import { useExchangeRatesContext } from '@/hooks/use-exchange-rates-context';
import { formatCurrency, formatPercent } from '@/format/currency';
import { useTheme } from '@/context/ThemeContext';

interface MarginSensitivityTableProps {
  product: ProductCalculation;
  materials: RawMaterial[];
}

export function MarginSensitivityTable({ product, materials }: MarginSensitivityTableProps) {
  const { colors } = useTheme();
  const { snapshot } = useExchangeRatesContext();
  const rows = calculateMarginSensitivity(product, materials, snapshot);

  if (rows.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.muted }]}>
        Este producto no tiene costos vinculados a divisas; la sensibilidad cambiaria no aplica.
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.table}>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerCell, styles.scenarioCol, { color: colors.muted }]}>
            Escenario
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.rateCol, { color: colors.muted }]}>USD</Text>
          <Text style={[styles.cell, styles.headerCell, styles.costCol, { color: colors.muted }]}>Costo</Text>
          <Text style={[styles.cell, styles.headerCell, styles.priceCol, { color: colors.muted }]}>Precio</Text>
          <Text style={[styles.cell, styles.headerCell, styles.marginCol, { color: colors.muted }]}>Margen</Text>
        </View>

        {rows.map((row) => (
          <View
            key={row.label}
            style={[
              styles.row,
              styles.dataRow,
              { borderTopColor: colors.border },
              row.rateMultiplier === 1 ? { backgroundColor: colors.brandMuted } : null,
            ]}
          >
            <Text style={[styles.cell, styles.scenarioCol, styles.bodyText, { color: colors.foreground }]}>
              {row.label}
            </Text>
            <Text style={[styles.cell, styles.rateCol, styles.numeric, { color: colors.foreground }]}>
              {row.usdRate.toFixed(0)}
            </Text>
            <Text style={[styles.cell, styles.costCol, styles.numeric, { color: colors.foreground }]}>
              {formatCurrency(row.unitCost)}
            </Text>
            <Text style={[styles.cell, styles.priceCol, styles.numeric, { color: colors.brand, fontWeight: '600' }]}>
              {formatCurrency(row.suggestedPrice)}
            </Text>
            <Text style={[styles.cell, styles.marginCol, styles.numeric, { color: colors.foreground }]}>
              {formatPercent(row.marginPercent)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, lineHeight: 20 },
  table: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  headerRow: { paddingVertical: 8 },
  dataRow: { borderTopWidth: 1, paddingVertical: 8 },
  cell: { paddingRight: 12 },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: { fontSize: 14, fontWeight: '500' },
  numeric: { fontSize: 14, fontVariant: ['tabular-nums'] },
  scenarioCol: { width: 100 },
  rateCol: { width: 56 },
  costCol: { width: 88 },
  priceCol: { width: 88 },
  marginCol: { width: 72, paddingRight: 0 },
});
