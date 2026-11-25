import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  getJourney,
  parseJourney,
  startJourneyDay,
  type JourneyDayView,
  type JourneyView,
} from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LinearGradient } from '../components/Gradient';
import { Glass } from '../components/glass';
import { TabScreen } from '../components/TabScreen';
import { Empty, PressScale } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { radius, useThemed, type Palette } from '../theme';

const PLAYABLE = ['CURRENT', 'AVAILABLE', 'COMPLETED'];

export default function Journey() {
  const [t, s] = useThemed(styles);
  const map = useAsync(async () => parseJourney(await getJourney()), []);
  const [fresh, setFresh] = useState<JourneyView | null>(null); // map returned by "start day"
  const [open, setOpen] = useState<number | null>(null);
  const [ask, setAsk] = useState<JourneyDayView | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
    error?: boolean;
  } | null>(null);

  const { reload } = map;
  useFocusEffect(
    useCallback(() => {
      setFresh(null);
      reload();
    }, [reload]),
  );

  const view = fresh ?? map.data;
  const current = useMemo(
    () =>
      view?.days.find(d => d.day === (view.active?.day ?? view.currentDay)) ??
      view?.days.find(d => d.status === 'CURRENT'),
    [view],
  );

  const doStart = async () => {
    const day = ask;
    if (!day) return;
    setAsk(null);
    setBusy(true);
    try {
      setFresh(parseJourney(await startJourneyDay(day.day)));
      setNotice({
        title: `Day ${day.day} started`,
        message: 'Use Mails, Chat, Calls and Loads to finish the objectives.',
      });
    } catch (e) {
      setNotice({
        title: 'Could not start the day',
        message: (e as Error).message,
        error: true,
      });
    }
    setBusy(false);
  };

  const statusIcon = (d: JourneyDayView) =>
    d.status === 'COMPLETED'
      ? ({ name: 'checkmark-circle', color: t.green } as const)
      : d.status === 'CURRENT'
      ? ({ name: 'play-circle', color: t.accent } as const)
      : d.status === 'AVAILABLE'
      ? ({ name: 'play-circle-outline', color: t.accent } as const)
      : ({ name: 'lock-closed', color: t.muted } as const);

  const render = ({ item: d, index }: { item: DayItem; index: number }) => {
    const zoneStart = index === 0 || view?.days[index - 1]?.zone !== d.zone;
    const icon = statusIcon(d);
    const isOpen = open === d.day;
    const locked = !PLAYABLE.includes(d.status);
    return (
      <View>
        {zoneStart && d.zone ? <Text style={s.zone}>{d.zone}</Text> : null}
        <PressScale
          onPress={() => setOpen(isOpen ? null : d.day)}
          style={s.rowWrap}
          scale={0.985}
        >
          <Glass
            radius={20}
            strong={d.status === 'CURRENT'}
            style={[
              s.card,
              d.status === 'CURRENT' && { borderColor: t.accent },
              locked && s.locked,
            ]}
          >
            <View style={s.top}>
              <Ionicons name={icon.name} size={28} color={icon.color} />
              <View style={s.flex}>
                <Text style={s.title} numberOfLines={isOpen ? 3 : 1}>
                  Day {d.day} · {d.title}
                </Text>
                <Text style={s.sub} numberOfLines={1}>
                  {[
                    d.minutes ? `${d.minutes} min` : null,
                    d.rewardXp ? `+${d.rewardXp} XP` : null,
                    d.milestone ? 'Milestone' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || (locked ? d.lockedReason ?? 'Locked' : '')}
                </Text>
              </View>
              {d.stars > 0 ? (
                <View style={s.stars}>
                  <Ionicons name="star" size={14} color={t.amber} />
                  <Text style={s.starText}>{d.stars}</Text>
                </View>
              ) : null}
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={t.muted}
              />
            </View>

            {isOpen && (
              <View style={s.body}>
                {d.description ? (
                  <Text style={s.desc}>{d.description}</Text>
                ) : null}
                {locked && d.lockedReason ? (
                  <Text style={s.lockedText}>{d.lockedReason}</Text>
                ) : null}
                {d.objectives.map(o => (
                  <View key={o.label} style={s.obj}>
                    <Ionicons
                      name={o.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={o.done ? t.green : t.muted}
                    />
                    <Text style={[s.objText, o.done && s.objDone]}>
                      {o.label}
                    </Text>
                  </View>
                ))}
                {!locked && (
                  <PressScale onPress={() => setAsk(d)} style={busy && s.dim}>
                    <LinearGradient
                      colors={t.accentGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.btn}
                    >
                      {busy ? (
                        <ActivityIndicator color={t.onAccent} />
                      ) : (
                        <Text style={s.btnText}>
                          {d.status === 'COMPLETED'
                            ? 'Replay day'
                            : view?.active?.day === d.day
                            ? 'Resume day'
                            : 'Start day'}
                        </Text>
                      )}
                    </LinearGradient>
                  </PressScale>
                )}
              </View>
            )}
          </Glass>
        </PressScale>
      </View>
    );
  };

  const header = view ? (
    <View style={s.head}>
      <Glass radius={22} strong style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.heroK}>
            {view.allComplete
              ? 'All days complete'
              : current
              ? `Today · Day ${current.day}`
              : 'Training journey'}
          </Text>
          <Text style={s.heroCount}>
            {view.completedCount}/{view.totalDays} done
          </Text>
        </View>
        {current ? <Text style={s.heroTitle}>{current.title}</Text> : null}
        <View style={s.track}>
          <LinearGradient
            colors={[t.accentGrad[0], t.accentGrad[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              s.fillBar,
              {
                width: `${
                  view.totalDays
                    ? Math.max(3, (view.completedCount / view.totalDays) * 100)
                    : 3
                }%`,
              },
            ]}
          />
        </View>
        {(view.active?.objectives.length
          ? view.active.objectives
          : current?.objectives ?? []
        ).map(o => (
          <View key={o.label} style={s.obj}>
            <Ionicons
              name={o.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={o.done ? t.green : t.muted}
            />
            <Text style={[s.objText, o.done && s.objDone]}>{o.label}</Text>
          </View>
        ))}
        {view.demoMode ? (
          <Text style={s.note}>
            Demo mode: today counts as Day 15 until the course start date is
            set.
          </Text>
        ) : null}
        {!view.simulatorOpen ? (
          <Text style={s.note}>
            The simulator is closed
            {view.simulatorOpensOn
              ? `, it opens on ${view.simulatorOpensOn}`
              : ''}
            .
          </Text>
        ) : null}
      </Glass>
    </View>
  ) : undefined;

  const empty =
    map.loading && !map.data ? (
      <ActivityIndicator color={t.accent} style={s.spinner} />
    ) : map.error ? (
      <View style={s.center}>
        <Empty icon="cloud-offline-outline" text={map.error.message} />
        <PressScale onPress={reload} style={s.retry}>
          <Text style={s.retryText}>Try again</Text>
        </PressScale>
      </View>
    ) : (
      <Empty icon="map-outline" text="No journey days yet" />
    );

  return (
    <>
      <TabScreen
        title="Journey"
        subtitle="Your training days"
        data={view?.days ?? []}
        keyExtractor={(d: DayItem) => String(d.day)}
        renderItem={render}
        empty={empty}
        headerExtra={header}
        refreshing={map.loading && !!map.data}
        onRefresh={() => {
          setFresh(null);
          reload();
        }}
      />
      <ConfirmDialog
        visible={!!ask}
        icon="play-circle-outline"
        title={
          ask
            ? `${ask.status === 'COMPLETED' ? 'Replay' : 'Start'} Day ${
                ask.day
              }?`
            : ''
        }
        message={
          ask?.status === 'COMPLETED'
            ? 'XP is never given twice, stars can only improve.'
            : ask?.title
        }
        confirmLabel={ask?.status === 'COMPLETED' ? 'Replay' : 'Start'}
        onCancel={() => setAsk(null)}
        onConfirm={doStart}
      />
      <ConfirmDialog
        visible={!!notice}
        icon={
          notice?.error ? 'alert-circle-outline' : 'checkmark-circle-outline'
        }
        destructive={!!notice?.error}
        hideCancel
        title={notice?.title ?? ''}
        message={notice?.message}
        confirmLabel="OK"
        onCancel={() => setNotice(null)}
        onConfirm={() => setNotice(null)}
      />
    </>
  );
}

type DayItem = JourneyDayView;

const styles = (t: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    spinner: { marginTop: 80 },
    center: { alignItems: 'center' },
    head: { marginTop: 10 },
    hero: { padding: 16, gap: 10 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
    heroK: {
      color: t.accent,
      fontWeight: '900',
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroCount: { color: t.dim, fontWeight: '700', fontSize: 13 },
    heroTitle: { color: t.ink, fontSize: 20, fontWeight: '800' },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: t.glassFill,
      overflow: 'hidden',
    },
    fillBar: { height: 8, borderRadius: 4 },
    obj: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    objText: { color: t.ink, fontSize: 14, flex: 1 },
    objDone: { color: t.muted, textDecorationLine: 'line-through' },
    note: { color: t.muted, fontSize: 12 },
    zone: {
      color: t.dim,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginLeft: 20,
      marginTop: 14,
      marginBottom: 6,
    },
    rowWrap: { marginHorizontal: 14, marginBottom: 10 },
    card: { padding: 14, gap: 10 },
    locked: { opacity: 0.6 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { color: t.ink, fontWeight: '800', fontSize: 16 },
    sub: { color: t.muted, fontSize: 12, marginTop: 2 },
    stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    starText: { color: t.amber, fontWeight: '800', fontSize: 13 },
    body: { gap: 10, paddingTop: 4 },
    desc: { color: t.dim, fontSize: 14, lineHeight: 20 },
    lockedText: { color: t.amber, fontSize: 13 },
    btn: {
      height: 46,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    btnText: { color: t.onAccent, fontWeight: '900', fontSize: 15 },
    dim: { opacity: 0.5 },
    retry: {
      marginTop: 14,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.chipBorder,
      backgroundColor: t.chipBg,
    },
    retryText: { color: t.accent, fontWeight: '800' },
  });
