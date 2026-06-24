import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boxes } from 'lucide-react-native';
import type { RawMaterial } from '@/domain/types';
import { formatCurrency } from '@/format/currency';
import { RawMaterialForm } from '@/components/raw-materials/RawMaterialForm';
import { RawMaterialItem } from '@/components/raw-materials/RawMaterialItem';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useConfirm } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';

interface RawMaterialsManagerProps {
  materials: RawMaterial[];
  onSave: (
    data: {
      name: string;
      purchasePrice: number;
      unitType: RawMaterial['unitType'];
      packageQuantity: number;
      stockQuantity: number;
      purchaseMeta?: RawMaterial['purchaseMeta'];
    },
    id?: string,
    timestamp?: number
  ) => void;
  onDelete: (id: string) => void;
  onStockChange: (id: string, stockQuantity: number) => void;
}

export function RawMaterialsManager({
  materials,
  onSave,
  onDelete,
  onStockChange,
}: RawMaterialsManagerProps) {
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const scrollRef = useRef<ScrollView>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const totalStockValue = materials.reduce((sum, m) => sum + m.unitCost * m.stockQuantity, 0);

  const handleDelete = async (material: RawMaterial) => {
    const confirmed = await confirm({
      title: 'Eliminar materia prima',
      message: `¿Eliminar "${material.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;
    onDelete(material.id);
    if (editingMaterial?.id === material.id) setEditingMaterial(null);
  };

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      <Card>
        <SectionHeader
          icon={Boxes}
          title={editingMaterial ? `Editando: ${editingMaterial.name}` : 'Nueva materia prima'}
          description="Registra el costo de compra y calcula el precio unitario automáticamente"
        />
        <RawMaterialForm
          editingMaterial={editingMaterial}
          onSave={(data) => {
            if (editingMaterial) {
              onSave(data, editingMaterial.id, editingMaterial.timestamp);
            } else {
              onSave(data);
            }
            setEditingMaterial(null);
          }}
          onCancel={() => setEditingMaterial(null)}
        />
      </Card>

      {materials.length > 0 ? (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <StatCard label="Materias primas" value={String(materials.length)} />
          </Card>
          <Card style={styles.statCard}>
            <StatCard label="Valor en almacén" value={formatCurrency(totalStockValue)} />
          </Card>
        </View>
      ) : null}

      {materials.length === 0 ? (
        <Card variant="muted" style={styles.empty}>
          <Boxes size={40} color={`${colors.muted}66`} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Sin materias primas</Text>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>
            Agrega la primera para confeccionar productos elaborados.
          </Text>
        </Card>
      ) : (
        materials.map((material) => (
          <RawMaterialItem
            key={material.id}
            material={material}
            onEdit={() => {
              setEditingMaterial(material);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            onDelete={() => handleDelete(material)}
            onStockChange={(stock) => onStockChange(material.id, stock)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12 },
  empty: { alignItems: 'center', paddingVertical: 28 },
});
