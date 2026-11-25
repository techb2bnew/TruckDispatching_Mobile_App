import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  confirmBrokerDeal, getBrokerSession, getCompanyBroker, getLoad, mailMessages, sendBrokerMessage,
  type BrokerSession, type LoadBroker, type MailMessage,
} from '../api';
import { DayPill, SystemPill, Ticks, TypingBubble } from '../components/Bits';
import { Composer } from '../components/Composer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Glass, Screen } from '../components/glass';
import { ThreadHeader } from '../components/ThreadHeader';
import { Avatar, Empty, LoadChip, PressScale } from '../components/ui';
import { clock, hueOf, money, sameDay } from '../lib/format';
import { router, useLocalSearchParams } from '../lib/router';
import { useThemed, type Palette } from '../theme';

export default function MailThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ApiMailThread id={id} />;
}

function ApiMailThread({ id }: { id: string }) {
  const [t, s] = useThemed(styles);
  const [session, setSession] = useState<BrokerSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [broker, setBroker] = useState<LoadBroker | null>(null);
  const [loadRef, setLoadRef] = useState<string | undefined>();
  const [sending, setSending] = useState<MailMessage[]>([]); // optimistic, until the server answers
  const [confirming, setConfirming] = useState(false);
  const [askDeal, setAskDeal] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const ref = useRef<ScrollViewInstance>(null);
  const mountedAt = useRef(Date.now());

  const fetchSession = useCallback(async () => {
    try {
      setSession(await getBrokerSession(id));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // broker + load label, once the session is known
  const companyId = session?.companyId;
  const loadId = session?.loadId;
  useEffect(() => { if (companyId) getCompanyBroker(companyId).then(setBroker).catch(() => {}); }, [companyId]);
  useEffect(() => { if (loadId) getLoad(loadId).then((l) => setLoadRef(l.referenceId)).catch(() => {}); }, [loadId]);

  // broker reply is queued on the server: poll until it lands
  const waiting = !!session?.pendingReply;
  const secondsLeft = session?.pendingReply?.secondsLeft;
  useEffect(() => {
    if (!waiting) return;
    const h = setTimeout(fetchSession, Math.min(Math.max((secondsLeft ?? 3) * 1000 + 800, 2500), 15_000));
    return () => clearTimeout(h);
  }, [waiting, secondsLeft, session?.version, fetchSession]);

  const msgs = useMemo(() => (session ? mailMessages(session) : []), [session]);
  const all = useMemo(() => [...msgs, ...sending], [msgs, sending]);
  useEffect(() => { setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 60); }, [all.length, waiting]);

  const lastReplyTs = useMemo(() => Math.max(0, ...msgs.filter((m) => m.from === 'broker').map((m) => m.ts)), [msgs]);

  const send = async (text: string) => {
    if (!session) return;
    const tmp: MailMessage = { id: `tmp${Date.now()}`, from: 'student', body: text.trim(), ts: Date.now() };
    setSending((p) => [...p, tmp]);
    try {
      setSession(await sendBrokerMessage(session.id, tmp.body));
    } catch (e) {
      setNotice({ title: 'Could not send', message: (e as Error).message });
    } finally {
      setSending((p) => p.filter((m) => m.id !== tmp.id));
    }
  };

  const confirmDeal = () => setAskDeal(true);
  const doConfirmDeal = async () => {
    if (!session) return;
    setAskDeal(false);
    setConfirming(true);
    try {
      setSession(await confirmBrokerDeal(session.id));
    } catch (e) {
      setNotice({ title: 'Could not confirm', message: (e as Error).message });
    }
    setConfirming(false);
  };

  if (!session) {
    return (
      <Screen>
        <View style={s.fill}>
          {error ? (
            <View style={s.center}>
              <Empty icon="cloud-offline-outline" text={error} />
              <PressScale onPress={fetchSession} style={s.retry}><Text style={s.retryText}>Try again</Text></PressScale>
              <PressScale onPress={() => router.back()} style={s.retry}><Text style={s.retryText}>Go back</Text></PressScale>
            </View>
          ) : (
            <ActivityIndicator color={t.accent} style={{ marginTop: 120 }} />
          )}
        </View>
      </Screen>
    );
  }

  const name = broker?.contact.name ?? broker?.company.name ?? 'Broker';
  const contact = { name, title: broker?.company.name ?? '', hue: hueOf(session.companyId) };

  return (
    <Screen>
      <KeyboardAvoidingView style={s.fill} behavior="padding">
        <ThreadHeader contact={contact} onPressTitle={() => router.push(`/load/${session.loadId}`)} />
        <ScrollView ref={ref} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.top}>
            <Text style={s.subject}>{session.subject}</Text>
            <LoadChip id={session.loadId} label={loadRef ?? 'View load'} />
          </View>

          {all.length === 0 && !waiting && <SystemPill icon="mail" text="No messages yet" ts={Date.now()} />}

          {all.map((m, i) => {
            const showDay = i === 0 || !sameDay(all[i - 1].ts, m.ts);
            const fresh = m.ts > mountedAt.current - 1500;
            return (
              <View key={m.id} style={s.gap8}>
                {showDay && <DayPill ts={m.ts} />}
                <Animated.View entering={fresh ? FadeInDown.duration(260).springify().damping(16) : undefined}>
                  <Glass strong={m.from === 'student'} style={[s.mail, m.from === 'student' && { borderColor: t.chipBorder }]}>
                    <View style={s.head}>
                      {m.from === 'broker' ? (
                        <Avatar name={name} h={contact.hue} size={32} />
                      ) : (
                        <View style={s.you}><Text style={s.youText}>ME</Text></View>
                      )}
                      <Text style={s.from}>{m.from === 'broker' ? name : 'You'}</Text>
                      <Text style={s.time}>{clock(m.ts)}</Text>
                    </View>
                    <Text style={s.body}>{m.body}</Text>
                    {m.from === 'student' && (
                      <View style={s.tick}><Ticks done={lastReplyTs > m.ts} color={t.muted} doneColor={t.accent} /></View>
                    )}
                  </Glass>
                </Animated.View>
              </View>
            );
          })}

          {waiting && <TypingBubble />}

          {session.agreementConfirmed ? (
            <SystemPill icon="checkmark-circle" text={`Deal confirmed${session.agreedPrice ? ` · ${money(session.agreedPrice)}` : ''}`} ts={Date.now()} />
          ) : session.canConfirm ? (
            <PressScale onPress={confirming ? undefined : confirmDeal}>
              <Glass strong style={s.deal}>
                {confirming ? <ActivityIndicator color={t.green} /> : <Text style={s.dealText}>Confirm deal{session.agreedPrice ? ` · ${money(session.agreedPrice)}` : ''}</Text>}
              </Glass>
            </PressScale>
          ) : null}
        </ScrollView>
        <Composer placeholder="Reply by email" multiline onSend={send} />
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={askDeal}
        icon="checkmark-circle-outline"
        title="Confirm deal?"
        message={`Confirm the agreement${session.agreedPrice ? ` at ${money(session.agreedPrice)}` : ''}. The deal will show up in your Driver Roster.`}
        confirmLabel="Confirm deal"
        onCancel={() => setAskDeal(false)}
        onConfirm={doConfirmDeal}
      />
      <ConfirmDialog
        visible={!!notice}
        icon="alert-circle-outline"
        destructive
        hideCancel
        title={notice?.title ?? ''}
        message={notice?.message}
        confirmLabel="OK"
        onCancel={() => setNotice(null)}
        onConfirm={() => setNotice(null)}
      />
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    fill: { flex: 1 },
    center: { alignItems: 'center', marginTop: 100 },
    scroll: { padding: 14, gap: 10 },
    gap8: { gap: 8 },
    top: { gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
    subject: { color: t.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    mail: { padding: 14, gap: 10 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    from: { color: t.ink, fontWeight: '800', flex: 1 },
    time: { color: t.muted, fontSize: 12 },
    body: { color: t.ink, fontSize: 15, lineHeight: 22 },
    tick: { alignSelf: 'flex-end', marginTop: -4 },
    you: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
    youText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    deal: { paddingVertical: 14, alignItems: 'center', borderColor: t.green },
    dealText: { color: t.green, fontWeight: '900', fontSize: 15 },
    retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    retryText: { color: t.accent, fontWeight: '800' },
  });
