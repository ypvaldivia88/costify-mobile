import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeftRight } from 'lucide-react-native';
import type {
  MovementType,
  ProductCalculation,
  RawMaterial,
  StockMovement,
  Warehouse,
} from '@/domain/types';
import { MOVEMENT_TYPE_LABELS } from '@/domain/constants';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumericField } from '@/components/ui/NumericField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

interface MovementFormProps {
  warehouses: Warehouse[];
  materials: RawMaterial[];
  products: ProductCalculation[];
  onSubmit: (input: Omit<StockMovement, 'id' | 'timestamp'>) => void;
}

const MOVEMENT_TYPES: MovementType[] = [
  'entrada',
  'salida',
  'transferencia',
  'merma',
  'ajuste',
  'inventario_inicial',
];

export function MovementForm({
  warehouses,
  materials,
  products,
  onSubmit,
}: MovementFormProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const activeWarehouses = warehouses.filter((w) => w.active);

  const [type, setType] = useState<MovementType>('entrada');
  const [warehouseId, setWarehouseId] = useState(activeWarehouses[0]?.id ?? '');
  const [sourceWarehouseId, setSourceWarehouseId] = useState(activeWarehouses[0]?.id ?? '');
  const [refType, setRefType] = useState<'raw_material' | 'product'>('raw_material');
  const [refId, setRefId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState('');

  const refOptions = useMemo(() => {
    return refType === 'raw_material'
      ? materials.map((m) => ({ id: m.id, name: m.name }))
      : products.map((p) => ({ id: p.id, name: p.name }));
  }, [refType, materials, products]);

  const handleSubmit = () => {
    if (!warehouseId || !refId || quantity === 0) {
      showToast('Completa almacén, ítem y cantidad.', 'error');
      return;
    }

    if (type === 'transferencia' && (!sourceWarehouseId || sourceWarehouseId === warehouseId)) {
      showToast('Selecciona almacenes de origen y destino distintos.', 'error');
      return;
    }

    const selectedMaterial = materials.find((m) => m.id === refId);
    const selectedProduct = products.find((p) => p.id === refId);

    try {
      onSubmit({
        type,
        warehouseId,
        sourceWarehouseId: type === 'transferencia' ? sourceWarehouseId : undefined,
        note: note.trim() || undefined,
        lines: [
          {
            refType,
            refId,
            quantity: type === 'ajuste' ? quantity : Math.abs(quantity),
            unitType:
              refType === 'raw_material'
                ? selectedMaterial?.unitType
                : selectedProduct?.purchaseUnit,
          },
        ],
      });

      showToast('Movimiento registrado', 'success');
      setQuantity(0);
      setNote('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar.', 'error');
    }
  };

  return (
    <Card>
      <SectionHeader
        icon={ArrowLeftRight}
        title="Registrar movimiento"
        description="Entradas, salidas, transferencias, mermas y ajustes de inventario"
      />

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Tipo</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {MOVEMENT_TYPES.map((t) => {
              const active = type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.brand : colors.border,
                      backgroundColor: active ? colors.brandMuted : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.brandForeground : colors.muted, fontSize: 12 },
                    ]}
                  >
                    {MOVEMENT_TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {type === 'transferencia' ? (
          <Select
            label="Origen"
            value={sourceWarehouseId}
            onValueChange={setSourceWarehouseId}
          >
            {activeWarehouses.map((w) => (
              <Picker.Item key={w.id} label={w.name} value={w.id} />
            ))}
          </Select>
        ) : null}

        <Select
          label={type === 'transferencia' ? 'Destino' : 'Almacén'}
          value={warehouseId}
          onValueChange={setWarehouseId}
        >
          {activeWarehouses.map((w) => (
            <Picker.Item key={w.id} label={w.name} value={w.id} />
          ))}
        </Select>

        <View style={styles.field}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {(['raw_material', 'product'] as const).map((rt) => {
              const active = refType === rt;
              return (
                <Pressable
                  key={rt}
                  onPress={() => {
                    setRefType(rt);
                    setRefId('');
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.brand : colors.border,
                      backgroundColor: active ? colors.brandMuted : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.brandForeground : colors.muted },
                    ]}
                  >
                    {rt === 'raw_material' ? 'Insumo' : 'Producto'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Select label="Ítem" value={refId} onValueChange={setRefId}>
          <Picker.Item label="Seleccionar…" value="" />
          {refOptions.map((opt) => (
            <Picker.Item key={opt.id} label={opt.name} value={opt.id} />
          ))}
        </Select>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Cantidad{type === 'ajuste' ? ' (delta, puede ser negativo)' : ''}
          </Text>
          <NumericField value={quantity} onChange={setQuantity} />
        </View>

        <Input
          label="Nota (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ej. Compra en TRD, rotura, conteo físico…"
        />

        <Button onPress={handleSubmit} disabled={activeWarehouses.length === 0}>
          Registrar movimiento
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  chipRow: { gap: 8, paddingBottom: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
