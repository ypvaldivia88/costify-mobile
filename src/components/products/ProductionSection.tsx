import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Factory } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import type { ProductCalculation, RawMaterial, UnitSettings, Warehouse } from '@/domain/types';
import { estimateRecipeConsumption } from '@/domain/calculations';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumericField } from '@/components/ui/NumericField';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

interface ProductionSectionProps {
  product: ProductCalculation;
  materials: RawMaterial[];
  warehouses: Warehouse[];
  unitSettings: UnitSettings;
  onProduce: (quantity: number, warehouseId: string, note?: string) => void;
}

export function ProductionSection({
  product,
  materials,
  warehouses,
  unitSettings,
  onProduce,
}: ProductionSectionProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const unitCatalog = useUnitCatalog();
  const activeWarehouses = warehouses.filter((w) => w.active);
  const [quantity, setQuantity] = useState(1);
  const [warehouseId, setWarehouseId] = useState(
    activeWarehouses.find((w) => w.type === 'produccion')?.id ?? activeWarehouses[0]?.id ?? ''
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
      setQuantity(1);
      setNote('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar.', 'error');
    }
  };

  return (
    <Card>
      <View style={styles.header}>
        <Factory size={20} color={colors.brand} />
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '800' }}>
          Registrar producción
        </Text>
      </View>

      <View style={styles.form}>
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
                    style={{ color: short ? colors.danger : colors.muted, flex: 1 }}
                    numberOfLines={1}
                  >
                    {material?.name ?? 'Insumo'}
                  </Text>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                    {c.quantity.toLocaleString('es-CU')}{' '}
                    {material ? unitCatalog.getShortLabel(material.unitType) : ''}
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '400' }}>
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

        <Input placeholder="Nota opcional" value={note} onChangeText={setNote} />

        <Button onPress={handleSubmit} disabled={insufficient.length > 0}>
          Confirmar producción
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  consumption: { borderRadius: 12, padding: 12, gap: 8 },
  consumptionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consumptionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
