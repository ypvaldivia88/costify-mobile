import { useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'default' | 'accent' | 'warning';
  style?: ViewStyle;
}

function clampFontSize(width: number): number {
  return Math.min(24, Math.max(12, width * 0.11));
}

export function StatCard({ label, value, subtext, variant = 'default', style }: StatCardProps) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const valueColor =
    variant === 'accent' ? colors.brand : variant === 'warning' ? colors.warning : colors.foreground;
  const valueFontSize = containerWidth > 0 ? clampFontSize(containerWidth) : 16;

  return (
    <View
      style={[styles.wrap, style]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width !== containerWidth) setContainerWidth(width);
      }}
    >
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text
        style={[
          styles.value,
          {
            color: valueColor,
            fontSize: valueFontSize,
            lineHeight: valueFontSize * 1.15,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      {subtext ? <Text style={[styles.subtext, { color: colors.muted }]}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, minWidth: 0 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.25 },
  subtext: { fontSize: 12 },
});
