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
              <meta name="keywords" content="Christmas radio, holiday music, streaming, festive, NoelCast" />
              <meta name="author" content="NoelCast" />
              <meta name="theme-color" content="#121212" />
              
              {/* Open Graph */}
              <meta property="og:title" content="NoelCast - Christmas Radio" />
              <meta property="og:description" content="A premium Christmas radio streaming application." />
              <meta property="og:type" content="website" />
              <meta property="og:url" content="https://noelcast.driftapps.xyz" />
              <meta property="og:image" content="https://noelcast.driftapps.xyz/noelcast-feature-image.png" />
              
              {/* Twitter Card */}
              <meta name="twitter:card" content="summary" />
              <meta name="twitter:title" content="NoelCast - Christmas Radio" />
              <meta name="twitter:description" content="A premium Christmas radio streaming application." />
              <meta name="twitter:image" content="https://noelcast.driftapps.xyz/noelcast-feature-image.png" />
            </Head>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="developer" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
            {/* Global full-screen player overlay */}
            <FullScreenPlayer />
          </PlayerProvider>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
