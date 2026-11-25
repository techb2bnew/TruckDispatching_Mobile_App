import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

export interface Palette {
  isDark: boolean;
  bg: string;
  gradient: [string, string, string];
  glowA: string;
  glowB: string;
  glowC: string;
  glowOpacity: number;
  ink: string;
  dim: string;
  muted: string;
  accent: string;
  accentGrad: [string, string, string];
  onAccent: string;
  green: string;
  amber: string;
  violet: string;
  rose: string;
  blue: string;
  glassFill: string;
  glassFillStrong: string;
  glassBorder: string;
  glassEdge: string;
  divider: string;
  press: string;
  meGrad: [string, string];
  onMe: string;
  doodle: string;
  chipBg: string;
  chipBorder: string;
  blurTint: 'dark' | 'light';
  tabFill: string;
}

export const darkPalette: Palette = {
  isDark: true,
  bg: '#040a16',
  gradient: ['#030816', '#071a3d', '#0a0d33'],
  glowA: '#22d3ee',
  glowB: '#a78bfa',
  glowC: '#3b82f6',
  glowOpacity: 0.3,
  ink: '#e8f1ff',
  dim: '#9bb0d0',
  muted: '#6a7fa3',
  accent: '#22d3ee',
  accentGrad: ['#5eead4', '#22d3ee', '#3b82f6'],
  onAccent: '#031425',
  green: '#34d399',
  amber: '#fbbf24',
  violet: '#a78bfa',
  rose: '#fb7185',
  blue: '#3b82f6',
  glassFill: 'rgba(255,255,255,0.08)',
  glassFillStrong: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassEdge: 'rgba(255,255,255,0.32)',
  divider: 'rgba(255,255,255,0.10)',
  press: 'rgba(255,255,255,0.07)',
  meGrad: ['#2a9df4', '#2563eb'],
  onMe: '#ffffff',
  doodle: 'rgba(255,255,255,0.045)',
  chipBg: 'rgba(34,211,238,0.14)',
  chipBorder: 'rgba(34,211,238,0.3)',
  blurTint: 'dark',
  tabFill: 'rgba(10,20,45,0.74)',
};

export const lightPalette: Palette = {
  isDark: false,
  bg: '#eef3fb',
  gradient: ['#f4f8ff', '#e7effc', '#f1ecfb'],
  glowA: '#38bdf8',
  glowB: '#c4b5fd',
  glowC: '#93c5fd',
  glowOpacity: 0.5,
  ink: '#0b1630',
  dim: '#41567d',
  muted: '#7285a8',
  accent: '#0a84ff',
  accentGrad: ['#38bdf8', '#0a84ff', '#2563eb'],
  onAccent: '#ffffff',
  green: '#16a34a',
  amber: '#d97706',
  violet: '#7c3aed',
  rose: '#e11d48',
  blue: '#2563eb',
  glassFill: 'rgba(255,255,255,0.62)',
  glassFillStrong: 'rgba(255,255,255,0.82)',
  glassBorder: 'rgba(30,60,120,0.12)',
  glassEdge: 'rgba(255,255,255,1)',
  divider: 'rgba(11,22,48,0.09)',
  press: 'rgba(11,22,48,0.05)',
  meGrad: ['#38a9f8', '#0a74e8'],
  onMe: '#ffffff',
  doodle: 'rgba(11,22,48,0.06)',
  chipBg: 'rgba(10,132,255,0.12)',
  chipBorder: 'rgba(10,132,255,0.3)',
  blurTint: 'light',
  tabFill: 'rgba(255,255,255,0.8)',
};

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const hue = (h: number) => `hsl(${h}, 65%, 45%)`;

// ---- theme mode (system by default, toggle sets an explicit mode) ----
type Mode = 'system' | 'light' | 'dark';
let mode: Mode = 'light'; // default light, ThemeToggle se dark ho sakta hai
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export const ThemeOverride = createContext<Palette | null>(null);

export function useTheme(): Palette {
  const override = useContext(ThemeOverride);
  const m = useSyncExternalStore(subscribe, () => mode);
  const sys = useColorScheme();
  if (override) return override;
  const dark = m === 'system' ? sys !== 'light' : m === 'dark';
  return dark ? darkPalette : lightPalette;
}

export function toggleTheme(currentlyDark: boolean) {
  mode = currentlyDark ? 'light' : 'dark';
  listeners.forEach((l) => l());
}

/** `const [t, s] = useThemed(makeStyles)` — makeStyles must be a module-level function. */
export function useThemed<T>(factory: (t: Palette) => T): [Palette, T] {
  const t = useTheme();
  const s = useMemo(() => factory(t), [t, factory]);
  return [t, s];
}
