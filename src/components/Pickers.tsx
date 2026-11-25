import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDrivers, getLoads, type Driver } from '../api';
import { useAsync } from '../hooks/useAsync';
import { radius, useThemed, type Palette } from '../theme';
import { LinearGradient } from './Gradient';
import { Glass } from './glass';
import { Avatar, PressScale } from './ui';

/** Horizontal load chips (first 30 loads of the board). `value` is the API load id. */
export function LoadChips({ value, onChange, optional }: { value?: string; onChange: (id: string | undefined) => void; optional?: string }) {
  const [t, s] = useThemed(styles);
  const loads = useAsync(() => getLoads({ limit: 30 }), []);
  if (loads.loading && !loads.data) return <ActivityIndicator color={t.accent} />;
  if (loads.error) return <Text style={s.error}>{loads.error.message}</Text>;
  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <PressScale key={key} onPress={onPress}>
      {on ? (
        <LinearGradient colors={[t.accentGrad[0], t.accentGrad[1]]} style={s.opt}>
          <Text style={[s.optText, { color: t.onAccent }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Glass radius={radius.pill} lite style={s.opt}>
          <Text style={s.optText}>{label}</Text>
        </Glass>
      )}
    </PressScale>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsContent}>
      {optional ? chip('none', optional, !value, () => onChange(undefined)) : null}
      {(loads.data?.items ?? []).map((l) => chip(l.id, l.referenceId, l.id === value, () => onChange(l.id)))}
    </ScrollView>
  );
}

const availColor = (a: Driver['availability'], t: Palette) => (a === 'available' ? t.green : a === 'on_load' ? t.amber : t.muted);

/** Driver roster list; tap to choose. */
export function DriverList({ value, onChange }: { value?: string; onChange: (d: Driver) => void }) {
  const [t, s] = useThemed(styles);
  const drivers = useAsync(() => getDrivers({ limit: 50 }), []);
  if (drivers.loading && !drivers.data) return <ActivityIndicator color={t.accent} />;
  if (drivers.error) return <Text style={s.error}>{drivers.error.message}</Text>;
  return (
    <View style={s.list}>
      {(drivers.data?.items ?? []).map((d) => (
        <PressScale key={d.id} onPress={() => onChange(d)} scale={0.98}>
          <Glass radius={16} lite strong={d.id === value} style={[s.driver, d.id === value && { borderColor: t.accent }]}>
            <Avatar name={d.name} h={d.hue} size={40} />
            <View style={s.flex}>
              <Text style={s.dName}>{d.name}</Text>
              <Text style={s.dSub} numberOfLines={1}>
                {[d.truckId ? `Truck ${d.truckId}` : 'No truck', [d.location?.city, d.location?.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={[s.avail, { color: availColor(d.availability, t) }]}>{d.availability.replace('_', ' ')}</Text>
          </Glass>
        </PressScale>
      ))}
    </View>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    chips: { flexGrow: 0 },
    chipsContent: { gap: 8 },
    opt: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
    optText: { color: t.ink, fontWeight: '800' },
    error: { color: t.rose },
    list: { gap: 8 },
    driver: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
    flex: { flex: 1 },
    dName: { color: t.ink, fontWeight: '800' },
    dSub: { color: t.muted, fontSize: 12 },
    avail: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  });
