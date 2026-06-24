import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AlertTriangle, Bell } from 'lucide-react-native';
import type {
  ProductCalculation,
  RawMaterial,
  StockAlert,
  StockThreshold,
  Warehouse,
} from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumericField } from '@/components/ui/NumericField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/context/ThemeContext';

interface StockAlertsPanelProps {
  alerts: StockAlert[];
  thresholds: StockThreshold[];
  warehouses: Warehouse[];
  materials: RawMaterial[];
  products: ProductCalculation[];
  onSaveThreshold: (input: Omit<StockThreshold, 'id'>, id?: string) => void;
  onDeleteThreshold: (id: string) => void;
}

export function StockAlertsPanel({
  alerts,
  thresholds,
  warehouses,
  materials,
  products,
  onSaveThreshold,
  onDeleteThreshold,
}: StockAlertsPanelProps) {
  const { colors } = useTheme();
  const [refType, setRefType] = useState<'raw_material' | 'product'>('raw_material');
  const [refId, setRefId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [minQuantity, setMinQuantity] = useState(0);

  const refOptions =
    refType === 'raw_material'
      ? materials.map((m) => ({ id: m.id, name: m.name }))
      : products.map((p) => ({ id: p.id, name: p.name }));

  const handleSubmit = () => {
    if (!refId || minQuantity <= 0) return;

    onSaveThreshold({
      refType,
      refId,
      warehouseId: warehouseId || undefined,
      minQuantity,
    });

    setRefId('');
    setMinQuantity(0);
    setWarehouseId('');
  };

  return (
    <View style={styles.wrap}>
      {alerts.length > 0 ? (
        <View style={styles.alertsSection}>
          <View style={styles.alertsHeader}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={[styles.alertsTitle, { color: colors.foreground }]}>
              Alertas activas ({alerts.length})
            </Text>
          </View>
          {alerts.map((alert) => (
            <Card
              key={`${alert.refType}:${alert.refId}:${alert.warehouseId ?? 'all'}`}
              style={[styles.alertCard, { borderColor: colors.warning }]}
            >
              <View style={styles.alertRow}>
                <View style={styles.alertMeta}>
                  <Text style={[styles.alertName, { color: colors.foreground }]}>{alert.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {alert.currentQuantity.toLocaleString('es-CU')} {alert.unitLabel} · mínimo{' '}
                    {alert.minQuantity.toLocaleString('es-CU')}
                    {alert.warehouseName ? ` · ${alert.warehouseName}` : ' · todos los almacenes'}
                  </Text>
                </View>
                <Text style={[styles.alertBadge, { color: colors.warning }]}>Bajo stock</Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <Card>
        <SectionHeader
          icon={Bell}
          title="Umbrales de stock mínimo"
          description="Recibe alertas cuando un ítem baje del nivel configurado"
        />

        <View style={styles.form}>
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

          <Select label="Ítem" value={refId} onValueChange={setRefId}>
            <Picker.Item label="Seleccionar…" value="" />
            {refOptions.map((opt) => (
              <Picker.Item key={opt.id} label={opt.name} value={opt.id} />
            ))}
          </Select>

          <Select
            label="Almacén (opcional)"
            value={warehouseId}
            onValueChange={setWarehouseId}
          >
            <Picker.Item label="Todos los almacenes" value="" />
            {warehouses
              .filter((w) => w.active)
              .map((w) => (
                <Picker.Item key={w.id} label={w.name} value={w.id} />
              ))}
          </Select>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Cantidad mínima</Text>
            <NumericField value={minQuantity} onChange={setMinQuantity} />
          </View>

          <Button onPress={handleSubmit}>Guardar umbral</Button>
        </View>
      </Card>

      {thresholds.length > 0 ? (
        <View style={styles.thresholdsSection}>
          <Text style={[styles.thresholdsTitle, { color: colors.muted }]}>
            Umbrales configurados
          </Text>
          {thresholds.map((threshold) => {
            const name =
              threshold.refType === 'raw_material'
                ? materials.find((m) => m.id === threshold.refId)?.name
                : products.find((p) => p.id === threshold.refId)?.name;
            const wh = threshold.warehouseId
              ? warehouses.find((w) => w.id === threshold.warehouseId)?.name
              : 'Todos';

            return (
              <Card key={threshold.id} style={styles.thresholdCard}>
                <View style={styles.thresholdRow}>
                  <View style={styles.thresholdMeta}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                      {name ?? 'Ítem'}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      Mín. {threshold.minQuantity.toLocaleString('es-CU')} · {wh}
                    </Text>
                  </View>
                  <Button variant="outline" size="sm" onPress={() => onDeleteThreshold(threshold.id)}>
                    Eliminar
                  </Button>
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  alertsSection: { gap: 8 },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertsTitle: { fontSize: 14, fontWeight: '600' },
  alertCard: { padding: 16, borderWidth: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  alertMeta: { flex: 1, gap: 2 },
  alertName: { fontSize: 15, fontWeight: '600' },
  alertBadge: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  form: { gap: 16 },
  chipRow: { gap: 8, paddingBottom: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  thresholdsSection: { gap: 8 },
  thresholdsTitle: { fontSize: 14, fontWeight: '600' },
  thresholdCard: { padding: 12 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  thresholdMeta: { flex: 1, gap: 2 },
});
