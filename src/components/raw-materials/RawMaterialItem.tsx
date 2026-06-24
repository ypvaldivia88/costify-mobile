import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Edit2, Package, Trash2 } from 'lucide-react-native';
import type { RawMaterial } from '@/domain/types';
import { formatCurrency } from '@/format/currency';
import { Card } from '@/components/ui/Card';
import { NumericField } from '@/components/ui/NumericField';
import { useTheme } from '@/context/ThemeContext';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface RawMaterialItemProps {
  material: RawMaterial;
  onEdit: () => void;
  onDelete: () => void;
  onStockChange: (stockQuantity: number) => void;
}

export function RawMaterialItem({ material, onEdit, onDelete, onStockChange }: RawMaterialItemProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const unitLabel = unitCatalog.getShortLabel(material.unitType);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {material.name}
            </Text>
            <Text style={[styles.dateBadge, { color: colors.muted, backgroundColor: colors.surfaceMuted }]}>
              {new Date(material.timestamp).toLocaleDateString('es-CU')}
            </Text>
          </View>
          <View style={styles.costRow}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Costo:{' '}
              <Text style={{ color: colors.brand, fontWeight: '700' }}>
                {formatCurrency(material.unitCost)}/{unitLabel}
              </Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Compra:{' '}
              <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                {formatCurrency(material.purchasePrice)}
              </Text>
              {' · '}
              {material.packageQuantity} {unitLabel}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
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
      </View>

      <View style={[styles.stockRow, { borderTopColor: colors.border }]}>
        <View style={styles.stockLabel}>
          <Package size={16} color={colors.muted} />
          <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>Ajustar stock:</Text>
        </View>
        <View style={styles.stockInputWrap}>
          <NumericField
            value={material.stockQuantity}
            onChange={onStockChange}
            style={styles.stockInput}
          />
          <Text style={{ color: colors.muted, fontSize: 12 }}>{unitLabel}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 12 },
  meta: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  dateBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  costRow: { gap: 4 },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  stockLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  stockInput: { flex: 1, minWidth: 0 },
});
