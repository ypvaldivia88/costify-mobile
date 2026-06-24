import { Plus, Trash2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { RawMaterial, RecipeItem, UnitType } from '@/domain/types';
import {
  getRecipeUnitOptions,
  materialUnitCostInRecipeUnit,
  recipeQuantityInMaterialUnit,
  resolveRecipeUnit,
} from '@/domain/units';
import { formatCurrency } from '@/format/currency';
import { Button } from '@/components/ui/Button';
import { NumericField } from '@/components/ui/NumericField';
import { useTheme } from '@/context/ThemeContext';
import { useUnitCatalog } from '@/hooks/use-unit-catalog';

interface RecipeEditorProps {
  recipe: RecipeItem[];
  rawMaterials: RawMaterial[];
  onChange: (recipe: RecipeItem[]) => void;
}

function lineCost(
  item: RecipeItem,
  material: RawMaterial,
  unitSettings: ReturnType<typeof useUnitCatalog>['settings']
): number {
  const recipeUnit = resolveRecipeUnit(item, material.unitType, unitSettings);
  const qty = recipeQuantityInMaterialUnit(item.quantity, recipeUnit, material.unitType, unitSettings);
  return material.unitCost * qty;
}

export function RecipeEditor({ recipe, rawMaterials, onChange }: RecipeEditorProps) {
  const { colors } = useTheme();
  const unitCatalog = useUnitCatalog();
  const unitSettings = unitCatalog.settings;
  const usedIds = new Set(recipe.map((r) => r.rawMaterialId));
  const availableMaterials = rawMaterials.filter((m) => !usedIds.has(m.id));

  const addItem = () => {
    if (availableMaterials.length === 0) return;
    const material = availableMaterials[0];
    onChange([...recipe, { rawMaterialId: material.id, quantity: 1, unitType: material.unitType }]);
  };

  const updateItem = (index: number, updates: Partial<RecipeItem>) => {
    onChange(recipe.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const changeMaterial = (index: number, rawMaterialId: string) => {
    const material = rawMaterials.find((m) => m.id === rawMaterialId);
    const item = recipe[index];
    const updates: Partial<RecipeItem> = { rawMaterialId };
    if (material) {
      const currentUnit = resolveRecipeUnit(item, material.unitType, unitSettings);
      const options = getRecipeUnitOptions(material.unitType, unitSettings);
      if (!options.includes(currentUnit)) updates.unitType = material.unitType;
    }
    updateItem(index, updates);
  };

  const totalCost = recipe.reduce((sum, item) => {
    const material = rawMaterials.find((m) => m.id === item.rawMaterialId);
    if (!material || item.quantity <= 0) return sum;
    return sum + lineCost(item, material, unitSettings);
  }, 0);

  if (rawMaterials.length === 0) {
    return (
      <Text style={[styles.warning, { color: colors.warning, borderColor: colors.warning }]}>
        Registra materias primas primero para confeccionar un producto elaborado.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.foreground }]}>Receta</Text>
        <Button variant="outline" size="sm" onPress={addItem} disabled={availableMaterials.length === 0}>
          + Agregar
        </Button>
      </View>

      {recipe.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Agrega materias primas y cantidades por unidad de producto.
        </Text>
      ) : (
        recipe.map((item, index) => {
          const material = rawMaterials.find((m) => m.id === item.rawMaterialId);
          if (!material) return null;
          const recipeUnit = resolveRecipeUnit(item, material.unitType, unitSettings);
          const unitOptions = getRecipeUnitOptions(material.unitType, unitSettings);
          const cost = lineCost(item, material, unitSettings);
          const displayUnitCost = materialUnitCostInRecipeUnit(
            material.unitCost,
            material.unitType,
            recipeUnit,
            unitSettings
          );

          return (
            <View
              key={`${item.rawMaterialId}-${index}`}
              style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
            >
              <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
                <Picker
                  selectedValue={item.rawMaterialId}
                  onValueChange={(value) => changeMaterial(index, value)}
                  style={{ color: colors.foreground }}
                >
                  {rawMaterials.map((m) => (
                    <Picker.Item
                      key={m.id}
                      label={`${m.name} (${formatCurrency(m.unitCost)}/${unitCatalog.getShortLabel(m.unitType)})`}
                      value={m.id}
                    />
                  ))}
                </Picker>
              </View>
              <View style={styles.row}>
                <NumericField
                  value={item.quantity}
                  onChange={(quantity) => updateItem(index, { quantity })}
                  style={styles.qty}
                />
                <View style={[styles.pickerWrap, styles.unitPicker, { borderColor: colors.border }]}>
                  <Picker
                    selectedValue={recipeUnit}
                    onValueChange={(value) => updateItem(index, { unitType: value as UnitType })}
                    style={{ color: colors.foreground }}
                  >
                    {unitOptions.map((unit) => (
                      <Picker.Item key={unit} label={unitCatalog.getLabel(unit)} value={unit} />
                    ))}
                  </Picker>
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => onChange(recipe.filter((_, i) => i !== index))}
                >
                  <Trash2 size={14} color={colors.danger} />
                </Button>
              </View>
              <View style={styles.costRow}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {formatCurrency(displayUnitCost)}/{unitCatalog.getShortLabel(recipeUnit)}
                </Text>
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>{formatCurrency(cost)}</Text>
              </View>
            </View>
          );
        })
      )}

      {recipe.length > 0 ? (
        <View style={[styles.total, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>Costo directo por unidad</Text>
          <Text style={{ color: colors.brand, fontSize: 18, fontWeight: '800' }}>
            {formatCurrency(totalCost)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
  warning: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qty: { width: 90 },
  unitPicker: { flex: 1 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
});
