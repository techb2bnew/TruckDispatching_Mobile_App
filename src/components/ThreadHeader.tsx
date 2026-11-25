import { router } from '../lib/router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemed, type Palette } from '../theme';
import { Glass } from './glass';
import { Avatar, GlassBtn, PressScale } from './ui';

/** iOS-Messages / WhatsApp hybrid header: back • avatar+name capsule • call. */
export function ThreadHeader({ contact, subtitle, online, onCall, onPressTitle }: {
  contact: { name: string; title?: string; hue: number }; subtitle?: string; online?: boolean; onCall?: () => void; onPressTitle?: () => void;
}) {
  const [t, s] = useThemed(styles);
  const { top } = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { paddingTop: top + 8 }]}>
      <GlassBtn icon="chevron-back" color={t.ink} onPress={() => router.back()} />
      <View style={s.center}>
        <PressScale onPress={onPressTitle} scale={0.97}>
          <Glass radius={26} strong lite style={s.capsule}>
            <Avatar name={contact.name} h={contact.hue} size={34} />
            <View style={{ flexShrink: 1 }}>
              <Text style={s.name} numberOfLines={1}>{contact.name}</Text>
              <View style={s.subRow}>
                {online ? <View style={s.online} /> : null}
                <Text style={[s.sub, online && { color: t.green }]} numberOfLines={1}>{online ? 'online' : subtitle ?? contact.title}</Text>
              </View>
            </View>
          </Glass>
        </PressScale>
      </View>
      {onCall ? <GlassBtn icon="call" onPress={onCall} /> : <View style={s.spacer} />}
    </View>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
    center: { flex: 1, alignItems: 'center' },
    spacer: { width: 42 },
    capsule: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingRight: 16, height: 46, maxWidth: '100%' },
    name: { color: t.ink, fontSize: 15, fontWeight: '800' },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    online: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.green },
    sub: { color: t.muted, fontSize: 11 },
  });
