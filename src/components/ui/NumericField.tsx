import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useNumericField } from '@/hooks/use-numeric-field';
import { useTheme } from '@/context/ThemeContext';

interface NumericFieldProps extends Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText'> {
  value: number;
  onChange: (value: number) => void;
}

export function NumericField({ value, onChange, style, onBlur, onFocus, ...props }: NumericFieldProps) {
  const { colors } = useTheme();
  const { text, handleChange, handleFocus, handleBlur } = useNumericField({ value, onChange });

  return (
    <TextInput
      keyboardType="decimal-pad"
      value={text}
      onChangeText={handleChange}
      onFocus={(e) => {
        handleFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        handleBlur();
        onBlur?.(e);
      }}
      placeholderTextColor={colors.muted}
      style={[
        styles.field,
        {
          color: colors.foreground,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
    minWidth: 0,
    flexShrink: 1,
  },
});
