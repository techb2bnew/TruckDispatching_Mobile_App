import * as Haptics from '../lib/haptics';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { type Driver } from '../api';
import { ensureThread } from '../chat/chatStore';
import { LinearGradient } from '../components/Gradient';
import { Screen } from '../components/glass';
import { DriverList, LoadChips } from '../components/Pickers';
import { Header, PressScale } from '../components/ui';
import { router } from '../lib/router';
import { radius, useThemed, type Palette } from '../theme';

/** Pick a load and a driver, then open the chat. The first message creates the conversation on the server. */
export default function NewChat() {
  const [t, s] = useThemed(styles);
  const [loadId, setLoadId] = useState<string | undefined>();
  const [driver, setDriver] = useState<Driver | undefined>();
  const ok = !!loadId && !!driver;

  const start = () => {
    if (!loadId || !driver) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ensureThread(loadId, driver.id, driver.truckId);
    router.replace(`/chat/open?loadId=${encodeURIComponent(loadId)}&driverId=${encodeURIComponent(driver.id)}${driver.truckId ? `&truckId=${encodeURIComponent(driver.truckId)}` : ''}`);
  };

  return (
    <Screen>
      <Header
        title="New chat"
        right={
          <PressScale onPress={start} style={!ok && s.dim}>
            <LinearGradient colors={t.accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
              <Text style={s.btnText}>Start</Text>
            </LinearGradient>
          </PressScale>
        }
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Load</Text>
        <LoadChips value={loadId} onChange={setLoadId} />
        <Text style={s.label}>Driver</Text>
        <DriverList value={driver?.id} onChange={setDriver} />
      </ScrollView>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    dim: { opacity: 0.4 },
    label: { color: t.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
    btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    btnText: { color: t.onAccent, fontWeight: '900', fontSize: 15 },
  });
