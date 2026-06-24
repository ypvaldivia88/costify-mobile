import { StyleSheet, Switch, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { PiggyBank } from 'lucide-react-native';
import type { GlobalFundSettings } from '@/domain/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/context/ThemeContext';

interface GlobalFundSettingsProps {
  settings: GlobalFundSettings;
  onChange: (updates: Partial<GlobalFundSettings>) => void;
}

export function GlobalFundSettingsPanel({ settings, onChange }: GlobalFundSettingsProps) {
  const { colors } = useTheme();

  return (
    <Card>
      <SectionHeader
        icon={PiggyBank}
        title="Fondo global opcional"
        description="Porcentaje del costo directo reservado en cada producto"
      />

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>Activar fondo global</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            Se suma automáticamente al costo de todos los productos.
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => onChange({ enabled })}
          trackColor={{ true: colors.brand, false: colors.border }}
        />
      </View>

      {settings.enabled ? (
        <View style={styles.body}>
          <Input
            label="Nombre del fondo"
            placeholder="Ej. Reserva operativa"
            value={settings.name}
            onChangeText={(name) => onChange({ name })}
          />
          <View style={styles.sliderRow}>
            <Text style={{ color: colors.foreground, fontWeight: '600' }}>
              Porcentaje sobre costo directo
            </Text>
            <Text style={{ color: colors.brand, fontWeight: '800' }}>{settings.percent}%</Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={50}
            step={1}
            value={settings.percent}
            onValueChange={(percent) => onChange({ percent })}
            minimumTrackTintColor={colors.brand}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.brand}
          />
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Ej: 5% sobre un costo directo de 100 CUP añade 5 CUP al costo unitario.
          </Text>
          {settings.percent > 0 ? (
            <View style={[styles.note, { backgroundColor: colors.accentSurface, borderColor: colors.accentBorder }]}>
              <Text style={{ color: colors.brandForeground, fontSize: 13 }}>
                Cada producto incluirá un {settings.percent}% adicional sobre su costo directo como{' '}
                {settings.name.trim() || 'Fondo global'}.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  body: { gap: 12, borderTopWidth: 0, paddingTop: 8 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  note: { borderWidth: 1, borderRadius: 12, padding: 12 },
});
