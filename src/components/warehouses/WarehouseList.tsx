import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Building2, Trash2 } from 'lucide-react-native';
import type { Warehouse, WarehouseType } from '@/domain/types';
import { WAREHOUSE_TYPE_LABELS } from '@/domain/constants';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useConfirm } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';

interface WarehouseListProps {
  warehouses: Warehouse[];
  onSave: (input: Omit<Warehouse, 'id' | 'timestamp'>, id?: string, timestamp?: number) => void;
  onDelete: (id: string) => void;
}

const WAREHOUSE_TYPES: WarehouseType[] = ['principal', 'venta', 'produccion'];

export function WarehouseList({ warehouses, onSave, onDelete }: WarehouseListProps) {
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<WarehouseType>('principal');

  const resetForm = () => {
    setEditing(null);
    setName('');
    setType('principal');
  };

  const startEdit = (warehouse: Warehouse) => {
    setEditing(warehouse);
    setName(warehouse.name);
    setType(warehouse.type);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (editing) {
      onSave({ name: name.trim(), type, active: editing.active }, editing.id, editing.timestamp);
    } else {
      onSave({ name: name.trim(), type, active: true });
    }
    resetForm();
  };

  const handleDelete = async (warehouse: Warehouse) => {
    const confirmed = await confirm({
      title: 'Eliminar almacén',
      message: `¿Eliminar "${warehouse.name}"? Los movimientos asociados se conservarán.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;
    onDelete(warehouse.id);
    if (editing?.id === warehouse.id) resetForm();
  };

  return (
    <View style={styles.wrap}>
      <Card>
        <SectionHeader
          icon={Building2}
          title={editing ? `Editando: ${editing.name}` : 'Nuevo almacén'}
          description="Organiza tu inventario por bodega, punto de venta o área de producción"
        />
        <View style={styles.form}>
          <Input
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Bodega principal"
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Tipo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {WAREHOUSE_TYPES.map((t) => {
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
                        { color: active ? colors.brandForeground : colors.muted },
                      ]}
                    >
                      {WAREHOUSE_TYPE_LABELS[t]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <Button onPress={handleSubmit} style={styles.action}>
              {editing ? 'Guardar cambios' : 'Crear almacén'}
            </Button>
            {editing ? (
              <Button variant="outline" onPress={resetForm} style={styles.action}>
                Cancelar
              </Button>
            ) : null}
          </View>
        </View>
      </Card>

      {warehouses.length === 0 ? (
        <Card variant="muted" style={styles.empty}>
          <Building2 size={40} color={colors.muted} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin almacenes</Text>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>
            Crea el primero para empezar a registrar movimientos.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {warehouses.map((warehouse) => (
            <Card key={warehouse.id} style={styles.listCard}>
              <View style={styles.listRow}>
                <View style={styles.listMeta}>
                  <Text style={[styles.listName, { color: colors.foreground }]}>{warehouse.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {WAREHOUSE_TYPE_LABELS[warehouse.type]}
                    {!warehouse.active ? ' · Inactivo' : ''}
                  </Text>
                </View>
                <View style={styles.listActions}>
                  <Button variant="outline" size="sm" onPress={() => startEdit(warehouse)}>
                    Editar
                  </Button>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar"
                    onPress={() => void handleDelete(warehouse)}
                    style={[styles.deleteBtn, { backgroundColor: colors.dangerMuted }]}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </Pressable>
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
  wrap: { gap: 16 },
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
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { opacity: 0.4, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  list: { gap: 8 },
  listCard: { padding: 16 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  listMeta: { flex: 1, gap: 2 },
  listName: { fontSize: 16, fontWeight: '700' },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
