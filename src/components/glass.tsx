import { BlurView } from '@react-native-community/blur';
import { LinearGradient } from './Gradient';
import type { ReactNode } from 'react';
import { Platform, StatusBar, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ThemeOverride, darkPalette, useTheme } from '../theme';

/** One SVG with 3 radial gradients — smooth, and far cheaper than stacked circles. */
export function Backdrop() {
  const t = useTheme();
  const glows: [string, string, string, string, number][] = [
    ['ga', t.glowA, '88%', '6%', 330],
    ['gb', t.glowB, '8%', '94%', 380],
    ['gc', t.glowC, '100%', '50%', 250],
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={t.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {glows.map(([id, c]) => (
            <RadialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={t.glowOpacity} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {glows.map(([id, , cx, cy, r]) => (
          <Circle key={id} cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
        ))}
      </Svg>
    </View>
  );
}

/** Subtle trucking-doodle wallpaper for chat (single tiled SVG pattern). */
export function Doodles() {
  const t = useTheme();
  const c = t.doodle;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="doodle" width="110" height="110" patternUnits="userSpaceOnUse">
            <Path d="M10 78 C 34 44, 58 100, 92 56" stroke={c} strokeWidth="2" strokeDasharray="4 6" fill="none" />
            <Circle cx="10" cy="78" r="4" stroke={c} strokeWidth="2" fill="none" />
            <Circle cx="92" cy="56" r="4" fill={c} />
            <Rect x="58" y="10" width="22" height="16" rx="3" stroke={c} strokeWidth="2" fill="none" />
            <Path d="M58 18 h22" stroke={c} strokeWidth="2" />
            <Path d="M18 16 h12 M24 10 v12" stroke={c} strokeWidth="2" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#doodle)" />
      </Svg>
    </View>
  );
}

/** Page container: gradient + glow backdrop. `dark` forces the dark palette (call screens). */
export function Screen({ children, style, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const real = useTheme();
  const t = dark ? darkPalette : real;
  return (
    <ThemeOverride.Provider value={dark ? darkPalette : null}>
      <View style={[{ flex: 1, backgroundColor: t.bg }, style]}>
        {dark && <StatusBar barStyle="light-content" />}
        <Backdrop />
        {children}
      </View>
    </ThemeOverride.Provider>
  );
}

/**
 * Glass surface. Real blur on iOS; on Android a translucent fill over the glow backdrop
 * (keeps the app light). `lite` skips the blur layer for small/repeated elements.
 */
export function Glass({
  children,
  style,
  radius = 20,
  strong,
  lite,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  strong?: boolean;
  lite?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: t.glassBorder,
          backgroundColor: strong ? t.glassFillStrong : t.glassFill,
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' && !lite && <BlurView blurAmount={strong ? 16 : 10} blurType={t.blurTint} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 1, backgroundColor: t.glassEdge, opacity: 0.8 }} />
      {children}
    </View>
  );
}
