import type { IconName } from '../lib/icons';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { radius, useThemed, type Palette } from '../theme';
import { LinearGradient } from './Gradient';
import { Glass } from './glass';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  icon?: IconName;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button (sign out, delete). */
  destructive?: boolean;
  /** Info / error popup: only the confirm button. */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** App-styled confirmation popup (glass card on a dimmed backdrop), used instead of the system Alert. */
export function ConfirmDialog({
  visible, title, message, icon = 'help-circle-outline', confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, hideCancel, onConfirm, onCancel,
}: Props) {
  const [t, s] = useThemed(styles);
  const tone = destructive ? t.rose : t.accent;
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(180)} style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View entering={ZoomIn.duration(200)} style={s.cardWrap}>
          <Glass radius={28} strong style={s.card}>
            <View style={[s.iconWrap, { backgroundColor: `${tone}22`, borderColor: `${tone}66` }]}>
              <Ionicons name={icon} size={30} color={tone} />
            </View>
            <Text style={s.title}>{title}</Text>
            {message ? <Text style={s.message}>{message}</Text> : null}
            <View style={s.row}>
              {hideCancel ? null : (
                <Pressable onPress={onCancel} style={s.btnWrap}>
                  <Glass radius={radius.pill} lite style={s.btn}>
                    <Text style={s.cancelText}>{cancelLabel}</Text>
                  </Glass>
                </Pressable>
              )}
              <Pressable onPress={onConfirm} style={s.btnWrap}>
                <LinearGradient
                  colors={destructive ? ['#fda4af', '#f43f5e'] : [t.accentGrad[0], t.accentGrad[2]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.btn, s.confirm]}
                >
                  <Text style={[s.confirmText, !destructive && { color: t.onAccent }]}>{confirmLabel}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Glass>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(3,8,22,0.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    cardWrap: { width: '100%', maxWidth: 360 },
    card: {
      padding: 22,
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.isDark ? 'rgba(18,32,66,0.98)' : 'rgba(255,255,255,0.98)',
      borderColor: t.glassBorder,
    },
    iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 4 },
    title: { color: t.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    message: { color: t.dim, fontSize: 14, lineHeight: 20, textAlign: 'center' },
    row: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },
    btnWrap: { flex: 1 },
    btn: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
    confirm: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    cancelText: { color: t.ink, fontWeight: '800', fontSize: 15 },
    confirmText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  });
