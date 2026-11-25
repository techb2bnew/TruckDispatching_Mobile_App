import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getCall, getDriverMap, getLoadCached, listCalls, type ApiLoad, type Driver } from '../api';
import { ensureThread, seedThread, sendChat, threadKey, useChatThread } from '../chat/chatStore';
import { DayPill, SystemPill, Ticks, TypingBubble } from '../components/Bits';
import { Composer } from '../components/Composer';
import { LinearGradient } from '../components/Gradient';
import { Doodles, Glass, Screen } from '../components/glass';
import { Scorecard } from '../components/Scorecard';
import { ThreadHeader } from '../components/ThreadHeader';
import { LoadChip } from '../components/ui';
import { clock, hueOf, sameDay } from '../lib/format';
import { equipmentLabel, placeLabel, rateLabel } from '../lib/loadFormat';
import { router, useLocalSearchParams } from '../lib/router';
import { useThemed, type Palette } from '../theme';

export default function ChatThread() {
  const { loadId, driverId, truckId } = useLocalSearchParams<{ loadId: string; driverId: string; truckId?: string }>();
  const [t, s] = useThemed(styles);
  const key = threadKey(loadId, driverId, truckId);
  const thread = useChatThread(key);
  const [driver, setDriver] = useState<Driver | undefined>();
  const [load, setLoad] = useState<ApiLoad | undefined>();
  const ref = useRef<ScrollViewInstance>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => { ensureThread(loadId, driverId, truckId); }, [loadId, driverId, truckId]);
  useEffect(() => { getDriverMap().then((m) => setDriver(m.get(driverId))).catch(() => {}); }, [driverId]);
  useEffect(() => { getLoadCached(loadId).then(setLoad).catch(() => {}); }, [loadId]);

  // after an app restart the thread is empty: rebuild it from the server's call turns, if there are any
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { items } = await listCalls({ type: 'DRIVER', loadId });
        const c = items.find((x) => x.driverId === driverId && (x.truckId ?? '') === (truckId ?? ''));
        if (!c) return;
        const detail = await getCall(c.id);
        if (alive && detail.turns) seedThread(key, detail.turns);
      } catch { /* history is a bonus, the chat still works without it */ }
    })();
    return () => { alive = false; };
  }, [key, loadId, driverId, truckId]);

  const msgs = useMemo(() => thread?.messages ?? [], [thread?.messages]);
  const typing = !!thread?.typing;
  useEffect(() => { setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 60); }, [msgs.length, typing]);

  // single tick = sent, double tick = the driver replied after it
  const lastReplyTs = useMemo(() => Math.max(0, ...msgs.filter((m) => m.from === 'driver').map((m) => m.ts)), [msgs]);

  const name = driver?.name ?? 'Driver';
  const contact = { name, title: truckId ? `Truck ${truckId}` : '', hue: driver?.hue ?? hueOf(driverId) };
  const send = (text: string) => { sendChat(key, text).catch((e: Error) => Alert.alert('Could not send', e.message)); };
  const callDriver = () =>
    router.push(`/call/new?type=DRIVER&loadId=${encodeURIComponent(loadId)}&driverId=${encodeURIComponent(driverId)}${truckId ? `&truckId=${encodeURIComponent(truckId)}` : ''}`);

  return (
    <Screen>
      <Doodles />
      <KeyboardAvoidingView style={s.fill} behavior="padding">
        <ThreadHeader contact={contact} onCall={callDriver} onPressTitle={() => router.push(`/load/${loadId}`)} />
        {load && (
          <Pressable onPress={() => router.push(`/load/${load.id}`)} style={s.ctxWrap}>
            <Glass radius={16} lite style={s.ctx}>
              <LoadChip id={load.id} label={load.referenceId} />
              <Text style={s.ctxText} numberOfLines={1}>
                {placeLabel(load.trip.origin)} → {placeLabel(load.trip.destination)} · {rateLabel(load)} · {equipmentLabel(load)}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={t.muted} />
            </Glass>
          </Pressable>
        )}
        <ScrollView ref={ref} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {msgs.length === 0 && !typing && <SystemPill icon="chatbubble" text={`Brief ${name} about this load`} ts={Date.now()} />}
          {msgs.map((m, i) => {
            const showDay = i === 0 || !sameDay(msgs[i - 1].ts, m.ts);
            const fresh = m.ts > mountedAt.current - 1500;
            const enter = fresh ? FadeInDown.duration(240).springify().damping(16) : undefined;
            return (
              <View key={m.id} style={s.gap6}>
                {showDay && <DayPill ts={m.ts} />}
                {m.from === 'system' ? (
                  <SystemPill icon="information-circle" text={m.body} ts={m.ts} />
                ) : m.from === 'me' ? (
                  <Animated.View entering={enter} style={s.meWrap}>
                    <LinearGradient colors={t.meGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.bubble, s.me]}>
                      <Text style={[s.text, { color: t.onMe }]}>{m.body}</Text>
                      <View style={s.foot}>
                        <Text style={[s.time, s.timeMe]}>{clock(m.ts)}</Text>
                        <Ticks done={lastReplyTs > m.ts} color="rgba(255,255,255,0.75)" doneColor="#ffffff" />
                      </View>
                    </LinearGradient>
                  </Animated.View>
                ) : (
                  <Animated.View entering={enter} style={s.themWrap}>
                    <Glass radius={20} strong style={s.them}>
                      <View style={s.bubbleIn}>
                        <Text style={[s.text, { color: t.ink }]}>{m.body}</Text>
                        <View style={s.foot}><Text style={[s.time, { color: t.muted }]}>{clock(m.ts)}</Text></View>
                      </View>
                    </Glass>
                  </Animated.View>
                )}
              </View>
            );
          })}
          {typing && <TypingBubble />}
          {thread?.outcome === 'ASSIGNED' && <SystemPill icon="checkmark-circle" text={`${name} accepted the load`} ts={Date.now()} />}
          {thread?.over && <SystemPill icon="flag" text="Conversation ended" ts={Date.now()} />}
          {thread?.scorecard ? <Scorecard data={thread.scorecard} /> : null}
        </ScrollView>
        {!thread?.over && <Composer placeholder="Message driver" onSend={send} />}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    fill: { flex: 1 },
    ctxWrap: { marginHorizontal: 14, marginBottom: 4 },
    ctx: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
    ctxText: { color: t.dim, fontSize: 12, flex: 1 },
    scroll: { padding: 14, gap: 6 },
    gap6: { gap: 6 },
    meWrap: { alignSelf: 'flex-end', maxWidth: '82%' },
    themWrap: { alignSelf: 'flex-start', maxWidth: '82%' },
    bubble: { borderRadius: 22, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    me: { borderBottomRightRadius: 6 },
    them: { borderBottomLeftRadius: 6 },
    bubbleIn: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 6 },
    text: { fontSize: 16, lineHeight: 22 },
    foot: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 3, marginTop: 2 },
    time: { fontSize: 11 },
    timeMe: { color: 'rgba(255,255,255,0.75)' },
  });
