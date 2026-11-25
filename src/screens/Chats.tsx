import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getDriverMap, getLoadCached, listCalls, type ApiLoad, type Driver } from '../api';
import { threadKey, useChatThreads } from '../chat/chatStore';
import { TabScreen } from '../components/TabScreen';
import { Avatar, Empty, LoadChip, PressScale } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { hueOf, timeAgo } from '../lib/format';
import { placeLabel } from '../lib/loadFormat';
import { router } from '../lib/router';
import { useThemed, type Palette } from '../theme';

interface Row {
  key: string;
  loadId: string;
  driverId: string;
  truckId?: string;
  ts: number;
  snippet: string;
}

/** Driver chats: threads started in this app + driver calls the server already knows. */
export default function Chats() {
  const [t, s] = useThemed(styles);
  const local = useChatThreads();
  const calls = useAsync(() => listCalls({ type: 'DRIVER', limit: 50 }), []);
  const [drivers, setDrivers] = useState<Map<string, Driver>>(new Map());
  const [loads, setLoads] = useState<Record<string, ApiLoad>>({});
  const [q, setQ] = useState('');

  const { reload } = calls;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => { getDriverMap().then(setDrivers).catch(() => {}); }, []);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    (calls.data?.items ?? []).forEach((c) => {
      if (!c.loadId || !c.driverId) return;
      const key = threadKey(c.loadId, c.driverId, c.truckId);
      map.set(key, { key, loadId: c.loadId, driverId: c.driverId, truckId: c.truckId ?? undefined, ts: Date.parse(c.startedAt) || 0, snippet: c.status === 'ACTIVE' ? 'Conversation in progress' : 'Tap to open' });
    });
    local.forEach((th) => {
      const last = th.messages.at(-1);
      map.set(th.key, { key: th.key, loadId: th.loadId, driverId: th.driverId, truckId: th.truckId, ts: th.updatedAt, snippet: last ? `${last.from === 'me' ? 'You: ' : ''}${last.body}` : 'Say hello to your driver' });
    });
    return [...map.values()];
  }, [calls.data, local]);

  useEffect(() => {
    [...new Set(rows.map((r) => r.loadId))].filter((id) => !loads[id]).forEach((id) => {
      getLoadCached(id).then((l) => setLoads((p) => ({ ...p, [id]: l }))).catch(() => {});
    });
  }, [rows, loads]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((r) => !query || `${drivers.get(r.driverId)?.name ?? ''} ${loads[r.loadId]?.referenceId ?? ''} ${r.snippet}`.toLowerCase().includes(query))
      .sort((a, b) => b.ts - a.ts);
  }, [rows, q, drivers, loads]);

  const open = (r: Row) =>
    router.push(`/chat/open?loadId=${encodeURIComponent(r.loadId)}&driverId=${encodeURIComponent(r.driverId)}${r.truckId ? `&truckId=${encodeURIComponent(r.truckId)}` : ''}`);

  const render = ({ item: r }: { item: Row }) => {
    const d = drivers.get(r.driverId);
    const l = loads[r.loadId];
    const name = d?.name ?? 'Driver';
    return (
      <Pressable onPress={() => open(r)} style={({ pressed }) => [s.row, pressed && { backgroundColor: t.press }]}>
        <View style={s.dotCol} />
        <Avatar name={name} h={d?.hue ?? hueOf(r.driverId)} size={52} />
        <View style={s.body}>
          <View style={s.top}>
            <Text style={s.name} numberOfLines={1}>{name}</Text>
            {r.ts ? <Text style={s.time}>{timeAgo(r.ts)}</Text> : null}
            <Ionicons name="chevron-forward" size={14} color={t.muted} />
          </View>
          <Text style={s.snippet} numberOfLines={2}>{r.snippet}</Text>
          <View style={s.meta}>
            <LoadChip id={r.loadId} label={l?.referenceId ?? 'View load'} />
            <Text style={s.company} numberOfLines={1}>
              {l ? `${placeLabel(l.trip.origin)} → ${placeLabel(l.trip.destination)}` : r.truckId ? `Truck ${r.truckId}` : ''}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const empty = calls.loading && !calls.data ? (
    <ActivityIndicator color={t.accent} style={{ marginTop: 80 }} />
  ) : calls.error && !rows.length ? (
    <View style={{ alignItems: 'center' }}>
      <Empty icon="cloud-offline-outline" text={calls.error.message} />
      <PressScale onPress={reload} style={s.retry}><Text style={s.retryText}>Try again</Text></PressScale>
    </View>
  ) : (
    <Empty icon="chatbubbles-outline" text={q ? 'No matches' : 'No chats yet. Tap ✏️ to message a driver.'} />
  );

  return (
    <TabScreen
      title="Chat"
      subtitle="Drivers"
      data={shown}
      keyExtractor={(r) => r.key}
      renderItem={render}
      empty={empty}
      search={{ placeholder: 'Search chats', value: q, onChange: setQ }}
      action={{ icon: 'create-outline', onPress: () => router.push('/chat/new') }}
      refreshing={calls.loading && !!calls.data}
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
    snippet: { color: t.muted, fontSize: 14, lineHeight: 19 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
    company: { color: t.muted, fontSize: 11, flexShrink: 1 },
    retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    retryText: { color: t.accent, fontWeight: '800' },
  });
