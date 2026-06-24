import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Package } from 'lucide-react-native';
import type { ProductCalculation, RawMaterial, StockLevel, Warehouse } from '@/domain/types';
import { formatCurrency } from '@/format/currency';
import { Card } from '@/components/ui/Card';
import { CurrencyEquivalentsOnly } from '@/components/ui/CurrencyEquivalents';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { useTheme } from '@/context/ThemeContext';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface StockOverviewProps {
  stockLevels: StockLevel[];
  warehouses: Warehouse[];
  materials: RawMaterial[];
  products: ProductCalculation[];
  valuation: { rawMaterialsValue: number; productsValue: number; totalValue: number };
  selectedWarehouseId?: string;
  onWarehouseChange: (id?: string) => void;
}

type StockFilter = 'all' | 'raw_material' | 'product';

const FILTER_OPTIONS: { id: StockFilter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'raw_material', label: 'Insumos' },
  { id: 'product', label: 'Productos' },
];

export function StockOverview({
  stockLevels,
  warehouses,
  materials,
  products,
  valuation,
  selectedWarehouseId,
  onWarehouseChange,
}: StockOverviewProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const [filter, setFilter] = useState<StockFilter>('all');

  const items = useMemo(() => {
    const rows: Array<{
      refType: 'raw_material' | 'product';
      refId: string;
      name: string;
      quantity: number;
      unitLabel: string;
      unitValue: number;
      totalValue: number;
    }> = [];

    const materialIds = new Set(materials.map((m) => m.id));
    const productIds = new Set(products.map((p) => p.id));

    const addItem = (
      refType: 'raw_material' | 'product',
      refId: string,
      quantity: number
    ) => {
      if (quantity <= 0) return;

      if (refType === 'raw_material' && materialIds.has(refId)) {
        const material = materials.find((m) => m.id === refId)!;
        rows.push({
          refType,
          refId,
          name: material.name,
          quantity,
          unitLabel: unitCatalog.getShortLabel(material.unitType),
          unitValue: material.unitCost,
          totalValue: material.unitCost * quantity,
        });
      }

      if (refType === 'product' && productIds.has(refId)) {
        const product = products.find((p) => p.id === refId)!;
        rows.push({
          refType,
          refId,
          name: product.name,
          quantity,
          unitLabel: product.purchaseUnit,
          unitValue: product.totalUnitCost,
          totalValue: product.totalUnitCost * quantity,
        });
      }
    };

    if (selectedWarehouseId) {
      for (const level of stockLevels) {
        if (level.warehouseId !== selectedWarehouseId) continue;
        addItem(level.refType, level.refId, level.quantity);
      }
    } else {
      const totals = new Map<string, number>();
      for (const level of stockLevels) {
        const key = `${level.refType}:${level.refId}`;
        totals.set(key, (totals.get(key) ?? 0) + level.quantity);
      }
      for (const [key, quantity] of totals.entries()) {
        const [refType, refId] = key.split(':') as ['raw_material' | 'product', string];
        addItem(refType, refId, quantity);
      }
    }

    return rows
      .filter((row) => filter === 'all' || row.refType === filter)
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [stockLevels, materials, products, selectedWarehouseId, filter, unitCatalog]);

  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <StatCard label="Valor insumos" value={formatCurrency(valuation.rawMaterialsValue)} />
        </Card>
        <Card style={styles.statCard}>
          <StatCard label="Valor productos" value={formatCurrency(valuation.productsValue)} />
        </Card>
      </View>
      <Card style={styles.statCard}>
        <StatCard label="Valor total" value={formatCurrency(valuation.totalValue)} />
        <CurrencyEquivalentsOnly cupAmount={valuation.totalValue} style={styles.equiv} />
      </Card>

      <Select
        label="Almacén"
        value={selectedWarehouseId ?? ''}
        onValueChange={(value) => onWarehouseChange(value || undefined)}
      >
        <Picker.Item label="Todos los almacenes" value="" />
        {warehouses
          .filter((w) => w.active)
          .map((w) => (
            <Picker.Item key={w.id} label={w.name} value={w.id} />
          ))}
      </Select>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(id)}
              style={[
                styles.filterChip,
                {
                  borderColor: active ? colors.brand : colors.border,
                  backgroundColor: active ? colors.brandMuted : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.brandForeground : colors.muted },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {items.length === 0 ? (
        <Card variant="muted" style={styles.empty}>
          <Package size={40} color={colors.muted} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin stock registrado</Text>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>
            Registra entradas o inventario inicial en Movimientos.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Card key={`${item.refType}:${item.refId}`} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemMeta}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {item.quantity.toLocaleString('es-CU')} {item.unitLabel} ·{' '}
                    {item.refType === 'raw_material' ? 'Insumo' : 'Producto'}
                  </Text>
                </View>
                <View style={styles.itemValues}>
                  <Text style={[styles.itemTotal, { color: colors.brand }]}>
                    {formatCurrency(item.totalValue)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {formatCurrency(item.unitValue)}/ud
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12 },
  equiv: { marginTop: 4 },
  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { opacity: 0.4, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  list: { gap: 8 },
  itemCard: { padding: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemMeta: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemValues: { alignItems: 'flex-end', flexShrink: 0 },
  itemTotal: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
