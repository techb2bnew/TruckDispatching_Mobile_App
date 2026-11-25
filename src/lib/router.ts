import { StackActions, createNavigationContainerRef, useRoute } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Tabs: { screen?: string } | undefined;
  Dialer: undefined;
  NewChat: undefined;
  Profile: undefined;
  Compose: { loadId?: string } | undefined;
  ActiveCall: { callId?: string; type?: 'BROKER' | 'DRIVER'; loadId?: string; driverId?: string; truckId?: string };
  MailThread: { id: string };
  ChatThread: { loadId: string; driverId: string; truckId?: string };
  LoadDetail: { id: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Target = { name: keyof RootStackParamList; params?: object };

/** Maps the old expo-router style paths ('/call/new?contactId=..') onto React Navigation routes. */
function resolve(href: string): Target {
  const [path, qs = ''] = href.split('?');
  const params: Record<string, string> = {};
  qs.split('&').filter(Boolean).forEach((kv) => {
    const [k, v = ''] = kv.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  const seg = path.split('/').filter(Boolean);
  switch (seg[0]) {
    case 'journey': case 'mails': case 'chats': case 'calls': case 'loads':
      return { name: 'Tabs', params: { screen: seg[0] } };
    case 'dialer': return { name: 'Dialer' };
    case 'profile': return { name: 'Profile' };
    case 'call': return { name: 'ActiveCall', params };
    case 'mail': return seg[1] === 'compose' ? { name: 'Compose', params } : { name: 'MailThread', params: { id: seg[1] } };
    case 'chat': return seg[1] === 'new' ? { name: 'NewChat' } : { name: 'ChatThread', params };
    case 'load': return { name: 'LoadDetail', params: { id: seg[1] } };
    default: return { name: 'Tabs' };
  }
}

export const router = {
  push(href: string) {
    const { name, params } = resolve(href);
    navigationRef.isReady() && (navigationRef.dispatch as (a: unknown) => void)(StackActions.push(name, params));
  },
  replace(href: string) {
    const { name, params } = resolve(href);
    navigationRef.isReady() && (navigationRef.dispatch as (a: unknown) => void)(StackActions.replace(name, params));
  },
  back() {
    navigationRef.isReady() && navigationRef.canGoBack() && navigationRef.goBack();
  },
};

export function useLocalSearchParams<T extends object>(): T {
  return (useRoute().params ?? {}) as T;
}
