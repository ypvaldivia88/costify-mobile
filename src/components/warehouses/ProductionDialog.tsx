import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Factory } from 'lucide-react-native';
import type { ProductCalculation, RawMaterial, UnitSettings, Warehouse } from '@/domain/types';
import { estimateRecipeConsumption } from '@/domain/calculations';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumericField } from '@/components/ui/NumericField';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface ProductionDialogProps {
  product: ProductCalculation;
  materials: RawMaterial[];
  warehouses: Warehouse[];
  unitSettings: UnitSettings;
  onProduce: (quantity: number, warehouseId: string, note?: string) => void;
  onClose: () => void;
}

export function ProductionDialog({
  product,
  materials,
  warehouses,
  unitSettings,
  onProduce,
  onClose,
}: ProductionDialogProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const unitCatalog = useUnitCatalog();
  const activeWarehouses = warehouses.filter((w) => w.active);
  const [quantity, setQuantity] = useState(1);
  const [warehouseId, setWarehouseId] = useState(
    activeWarehouses.find((w) => w.type === 'produccion')?.id ??
      activeWarehouses[0]?.id ??
      ''
  );
  const [note, setNote] = useState('');

  const consumption =
    product.recipe && quantity > 0
      ? estimateRecipeConsumption(product.recipe, materials, quantity, unitSettings)
      : [];

  const insufficient = consumption.filter((c) => {
    const material = materials.find((m) => m.id === c.rawMaterialId);
    return material && c.quantity > material.stockQuantity;
  });

  const handleSubmit = () => {
    if (!warehouseId || quantity <= 0) {
      showToast('Indica cantidad y almacén.', 'error');
      return;
    }

    if (insufficient.length > 0) {
      showToast('Stock insuficiente de uno o más insumos.', 'error');
      return;
    }

    try {
      onProduce(quantity, warehouseId, note.trim() || undefined);
      showToast('Producción registrada', 'success');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar.', 'error');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.titleRow}>
              <Factory size={20} color={colors.brand} />
              <Text style={[styles.title, { color: colors.foreground }]}>Registrar producción</Text>
            </View>
            <Text style={[styles.productName, { color: colors.muted }]}>{product.name}</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Unidades a producir</Text>
              <NumericField value={quantity} onChange={setQuantity} />
            </View>

            <Select label="Almacén destino" value={warehouseId} onValueChange={setWarehouseId}>
              {activeWarehouses.map((w) => (
                <Picker.Item key={w.id} label={w.name} value={w.id} />
              ))}
            </Select>

            {consumption.length > 0 ? (
              <View style={[styles.consumption, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.consumptionTitle, { color: colors.muted }]}>
                  Consumo de insumos
                </Text>
                {consumption.map((c) => {
                  const material = materials.find((m) => m.id === c.rawMaterialId);
                  const available = material?.stockQuantity ?? 0;
                  const short = material && c.quantity > available;
                  return (
                    <View key={c.rawMaterialId} style={styles.consumptionRow}>
                      <Text
                        style={{
                          color: short ? colors.danger : colors.muted,
                          fontSize: 14,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {material?.name ?? 'Insumo'}
                      </Text>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                        {c.quantity.toLocaleString('es-CU')}{' '}
                        {material ? unitCatalog.getShortLabel(material.unitType) : ''}
                        <Text style={{ color: colors.muted, fontWeight: '400', fontSize: 12 }}>
                          {' '}
                          (disp. {available.toLocaleString('es-CU')})
                        </Text>
                      </Text>
                    </View>
                  );
                })}
                {insufficient.length > 0 ? (
                  <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>
                    Stock insuficiente para producir esta cantidad.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Input
              value={note}
              onChangeText={setNote}
              placeholder="Nota opcional"
            />

            <View style={styles.actions}>
              <Button
                onPress={handleSubmit}
                style={styles.action}
                disabled={insufficient.length > 0}
              >
                Confirmar producción
              </Button>
              <Button variant="outline" onPress={onClose} style={styles.action}>
                Cancelar
              </Button>
            </View>
          </ScrollView>
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
    maxHeight: '90%',
  },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  productName: { fontSize: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  consumption: { borderRadius: 12, padding: 12, gap: 8 },
  consumptionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  consumptionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
