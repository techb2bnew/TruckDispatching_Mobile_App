import { StyleSheet, Text, View } from 'react-native';
import { useThemed, type Palette } from '../theme';
import { Glass } from './glass';

const words = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());

function flatten(v: unknown, prefix = '', depth = 0): [string, string][] {
  if (v === null || v === undefined || v === '') return [];
  if (typeof v !== 'object') return [[prefix, typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)]];
  if (Array.isArray(v)) {
    return v.every((x) => typeof x !== 'object') ? [[prefix, v.join(', ')]] : v.flatMap((x, i) => flatten(x, `${prefix} ${i + 1}`, depth + 1));
  }
  if (depth > 2) return [];
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => flatten(x, prefix ? `${prefix} · ${words(k)}` : words(k), depth + 1));
}

/** The server does not fix the scorecard's shape, so show whatever it sends as label / value rows. */
export function Scorecard({ data, title = 'Scorecard' }: { data: Record<string, unknown>; title?: string }) {
  const [, s] = useThemed(styles);
  const rows = flatten(data);
  if (!rows.length) return null;
  return (
    <Glass strong style={s.card}>
      <Text style={s.title}>{title}</Text>
      {rows.map(([k, v], i) => (
        <View key={`${k}${i}`} style={s.row}>
          <Text style={s.k}>{k}</Text>
          <Text style={s.v}>{v}</Text>
        </View>
      ))}
    </Glass>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    card: { padding: 14, gap: 8 },
    title: { color: t.ink, fontWeight: '900', fontSize: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
    k: { color: t.muted, flexShrink: 1 },
    v: { color: t.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  });
