import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getLoads, type ApiLoad } from '../api';
import { Glass } from '../components/glass';
import { TabScreen } from '../components/TabScreen';
import { Empty, PressScale } from '../components/ui';
import { equipmentLabel, pickupLabel, placeLabel, rateLabel } from '../lib/loadFormat';
import { router } from '../lib/router';
import { useThemed, type Palette } from '../theme';

const PAGE_SIZE = 20;

export default function Loads() {
  const [t, s] = useThemed(styles);
  const [items, setItems] = useState<ApiLoad[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<'loading' | 'refreshing' | 'more' | 'idle'>('loading');
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0); // ignore responses of older requests

  const fetchPage = useCallback(async (p: number, text: string, mode: 'loading' | 'refreshing' | 'more') => {
    const id = ++seq.current;
    setPhase(mode);
    setError(null);
    try {
      const r = await getLoads({ page: p, limit: PAGE_SIZE, text: text.trim() || undefined });
      if (id !== seq.current) return;
      setItems((prev) => (p === 1 ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setPage(p);
    } catch (e) {
      if (id !== seq.current) return;
      setError((e as Error).message);
    } finally {
      if (id === seq.current) setPhase('idle');
    }
  }, []);

  // first load + search (debounced)
  useEffect(() => {
    const h = setTimeout(() => fetchPage(1, query, 'loading'), query ? 400 : 0);
    return () => clearTimeout(h);
  }, [query, fetchPage]);

  const hasMore = items.length < total;
  const loadMore = () => { if (phase === 'idle' && hasMore && !error) fetchPage(page + 1, query, 'more'); };

  const render = ({ item: l }: { item: ApiLoad }) => (
    <PressScale onPress={() => router.push(`/load/${l.id}`)} style={{ marginHorizontal: 14, marginBottom: 10 }} scale={0.98}>
      <Glass style={s.card}>
        <View style={s.top}>
          <Text style={s.id}>{l.referenceId}</Text>
          <Text style={s.company} numberOfLines={1}>{l.company?.name ?? ''}</Text>
        </View>
        <View style={s.route}>
          <Text style={s.city}>{placeLabel(l.trip.origin)}</Text>
          <Ionicons name="arrow-forward" size={14} color={t.muted} />
          <Text style={s.city}>{placeLabel(l.trip.destination)}</Text>
        </View>
        <Text style={s.meta}>Pickup {pickupLabel(l.trip.origin)}</Text>
        <View style={s.bottom}>
          <Text style={s.meta}>{l.trip.tripMiles} mi · {equipmentLabel(l)}</Text>
          <Text style={[s.rate, l.rate.total == null && { color: t.amber, fontSize: 14 }]}>{rateLabel(l)}</Text>
        </View>
      </Glass>
    </PressScale>
  );

  const empty =
    phase === 'loading' ? (
      <ActivityIndicator color={t.accent} style={{ marginTop: 80 }} />
    ) : error ? (
      <View style={{ alignItems: 'center' }}>
        <Empty icon="cloud-offline-outline" text={error} />
        <PressScale onPress={() => fetchPage(1, query, 'loading')} style={s.retry}>
          <Text style={s.retryText}>Try again</Text>
        </PressScale>
      </View>
    ) : (
      <Empty icon="cube-outline" text={query ? 'No loads match your search' : 'No loads available'} />
    );

  return (
    <TabScreen
      title="Loads"
      subtitle={total ? `${total} loads on the board` : 'Load board'}
      data={items}
      keyExtractor={(l) => l.id}
      renderItem={render}
      empty={empty}
      search={{ placeholder: 'Search loads', value: query, onChange: setQuery }}
      refreshing={phase === 'refreshing'}
      onRefresh={() => fetchPage(1, query, 'refreshing')}
      onEndReached={loadMore}
      loadingMore={phase === 'more'}
    />
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    card: { padding: 16, gap: 8 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    id: { color: t.accent, fontWeight: '900', fontSize: 15 },
    company: { color: t.dim, fontSize: 12, fontWeight: '700', flexShrink: 1 },
    route: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    city: { color: t.ink, fontSize: 16, fontWeight: '700' },
    bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    meta: { color: t.muted, fontSize: 12 },
    rate: { color: t.green, fontWeight: '900', fontSize: 17 },
    retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    retryText: { color: t.accent, fontWeight: '800' },
  });
