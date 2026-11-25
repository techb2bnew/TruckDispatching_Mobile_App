import type { IconName } from '../lib/icons';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { BlurView } from '@react-native-community/blur';
import * as Haptics from '../lib/haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemed, type Palette } from '../theme';

const ICONS: Record<string, [IconName, IconName, string]> = {
  journey: ['map', 'map-outline', 'Journey'],
  mails: ['mail', 'mail-outline', 'Mails'],
  chats: ['chatbubbles', 'chatbubbles-outline', 'Chat'],
  calls: ['call', 'call-outline', 'Calls'],
  loads: ['cube', 'cube-outline', 'Loads'],
};

function Item({ name, focused, badge, onPress }: { name: string; focused: boolean; badge: number; onPress: () => void }) {
  const [t, s] = useThemed(styles);
  const [on, off, label] = ICONS[name] ?? ['ellipse', 'ellipse-outline', name];
  const k = useSharedValue(focused ? 1 : 0);
  useEffect(() => { k.value = withSpring(focused ? 1 : 0, { damping: 11, stiffness: 240 }); }, [focused, k]);
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: 1 + k.value * 0.14 }, { translateY: -k.value * 1.5 }] }));
  return (
    <Pressable onPress={onPress} style={s.item} hitSlop={4}>
      <Animated.View style={icon}>
        <Ionicons name={focused ? on : off} size={25} color={focused ? t.accent : t.muted} />
        {badge > 0 && (
          <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>
        )}
      </Animated.View>
      <Text style={[s.label, focused && { color: t.accent }]}>{label}</Text>
    </Pressable>
  );
}

/** Floating glass tab bar with a springy sliding indicator. */
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const [t, s] = useThemed(styles);
  const [w, setW] = useState(0);
  // The API has no unread counters yet, so no badges for now.
  const badges: Record<string, number> = {};

  const n = state.routes.length;
  const itemW = w / n;
  const indicatorW = Math.max(40, Math.min(78, itemW - 6));
  const x = useSharedValue(0);
  useEffect(() => {
    if (itemW) x.value = withSpring(state.index * itemW + (itemW - indicatorW) / 2, { damping: 16, stiffness: 200 });
  }, [state.index, itemW, indicatorW, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={s.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {Platform.OS === 'ios' && <BlurView blurAmount={20} blurType={t.blurTint} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={s.edge} />
      {itemW > 0 && <Animated.View style={[s.indicator, { width: indicatorW }, indicator]} />}
      {state.routes.map((route, i) => (
        <Item
          key={route.key}
          name={route.name}
          focused={state.index === i}
          badge={badges[route.name] ?? 0}
          onPress={() => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (state.index !== i && !ev.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name);
            }
          }}
        />
      ))}
    </View>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute', left: 12, right: 12, bottom: 12, height: 68, borderRadius: 28, overflow: 'hidden',
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.glassBorder, backgroundColor: t.tabFill,
    },
    edge: { position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: t.glassEdge, opacity: 0.8 },
    indicator: { position: 'absolute', top: 5, width: 78, height: 55, borderRadius: 20, backgroundColor: t.chipBg, borderWidth: 1, borderColor: t.chipBorder },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: 68 },
    label: { color: t.muted, fontSize: 11, fontWeight: '700' },
    badge: { position: 'absolute', top: -5, right: -9, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    badgeText: { color: t.onAccent, fontSize: 10, fontWeight: '900' },
  });
