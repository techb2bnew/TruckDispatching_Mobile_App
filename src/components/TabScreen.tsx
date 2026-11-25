import type { IconName } from '../lib/icons';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import type { Palette } from '../theme';
import { useThemed } from '../theme';
import { LinearGradient } from './Gradient';
import { Glass, Screen } from './glass';
import { hueOf } from '../lib/format';
import { router } from '../lib/router';
import { Avatar, GlassBtn, Logo, PressScale, ThemeToggle } from './ui';

const TAB_CLEARANCE = 92; // floating tab bar height + margin

/** Screen Y where the keyboard starts (null while it is hidden). Using the position, not the height,
 *  keeps the bar above the keyboard on Android edge-to-edge, where the height excludes the nav-bar area. */
function useKeyboardTop() {
  const [y, setY] = useState<number | null>(null);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', e =>
      setY(e.endCoordinates.screenY),
    );
    const b = Keyboard.addListener('keyboardDidHide', () => setY(null));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return y;
}

interface Props<T> {
  title: string;
  subtitle?: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (info: { item: T; index: number }) => ReactElement;
  empty?: ReactElement;
  search?: {
    placeholder: string;
    value: string;
    onChange: (q: string) => void;
  };
  action?: { icon: IconName; onPress: () => void };
  headerExtra?: ReactElement;
  /** Server-backed lists: pull-to-refresh, infinite scroll, bottom spinner. */
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
}

/** iOS-Messages style tab page: brand bar, collapsing large title, floating search + action. */
export function TabScreen<T>({
  title,
  subtitle,
  data,
  keyExtractor,
  renderItem,
  empty,
  search,
  action,
  headerExtra,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
}: Props<T>) {
  const [t, s] = useThemed(styles);
  const { top } = useSafeAreaInsets();
  const kbTop = useKeyboardTop();
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [rootBottom, setRootBottom] = useState(Dimensions.get('window').height);
  const measureRoot = () =>
    rootRef.current?.measureInWindow((_x, y, _w, h) => {
      if (h) setRootBottom(y + h);
    });
  const { user } = useAuth();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => {
    y.value = e.contentOffset.y;
  });

  const smallTitle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [30, 70], [0, 1], Extrapolation.CLAMP),
  }));
  const bigTitle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 55], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(y.value, [0, 55], [0, -8], Extrapolation.CLAMP),
      },
    ],
  }));
  const bar = !!(search || action);

  return (
    <Screen>
      <View
        ref={rootRef}
        collapsable={false}
        onLayout={measureRoot}
        style={s.root}
      >
        <View style={[s.top, { paddingTop: top + 8 }]}>
          <View style={s.brand}>
            <Logo size={30} />
            <Text style={s.brandText}>B2B Logistics</Text>
          </View>
          <Animated.Text pointerEvents="none" style={[s.small, smallTitle]}>
            {title}
          </Animated.Text>
          <View style={s.right}>
            <ThemeToggle />
            <PressScale onPress={() => router.push('/profile')} hitSlop={6}>
              <Avatar
                name={user?.name ?? '?'}
                h={hueOf(user?.id ?? 'me')}
                size={42}
              />
            </PressScale>
          </View>
        </View>

        <Animated.FlatList
          data={data}
          keyExtractor={keyExtractor as (item: unknown) => string}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: bar ? 170 : 130 }}
          ListHeaderComponent={
            <Animated.View style={[s.large, bigTitle]}>
              <Text style={s.title}>{title}</Text>
              {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
              {headerExtra}
            </Animated.View>
          }
          ListEmptyComponent={empty}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={t.accent}
                colors={[t.accent]}
              />
            ) : undefined
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={t.accent}
                style={{ marginVertical: 18 }}
              />
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={
                index < 10
                  ? FadeInDown.delay(index * 45).duration(320)
                  : undefined
              }
            >
              {renderItem({ item: item as T, index })}
            </Animated.View>
          )}
        />

        {bar && (
          <LinearGradient
            pointerEvents="none"
            colors={[`${t.bg}00`, `${t.bg}f5`]}
            style={s.fade}
          />
        )}

        {bar && (
          <View
            style={[
              s.bar,
              {
                bottom:
                  kbTop !== null
                    ? Math.max(0, rootBottom - kbTop) + 8
                    : TAB_CLEARANCE,
              },
            ]}
          >
            {search ? (
              <Glass radius={26} strong style={[s.search, s.searchSolid]}>
                <Ionicons name="search" size={18} color={t.muted} />
                <TextInput
                  value={search.value}
                  onChangeText={search.onChange}
                  placeholder={search.placeholder}
                  placeholderTextColor={t.dim}
                  style={s.input}
                />
                {search.value ? (
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={t.muted}
                    onPress={() => search.onChange('')}
                  />
                ) : null}
              </Glass>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {action && (
              <GlassBtn icon={action.icon} size={52} onPress={action.onPress} />
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = (t: Palette) =>
  StyleSheet.create({
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
    root: { flex: 1 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandText: {
      color: t.dim,
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 0.3,
    },
    small: {
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      color: t.ink,
      fontWeight: '800',
      fontSize: 16,
    },
    large: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
    title: {
      color: t.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    subtitle: { color: t.dim, fontSize: 13, marginTop: 2 },
    bar: {
      position: 'absolute',
      left: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 360 },
    searchSolid: {
      backgroundColor: t.isDark
        ? 'rgba(18,32,66,0.97)'
        : 'rgba(255,255,255,0.98)',
      borderColor: t.chipBorder,
      elevation: 6,
    },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      height: 52,
    },
    input: { flex: 1, color: t.ink, fontSize: 16, paddingVertical: 0 },
  });
