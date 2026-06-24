import { StyleSheet, Text, type TextStyle } from 'react-native';
import { useExchangeRatesContext } from '@/hooks/use-exchange-rates-context';
import { formatCurrency } from '@/format/currency';
import { useTheme } from '@/context/ThemeContext';

interface CurrencyEquivalentsProps {
  cupAmount: number;
  style?: TextStyle;
  size?: 'sm' | 'md';
}

export function CurrencyEquivalents({
  cupAmount,
  style,
  size = 'sm',
}: CurrencyEquivalentsProps) {
  const { colors } = useTheme();
  const { formatEquivalents } = useExchangeRatesContext();
  const equivalents = formatEquivalents(cupAmount);

  if (!equivalents || cupAmount <= 0) return null;

  return (
    <Text
      style={[
        styles.base,
        { color: colors.muted },
        size === 'sm' ? styles.sm : styles.md,
        style,
      ]}
    >
      {formatCurrency(cupAmount)} · {equivalents}
    </Text>
  );
}

interface CurrencyEquivalentsOnlyProps {
  cupAmount: number;
  style?: TextStyle;
}

/** Solo muestra equivalencias sin repetir el CUP */
export function CurrencyEquivalentsOnly({ cupAmount, style }: CurrencyEquivalentsOnlyProps) {
  const { colors } = useTheme();
  const { formatEquivalents } = useExchangeRatesContext();
  const equivalents = formatEquivalents(cupAmount);

  if (!equivalents || cupAmount <= 0) return null;

  return (
    <Text style={[styles.base, styles.sm, { color: colors.muted }, style]}>{equivalents}</Text>
  );
}

const styles = StyleSheet.create({
  base: { fontVariant: ['tabular-nums'] },
  sm: { fontSize: 12 },
  md: { fontSize: 14 },
});
