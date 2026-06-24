import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasePriceMode } from '@/ui/purchase-price';
import { switchPurchasePriceMode } from '@/ui/purchase-price';
import type { PurchaseCurrency } from '@/domain/types';
import type { ExchangeRateSnapshot } from '@/domain/exchange-rates';
import { PURCHASE_CURRENCY_LABELS, toCup, TRMI_DISCLAIMER } from '@/domain/exchange-rates';
import { formatCurrency } from '@/format/currency';
import { Button } from '@/components/ui/Button';
import { NumericInput } from '@/components/ui/NumericInput';
import { useTheme } from '@/context/ThemeContext';

const MODE_OPTIONS: { id: PurchasePriceMode; label: string }[] = [
  { id: 'per-unit', label: 'Por unidad' },
  { id: 'per-package', label: 'Por lote' },
];

const CURRENCY_OPTIONS: PurchaseCurrency[] = ['CUP', 'USD', 'MLC', 'EUR'];

interface PurchasePriceInputProps {
  mode: PurchasePriceMode;
  onModeChange: (mode: PurchasePriceMode) => void;
  currency: PurchaseCurrency;
  onCurrencyChange: (currency: PurchaseCurrency) => void;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  suggestedTrmiRate?: number;
  value: number;
  onChange: (value: number) => void;
  packageQuantity: number;
  unitLabel: string;
  snapshot?: ExchangeRateSnapshot | null;
  exchangeRateError?: string;
  error?: string;
  perUnitHint?: string;
  perPackageHint?: string;
}

export function PurchasePriceInput({
  mode,
  onModeChange,
  currency,
  onCurrencyChange,
  exchangeRate,
  onExchangeRateChange,
  suggestedTrmiRate = 0,
  value,
  onChange,
  packageQuantity,
  unitLabel,
  snapshot,
  exchangeRateError,
  error,
  perUnitHint,
  perPackageHint,
}: PurchasePriceInputProps) {
  const { colors } = useTheme();
  const currencyLabel = PURCHASE_CURRENCY_LABELS[currency];
  const label =
    mode === 'per-unit'
      ? `Precio de compra por ${unitLabel} (${currencyLabel})`
      : `Precio de compra del lote (${currencyLabel})`;

  const hint =
    mode === 'per-unit'
      ? (perUnitHint ?? `Costo por cada ${unitLabel}`)
      : (perPackageHint ?? 'Lo que pagaste por la compra completa');

  const handleModeChange = (nextMode: PurchasePriceMode) => {
    if (nextMode === mode) return;
    onModeChange(nextMode);
    onChange(switchPurchasePriceMode(value, mode, nextMode, packageQuantity));
  };

  const totalInCurrency =
    mode === 'per-package' ? value : value * (packageQuantity > 0 ? packageQuantity : 1);

  const effectiveRate = currency !== 'CUP' ? exchangeRate : 0;
  const cupEquivalent =
    currency !== 'CUP' && value > 0 && effectiveRate > 0
      ? toCup(totalInCurrency, currency, snapshot ?? null, effectiveRate)
      : null;

  const trmiDiffers =
    currency !== 'CUP' &&
    suggestedTrmiRate > 0 &&
    effectiveRate > 0 &&
    Math.abs(effectiveRate - suggestedTrmiRate) / suggestedTrmiRate >= 0.02;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentRow}
      >
        {CURRENCY_OPTIONS.map((c) => {
          const active = currency === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onCurrencyChange(c)}
              style={[
                styles.segment,
                {
                  borderColor: active ? colors.brand : colors.border,
                  backgroundColor: active ? colors.brandMuted : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.brandForeground : colors.muted },
                ]}
              >
                {PURCHASE_CURRENCY_LABELS[c]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {currency !== 'CUP' && (
        <View style={[styles.rateCard, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.disclaimer, { color: colors.muted }]}>{TRMI_DISCLAIMER}</Text>

          <NumericInput
            label={`Tasa real que pagaste (CUP por 1 ${currencyLabel})`}
            value={exchangeRate}
            error={exchangeRateError}
            onChange={onExchangeRateChange}
            hint={
              suggestedTrmiRate > 0
                ? `Referencia TRMI hoy: ${formatCurrency(suggestedTrmiRate)} — ajústala a lo que pagaste`
                : 'Ingresa cuántos CUP pagaste por cada unidad de divisa'
            }
          />

          {suggestedTrmiRate > 0 && exchangeRate <= 0 && (
            <Button variant="secondary" size="sm" onPress={() => onExchangeRateChange(suggestedTrmiRate)}>
              Usar referencia TRMI ({formatCurrency(suggestedTrmiRate)})
            </Button>
          )}
        </View>
      )}

      <View style={styles.modeRow}>
        {MODE_OPTIONS.map(({ id, label: optionLabel }) => {
          const active = mode === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => handleModeChange(id)}
              style={[
                styles.modeSegment,
                {
                  borderColor: active ? colors.brand : colors.border,
                  backgroundColor: active ? colors.brandMuted : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.brandForeground : colors.muted },
                ]}
              >
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <NumericInput label={label} value={value} error={error} onChange={onChange} hint={hint} />

      {cupEquivalent != null && cupEquivalent > 0 && (
        <View style={styles.equivWrap}>
          <Text style={[styles.equivText, { color: colors.muted }]}>
            Costo en CUP:{' '}
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>
              {formatCurrency(cupEquivalent)}
            </Text>
            <Text>
              {' '}
              (1 {currencyLabel} = {formatCurrency(effectiveRate)})
            </Text>
          </Text>
          {trmiDiffers && suggestedTrmiRate > 0 && (
            <Text style={[styles.equivNote, { color: colors.muted }]}>
              Tu tasa difiere de la TRMI ({formatCurrency(suggestedTrmiRate)}) — correcto si pagaste otro
              precio en el mercado.
            </Text>
          )}
          {snapshot?.stale && (
            <Text style={[styles.equivNote, { color: colors.warning }]}>
              Referencia TRMI en cache — puede no estar actualizada
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  segmentRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  segment: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeSegment: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  rateCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  disclaimer: { fontSize: 12, lineHeight: 18 },
  equivWrap: { gap: 4 },
  equivText: { fontSize: 14, lineHeight: 20 },
  equivNote: { fontSize: 12, lineHeight: 16 },
});
