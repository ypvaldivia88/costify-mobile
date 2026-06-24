import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Edit2, Factory } from 'lucide-react-native';
import type {
  MovementType,
  ProductCalculation,
  RawMaterial,
  StockLevel,
  TaxSettings,
  UnitSettings,
  Warehouse,
} from '@/domain/types';
import { calculateMonthlyTaxProjection, hasActiveTaxes } from '@/domain/calculations/taxes';
import { DISTRIBUTION_CRITERIA_SHORT, PRODUCT_TYPE_LABELS } from '@/domain/constants';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';
import { formatCurrency, formatPercent } from '@/format/currency';
import { CurrencyEquivalentsOnly } from '@/components/ui/CurrencyEquivalents';
import { MarginSensitivityTable } from '@/components/ui/MarginSensitivityTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProductionSection } from '@/components/products/ProductionSection';
import { ProductStockSection } from '@/components/products/ProductStockSection';
import { useTheme } from '@/context/ThemeContext';

type DetailSection = 'costos' | 'stock' | 'produccion';

interface ProductDetailViewProps {
  product: ProductCalculation;
  taxSettings: TaxSettings;
  materials: RawMaterial[];
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  unitSettings: UnitSettings;
  onBack: () => void;
  onEdit: () => void;
  onRegisterMovement: (input: {
    type: MovementType;
    warehouseId: string;
    sourceWarehouseId?: string;
    quantity: number;
    note?: string;
  }) => void;
  onRegisterProduction: (quantity: number, warehouseId: string, note?: string) => void;
}

const SECTIONS: { id: DetailSection; label: string }[] = [
  { id: 'costos', label: 'Costos' },
  { id: 'stock', label: 'Stock' },
  { id: 'produccion', label: 'Producción' },
];

export function ProductDetailView({
  product,
  taxSettings,
  materials,
  warehouses,
  stockLevels,
  unitSettings,
  onBack,
  onEdit,
  onRegisterMovement,
  onRegisterProduction,
}: ProductDetailViewProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const [section, setSection] = useState<DetailSection>('costos');
  const monthlyRevenue = product.suggestedPrice * product.productionUnits;
  const monthlyGross = product.profitPerUnit * product.productionUnits;
  const taxes = calculateMonthlyTaxProjection(monthlyRevenue, monthlyGross, taxSettings);
  const canProduce =
    product.productType === 'elaborated' && product.recipe && product.recipe.length > 0;

  const visibleSections = SECTIONS.filter((s) => s.id !== 'produccion' || canProduce);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <Button variant="outline" size="sm" onPress={onBack}>
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Volver</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={onEdit} style={styles.editBtn}>
          <Edit2 size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Editar ficha</Text>
        </Button>
      </View>

      <Card>
        <View style={styles.hero}>
          <View style={styles.heroMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.typeBadge, { color: colors.muted, backgroundColor: colors.surfaceMuted }]}>
                {PRODUCT_TYPE_LABELS[product.productType ?? 'simple']}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Costo:{' '}
              <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                {formatCurrency(product.totalUnitCost)}
              </Text>
              {'  '}
              Margen:{' '}
              <Text style={{ color: colors.brand, fontWeight: '700' }}>
                {formatPercent(product.grossMarginPercent)}
              </Text>
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>PRECIO SUGERIDO</Text>
            <Text style={{ color: colors.brand, fontSize: 24, fontWeight: '900' }}>
              {formatCurrency(product.suggestedPrice)}
            </Text>
            <CurrencyEquivalentsOnly cupAmount={product.suggestedPrice} />
          </View>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {visibleSections.map(({ id, label }) => {
          const active = section === id;
          return (
            <Pressable
              key={id}
              onPress={() => setSection(id)}
              style={[
                styles.tab,
                {
                  borderColor: active ? colors.brand : colors.border,
                  backgroundColor: active ? colors.brandMuted : colors.surface,
                },
              ]}
            >
              {id === 'produccion' ? (
                <Factory size={16} color={active ? colors.brandForeground : colors.muted} />
              ) : null}
              <Text
                style={{
                  color: active ? colors.brandForeground : colors.muted,
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {section === 'costos' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Desglose de costos</Text>
          <View style={styles.breakdown}>
            {product.recipeBreakdown?.map((rm) => (
              <View key={rm.rawMaterialId} style={styles.row}>
                <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={2}>
                  {rm.name}{' '}
                  <Text style={{ fontSize: 12 }}>
                    ({rm.quantity}{' '}
                    {rm.unitType ? unitCatalog.getShortLabel(rm.unitType) : ''} ×{' '}
                    {formatCurrency(rm.unitCost)})
                  </Text>
                </Text>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  {formatCurrency(rm.lineCost)}
                </Text>
              </View>
            ))}
            <View style={styles.row}>
              <Text style={{ color: colors.muted }}>Costo directo unitario</Text>
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                {formatCurrency(product.unitCost)}
              </Text>
            </View>
            {product.indirectBreakdown.map((ic, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={2}>
                  {ic.name}{' '}
                  <Text style={{ fontSize: 12 }}>({DISTRIBUTION_CRITERIA_SHORT[ic.criteria]})</Text>
                </Text>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  {formatCurrency(ic.perUnit)}
                </Text>
              </View>
            ))}
            <View style={[styles.row, styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontWeight: '800' }}>Costo total unitario</Text>
              <Text style={{ color: colors.foreground, fontWeight: '800' }}>
                {formatCurrency(product.totalUnitCost)}
              </Text>
            </View>
          </View>

          <View style={styles.block}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>
              Sensibilidad al tipo de cambio
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
              Escenarios si varía la referencia TRMI del USD. Tu tasa real de compra puede diferir.
            </Text>
            <MarginSensitivityTable product={product} materials={materials} />
          </View>

          {product.productionUnits > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>
                Proyección mensual ({product.productionUnits} uds./mes)
              </Text>
              <View style={styles.breakdown}>
                <View style={styles.row}>
                  <Text style={{ color: colors.muted }}>Ingresos proyectados</Text>
                  <Text style={{ color: colors.brand, fontWeight: '700' }}>
                    {formatCurrency(monthlyRevenue)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={{ color: colors.muted }}>Utilidad bruta</Text>
                  <Text style={{ color: colors.brand, fontWeight: '700' }}>
                    {formatCurrency(monthlyGross)}
                  </Text>
                </View>
                {hasActiveTaxes(taxSettings) && taxes.totalTaxes > 0 ? (
                  <View style={styles.row}>
                    <Text style={{ color: colors.muted }}>Después de impuestos estimados</Text>
                    <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                      {formatCurrency(taxes.netProfit)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      {section === 'stock' ? (
        <ProductStockSection
          product={product}
          warehouses={warehouses}
          stockLevels={stockLevels}
          onRegisterMovement={onRegisterMovement}
        />
      ) : null}

      {section === 'produccion' && canProduce ? (
        <ProductionSection
          product={product}
          materials={materials}
          warehouses={warehouses}
          unitSettings={unitSettings}
          onProduce={onRegisterProduction}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { marginLeft: 'auto' },
  hero: { flexDirection: 'row', gap: 12 },
  heroMeta: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  name: { fontSize: 20, fontWeight: '800', flexShrink: 1 },
  typeBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  priceBox: { alignItems: 'flex-end' },
  tabs: { gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionCard: { gap: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdown: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  totalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  block: { gap: 8 },
});
