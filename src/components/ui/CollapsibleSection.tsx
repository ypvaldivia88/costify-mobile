import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface CollapsibleSectionProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
  style,
}: CollapsibleSectionProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.header,
          pressed ? { backgroundColor: colors.surfaceMuted } : null,
        ]}
      >
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {summary ? (
            <Text style={[styles.summary, { color: colors.muted }]}>{summary}</Text>
          ) : null}
        </View>
        <ChevronDown
          size={16}
          color={colors.muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open ? (
        <View style={[styles.body, { borderTopColor: `${colors.border}99` }]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600' },
  summary: { fontSize: 12, marginTop: 2 },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
});
