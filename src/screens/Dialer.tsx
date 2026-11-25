import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type CallType, type Driver } from '../api';
import { LinearGradient } from '../components/Gradient';
import { Glass, Screen } from '../components/glass';
import { DriverList, LoadChips } from '../components/Pickers';
import { Header, PressScale } from '../components/ui';
import { callHref } from '../lib/callHref';
import { router } from '../lib/router';
import { radius, useThemed, type Palette } from '../theme';

/** New call: a broker (about a load, or say the load on the call) or a driver (about a load). */
export default function Dialer() {
  const [t, s] = useThemed(styles);
  const [type, setType] = useState<CallType>('BROKER');
  const [loadId, setLoadId] = useState<string | undefined>();
  const [driver, setDriver] = useState<Driver | undefined>();
  const ok = type === 'BROKER' || (!!loadId && !!driver);

  const call = () => {
    if (!ok) return;
    router.replace(type === 'BROKER'
      ? callHref({ type, loadId })
      : callHref({ type, loadId, driverId: driver?.id, truckId: driver?.truckId }));
  };

  return (
    <Screen>
      <Header title="New call" subtitle="Calls stay inside this app" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Glass radius={radius.pill} lite style={s.seg}>
          {(['BROKER', 'DRIVER'] as const).map((k) => (
            <Pressable key={k} onPress={() => setType(k)} style={s.segItem}>
              {type === k ? (
                <LinearGradient colors={[t.accentGrad[0], t.accentGrad[1]]} style={s.segOn}>
                  <Text style={[s.segText, { color: t.onAccent }]}>{k === 'BROKER' ? 'Broker' : 'Driver'}</Text>
                </LinearGradient>
              ) : (
                <View style={s.segOn}><Text style={s.segText}>{k === 'BROKER' ? 'Broker' : 'Driver'}</Text></View>
              )}
            </Pressable>
          ))}
        </Glass>

        <Text style={s.label}>Load</Text>
        <LoadChips value={loadId} onChange={setLoadId} optional={type === 'BROKER' ? 'Say it on the call' : undefined} />
        {type === 'DRIVER' && (
          <>
            <Text style={s.label}>Driver</Text>
            <DriverList value={driver?.id} onChange={setDriver} />
          </>
        )}
        {type === 'BROKER' && !loadId && <Text style={s.hint}>The broker will ask for the load id, for example “LD-1234”.</Text>}
      </ScrollView>

      <View style={s.footer}>
        <PressScale onPress={call} style={!ok && s.dim}>
          <LinearGradient colors={['#6ee7b7', '#10b981']} style={s.callBtn}>
            <Ionicons name="call" size={26} color="#fff" />
            <Text style={s.callText}>Call</Text>
          </LinearGradient>
        </PressScale>
      </View>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    content: { padding: 16, gap: 14, paddingBottom: 24 },
    seg: { flexDirection: 'row', padding: 4 },
    segItem: { flex: 1 },
    segOn: { paddingVertical: 10, alignItems: 'center', borderRadius: radius.pill },
    segText: { color: t.ink, fontWeight: '800' },
    label: { color: t.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
    hint: { color: t.muted, fontSize: 13 },
    dim: { opacity: 0.35 },
    footer: { padding: 16, paddingBottom: 28 },
    callBtn: { height: 58, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    callText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  });
