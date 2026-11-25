import Ionicons from '@react-native-vector-icons/ionicons/static';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getLoad, getLoadBroker, type ApiLoad } from '../api';
import { Glass, Screen } from '../components/glass';
import { Avatar, Empty, GlassBtn, Header, PressScale } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { callHref } from '../lib/callHref';
import { equipmentLabel, pickupLabel, placeLabel, rateLabel } from '../lib/loadFormat';
import { router, useLocalSearchParams } from '../lib/router';
import { useThemed, type Palette } from '../theme';

export default function LoadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ApiLoadDetail id={id} />;
}

function rows(l: ApiLoad): [string, string][] {
  const out: [string, string | undefined | null][] = [
    ['Pickup', `${placeLabel(l.trip.origin)} · ${pickupLabel(l.trip.origin)}`],
    ['Delivery', `${placeLabel(l.trip.destination)} · ${pickupLabel(l.trip.destination)}`],
    ['Trip', `${l.trip.tripMiles} mi · ${l.trip.appointmentType}`],
    ['Rate (listed)', rateLabel(l)],
    ['Per mile', l.rate.ratePerMile != null ? `$${l.rate.ratePerMile.toFixed(2)}${l.rate.perMileEstimated ? ' (est.)' : ''}` : undefined],
    ['Market rate', l.marketRate?.available && l.marketRate.value != null ? `$${l.marketRate.value.toLocaleString('en-US')}` : undefined],
    ['Deadhead', l.derived?.deadheadMiles != null ? `${l.derived.deadheadMiles} mi` : undefined],
    ['Equipment', equipmentLabel(l)],
    ['Weight', l.equipment.weightLbs != null ? `${l.equipment.weightLbs.toLocaleString()} lbs` : undefined],
    ['Commodity', l.equipment.commodity],
    ['Status', l.meta?.status],
  ];
  return out.filter((r): r is [string, string] => !!r[1]);
}

function ApiLoadDetail({ id }: { id: string }) {
  const [t, s] = useThemed(styles);
  const load = useAsync(() => getLoad(id), [id]);
  const broker = useAsync(() => getLoadBroker(id), [id]);
  const l = load.data;

  if (!l) {
    return (
      <Screen>
        <Header title="Load" />
        {load.loading ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 80 }} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Empty icon="cloud-offline-outline" text={load.error?.message ?? 'Load not found'} />
            <PressScale onPress={load.reload} style={s.retry}><Text style={s.retryText}>Try again</Text></PressScale>
          </View>
        )}
      </Screen>
    );
  }

  const b = broker.data;
  const phone = b?.contact.phone ?? l.contact?.phone;
  const email = b?.contact.email ?? l.contact?.email;

  return (
    <Screen>
      <Header title={l.referenceId} subtitle={`${placeLabel(l.trip.origin)} → ${placeLabel(l.trip.destination)}`} />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: 40 }}>
        {l.warning ? (
          <Glass style={s.warn}>
            <Ionicons name="warning" size={18} color={t.amber} />
            <Text style={s.warnText}>{l.warning.message}</Text>
          </Glass>
        ) : null}

        <Animated.View entering={FadeInDown.duration(300)}>
          <Glass strong style={s.card}>
            {rows(l).map(([k, v]) => (
              <View key={k} style={s.row}>
                <Text style={s.k}>{k}</Text>
                <Text style={s.v}>{v}</Text>
              </View>
            ))}
          </Glass>
        </Animated.View>

        {l.comments ? (
          <Animated.View entering={FadeInDown.delay(80).duration(300)}>
            <Text style={s.section}>Comments</Text>
            <Glass style={[s.card, { marginTop: 8 }]}><Text style={s.comment}>{l.comments}</Text></Glass>
          </Animated.View>
        ) : null}

        <Text style={s.section}>Broker</Text>
        <Animated.View entering={FadeInDown.delay(140).duration(300)}>
          <Glass style={s.person}>
            <Avatar name={b?.contact.name ?? l.company?.name ?? '?'} h={205} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={s.pName}>{b?.contact.name ?? l.company?.name ?? 'Broker'}</Text>
              <Text style={s.pSub} numberOfLines={1}>
                {[b?.contact.title, b?.company.name ?? l.company?.name].filter(Boolean).join(' · ')}
              </Text>
              {email ? <Text style={s.pSub} numberOfLines={1}>{email}</Text> : null}
              {b?.company.rating != null ? <Text style={s.pSub}>★ {b.company.rating.toFixed(1)} · pays in {b.company.daysToPay} days</Text> : null}
            </View>
            {phone ? <GlassBtn icon="call" color={t.green} size={40} onPress={() => router.push(callHref({ type: 'BROKER', loadId: l.id }))} /> : null}
          </Glass>
        </Animated.View>
        <PressScale onPress={() => router.push(`/mail/compose?loadId=${encodeURIComponent(l.id)}`)} scale={0.98}>
          <Glass strong style={s.mailBtn}>
            <Ionicons name="mail" size={18} color={t.accent} />
            <Text style={s.mailBtnText}>Email this broker</Text>
          </Glass>
        </PressScale>
      </ScrollView>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    card: { padding: 16, gap: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    k: { color: t.muted },
    v: { color: t.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    section: { color: t.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginLeft: 4 },
    comment: { color: t.ink, lineHeight: 20 },
    warn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    warnText: { color: t.amber, flex: 1, fontSize: 13, fontWeight: '600' },
    mailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    mailBtnText: { color: t.accent, fontWeight: '900', fontSize: 15 },
    person: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
    pName: { color: t.ink, fontWeight: '800' },
    pSub: { color: t.muted, fontSize: 12 },
    retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: t.chipBorder, backgroundColor: t.chipBg },
    retryText: { color: t.accent, fontWeight: '800' },
  });
