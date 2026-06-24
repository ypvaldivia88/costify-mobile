import { StyleSheet, Text, View } from 'react-native';
import type { StockMovement, Warehouse } from '@/domain/types';
import { MOVEMENT_TYPE_LABELS } from '@/domain/constants';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';

interface MovementHistoryProps {
  movements: StockMovement[];
  warehouses: Warehouse[];
  getItemName: (refType: 'raw_material' | 'product', refId: string) => string;
}

export function MovementHistory({ movements, warehouses, getItemName }: MovementHistoryProps) {
  const { colors } = useTheme();

  if (movements.length === 0) {
    return (
      <Card variant="muted" style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin movimientos</Text>
        <Text style={[styles.emptyHint, { color: colors.muted }]}>
          El kardex aparecerá aquí al registrar operaciones.
        </Text>
      </Card>
    );
  }

  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? 'Almacén desconocido';

  return (
    <View style={styles.list}>
      {movements.map((movement) => (
        <Card key={movement.id} style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: colors.brandMuted }]}>
              <Text style={[styles.badgeText, { color: colors.brandForeground }]}>
                {MOVEMENT_TYPE_LABELS[movement.type]}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {new Date(movement.timestamp).toLocaleString('es-CU')}
            </Text>
          </View>

          <Text style={{ color: colors.foreground, fontSize: 14, marginTop: 4 }}>
            {movement.type === 'transferencia' && movement.sourceWarehouseId
              ? `${warehouseName(movement.sourceWarehouseId)} → ${warehouseName(movement.warehouseId)}`
              : warehouseName(movement.warehouseId)}
          </Text>

          <View style={styles.lines}>
            {movement.lines.map((line, idx) => (
              <Text key={idx} style={{ color: colors.muted, fontSize: 14 }}>
                {getItemName(line.refType, line.refId)}:{' '}
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                  {line.quantity.toLocaleString('es-CU')}
                  {line.unitType ? ` ${line.unitType}` : ''}
                </Text>
              </Text>
            ))}
          </View>

          {movement.note ? (
            <Text style={[styles.note, { color: colors.muted }]}>{movement.note}</Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  lines: { marginTop: 8, gap: 2 },
  note: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 4, textAlign: 'center' },
});
