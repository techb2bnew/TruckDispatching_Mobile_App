import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ApiError, endCall, getCall, getDriverMap, getLoadCached, isMyTurn, listCalls, sendCallTurn, startCall,
  type ApiLoad, type CallDetail, type CallTurnResult, type CallType, type Driver,
} from '../api';
import { PulseRings, SystemPill, TypingBubble } from '../components/Bits';
import { LinearGradient } from '../components/Gradient';
import { Glass, Screen } from '../components/glass';
import { Scorecard } from '../components/Scorecard';
import { Avatar, LoadChip, PressScale } from '../components/ui';
import { callHref } from '../lib/callHref';
import { duration, hueOf, money } from '../lib/format';
import * as Haptics from '../lib/haptics';
import { placeLabel } from '../lib/loadFormat';
import { router, useLocalSearchParams } from '../lib/router';
import { useThemed, type Palette } from '../theme';

interface Turn { id: string; mine: boolean; text: string }
type Phase = 'connecting' | 'active' | 'ended' | 'error';

// Text version of the call: the student types what they would say, the AI broker / driver answers.
// Real audio (speech-to-text + voice) plugs into `say()` later without changing the API calls.
export default function ActiveCall() {
  return (
    <Screen dark>
      <Body />
    </Screen>
  );
}

function Body() {
  const p = useLocalSearchParams<{ callId?: string; type?: CallType; loadId?: string; driverId?: string; truckId?: string }>();
  const [t, s] = useThemed(styles);
  const { top, bottom } = useSafeAreaInsets();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [error, setError] = useState<{ message: string; canResume: boolean } | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<Partial<CallTurnResult>>({});
  const [now, setNow] = useState(Date.now());
  const [driver, setDriver] = useState<Driver | undefined>();
  const [load, setLoad] = useState<ApiLoad | undefined>();
  const scroll = useRef<ScrollViewInstance>(null);
  const started = useRef(false);
  const mountedAt = useRef(Date.now());

  // ---- start (or resume) the call once ----
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const c = p.callId
          ? await getCall(p.callId)
          : await startCall({ type: p.type ?? 'BROKER', loadId: p.loadId, driverId: p.driverId, truckId: p.truckId });
        setCall(c);
        setTurns((c.turns ?? []).filter((x) => x.text).map((x, i) => ({ id: x.id ?? `t${i}`, mine: isMyTurn(x.role), text: x.text })));
        setPhase(c.status === 'ENDED' ? 'ended' : 'active');
        if (c.status !== 'ENDED') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        const err = e as ApiError;
        const text = `${err.message} ${JSON.stringify(err.details ?? '')}`;
        setError({ message: err.message, canResume: err.status === 409 && /active/i.test(text) });
        setPhase('error');
      }
    })();
  }, [p.callId, p.type, p.loadId, p.driverId, p.truckId]);

  // ---- who / which load ----
  const loadId = result.loadId ?? call?.loadId ?? p.loadId;
  const driverId = call?.driverId ?? p.driverId;
  const type = call?.type ?? p.type ?? 'BROKER';
  useEffect(() => { if (driverId) getDriverMap().then((m) => setDriver(m.get(driverId))).catch(() => {}); }, [driverId]);
  useEffect(() => { if (loadId) getLoadCached(loadId).then(setLoad).catch(() => {}); }, [loadId]);

  const name = type === 'DRIVER' ? driver?.name ?? 'Driver' : load?.company?.name ?? 'Broker';
  const hue = type === 'DRIVER' ? driver?.hue ?? hueOf(driverId ?? 'd') : hueOf(load?.companyId ?? 'broker');

  // ---- clock ----
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);
  const startedAt = call ? Date.parse(call.startedAt) || mountedAt.current : mountedAt.current;
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const left = call ? Math.max(0, call.maxDurationSec - elapsed) : 0;
  const shownSecs = phase === 'ended' ? call?.durationSec ?? elapsed : elapsed;

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [turns.length, busy]);

  // ---- actions ----
  const say = async () => {
    const text = draft.trim();
    if (!text || busy || phase !== 'active' || !call) return;
    setDraft('');
    setTurns((x) => [...x, { id: `me${Date.now()}`, mine: true, text }]);
    setBusy(true);
    try {
      const r = await sendCallTurn(call.id, text);
      setTurns((x) => [...x, { id: `re${Date.now()}`, mine: false, text: r.reply }]);
      setResult((prev) => ({ ...prev, ...r, scorecard: r.scorecard ?? prev.scorecard }));
      if (r.callEnded || r.sessionOver) {
        setPhase('ended');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e) {
      const err = e as ApiError;
      setTurns((x) => x.filter((m) => !(m.mine && m.text === text)));
      if (err.status === 409) setPhase('ended');
      else { setDraft(text); Alert.alert('Could not send', err.message); }
    } finally {
      setBusy(false);
    }
  };

  const hangUp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (call && phase === 'active') { try { await endCall(call.id, 'HANGUP'); } catch { /* already ended */ } }
    router.back();
  };

  const resumeActive = async () => {
    try {
      const { items } = await listCalls({ status: 'ACTIVE', limit: 1 });
      if (items[0]) router.replace(callHref({ callId: items[0].id }));
    } catch (e) { Alert.alert('Could not find the active call', (e as Error).message); }
  };

  const status = useMemo(() => {
    if (phase === 'connecting') return 'Calling…';
    if (phase === 'error') return 'Could not connect';
    if (phase === 'ended') return `Call ended · ${duration(shownSecs)}`;
    return `${duration(shownSecs)}${call ? `  ·  ${duration(left)} left` : ''}`;
  }, [phase, shownSecs, left, call]);

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: top + 24, paddingBottom: bottom + 48 }]} behavior="padding">
      <Animated.View entering={FadeInDown.duration(400)} style={s.head}>
        <PulseRings size={phase === 'active' || phase === 'connecting' ? 104 : 88} color={phase === 'active' ? t.green : t.accent}>
          <Avatar name={name} h={hue} size={phase === 'active' || phase === 'connecting' ? 96 : 80} />
        </PulseRings>
        <Text style={s.name}>{name}</Text>
        <Text style={[s.status, phase === 'active' && { color: t.green }, phase === 'error' && { color: t.rose }]}>{status}</Text>
        {loadId ? <LoadChip id={loadId} label={load?.referenceId ?? 'View load'} center /> : null}
        {load ? <Text style={s.ctx}>{placeLabel(load.trip.origin)} → {placeLabel(load.trip.destination)}</Text> : null}
      </Animated.View>

      {phase === 'connecting' && <ActivityIndicator color={t.accent} style={s.fill} />}

      {phase === 'error' && (
        <View style={[s.fill, s.errorBox]}>
          <Ionicons name="alert-circle-outline" size={40} color={t.rose} />
          <Text style={s.errorText}>{error?.message}</Text>
          {error?.canResume && (
            <PressScale onPress={resumeActive} style={s.pill}><Text style={s.pillText}>Resume the call in progress</Text></PressScale>
          )}
        </View>
      )}

      {(phase === 'active' || phase === 'ended') && (
        <ScrollView ref={scroll} style={s.fill} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {turns.length === 0 && (
            <Text style={s.hint}>
              {type === 'BROKER' && !loadId ? 'Say hello and tell the broker the load id, for example “LD-1234”.' : 'The line is open. Type what you would say.'}
            </Text>
          )}
          {turns.map((m) => (
            <Animated.View key={m.id} entering={FadeInDown.duration(220)} style={m.mine ? s.meWrap : s.themWrap}>
              {m.mine ? (
                <LinearGradient colors={t.meGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.bubble, s.me]}>
                  <Text style={[s.text, { color: t.onMe }]}>{m.text}</Text>
                </LinearGradient>
              ) : (
                <Glass radius={20} strong style={s.them}><Text style={[s.text, s.themText]}>{m.text}</Text></Glass>
              )}
            </Animated.View>
          ))}
          {busy && <TypingBubble />}
          {result.agreedPrice ? <SystemPill icon="pricetag" text={`Agreed price ${money(result.agreedPrice)}`} ts={Date.now()} /> : result.currentOffer ? <SystemPill icon="pricetag-outline" text={`Current offer ${money(result.currentOffer)}`} ts={Date.now()} /> : null}
          {result.outcome === 'ASSIGNED' && <SystemPill icon="checkmark-circle" text="Driver accepted the load" ts={Date.now()} />}
          {result.canConfirm && <SystemPill icon="mail" text="Deal ready: confirm it in Mails" ts={Date.now()} />}
          {result.scorecard ? <Scorecard data={result.scorecard} /> : null}
        </ScrollView>
      )}

      {phase === 'active' && (
        <View style={s.inputRow}>
          <Glass radius={24} strong style={s.pillInput}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Say something…"
              placeholderTextColor={t.muted}
              style={s.input}
              multiline
              editable={!busy}
            />
          </Glass>
          <PressScale onPress={say} style={(!draft.trim() || busy) && s.dim}>
            <LinearGradient colors={t.accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.send}>
              <Ionicons name="arrow-up" size={20} color={t.onAccent} />
            </LinearGradient>
          </PressScale>
        </View>
      )}

      <PressScale onPress={hangUp} style={[s.endWrap, { marginBottom: bottom + 36 }]}>
        {phase === 'active' || phase === 'connecting' ? (
          <LinearGradient colors={['#fda4af', '#f43f5e']} style={s.end}>
            <Ionicons name="call" size={30} color="#fff" style={s.hangIcon} />
          </LinearGradient>
        ) : (
          <Glass radius={999} strong style={s.close}><Text style={s.closeText}>Close</Text></Glass>
        )}
      </PressScale>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: 'center' },
    head: { alignItems: 'center', gap: 6, paddingHorizontal: 16 },
    name: { color: t.ink, fontSize: 24, fontWeight: '800', marginTop: 6 },
    status: { color: t.dim, fontSize: 16, fontVariant: ['tabular-nums'] },
    ctx: { color: t.muted, fontSize: 12 },
    fill: { flex: 1, alignSelf: 'stretch' },
    scroll: { padding: 14, gap: 8 },
    hint: { color: t.muted, textAlign: 'center', marginTop: 14, paddingHorizontal: 24 },
    meWrap: { alignSelf: 'flex-end', maxWidth: '82%' },
    themWrap: { alignSelf: 'flex-start', maxWidth: '82%' },
    bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    me: { borderBottomRightRadius: 6 },
    them: { borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
    text: { fontSize: 15, lineHeight: 21 },
    themText: { color: t.ink },
    errorBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
    errorText: { color: t.ink, textAlign: 'center' },
    pill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    pillText: { color: t.accent, fontWeight: '800' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingBottom: 10, alignSelf: 'stretch' },
    pillInput: { flex: 1, minHeight: 46 },
    input: { color: t.ink, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, maxHeight: 110 },
    send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    dim: { opacity: 0.4 },
    endWrap: { marginTop: 4 },
    end: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    hangIcon: { transform: [{ rotate: '135deg' }] },
    close: { paddingHorizontal: 36, paddingVertical: 16 },
    closeText: { color: t.ink, fontWeight: '900', fontSize: 16 },
  });
