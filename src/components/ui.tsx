import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { initials } from '@/lib/format';
import { colors, radius } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Avatar({ name, color, size = 48, online }: { name: string; color: string; size?: number; online?: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={{ color: colors.white, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
      </View>
      {online !== undefined && (
        <View style={[styles.dot, { backgroundColor: online ? colors.accent : '#4A4F63', right: 0, bottom: 0 }]} />
      )}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function RoundButton({
  icon,
  onPress,
  tone = 'dark',
  size = 58,
  label,
  testID,
  rotate,
}: {
  rotate?: string;
  icon: IconName;
  onPress: () => void;
  tone?: 'dark' | 'light' | 'danger' | 'primary';
  size?: number;
  label?: string;
  testID?: string;
}) {
  const bg = { dark: 'rgba(255,255,255,0.12)', light: colors.white, danger: colors.danger, primary: colors.primary }[tone];
  const fg = tone === 'light' ? '#111' : colors.white;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
          pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
        ]}
      >
        <Ionicons name={icon} size={size * 0.42} color={fg} style={rotate ? { transform: [{ rotate }] } : undefined} />
      </Pressable>
      {label ? <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>{label}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ title, icon, onPress, disabled, tone = 'primary', testID }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean; tone?: 'primary' | 'accent' | 'ghost'; testID?: string }) {
  const bg = tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accent : colors.surface2;
  const fg = tone === 'accent' ? '#06231D' : colors.white;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primary, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text, color = colors.accent, bg = colors.accentSoft, icon }: { text: string; color?: string; bg?: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function SignalBars({ bars }: { bars: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: 4, height: 3 + i * 3, borderRadius: 2, backgroundColor: i <= bars ? colors.accent : 'rgba(255,255,255,0.25)' }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  primary: { height: 54, borderRadius: radius.md, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  pill: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
