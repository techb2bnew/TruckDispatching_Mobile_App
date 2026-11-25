import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getCompanyBroker, lastActivity, listBrokerSessions, mailMessages, type LoadBroker } from '../api';
import { TabScreen } from '../components/TabScreen';
import { Avatar, Empty, LoadChip, PressScale } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { hueOf, timeAgo } from '../lib/format';
import { router } from '../lib/router';
import { useThemed, type Palette } from '../theme';

/** Inbox of the student's broker email threads (GET /api/broker/sessions). */
export default function Mails() {
  const [t, s] = useThemed(styles);
  const list = useAsync(listBrokerSessions, []);
  const [brokers, setBrokers] = useState<Record<string, LoadBroker>>({});
  const [q, setQ] = useState('');

  // coming back from a thread / compose: show new mails
  const { reload } = list;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // broker name + company for each thread (cached per company in the api layer)
  const sessions = useMemo(() => list.data?.items ?? [], [list.data]);
  useEffect(() => {
    const ids = [...new Set(sessions.map((x) => x.companyId))].filter((id) => !brokers[id]);
    ids.forEach((id) => {
      getCompanyBroker(id).then((b) => setBrokers((p) => ({ ...p, [id]: b }))).catch(() => {});
    });
  }, [sessions, brokers]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return sessions
      .map((x) => {
        const msgs = mailMessages(x);
        const last = msgs.at(-1);
        const b = brokers[x.companyId];
        return { session: x, last, ts: lastActivity(x), name: b?.contact.name ?? b?.company.name ?? 'Broker', company: b?.company.name ?? '' };
      })
      .filter((r) => !query || `${r.name} ${r.company} ${r.session.subject} ${r.last?.body ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => b.ts - a.ts);
  }, [sessions, brokers, q]);

  const render = ({ item: r }: { item: (typeof rows)[number] }) => (
    <Pressable onPress={() => router.push(`/mail/${r.session.id}`)} style={({ pressed }) => [s.row, pressed && { backgroundColor: t.press }]}>
      <View style={s.dotCol} />
      <Avatar name={r.name} h={hueOf(r.session.companyId)} size={52} />
      <View style={s.body}>
        <View style={s.top}>
          <Text style={s.name} numberOfLines={1}>{r.name}</Text>
          {r.ts ? <Text style={s.time}>{timeAgo(r.ts)}</Text> : null}
          <Ionicons name="chevron-forward" size={14} color={t.muted} />
        </View>
        <Text style={s.subject} numberOfLines={1}>{r.session.subject}</Text>
        <Text style={s.snippet} numberOfLines={2}>
          {r.last ? `${r.last.from === 'student' ? 'You: ' : ''}${r.last.body}` : r.session.pendingReply ? 'Waiting for the broker to reply…' : r.session.summary ?? 'No messages yet'}
        </Text>
        <View style={s.meta}>
          <LoadChip id={r.session.loadId} label="View load" />
          {r.session.agreementConfirmed ? <Text style={[s.company, { color: t.green }]}>Deal confirmed</Text> : <Text style={s.company} numberOfLines={1}>{r.company}</Text>}
        </View>
      </View>
    </Pressable>
  );

  const empty = list.loading && !list.data ? (
    <ActivityIndicator color={t.accent} style={{ marginTop: 80 }} />
  ) : list.error ? (
    <View style={{ alignItems: 'center' }}>
      <Empty icon="cloud-offline-outline" text={list.error.message} />
      <PressScale onPress={reload} style={s.retry}><Text style={s.retryText}>Try again</Text></PressScale>
    </View>
  ) : (
    <Empty icon="mail-outline" text={q ? 'No matches' : 'No emails yet. Tap ✏️ to write to a broker.'} />
  );

  return (
    <TabScreen
      title="Mails"
      subtitle="Brokers"
      data={rows}
      keyExtractor={(r) => r.session.id}
      renderItem={render}
      empty={empty}
      search={{ placeholder: 'Search mails', value: q, onChange: setQ }}
      action={{ icon: 'create-outline', onPress: () => router.push('/mail/compose') }}
      refreshing={list.loading && !!list.data}
      onRefresh={reload}
    />
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingRight: 16, paddingVertical: 12 },
    dotCol: { width: 22 },
    body: { flex: 1, marginLeft: 12, gap: 3, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.divider },
    top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { color: t.ink, fontSize: 17, fontWeight: '600', flex: 1 },
    time: { color: t.muted, fontSize: 13 },
    subject: { color: t.ink, fontSize: 14, fontWeight: '600' },
    snippet: { color: t.muted, fontSize: 14, lineHeight: 19 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
    company: { color: t.muted, fontSize: 11, flexShrink: 1 },
    retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    retryText: { color: t.accent, fontWeight: '800' },
  });
