import { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeftRight, RefreshCw, Settings2, TrendingUp } from 'lucide-react-native';
import type { PurchaseCurrency } from '@/domain/types';
import {
  formatSnapshotTime,
  fromCup,
  PURCHASE_CURRENCY_LABELS,
  toCup,
  TRMI_DISCLAIMER,
} from '@/domain/exchange-rates';
import { useExchangeRatesContext } from '@/hooks/use-exchange-rates-context';
import { TCP_MONTHLY_THRESHOLD_CUP } from '@/domain/tax-presets';
import { formatCurrency } from '@/format/currency';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumericField } from '@/components/ui/NumericField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/context/ThemeContext';

const DISPLAY_CURRENCIES: Exclude<PurchaseCurrency, 'CUP'>[] = ['USD', 'MLC', 'EUR'];
const ALL_CURRENCIES: PurchaseCurrency[] = ['CUP', 'USD', 'MLC', 'EUR'];

export function ExchangeRatesPanel() {
  const { colors } = useTheme();
  const { snapshot, settings, refreshing, error, refreshRates, updateSettings } =
    useExchangeRatesContext();

  const [calcAmount, setCalcAmount] = useState(1);
  const [calcFrom, setCalcFrom] = useState<PurchaseCurrency>('USD');
  const [calcTo, setCalcTo] = useState<PurchaseCurrency>('CUP');

  const rates = snapshot?.rates;

  const calcResult = useMemo(() => {
    if (!snapshot || calcAmount <= 0) return null;
    if (calcFrom === calcTo) return calcAmount;

    const cupValue = toCup(calcAmount, calcFrom, snapshot);
    if (calcTo === 'CUP') return cupValue;

    return fromCup(cupValue, calcTo, snapshot);
  }, [snapshot, calcAmount, calcFrom, calcTo]);

  const tcpThresholdForeign = useMemo(() => {
    if (!snapshot) return null;
    return fromCup(TCP_MONTHLY_THRESHOLD_CUP, settings.displayCurrency, snapshot);
  }, [snapshot, settings.displayCurrency]);

  return (
    <View style={styles.stack}>
      <Card>
        <SectionHeader
          icon={TrendingUp}
          title="Tasas de cambio (TRMI)"
          description="Referencia del mercado informal — media calculada por elTOQUE, no el precio exacto de cada operación"
        />

        <Text style={[styles.disclaimer, { color: colors.muted }]}>{TRMI_DISCLAIMER}</Text>

        {rates ? (
          <View style={styles.rateGrid}>
            {DISPLAY_CURRENCIES.map((currency) => (
              <View
                key={currency}
                style={[
                  styles.rateCard,
                  { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text style={[styles.rateLabel, { color: colors.muted }]}>1 {currency}</Text>
                <Text style={[styles.rateValue, { color: colors.brand }]}>
                  {formatCurrency(rates[currency])}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            No hay tasas cargadas. Pulsa actualizar para obtener los valores actuales.
          </Text>
        )}

        {snapshot ? (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
            Actualizado: {formatSnapshotTime(snapshot)}
            {snapshot.stale ? (
              <Text style={{ color: colors.warning }}> (cache local)</Text>
            ) : null}
          </Text>
        ) : null}

        {error ? <Text style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}>{error}</Text> : null}

        <Button
          variant="outline"
          onPress={() => void refreshRates(true)}
          disabled={refreshing}
          style={{ marginTop: 12 }}
        >
          <RefreshCw size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>
            {refreshing ? 'Actualizando…' : 'Actualizar tasas'}
          </Text>
        </Button>

        <Text style={[styles.footnote, { color: colors.muted }]}>
          Fuente:{' '}
          <Text
            style={{ color: colors.brand }}
            onPress={() =>
              void Linking.openURL('https://eltoque.com/tasas-de-cambio-cuba/mercado-informal')
            }
          >
            elTOQUE — Mercado Informal
          </Text>
          . La TRMI es una media de referencia; al registrar compras en divisa debes indicar la tasa
          real que pagaste.
        </Text>
      </Card>

      <Card>
        <SectionHeader
          icon={ArrowLeftRight}
          title="Calculadora de divisas"
          description="Convierte entre CUP, USD, MLC y EUR con la TRMI actual"
        />

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Cantidad</Text>
            <NumericField value={calcAmount} onChange={setCalcAmount} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>De</Text>
            <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
              <Picker
                selectedValue={calcFrom}
                onValueChange={(value) => setCalcFrom(value as PurchaseCurrency)}
                style={{ color: colors.foreground }}
              >
                {ALL_CURRENCIES.map((c) => (
                  <Picker.Item key={c} label={PURCHASE_CURRENCY_LABELS[c]} value={c} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>A</Text>
            <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
              <Picker
                selectedValue={calcTo}
                onValueChange={(value) => setCalcTo(value as PurchaseCurrency)}
                style={{ color: colors.foreground }}
              >
                {ALL_CURRENCIES.map((c) => (
                  <Picker.Item key={c} label={PURCHASE_CURRENCY_LABELS[c]} value={c} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {calcResult != null ? (
          <View
            style={[
              styles.resultBox,
              { backgroundColor: colors.brandMuted, borderColor: colors.brand },
            ]}
          >
            <Text style={[styles.resultLabel, { color: colors.muted }]}>Resultado</Text>
            <Text style={[styles.resultValue, { color: colors.brand }]}>
              {calcTo === 'CUP'
                ? formatCurrency(calcResult)
                : `${calcResult.toFixed(4)} ${PURCHASE_CURRENCY_LABELS[calcTo]}`}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          icon={Settings2}
          title="Preferencias"
          description="Cómo se muestran las equivalencias en productos e inventario"
        />

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Moneda secundaria en la app</Text>
            <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
              <Picker
                selectedValue={settings.displayCurrency}
                onValueChange={(value) =>
                  updateSettings({
                    displayCurrency: value as Exclude<PurchaseCurrency, 'CUP'>,
                  })
                }
                style={{ color: colors.foreground }}
              >
                {DISPLAY_CURRENCIES.map((c) => (
                  <Picker.Item key={c} label={PURCHASE_CURRENCY_LABELS[c]} value={c} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Umbral de alerta de revisión (%)
            </Text>
            <NumericField
              value={settings.alertThresholdPercent}
              onChange={(alertThresholdPercent) =>
                updateSettings({ alertThresholdPercent: Math.max(1, alertThresholdPercent) })
              }
            />
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              Aviso cuando el USD varíe más de este porcentaje respecto a tus últimos costeos.
            </Text>
          </View>

          {tcpThresholdForeign != null ? (
            <View
              style={[
                styles.tcpBox,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>Referencia TCP</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                Umbral mensual exento (~{formatCurrency(TCP_MONTHLY_THRESHOLD_CUP)}) ≈{' '}
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                  {tcpThresholdForeign.toFixed(2)} {PURCHASE_CURRENCY_LABELS[settings.displayCurrency]}
                </Text>{' '}
                al tipo actual
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  disclaimer: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  rateGrid: { flexDirection: 'row', gap: 8 },
  rateCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rateLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  rateValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  form: { gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  pickerWrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  resultBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  resultLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  resultValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  tcpBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
});
