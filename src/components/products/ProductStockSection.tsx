import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import type { MovementType, ProductCalculation, StockLevel, Warehouse } from '@/domain/types';
import { getStockQuantity } from '@/domain/calculations';
import { WAREHOUSE_TYPE_LABELS } from '@/domain/constants';
import { formatCurrency } from '@/format/currency';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumericField } from '@/components/ui/NumericField';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

interface ProductStockSectionProps {
  product: ProductCalculation;
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  onRegisterMovement: (input: {
    type: MovementType;
    warehouseId: string;
    sourceWarehouseId?: string;
    quantity: number;
    note?: string;
  }) => void;
}

type QuickAction = 'entrada' | 'salida' | 'transferencia' | null;

export function ProductStockSection({
  product,
  warehouses,
  stockLevels,
  onRegisterMovement,
}: ProductStockSectionProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const activeWarehouses = warehouses.filter((w) => w.active);
  const [action, setAction] = useState<QuickAction>(null);
  const [warehouseId, setWarehouseId] = useState(activeWarehouses[0]?.id ?? '');
  const [sourceWarehouseId, setSourceWarehouseId] = useState(activeWarehouses[0]?.id ?? '');
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState('');

  const totalStock = getStockQuantity(stockLevels, 'product', product.id);
  const rows = activeWarehouses.map((warehouse) => {
    const qty = getStockQuantity(stockLevels, 'product', product.id, warehouse.id);
    return {
      warehouse,
      quantity: qty,
      value: qty * product.totalUnitCost,
    };
  });

  const handleSubmit = () => {
    if (!warehouseId || quantity <= 0) {
      showToast('Indica almacén y cantidad.', 'error');
      return;
    }

    if (action === 'transferencia' && (!sourceWarehouseId || sourceWarehouseId === warehouseId)) {
      showToast('Selecciona almacenes de origen y destino distintos.', 'error');
      return;
    }

    try {
      onRegisterMovement({
        type: action!,
        warehouseId,
        sourceWarehouseId: action === 'transferencia' ? sourceWarehouseId : undefined,
        quantity,
        note: note.trim() || undefined,
      });
      showToast('Movimiento registrado', 'success');
      setAction(null);
      setQuantity(0);
      setNote('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar.', 'error');
    }
  };

  const actionTitle =
    action === 'entrada'
      ? 'Registrar entrada'
      : action === 'salida'
        ? 'Registrar salida'
        : action === 'transferencia'
          ? 'Transferir entre almacenes'
          : '';

  return (
    <View style={styles.wrap}>
      <Card>
        <View style={styles.totalRow}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Stock total</Text>
          <Text style={{ color: colors.brand, fontSize: 18, fontWeight: '800' }}>
            {totalStock.toLocaleString('es-CU')} {product.purchaseUnit}
          </Text>
        </View>

        {rows.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            No hay almacenes activos configurados.
          </Text>
        ) : (
          <View style={styles.warehouseList}>
            {rows.map(({ warehouse, quantity: qty, value }, index) => (
              <View
                key={warehouse.id}
                style={[
                  styles.warehouseRow,
                  index < rows.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: 1 } : null,
                ]}
              >
                <View style={styles.warehouseMeta}>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }} numberOfLines={1}>
                    {warehouse.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {WAREHOUSE_TYPE_LABELS[warehouse.type]}
                  </Text>
                </View>
                <View style={styles.warehouseQty}>
                  <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                    {qty.toLocaleString('es-CU')} {product.purchaseUnit}
                  </Text>
                  {qty > 0 ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{formatCurrency(value)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.actions}>
        <Button variant="outline" size="sm" onPress={() => setAction('entrada')} style={styles.actionBtn}>
          <ArrowDownToLine size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Entrada</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={() => setAction('salida')} style={styles.actionBtn}>
          <ArrowUpFromLine size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Salida</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={() => setAction('transferencia')} style={styles.actionBtn}>
          <ArrowLeftRight size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Transferir</Text>
        </Button>
      </View>

      {action ? (
        <Card style={styles.form}>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>{actionTitle}</Text>

          {action === 'transferencia' ? (
            <Select label="Origen" value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
              {activeWarehouses.map((w) => (
                <Picker.Item key={w.id} label={w.name} value={w.id} />
              ))}
            </Select>
          ) : null}

          <Select
            label={action === 'transferencia' ? 'Destino' : 'Almacén'}
            value={warehouseId}
            onValueChange={setWarehouseId}
          >
            {activeWarehouses.map((w) => (
              <Picker.Item key={w.id} label={w.name} value={w.id} />
            ))}
          </Select>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Cantidad</Text>
            <NumericField value={quantity} onChange={setQuantity} />
          </View>

          <Input
            placeholder="Nota opcional"
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.formActions}>
            <Button onPress={handleSubmit} style={styles.confirmBtn}>
              Confirmar
            </Button>
            <Button variant="outline" onPress={() => setAction(null)}>
              Cancelar
            </Button>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  warehouseList: { gap: 0 },
  warehouseRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  warehouseMeta: { flex: 1, minWidth: 0 },
  warehouseQty: { alignItems: 'flex-end' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexGrow: 1 },
  form: { gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1 },
});
