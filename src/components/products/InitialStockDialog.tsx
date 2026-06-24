import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import type { ProductCalculation, Warehouse } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { NumericField } from '@/components/ui/NumericField';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';

interface InitialStockDialogProps {
  product: ProductCalculation;
  warehouses: Warehouse[];
  defaultWarehouseId?: string;
  onConfirm: (quantity: number, warehouseId: string) => void;
  onSkip: () => void;
}

export function InitialStockDialog({
  product,
  warehouses,
  defaultWarehouseId,
  onConfirm,
  onSkip,
}: InitialStockDialogProps) {
  const { colors } = useTheme();
  const activeWarehouses = warehouses.filter((w) => w.active);
  const [quantity, setQuantity] = useState(0);
  const [warehouseId, setWarehouseId] = useState(
    defaultWarehouseId ??
      activeWarehouses.find((w) => w.type === 'principal')?.id ??
      activeWarehouses[0]?.id ??
      ''
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onSkip}>
      <Pressable style={styles.overlay} onPress={onSkip}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Package size={20} color={colors.brand} />
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '800' }}>
              Stock inicial
            </Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
            ¿Registrar stock inicial de{' '}
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{product.name}</Text> en un
            almacén?
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Cantidad</Text>
              <NumericField value={quantity} onChange={setQuantity} />
            </View>

            <Select label="Almacén" value={warehouseId} onValueChange={setWarehouseId}>
              {activeWarehouses.map((w) => (
                <Picker.Item key={w.id} label={w.name} value={w.id} />
              ))}
            </Select>

            <View style={styles.actions}>
              <Button
                disabled={quantity <= 0 || !warehouseId}
                onPress={() => onConfirm(quantity, warehouseId)}
              >
                Registrar stock
              </Button>
              <Button variant="outline" onPress={onSkip}>
                Omitir por ahora
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
    gap: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  actions: { gap: 8 },
});
