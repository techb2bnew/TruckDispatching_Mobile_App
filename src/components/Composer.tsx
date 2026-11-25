import Ionicons from '@react-native-vector-icons/ionicons/static';
import * as Haptics from '../lib/haptics';
import { LinearGradient } from './Gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemed, type Palette } from '../theme';
import { Glass } from './glass';
import { GlassBtn } from './ui';

/** iOS-Messages style floating composer: [+]  [ text … mic/send ] */
export function Composer({ placeholder, onSend, multiline }: { placeholder: string; onSend: (t: string) => void; multiline?: boolean }) {
  const [t, s] = useThemed(styles);
  const [text, setText] = useState('');
  const { bottom } = useSafeAreaInsets();
  const can = text.trim().length > 0;
  const send = () => {
    if (!can) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text);
    setText('');
  };
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(bottom, 10) }]}>
      <GlassBtn icon="add" size={44} onPress={() => {}} />
      <Glass radius={24} strong style={s.pill}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={t.muted}
          style={[s.input, multiline && { maxHeight: 140 }]}
          multiline
          submitBehavior={multiline ? 'newline' : 'submit'}
          onSubmitEditing={multiline ? undefined : send}
        />
        <View style={s.right}>
          {can ? (
            <Animated.View key="send" entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
              <Pressable onPress={send}>
                <LinearGradient colors={t.accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.send}>
                  <Ionicons name="arrow-up" size={18} color={t.onAccent} />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View key="mic" entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
              <Ionicons name="mic-outline" size={22} color={t.muted} />
            </Animated.View>
          )}
        </View>
      </Glass>
    </View>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 8 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', minHeight: 44 },
    input: { flex: 1, color: t.ink, paddingLeft: 16, paddingTop: 11, paddingBottom: 11, fontSize: 16, maxHeight: 110 },
    right: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    send: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  });
