import type { IconName } from '../lib/icons';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { clock, dayLabel } from '../lib/format';
import { radius, useTheme, useThemed, type Palette } from '../theme';
import { Glass } from './glass';

function Dot({ i, color }: { i: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(i * 160, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })), -1));
  }, [i, v]);
  const a = useAnimatedStyle(() => ({ opacity: 0.35 + v.value * 0.65, transform: [{ translateY: -v.value * 4 }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, a]} />;
}

/** Animated 3-dot typing bubble. */
export function TypingBubble() {
  const t = useTheme();
  return (
    <Glass radius={20} style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {[0, 1, 2].map((i) => <Dot key={i} i={i} color={t.dim} />)}
      </View>
    </Glass>
  );
}

/** One tick = sent, two ticks = the agent has replied. Deliberately simple. */
export function Ticks({ done, color, doneColor }: { done: boolean; color: string; doneColor?: string }) {
  return <Ionicons name={done ? 'checkmark-done' : 'checkmark'} size={15} color={done ? doneColor ?? color : color} />;
}

const dayStyles = (t: Palette) =>
  StyleSheet.create({
    pill: { alignSelf: 'center', backgroundColor: t.glassFill, borderWidth: 1, borderColor: t.glassBorder, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginVertical: 6 },
    text: { color: t.dim, fontSize: 12, fontWeight: '700' },
  });

export function DayPill({ ts }: { ts: number }) {
  const [, s] = useThemed(dayStyles);
  return <View style={s.pill}><Text style={s.text}>{dayLabel(ts)}</Text></View>;
}

/** Centered system line (call logs, context notes). */
export function SystemPill({ icon, text, ts }: { icon: IconName; text: string; ts: number }) {
  const [t, s] = useThemed(dayStyles);
  return (
    <View style={[s.pill, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
      <Ionicons name={icon} size={12} color={t.dim} />
      <Text style={s.text}>{text} · {clock(ts)}</Text>
    </View>
  );
}

function Ring({ delay, color, size }: { delay: number; color: string; size: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400 }), -1));
  }, [delay, v]);
  const a = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - v.value), transform: [{ scale: 1 + v.value * 0.5 }] }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, a]} />;
}

/** Expanding rings behind an avatar (ringing / connected call). */
export function PulseRings({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ring delay={0} color={color} size={size} />
      <Ring delay={800} color={color} size={size} />
      <Ring delay={1600} color={color} size={size} />
      {children}
    </View>
  );
}
