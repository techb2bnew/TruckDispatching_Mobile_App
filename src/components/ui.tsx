import type { IconName } from '../lib/icons';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import * as Haptics from '../lib/haptics';
import { LinearGradient } from './Gradient';
import { router } from '../lib/router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initials } from '../lib/format';
import { hue, radius, toggleTheme, useTheme, useThemed, type Palette } from '../theme';
import { Glass } from './glass';

/** Pressable with a springy scale. */
export function PressScale({
  children, onPress, style, scale = 0.96, hitSlop,
}: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; scale?: number; hitSlop?: number }) {
  const v = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return (
    <Pressable
      onPressIn={() => { v.value = withSpring(scale, { damping: 16, stiffness: 320 }); }}
      onPressOut={() => { v.value = withSpring(1, { damping: 12, stiffness: 260 }); }}
      onPress={onPress}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Avatar({ name, h, size = 44 }: { name: string; h: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, padding: 1.5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
      <LinearGradient
        colors={[`hsl(${h}, 75%, 60%)`, hue(h)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
      </LinearGradient>
    </View>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  const t = useTheme();
  return (
    <LinearGradient
      colors={t.accentGrad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' }}
    >
      <Text style={{ color: t.onAccent, fontWeight: '900', fontSize: size * 0.34, letterSpacing: -0.5 }}>B2B</Text>
    </LinearGradient>
  );
}

const chipStyles = (t: Palette) =>
  StyleSheet.create({
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.chipBg, borderWidth: 1, borderColor: t.chipBorder, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
    text: { color: t.accent, fontSize: 11, fontWeight: '800' },
  });

export function LoadChip({ id, label, onPress, center }: { id: string; label?: string; onPress?: () => void; center?: boolean }) {
  const [t, s] = useThemed(chipStyles);
  return (
    <Pressable onPress={onPress ?? (() => router.push(`/load/${id}`))} style={[s.chip, center && { alignSelf: 'center' }]} hitSlop={6}>
      <Ionicons name="cube-outline" size={12} color={t.accent} />
      <Text style={s.text}>{label ?? id}</Text>
    </Pressable>
  );
}

/** Round glass icon button (iOS-style). */
export function GlassBtn({ icon, onPress, color, size = 42 }: { icon: IconName; onPress: () => void; color?: string; size?: number }) {
  const t = useTheme();
  return (
    <PressScale onPress={onPress} hitSlop={6}>
      <Glass radius={size / 2} lite style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={size * 0.48} color={color ?? t.accent} />
      </Glass>
    </PressScale>
  );
}

export function ThemeToggle() {
  const t = useTheme();
  return (
    <GlassBtn
      icon={t.isDark ? 'sunny-outline' : 'moon-outline'}
      color={t.dim}
      onPress={() => { Haptics.selectionAsync(); toggleTheme(t.isDark); }}
    />
  );
}

const headerStyles = (t: Palette) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
    title: { color: t.ink, fontSize: 20, fontWeight: '800', flex: 1 },
    subtitle: { color: t.dim, fontSize: 12, marginTop: 1 },
  });

/** Header for stack screens: glass back button + title. */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { top } = useSafeAreaInsets();
  const [, s] = useThemed(headerStyles);
  return (
    <View style={[s.header, { paddingTop: top + 8 }]}>
      <GlassBtn icon="chevron-back" color={undefined} onPress={() => router.back()} />
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const badgeStyles = (t: Palette) =>
  StyleSheet.create({
    badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    text: { color: t.onAccent, fontSize: 11, fontWeight: '900' },
  });

export function Badge({ n }: { n: number }) {
  const [t, s] = useThemed(badgeStyles);
  if (!n) return null;
  return (
    <LinearGradient colors={[t.accentGrad[0], t.accentGrad[1]]} style={s.badge}>
      <Text style={s.text}>{n}</Text>
    </LinearGradient>
  );
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 80, gap: 12 }}>
      <Ionicons name={icon} size={44} color={t.muted} />
      <Text style={{ color: t.muted }}>{text}</Text>
    </View>
  );
}
