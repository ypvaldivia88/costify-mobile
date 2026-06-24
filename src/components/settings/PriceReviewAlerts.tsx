import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';
import { usePriceReviewAlerts } from '@/hooks/use-exchange-rates-context';
import type { ProductCalculation, RawMaterial } from '@/domain/types';
import { useTheme } from '@/context/ThemeContext';

interface PriceReviewAlertsProps {
  materials: RawMaterial[];
  products: ProductCalculation[];
}

export function PriceReviewAlerts({ materials, products }: PriceReviewAlertsProps) {
  const { colors, scheme } = useTheme();
  const alerts = usePriceReviewAlerts(materials, products);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.stack}>
      {alerts.map((alert) => {
        const Icon = alert.severity === 'warning' ? AlertTriangle : Info;
        const isWarning = alert.severity === 'warning';

        const backgroundColor = isWarning
          ? scheme === 'dark'
            ? '#451a03'
            : '#fffbeb'
          : scheme === 'dark'
            ? '#172554'
            : '#eff6ff';

        const borderColor = isWarning
          ? scheme === 'dark'
            ? '#92400e'
            : '#fcd34d'
          : scheme === 'dark'
            ? '#1e40af'
            : '#93c5fd';

        const textColor = isWarning
          ? scheme === 'dark'
            ? '#fef3c7'
            : '#78350f'
          : scheme === 'dark'
            ? '#dbeafe'
            : '#1e3a8a';

        const iconColor = isWarning ? colors.warning : colors.brand;

        return (
          <View
            key={alert.id}
            style={[styles.alert, { backgroundColor, borderColor }]}
          >
            <Icon size={20} color={iconColor} style={styles.icon} />
            <Text style={[styles.message, { color: textColor }]}>{alert.message}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: { marginTop: 1 },
  message: { flex: 1, fontSize: 13, lineHeight: 18 },
});
