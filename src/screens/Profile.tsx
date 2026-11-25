import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { changePassword, getProfile, parseProfile, updateMe } from '../api';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LinearGradient } from '../components/Gradient';
import { Glass, Screen } from '../components/glass';
import { Avatar, Header, PressScale, ThemeToggle } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { hueOf } from '../lib/format';
import { radius, useThemed, type Palette } from '../theme';

export default function Profile() {
  const [t, s] = useThemed(styles);
  const { user, setUser, signOut } = useAuth();
  const stats = useAsync(async () => parseProfile(await getProfile()), []);
  const st = stats.data;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [askSignOut, setAskSignOut] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  if (!user) return null;
  const hue = hueOf(user.id);
  const photo =
    user.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : null;

  const saveName = async () => {
    const n = name.trim();
    if (!n || n === user.name) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      setUser(await updateMe({ name: n }));
      setEditing(false);
    } catch (e) {
      setNameError((e as Error).message);
    }
    setSavingName(false);
  };

  const savePassword = async () => {
    if (next !== again) {
      setPwError('The new passwords do not match.');
      return;
    }
    setPwBusy(true);
    setPwError(null);
    try {
      await changePassword(cur, next);
      setPwDone(true);
    } catch (e) {
      setPwError((e as Error).message);
    }
    setPwBusy(false);
  };

  const rows: [string, string | null | undefined][] = [
    ['Email', user.email],
    ['Student ID', user.studentId],
    ['Role', user.role === 'ADMIN' ? 'Admin' : 'Student'],
    [
      'Training day',
      st?.trainingDay != null
        ? `${st.trainingDay}${st.totalDays ? ` of ${st.totalDays}` : ''}`
        : undefined,
    ],
    [
      'Course start',
      user.courseStartDate
        ? new Date(user.courseStartDate).toDateString()
        : undefined,
    ],
  ];

  const tiles: [string, number | undefined][] = [
    ['Level', st?.level],
    ['XP', st?.xp],
    ['Stars', st?.stars],
    ['Decisions', st?.decisions],
    ['Mistakes', st?.mistakes],
    ['Hints used', st?.hintsUsed],
  ];
  const shownTiles = tiles.filter(
    (x): x is [string, number] => x[1] !== undefined,
  );

  return (
    <Screen>
      <Header title="Profile" right={<ThemeToggle />} />
      <KeyboardAvoidingView style={s.fill} behavior="padding">
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.hero}>
            {photo ? (
              <Image source={{ uri: photo }} style={s.photo} />
            ) : (
              <Avatar name={user.name} h={hue} size={96} />
            )}

            {editing ? (
              <View style={s.editWrap}>
                <Glass radius={16} strong style={s.field}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={t.muted}
                    style={s.input}
                    autoFocus
                  />
                </Glass>
                {nameError ? <Text style={s.error}>{nameError}</Text> : null}
                <View style={s.row}>
                  <PressScale onPress={() => setEditing(false)} style={s.flex}>
                    <Glass radius={radius.pill} lite style={s.btn}>
                      <Text style={s.btnGhost}>Cancel</Text>
                    </Glass>
                  </PressScale>
                  <PressScale onPress={saveName} style={s.flex}>
                    <LinearGradient
                      colors={t.accentGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.btn}
                    >
                      {savingName ? (
                        <ActivityIndicator color={t.onAccent} />
                      ) : (
                        <Text style={s.btnText}>Save</Text>
                      )}
                    </LinearGradient>
                  </PressScale>
                </View>
              </View>
            ) : (
              <>
                <View style={s.nameRow}>
                  <Text style={s.name}>{user.name}</Text>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={t.accent}
                    onPress={() => {
                      setName(user.name);
                      setNameError(null);
                      setEditing(true);
                    }}
                  />
                </View>
                {st?.rank ? <Text style={s.rank}>{st.rank}</Text> : null}
              </>
            )}
          </View>

          {shownTiles.length > 0 && (
            <View style={s.tiles}>
              {shownTiles.map(([k, v]) => (
                <Glass key={k} radius={18} strong style={s.tile}>
                  <Text style={s.tileV}>{v.toLocaleString()}</Text>
                  <Text style={s.tileK}>{k}</Text>
                </Glass>
              ))}
            </View>
          )}

          {st?.pct != null && (
            <Glass radius={18} style={s.progress}>
              <View style={s.progressTop}>
                <Text style={s.k}>Progress to next level</Text>
                <Text style={s.v}>
                  {st.xpIntoLevel != null && st.xpForNextLevel != null
                    ? `${st.xpIntoLevel} / ${st.xpForNextLevel} XP`
                    : `${st.pct}%`}
                </Text>
              </View>
              <View style={s.track}>
                <LinearGradient
                  colors={[t.accentGrad[0], t.accentGrad[2]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    s.fillBar,
                    { width: `${Math.min(100, Math.max(4, st.pct))}%` },
                  ]}
                />
              </View>
            </Glass>
          )}

          {stats.loading && !st ? <ActivityIndicator color={t.accent} /> : null}

          <Text style={s.section}>Account</Text>
          <Glass strong style={s.card}>
            {rows
              .filter((r): r is [string, string] => !!r[1])
              .map(([k, v]) => (
                <View key={k} style={s.infoRow}>
                  <Text style={s.k}>{k}</Text>
                  <Text style={s.v} numberOfLines={1}>
                    {v}
                  </Text>
                </View>
              ))}
          </Glass>

          {st && st.achievements.length > 0 && (
            <>
              <Text style={s.section}>Achievements</Text>
              <View style={s.chips}>
                {st.achievements.map(a => (
                  <View
                    key={a.title}
                    style={[s.chip, !a.earned && s.chipLocked]}
                  >
                    <Ionicons
                      name={a.earned ? 'trophy' : 'lock-closed'}
                      size={13}
                      color={a.earned ? t.amber : t.muted}
                    />
                    <Text style={[s.chipText, !a.earned && { color: t.muted }]}>
                      {a.title}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={s.section}>Security</Text>
          <PressScale
            onPress={() => {
              setPwOpen(o => !o);
              setPwError(null);
            }}
            scale={0.98}
          >
            <Glass strong style={s.action}>
              <Ionicons name="key-outline" size={20} color={t.accent} />
              <Text style={s.actionText}>Change password</Text>
              <Ionicons
                name={pwOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={t.muted}
              />
            </Glass>
          </PressScale>

          {pwOpen && (
            <View style={s.pwBox}>
              {[
                { v: cur, set: setCur, ph: 'Current password' },
                { v: next, set: setNext, ph: 'New password' },
                { v: again, set: setAgain, ph: 'Repeat new password' },
              ].map(f => (
                <Glass key={f.ph} radius={16} strong style={s.field}>
                  <TextInput
                    value={f.v}
                    onChangeText={f.set}
                    placeholder={f.ph}
                    placeholderTextColor={t.muted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={s.input}
                  />
                </Glass>
              ))}
              {pwError ? <Text style={s.error}>{pwError}</Text> : null}
              <Text style={s.note}>
                You will be signed out on every device after changing it.
              </Text>
              <PressScale
                onPress={savePassword}
                style={(!cur || !next || !again || pwBusy) && s.dim}
              >
                <LinearGradient
                  colors={t.accentGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.btn}
                >
                  {pwBusy ? (
                    <ActivityIndicator color={t.onAccent} />
                  ) : (
                    <Text style={s.btnText}>Update password</Text>
                  )}
                </LinearGradient>
              </PressScale>
            </View>
          )}

          <PressScale onPress={() => setAskSignOut(true)} scale={0.98}>
            <Glass strong style={[s.action, s.danger]}>
              <Ionicons name="log-out-outline" size={20} color={t.rose} />
              <Text style={[s.actionText, { color: t.rose }]}>Sign out</Text>
            </Glass>
          </PressScale>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={askSignOut}
        icon="log-out-outline"
        title="Sign out?"
        message="You will need to sign in again to use TD Dispatcher."
        confirmLabel="Sign out"
        destructive
        onCancel={() => setAskSignOut(false)}
        onConfirm={() => {
          setAskSignOut(false);
          signOut();
        }}
      />
      <ConfirmDialog
        visible={pwDone}
        icon="checkmark-circle-outline"
        hideCancel
        title="Password changed"
        message="For your safety you were signed out. Please sign in again with the new password."
        confirmLabel="OK"
        onCancel={() => signOut()}
        onConfirm={() => signOut()}
      />
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    fill: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: 16, gap: 14, paddingBottom: 48 },
    hero: { alignItems: 'center', gap: 8, paddingVertical: 6 },
    photo: { width: 96, height: 96, borderRadius: 48 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: {
      color: t.ink,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    rank: { color: t.accent, fontWeight: '800', fontSize: 14 },
    editWrap: { alignSelf: 'stretch', gap: 10 },
    row: { flexDirection: 'row', gap: 10 },
    field: { paddingHorizontal: 16, height: 52, justifyContent: 'center' },
    input: { color: t.ink, fontSize: 16, paddingVertical: 0 },
    error: { color: t.rose, fontSize: 13 },
    note: { color: t.muted, fontSize: 12 },
    btn: {
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    btnText: { color: t.onAccent, fontWeight: '900', fontSize: 15 },
    btnGhost: { color: t.ink, fontWeight: '800', fontSize: 15 },
    dim: { opacity: 0.45 },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      flexGrow: 1,
      flexBasis: '30%',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 2,
    },
    tileV: { color: t.ink, fontSize: 24, fontWeight: '900' },
    tileK: { color: t.muted, fontSize: 12, fontWeight: '700' },
    progress: { padding: 14, gap: 10 },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between' },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: t.glassFill,
      overflow: 'hidden',
    },
    fillBar: { height: 8, borderRadius: 4 },
    section: {
      color: t.dim,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginLeft: 4,
      marginTop: 6,
    },
    card: { padding: 16, gap: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    k: { color: t.muted },
    v: { color: t.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: t.chipBg,
      borderWidth: 1,
      borderColor: t.chipBorder,
    },
    chipLocked: {
      backgroundColor: t.glassFill,
      borderColor: t.glassBorder,
    },
    chipText: { color: t.ink, fontWeight: '700', fontSize: 13 },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    actionText: { color: t.ink, fontWeight: '800', fontSize: 15, flex: 1 },
    danger: { borderColor: `${t.rose}66`, marginTop: 6 },
    pwBox: { gap: 10 },
  });
