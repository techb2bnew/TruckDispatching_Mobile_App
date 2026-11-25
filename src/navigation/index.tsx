import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { GlassTabBar } from '../components/GlassTabBar';
import { navigationRef, type RootStackParamList } from '../lib/router';
import { useTheme } from '../theme';
import ActiveCall from '../screens/ActiveCall';
import Calls from '../screens/Calls';
import ChatThread from '../screens/ChatThread';
import Chats from '../screens/Chats';
import Compose from '../screens/Compose';
import Dialer from '../screens/Dialer';
import Journey from '../screens/Journey';
import LoadDetail from '../screens/LoadDetail';
import Loads from '../screens/Loads';
import Login from '../screens/Login';
import MailThread from '../screens/MailThread';
import Mails from '../screens/Mails';
import NewChat from '../screens/NewChat';
import Profile from '../screens/Profile';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="journey"
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen
        name="journey"
        component={Journey}
        options={{ title: 'Journey' }}
      />
      <Tab.Screen name="mails" component={Mails} options={{ title: 'Mails' }} />
      <Tab.Screen name="chats" component={Chats} options={{ title: 'Chat' }} />
      <Tab.Screen name="calls" component={Calls} options={{ title: 'Calls' }} />
      <Tab.Screen name="loads" component={Loads} options={{ title: 'Loads' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const t = useTheme();
  const { status } = useAuth();
  if (status === 'loading')
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...DefaultTheme,
        dark: t.isDark,
        colors: { ...DefaultTheme.colors, background: t.bg },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: 'slide_from_right',
        }}
      >
        {status === 'signedOut' ? (
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ animation: 'fade' }}
          />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen
              name="Dialer"
              component={Dialer}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="Compose"
              component={Compose}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="NewChat"
              component={NewChat}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="ActiveCall"
              component={ActiveCall}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="MailThread" component={MailThread} />
            <Stack.Screen name="ChatThread" component={ChatThread} />
            <Stack.Screen name="LoadDetail" component={LoadDetail} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
