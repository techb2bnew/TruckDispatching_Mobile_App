import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useThemed, type Palette } from '../theme';
import { Glass, Screen } from './glass';
import { Logo } from './ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Pt = [number, number];
function bez(p: number, a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  'worklet';
  const u = 1 - p;
  const f = (i: 0 | 1) => u * u * u * a[i] + 3 * u * u * p * b[i] + 3 * u * p * p * c[i] + p * p * p * d[i];
  return [f(0), f(1)];
}

/** ~3.5s intro: a truck drives a route line, then the glass logo springs in with a sheen. */
export function Splash() {
  const [t, s] = useThemed(styles);
  const { width: W, height: H } = useWindowDimensions();

  const a: Pt = [-12, H * 0.8], b: Pt = [W * 0.28, H * 0.64], c: Pt = [W * 0.62, H * 0.93], d: Pt = [W + 12, H * 0.74];
  const dPath = `M ${a[0]} ${a[1]} C ${b[0]} ${b[1]}, ${c[0]} ${c[1]}, ${d[0]} ${d[1]}`;
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 40; i++) {
    const q = bez(i / 40, a, b, c, d);
    len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    prev = q;
  }

  const p = useSharedValue(0);
  const logo = useSharedValue(0);
  const sheen = useSharedValue(0);
  const title = useSharedValue(0);
  const tag = useSharedValue(0);
  const out = useSharedValue(1);

  useEffect(() => {
    p.value = withDelay(150, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }));
    logo.value = withDelay(1250, withSpring(1, { damping: 11, stiffness: 130 }));
    sheen.value = withDelay(1700, withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }));
    title.value = withDelay(1650, withTiming(1, { duration: 550 }));
    tag.value = withDelay(1950, withTiming(1, { duration: 550 }));
    out.value = withDelay(3000, withTiming(0, { duration: 480 }));
  }, [p, logo, sheen, title, tag, out]);

  const drawn = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  const truck = useAnimatedStyle(() => {
    const [x, y] = bez(p.value, a, b, c, d);
    const [x2, y2] = bez(Math.min(1, p.value + 0.01), a, b, c, d);
    return {
      opacity: interpolate(p.value, [0, 0.04, 0.94, 1], [0, 1, 1, 0]),
      transform: [{ translateX: x - 16 }, { translateY: y - 26 }, { rotate: `${Math.atan2(y2 - y, x2 - x)}rad` }],
    };
  });
  const logoStyle = useAnimatedStyle(() => ({ opacity: interpolate(logo.value, [0, 0.4], [0, 1], 'clamp'), transform: [{ scale: 0.5 + logo.value * 0.5 }] }));
  const sheenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -90 + sheen.value * 230 }, { rotate: '20deg' }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ translateY: (1 - title.value) * 14 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 10 }] }));
  const outStyle = useAnimatedStyle(() => ({ opacity: out.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, outStyle]}>
      <Screen>
        <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
          <Path d={dPath} stroke={t.muted} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="6 9" fill="none" strokeLinecap="round" />
          <AnimatedPath d={dPath} stroke={t.accent} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={[len, len]} animatedProps={drawn} />
        </Svg>
        <Animated.View style={[s.truck, truck]}>
          <MaterialDesignIcons name="truck-fast" size={32} color={t.accent} />
        </Animated.View>

        <View style={s.center}>
          <Animated.View style={logoStyle}>
            <Glass radius={34} strong style={s.logoCard}>
              <Logo size={76} />
              <Animated.View pointerEvents="none" style={[s.sheen, sheenStyle]} />
            </Glass>
          </Animated.View>
          <Animated.Text style={[s.title, titleStyle]}>B2B Logistics</Animated.Text>
          <Animated.Text style={[s.tag, tagStyle]}>DISPATCHER CAREER SIMULATOR</Animated.Text>
        </View>
      </Screen>
    </Animated.View>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    truck: { position: 'absolute', left: 0, top: 0 },
    center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 110 },
    logoCard: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
    sheen: { position: 'absolute', top: -30, bottom: -30, width: 36, backgroundColor: 'rgba(255,255,255,0.45)' },
    title: { color: t.ink, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 10 },
    tag: { color: t.dim, fontSize: 11, fontWeight: '800', letterSpacing: 2.4 },
  });

