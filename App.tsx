import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { Splash } from './src/components/Splash';
import { RootNavigator } from './src/navigation';
import { useTheme } from './src/theme';

export default function App() {
  const t = useTheme();
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setSplash(false), 3600);
    return () => clearTimeout(id);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={splash || t.isDark ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      {splash && <Splash />}
    </SafeAreaProvider>
  );
}
