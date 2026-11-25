import * as Haptics from '../lib/haptics';
import { LinearGradient } from '../components/Gradient';
import { router, useLocalSearchParams } from '../lib/router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { getLoads, sendBrokerEmailForLoad } from '../api';
import { Glass, Screen } from '../components/glass';
import { Header, PressScale } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { placeLabel } from '../lib/loadFormat';
import { radius, useThemed, type Palette } from '../theme';

/** New email to the broker of a load: POST /api/broker/sessions/by-load/{loadId}/messages. */
export default function Compose() {
  const [t, s] = useThemed(styles);
  const { loadId: presetLoadId } = useLocalSearchParams<{ loadId?: string }>();
  const loads = useAsync(() => getLoads({ limit: 30 }), []);
  const [picked, setPicked] = useState<string | undefined>(presetLoadId);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const items = loads.data?.items ?? [];
  const loadId = picked ?? items[0]?.id;
  const load = items.find((l) => l.id === loadId);
  const ok = !!loadId && body.trim().length > 0 && !busy;

  const send = async () => {
    if (!ok || !loadId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    try {
      const session = await sendBrokerEmailForLoad(loadId, body.trim(), subject.trim() || undefined);
      router.replace(`/mail/${session.id}`);
    } catch (e) {
      Alert.alert('Could not send', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        title="New mail"
        right={
          <PressScale onPress={send} style={!ok && s.dim}>
            <LinearGradient colors={t.accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sendBtn}>
              {busy ? <ActivityIndicator color={t.onAccent} /> : <Text style={s.send}>Send</Text>}
            </LinearGradient>
          </PressScale>
        }
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Regarding load</Text>
        {loads.loading && !loads.data ? (
          <ActivityIndicator color={t.accent} />
        ) : loads.error ? (
          <Text style={s.error}>{loads.error.message}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsContent}>
            {items.map((l) => (
              <PressScale key={l.id} onPress={() => setPicked(l.id)}>
                {l.id === loadId ? (
                  <LinearGradient colors={[t.accentGrad[0], t.accentGrad[1]]} style={s.opt}>
                    <Text style={[s.optText, { color: t.onAccent }]}>{l.referenceId}</Text>
                  </LinearGradient>
                ) : (
                  <Glass radius={radius.pill} lite style={s.opt}>
                    <Text style={s.optText}>{l.referenceId}</Text>
                  </Glass>
                )}
              </PressScale>
            ))}
          </ScrollView>
        )}
        {load && (
          <Text style={s.to}>
            To: {load.company?.name ?? 'Broker'}  ({placeLabel(load.trip.origin)} → {placeLabel(load.trip.destination)})
          </Text>
        )}
        <Glass radius={16}>
          <TextInput value={subject} onChangeText={setSubject} placeholder="Subject (optional)" placeholderTextColor={t.muted} style={s.input} />
        </Glass>
        <Glass radius={16}>
          <TextInput value={body} onChangeText={setBody} placeholder="Write your email…" placeholderTextColor={t.muted} style={[s.input, s.bodyInput]} multiline />
        </Glass>
      </ScrollView>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    content: { padding: 16, gap: 14 },
    dim: { opacity: 0.4 },
    sendBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', minWidth: 72, alignItems: 'center' },
    send: { color: t.onAccent, fontWeight: '900', fontSize: 15 },
    label: { color: t.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
    chips: { flexGrow: 0 },
    chipsContent: { gap: 8 },
    opt: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
    optText: { color: t.ink, fontWeight: '800' },
    to: { color: t.dim, fontSize: 13 },
    error: { color: t.rose },
    input: { color: t.ink, padding: 14, fontSize: 15 },
    bodyInput: { minHeight: 200, textAlignVertical: 'top' },
  });
