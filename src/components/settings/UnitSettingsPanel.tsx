import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Check, Edit2, Plus, RotateCcw, Ruler, Trash2, X } from 'lucide-react-native';
import type { ProductCalculation, RawMaterial, UnitDefinition, UnitFamily, UnitSettings } from '@/domain/types';
import {
  DEFAULT_UNIT_SETTINGS,
  canDeleteUnit,
  collectUsedUnitIds,
  createCustomUnitId,
  getUnitFamilyLabels,
} from '@/domain/unit-settings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumericField } from '@/components/ui/NumericField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useConfirm } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';

interface UnitSettingsPanelProps {
  settings: UnitSettings;
  rawMaterials: RawMaterial[];
  inventory: ProductCalculation[];
  onSave: (settings: UnitSettings) => void;
  onReset: () => void;
}

const FAMILY_OPTIONS: UnitFamily[] = ['count', 'weight', 'volume'];

type DraftUnit = Partial<UnitDefinition> & { isNew?: boolean };

export function UnitSettingsPanel({
  settings,
  rawMaterials,
  inventory,
  onSave,
  onReset,
}: UnitSettingsPanelProps) {
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const [localSettings, setLocalSettings] = useState<UnitSettings>(settings);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftUnit>({});
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const usedUnitIds = collectUsedUnitIds(rawMaterials, inventory);
  const familyLabels = getUnitFamilyLabels();

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
    setDraftError(null);
  };

  const startEdit = (unit: UnitDefinition) => {
    setEditingId(unit.id);
    setDraft({ ...unit });
    setDraftError(null);
  };

  const startAdd = () => {
    const newUnit: UnitDefinition = {
      id: createCustomUnitId('nueva'),
      label: 'Nueva unidad',
      shortLabel: 'ud',
      family: 'count',
      factor: 1,
    };
    const updated = { units: [...localSettings.units, newUnit] };
    setLocalSettings(updated);
    setEditingId(newUnit.id);
    setDraft({ ...newUnit, isNew: true });
    setDraftError(null);
  };

  const validateDraft = (): string | null => {
    if (!draft.label?.trim()) return 'Ingresa el nombre de la unidad';
    if (!draft.shortLabel?.trim()) return 'Ingresa la abreviatura';
    if (!draft.family) return 'Selecciona el tipo de unidad';
    if (draft.family !== 'count' && (draft.factor ?? 0) <= 0) {
      return 'Ingresa un factor de conversión mayor a cero';
    }
    return null;
  };

  const saveEdit = () => {
    if (!editingId) return;
    const error = validateDraft();
    if (error) {
      setDraftError(error);
      return;
    }

    const updatedUnit: UnitDefinition = {
      id: editingId,
      label: draft.label!.trim(),
      shortLabel: draft.shortLabel!.trim(),
      family: draft.family!,
      factor: draft.family === 'count' ? 1 : (draft.factor ?? 1),
      builtin: draft.builtin,
    };

    const updated = {
      units: localSettings.units.map((unit) => (unit.id === editingId ? updatedUnit : unit)),
    };
    setLocalSettings(updated);
    onSave(updated);
    cancelEdit();
  };

  const removeUnit = async (unit: UnitDefinition) => {
    const check = canDeleteUnit(unit, usedUnitIds);
    if (!check.allowed) {
      setDraftError(check.reason ?? 'No se puede eliminar esta unidad.');
      return;
    }

    const confirmed = await confirm({
      title: 'Eliminar unidad',
      message: `¿Eliminar "${unit.label}"?`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;

    const updated = { units: localSettings.units.filter((item) => item.id !== unit.id) };
    setLocalSettings(updated);
    onSave(updated);
    if (editingId === unit.id) cancelEdit();
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Restaurar unidades',
      message:
        'Se restaurarán las unidades predeterminadas. Las unidades personalizadas se eliminarán.',
      confirmLabel: 'Restaurar',
      variant: 'default',
    });
    if (!confirmed) return;
    setLocalSettings(DEFAULT_UNIT_SETTINGS);
    onReset();
    cancelEdit();
  };

  return (
    <Card>
      <SectionHeader
        icon={Ruler}
        title="Unidades de medida"
        description="Gestiona las unidades disponibles para materias primas y recetas"
      />

      <View style={styles.list}>
        {localSettings.units.map((unit) => {
          const isEditing = editingId === unit.id;
          const deleteCheck = canDeleteUnit(unit, usedUnitIds);

          return (
            <View
              key={unit.id}
              style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
            >
              {isEditing ? (
                <View style={styles.editForm}>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>Nombre</Text>
                      <TextInput
                        value={draft.label ?? ''}
                        onChangeText={(label) => setDraft((d) => ({ ...d, label }))}
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      />
                    </View>
                    <View style={styles.half}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>Abreviatura</Text>
                      <TextInput
                        value={draft.shortLabel ?? ''}
                        onChangeText={(shortLabel) => setDraft((d) => ({ ...d, shortLabel }))}
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>Tipo</Text>
                      <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
                        <Picker
                          selectedValue={draft.family ?? 'count'}
                          enabled={!draft.builtin}
                          onValueChange={(value) => {
                            const family = value as UnitFamily;
                            setDraft((d) => ({
                              ...d,
                              family,
                              factor: family === 'count' ? 1 : (d.factor ?? 1),
                            }));
                          }}
                          style={{ color: colors.foreground }}
                        >
                          {FAMILY_OPTIONS.map((family) => (
                            <Picker.Item key={family} label={familyLabels[family]} value={family} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    {draft.family !== 'count' ? (
                      <View style={styles.half}>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          Factor ({draft.family === 'weight' ? 'gramos' : 'mililitros'} por unidad)
                        </Text>
                        <NumericField
                          value={draft.factor ?? 1}
                          onChange={(factor) => setDraft((d) => ({ ...d, factor }))}
                        />
                      </View>
                    ) : null}
                  </View>

                  {draftError ? (
                    <Text style={{ color: colors.danger, fontSize: 12 }}>{draftError}</Text>
                  ) : null}

                  <View style={styles.editActions}>
                    <Button size="sm" onPress={saveEdit}>
                      <Check size={16} color={colors.brandForeground} />
                      <Text style={{ color: colors.brandForeground, fontWeight: '700' }}>Guardar</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => {
                        if (draft.isNew) {
                          setLocalSettings({
                            units: localSettings.units.filter((item) => item.id !== editingId),
                          });
                        }
                        cancelEdit();
                      }}
                    >
                      <X size={16} color={colors.foreground} />
                      <Text style={{ color: colors.foreground, fontWeight: '700' }}>Cancelar</Text>
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={styles.viewRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700' }}>{unit.label}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                      {unit.shortLabel} · {familyLabels[unit.family]}
                      {unit.family !== 'count' ? ` · factor ${unit.factor}` : ''}
                      {unit.builtin ? ' · predeterminada' : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => startEdit(unit)} style={styles.iconBtn}>
                    <Edit2 size={18} color={colors.muted} />
                  </Pressable>
                  {!unit.builtin ? (
                    <Pressable
                      onPress={() => void removeUnit(unit)}
                      disabled={!deleteCheck.allowed}
                      style={[styles.iconBtn, !deleteCheck.allowed && { opacity: 0.4 }]}
                    >
                      <Trash2 size={18} color={deleteCheck.allowed ? colors.danger : colors.muted} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable onPress={startAdd} style={styles.footerAction}>
          <Plus size={16} color={colors.brand} />
          <Text style={{ color: colors.brand, fontWeight: '700' }}>Añadir unidad</Text>
        </Pressable>
        <Pressable onPress={() => void handleReset()} style={styles.footerAction}>
          <RotateCcw size={16} color={colors.muted} />
          <Text style={{ color: colors.muted, fontWeight: '600' }}>Restaurar predeterminadas</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 }}>
        Las unidades del mismo tipo (peso, volumen o conteo) se pueden convertir entre sí en las
        recetas. El factor indica cuántos gramos o mililitros equivalen a una unidad.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: 4 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12 },
  editForm: { gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  pickerWrap: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  editActions: { flexDirection: 'row', gap: 8 },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 8 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
