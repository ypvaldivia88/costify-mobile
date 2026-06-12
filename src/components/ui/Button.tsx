import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const backgroundColor =
    variant === 'primary'
      ? colors.brand
      : variant === 'secondary'
        ? colors.brandMuted
        : variant === 'danger'
          ? colors.danger
          : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#ffffff'
      : variant === 'secondary'
        ? colors.brandForeground
        : colors.foreground;

  const borderColor = variant === 'outline' ? colors.border : backgroundColor;
  const paddingVertical = size === 'lg' ? 14 : size === 'sm' ? 8 : 11;
  const fontSize = size === 'sm' ? 13 : 15;

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled ? colors.border : backgroundColor,
          borderColor,
          paddingVertical,
          opacity: pressed ? 0.85 : disabled ? 0.55 : 1,
        },
        style,
      ]}
      {...props}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.text, { color: disabled ? colors.muted : textColor, fontSize }]}>
          {children}
        </Text>
      ) : (
        <View style={styles.contentRow}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
