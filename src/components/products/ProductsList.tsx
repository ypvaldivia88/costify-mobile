import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Package, Plus, RefreshCw } from 'lucide-react-native';
import type { ProductCalculation, TaxSettings } from '@/domain/types';
import { calculateBusinessSummary } from '@/domain/calculations';
import { formatCurrency } from '@/format/currency';
import { BusinessSummaryCard } from '@/components/inventory/BusinessSummaryCard';
import { InventoryItem } from '@/components/inventory/InventoryItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { useConfirm } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';

interface ProductsListProps {
  items: ProductCalculation[];
  taxSettings: TaxSettings;
  onDelete: (id: string) => void;
  onSelect: (item: ProductCalculation) => void;
  onEdit: (item: ProductCalculation) => void;
  onNew: () => void;
  onRecalculateAll: () => void;
  stockValuation?: { rawMaterialsValue: number; productsValue: number; totalValue: number };
}

export function ProductsList({
  items,
  taxSettings,
  onDelete,
  onSelect,
  onEdit,
  onNew,
  onRecalculateAll,
  stockValuation,
}: ProductsListProps) {
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const summary = calculateBusinessSummary(items, taxSettings);

  const handleDelete = async (item: ProductCalculation) => {
    const confirmed = await confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${item.name}"? Se eliminará la ficha de costo y sus movimientos de stock asociados.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (confirmed) onDelete(item.id);
  };

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Package size={48} color={colors.muted} style={{ opacity: 0.4, marginBottom: 16 }} />
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16 }}>Sin productos</Text>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 280 }}>
          Crea tu primera ficha de costo para calcular el precio de venta sugerido.
        </Text>
        <Button onPress={onNew} style={{ marginTop: 16 }}>
          <Plus size={16} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Nuevo producto</Text>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>
          {items.length} producto{items.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.headerActions}>
          <Button variant="outline" size="sm" onPress={onRecalculateAll}>
            <RefreshCw size={14} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Recalcular</Text>
          </Button>
          <Button size="sm" onPress={onNew}>
            <Plus size={16} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Nuevo</Text>
          </Button>
        </View>
      </View>

      <BusinessSummaryCard summary={summary} taxSettings={taxSettings} />

      {stockValuation && stockValuation.totalValue > 0 ? (
        <Card style={styles.valuationCard}>
          <Text style={[styles.valuationTitle, { color: colors.muted }]}>
            Inventario físico en almacén
          </Text>
          <View style={styles.statsRow}>
            <StatCard label="Insumos" value={formatCurrency(stockValuation.rawMaterialsValue)} style={styles.stat} />
            <StatCard label="Productos" value={formatCurrency(stockValuation.productsValue)} style={styles.stat} />
            <StatCard
              label="Total"
              value={formatCurrency(stockValuation.totalValue)}
              variant="accent"
              style={styles.stat}
            />
          </View>
        </Card>
      ) : null}

      {items.map((item) => (
        <InventoryItem
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          taxSettings={taxSettings}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onEdit={() => onEdit(item)}
          onDelete={() => handleDelete(item)}
          onOpen={() => onSelect(item)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  empty: {
    margin: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  valuationCard: { gap: 12 },
  valuationTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flex: 1, minWidth: 90 },
});
