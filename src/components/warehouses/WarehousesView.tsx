import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type {
  ProductCalculation,
  RawMaterial,
  StockAlert,
  StockLevel,
  StockMovement,
  StockThreshold,
  Warehouse,
} from '@/domain/types';
import { MovementForm } from '@/components/warehouses/MovementForm';
import { MovementHistory } from '@/components/warehouses/MovementHistory';
import { StockAlertsPanel } from '@/components/warehouses/StockAlertsPanel';
import { StockOverview } from '@/components/warehouses/StockOverview';
import { WarehouseList } from '@/components/warehouses/WarehouseList';
import { WarehouseSubNav, type WarehouseSubview } from '@/components/warehouses/WarehouseSubNav';
import { useTheme } from '@/context/ThemeContext';

interface WarehousesViewProps {
  warehouses: Warehouse[];
  stockMovements: StockMovement[];
  stockThresholds: StockThreshold[];
  stockLevels: StockLevel[];
  stockAlerts: StockAlert[];
  stockValuation: { rawMaterialsValue: number; productsValue: number; totalValue: number };
  materials: RawMaterial[];
  products: ProductCalculation[];
  onSaveWarehouse: (
    input: Omit<Warehouse, 'id' | 'timestamp'>,
    id?: string,
    timestamp?: number
  ) => void;
  onDeleteWarehouse: (id: string) => void;
  onRegisterMovement: (input: Omit<StockMovement, 'id' | 'timestamp'>) => void;
  onSaveThreshold: (input: Omit<StockThreshold, 'id'>, id?: string) => void;
  onDeleteThreshold: (id: string) => void;
}

export function WarehousesView({
  warehouses,
  stockMovements,
  stockThresholds,
  stockLevels,
  stockAlerts,
  stockValuation,
  materials,
  products,
  onSaveWarehouse,
  onDeleteWarehouse,
  onRegisterMovement,
  onSaveThreshold,
  onDeleteThreshold,
}: WarehousesViewProps) {
  const { colors } = useTheme();
  const [subview, setSubview] = useState<WarehouseSubview>('stock');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();

  const getItemName = useMemo(() => {
    const materialMap = new Map(materials.map((m) => [m.id, m.name]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    return (refType: 'raw_material' | 'product', refId: string) =>
      refType === 'raw_material'
        ? (materialMap.get(refId) ?? 'Insumo')
        : (productMap.get(refId) ?? 'Producto');
  }, [materials, products]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <WarehouseSubNav
        active={subview}
        onChange={setSubview}
        alertCount={stockAlerts.length}
      />

      {subview === 'stock' ? (
        <StockOverview
          stockLevels={stockLevels}
          warehouses={warehouses}
          materials={materials}
          products={products}
          valuation={stockValuation}
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={setSelectedWarehouseId}
        />
      ) : null}

      {subview === 'movements' ? (
        <View style={styles.movementsSection}>
          <MovementForm
            warehouses={warehouses}
            materials={materials}
            products={products}
            onSubmit={onRegisterMovement}
          />
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.muted }]}>Kardex reciente</Text>
            <MovementHistory
              movements={stockMovements.slice(0, 50)}
              warehouses={warehouses}
              getItemName={getItemName}
            />
          </View>
        </View>
      ) : null}

      {subview === 'warehouses' ? (
        <WarehouseList
          warehouses={warehouses}
          onSave={onSaveWarehouse}
          onDelete={onDeleteWarehouse}
        />
      ) : null}

      {subview === 'alerts' ? (
        <StockAlertsPanel
          alerts={stockAlerts}
          thresholds={stockThresholds}
          warehouses={warehouses}
          materials={materials}
          products={products}
          onSaveThreshold={onSaveThreshold}
          onDeleteThreshold={onDeleteThreshold}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  movementsSection: { gap: 16 },
  historySection: { gap: 8 },
  historyTitle: { fontSize: 14, fontWeight: '600' },
});
