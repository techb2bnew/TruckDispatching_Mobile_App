import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getDriverMap, getLoadCached, listCalls, type ApiLoad, type Call, type Driver } from '../api';
import { TabScreen } from '../components/TabScreen';
import { Avatar, Empty, LoadChip, PressScale } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { callHref } from '../lib/callHref';
import { duration, hueOf, timeAgo } from '../lib/format';
import { router } from '../lib/router';
import { useThemed, type Palette } from '../theme';

const END_LABEL: Record<string, string> = {
  HANGUP: 'Ended', TIMEOUT: 'Timed out', DEAL_CLOSED: 'Deal closed', FINISHED: 'Finished', ERROR: 'Failed',
};

export default function Calls() {
  const [t, s] = useThemed(styles);
  const list = useAsync(() => listCalls({ limit: 50 }), []);
  const [drivers, setDrivers] = useState<Map<string, Driver>>(new Map());
  const [loads, setLoads] = useState<Record<string, ApiLoad>>({});
  const [q, setQ] = useState('');

  const { reload } = list;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => { getDriverMap().then(setDrivers).catch(() => {}); }, []);

  const calls = useMemo(() => list.data?.items ?? [], [list.data]);
  useEffect(() => {
    [...new Set(calls.map((c) => c.loadId).filter((x): x is string => !!x))].filter((id) => !loads[id]).forEach((id) => {
      getLoadCached(id).then((l) => setLoads((p) => ({ ...p, [id]: l }))).catch(() => {});
    });
  }, [calls, loads]);

  const nameOf = useCallback((c: Call) =>
    c.type === 'DRIVER' ? drivers.get(c.driverId ?? '')?.name ?? 'Driver' : (c.loadId && loads[c.loadId]?.company?.name) || 'Broker', [drivers, loads]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return calls
      .filter((c) => !query || `${nameOf(c)} ${c.loadId ? loads[c.loadId]?.referenceId ?? '' : ''}`.toLowerCase().includes(query))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }, [calls, q, nameOf, loads]);

  const render = ({ item }: { item: Call }) => {
    const name = nameOf(item);
    const active = item.status === 'ACTIVE';
    const failed = item.endReason === 'ERROR' || item.endReason === 'TIMEOUT';
    const hue = item.type === 'DRIVER' ? drivers.get(item.driverId ?? '')?.hue ?? hueOf(item.driverId ?? 'd') : hueOf(item.loadId ?? 'broker');
    return (
      <Pressable
        onPress={() => router.push(active ? callHref({ callId: item.id }) : callHref({ type: item.type, loadId: item.loadId, driverId: item.driverId, truckId: item.truckId }))}
        style={({ pressed }) => [s.row, pressed && { backgroundColor: t.press }]}
      >
        <Avatar name={name} h={hue} size={50} />
        <View style={s.body}>
          <View style={s.top}>
            <Text style={[s.name, failed && { color: t.rose }]} numberOfLines={1}>{name}</Text>
            <Text style={s.time}>{timeAgo(Date.parse(item.startedAt))}</Text>
            <Ionicons name="call-outline" size={20} color={t.accent} />
          </View>
          <View style={s.meta}>
            <Ionicons name="arrow-up-outline" size={14} color={active ? t.green : failed ? t.rose : t.muted} />
            <Text style={[s.metaText, active && { color: t.green }]}>
              {item.type === 'BROKER' ? 'Broker' : 'Driver'} · {active ? 'In progress (tap to resume)' : `${END_LABEL[item.endReason ?? ''] ?? 'Ended'}${item.durationSec ? ` · ${duration(item.durationSec)}` : ''}`}
            </Text>
            {item.loadId ? <LoadChip id={item.loadId} label={loads[item.loadId]?.referenceId ?? 'View load'} /> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const empty = list.loading && !list.data ? (
    <ActivityIndicator color={t.accent} style={{ marginTop: 80 }} />
  ) : list.error ? (
    <View style={{ alignItems: 'center' }}>
      <Empty icon="cloud-offline-outline" text={list.error.message} />
      <PressScale onPress={reload} style={s.retry}><Text style={s.retryText}>Try again</Text></PressScale>
    </View>
  ) : (
    <Empty icon="call-outline" text={q ? 'No matches' : 'No calls yet'} />
  );

  return (
    <TabScreen
      title="Calls"
      subtitle="Recent"
      data={rows}
      keyExtractor={(c) => c.id}
      renderItem={render}
      empty={empty}
      search={{ placeholder: 'Search calls', value: q, onChange: setQ }}
      action={{ icon: 'keypad-outline', onPress: () => router.push('/dialer') }}
      refreshing={list.loading && !!list.data}
      onRefresh={reload}
    />
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 12 },
    body: { flex: 1, gap: 3, paddingBottom: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.divider },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { color: t.ink, fontSize: 17, fontWeight: '700', flex: 1 },
    time: { color: t.muted, fontSize: 13 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    metaText: { color: t.muted, fontSize: 13 },
    retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    retryText: { color: t.accent, fontWeight: '800' },
  });
