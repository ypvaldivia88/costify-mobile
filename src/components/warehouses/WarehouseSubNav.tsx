import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export type WarehouseSubview = 'stock' | 'movements' | 'warehouses' | 'alerts';

const SUBVIEWS: { id: WarehouseSubview; label: string }[] = [
  { id: 'stock', label: 'Stock actual' },
  { id: 'movements', label: 'Movimientos' },
  { id: 'warehouses', label: 'Almacenes' },
  { id: 'alerts', label: 'Alertas' },
];

interface WarehouseSubNavProps {
  active: WarehouseSubview;
  onChange: (view: WarehouseSubview) => void;
  alertCount?: number;
}

export function WarehouseSubNav({ active, onChange, alertCount = 0 }: WarehouseSubNavProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.nav}
      accessibilityRole="tablist"
      accessibilityLabel="Secciones de almacén"
    >
      {SUBVIEWS.map(({ id, label }) => {
        const isActive = active === id;
        const showBadge = id === 'alerts' && alertCount > 0;

        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(id)}
            style={[
              styles.navItem,
              {
                borderColor: isActive ? colors.brand : colors.border,
                backgroundColor: isActive ? colors.brandMuted : colors.surface,
              },
            ]}
          >
            <Text
              style={{
                color: isActive ? colors.brandForeground : colors.muted,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              {label}
            </Text>
            {showBadge ? (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{alertCount > 99 ? '99+' : alertCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  nav: { gap: 8, paddingBottom: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
