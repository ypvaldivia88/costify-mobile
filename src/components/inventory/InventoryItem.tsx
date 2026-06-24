import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Edit2, ExternalLink, Trash2 } from 'lucide-react-native';
import type { ProductCalculation, TaxSettings } from '@/domain/types';
import { calculateMonthlyTaxProjection, hasActiveTaxes } from '@/domain/calculations/taxes';
import { DISTRIBUTION_CRITERIA_SHORT, PRODUCT_TYPE_LABELS } from '@/domain/constants';
import { formatCurrency, formatPercent } from '@/format/currency';
import { Card } from '@/components/ui/Card';
import { CurrencyEquivalentsOnly } from '@/components/ui/CurrencyEquivalents';
import { useTheme } from '@/context/ThemeContext';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface InventoryItemProps {
  item: ProductCalculation;
  expanded: boolean;
  taxSettings: TaxSettings;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpen?: () => void;
}

export function InventoryItem({
  item,
  expanded,
  taxSettings,
  onToggle,
  onEdit,
  onDelete,
  onOpen,
}: InventoryItemProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const monthlyRevenue = item.suggestedPrice * item.productionUnits;
  const monthlyGross = item.profitPerUnit * item.productionUnits;
  const taxes = calculateMonthlyTaxProjection(monthlyRevenue, monthlyGross, taxSettings);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.badge, { color: colors.muted, backgroundColor: colors.surfaceMuted }]}>
              {PRODUCT_TYPE_LABELS[item.productType ?? 'simple']}
            </Text>
            <Text style={[styles.badge, { color: colors.muted, backgroundColor: colors.surfaceMuted }]}>
              {new Date(item.timestamp).toLocaleDateString('es-CU')}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Costo: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatCurrency(item.totalUnitCost)}</Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Margen: <Text style={{ color: colors.brand, fontWeight: '700' }}>{formatPercent(item.grossMarginPercent)}</Text>
            </Text>
          </View>
        </View>
        <View style={styles.priceBox}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>PRECIO</Text>
          <Text style={{ color: colors.brand, fontSize: 22, fontWeight: '900' }}>
            {formatCurrency(item.suggestedPrice)}
          </Text>
          <CurrencyEquivalentsOnly cupAmount={item.suggestedPrice} style={styles.equiv} />
        </View>
      </View>

      <View style={styles.actions}>
        {onOpen ? (
          <Pressable
            onPress={onOpen}
            style={[styles.openBtn, { backgroundColor: colors.brandMuted }]}
          >
            <ExternalLink size={14} color={colors.brandForeground} />
            <Text style={{ color: colors.brandForeground, fontWeight: '700', fontSize: 13 }}>Ver ficha</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onToggle}
          style={[styles.actionBtn, { backgroundColor: colors.surfaceMuted }, !onOpen && styles.actionBtnFlex]}
        >
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>
            {expanded ? 'Ocultar' : 'Resumen'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onEdit}
          accessibilityLabel="Editar"
          style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
        >
          <Edit2 size={16} color={colors.brand} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityLabel="Eliminar"
          style={[styles.iconBtn, { backgroundColor: colors.dangerMuted }]}
        >
          <Trash2 size={16} color={colors.danger} />
        </Pressable>
      </View>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Desglose de costos</Text>
          {item.recipeBreakdown && item.recipeBreakdown.length > 0
            ? item.recipeBreakdown.map((rm) => (
                <View key={rm.rawMaterialId} style={styles.row}>
                  <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={2}>
                    {rm.name}{' '}
                    <Text style={{ fontSize: 11 }}>
                      ({rm.quantity}{' '}
                      {rm.unitType ? unitCatalog.getShortLabel(rm.unitType) : ''} ×{' '}
                      {formatCurrency(rm.unitCost)})
                    </Text>
                  </Text>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>{formatCurrency(rm.lineCost)}</Text>
                </View>
              ))
            : null}
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>Costo directo unitario</Text>
            <Text style={{ color: colors.foreground, fontWeight: '600' }}>{formatCurrency(item.unitCost)}</Text>
          </View>
          {item.indirectBreakdown.map((ic, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={{ color: colors.muted, flex: 1 }}>
                {ic.name}{' '}
                <Text style={{ fontSize: 11 }}>({DISTRIBUTION_CRITERIA_SHORT[ic.criteria]})</Text>
              </Text>
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>{formatCurrency(ic.perUnit)}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: '800' }}>Costo total unitario</Text>
            <Text style={{ color: colors.foreground, fontWeight: '800' }}>{formatCurrency(item.totalUnitCost)}</Text>
          </View>

          {item.productionUnits > 0 ? (
            <View style={styles.projection}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>
                Proyección mensual ({item.productionUnits} uds.)
              </Text>
              <View style={styles.row}>
                <Text style={{ color: colors.muted }}>Ingresos</Text>
                <Text style={{ color: colors.brand, fontWeight: '700' }}>{formatCurrency(monthlyRevenue)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ color: colors.muted }}>Utilidad bruta</Text>
                <Text style={{ color: colors.brand, fontWeight: '700' }}>{formatCurrency(monthlyGross)}</Text>
              </View>
              {hasActiveTaxes(taxSettings) && taxes.totalTaxes > 0 ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.muted }}>Después de impuestos estimados</Text>
                  <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatCurrency(taxes.netProfit)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  header: { flexDirection: 'row', gap: 12, padding: 16 },
  meta: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statsRow: { gap: 4 },
  priceBox: { alignItems: 'flex-end', flexShrink: 0 },
  equiv: { marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  openBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    minHeight: 44,
  },
  actionBtn: { borderRadius: 12, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionBtnFlex: { flex: 1 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { borderTopWidth: 1, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  totalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  projection: { gap: 6, marginTop: 8 },
});
