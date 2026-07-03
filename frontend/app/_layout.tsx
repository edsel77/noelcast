import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { FullScreenPlayer } from '@/components/FullScreenPlayer';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash once layout mounts
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <PlayerProvider>
            <Head>
              <title>NoelCast - Christmas Radio</title>
              <meta name="description" content="A premium Christmas radio streaming application." />
            </Head>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }} />
            {/* Global full-screen player overlay */}
            <FullScreenPlayer />
          </PlayerProvider>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
