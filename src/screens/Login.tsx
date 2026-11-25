import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import { LinearGradient } from '../components/Gradient';
import { Glass, Screen } from '../components/glass';
import { Logo, PressScale, ThemeToggle } from '../components/ui';
import * as Haptics from '../lib/haptics';
import { radius, useThemed, type Palette } from '../theme';

export default function Login() {
  const [t, s] = useThemed(styles);
  const { top, bottom } = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passRef = useRef<ComponentRef<typeof TextInput>>(null);
  const ok = identifier.trim().length > 0 && password.length > 0 && !busy;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        e instanceof ApiError
          ? e.status === 401 || e.status === 400 ? 'Wrong email / Student ID or password.' : e.message
          : 'Something went wrong. Try again.',
      );
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={[s.themeBtn, { top: top + 8 }]}><ThemeToggle /></View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.content, { paddingTop: top + 40, paddingBottom: bottom + 24 }]}
        >
          <View style={s.brand}>
            <Logo size={64} />
            <Text style={s.title}>TD Dispatcher</Text>
            <Text style={s.subtitle}>Sign in to start your training</Text>
          </View>

          <Glass radius={16} style={s.field}>
            <Ionicons name="person-outline" size={18} color={t.muted} />
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Email or Student ID"
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              style={s.input}
            />
          </Glass>
          <Glass radius={16} style={s.field}>
            <Ionicons name="lock-closed-outline" size={18} color={t.muted} />
            <TextInput
              ref={passRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={t.muted}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={submit}
              style={s.input}
            />
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.muted} onPress={() => setShow((v) => !v)} />
          </Glass>

          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color={t.rose} />
              <Text style={s.error}>{error}</Text>
            </View>
          )}

          <PressScale onPress={submit} style={!ok && { opacity: 0.5 }}>
            <LinearGradient colors={t.accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
              {busy ? <ActivityIndicator color={t.onAccent} /> : <Text style={s.btnText}>Sign in</Text>}
            </LinearGradient>
          </PressScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    themeBtn: { position: 'absolute', right: 16, zIndex: 2 },
    content: { paddingHorizontal: 22, gap: 14, flexGrow: 1, justifyContent: 'center' },
    brand: { alignItems: 'center', gap: 8, marginBottom: 22 },
    title: { color: t.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 6 },
    subtitle: { color: t.dim, fontSize: 14 },
    field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 54 },
    input: { flex: 1, color: t.ink, fontSize: 16, paddingVertical: 0 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
    error: { color: t.rose, fontSize: 13, flex: 1 },
    btn: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', marginTop: 6 },
    btnText: { color: t.onAccent, fontWeight: '900', fontSize: 16 },
  });
