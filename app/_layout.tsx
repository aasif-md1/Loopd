import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Platform, PermissionsAndroid, Alert } from 'react-native';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import { Colors } from '@/src/theme';
import { dynamicIslandService } from '@/src/services/dynamicIslandService';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent auto-hiding of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Request Android permissions immediately on startup per user request
  useEffect(() => {
    const reqPermissions = async () => {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          try {
            const granted = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (!granted) {
              await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                {
                  title: 'Loopd Notifications',
                  message: 'Loopd needs notification permission to show the media player with next/previous controls on your lock screen and notification shade.',
                  buttonPositive: 'Allow',
                  buttonNegative: 'Not Now',
                }
              );
            }
          } catch (e) {
            console.warn('Startup notification permission error:', e);
          }
        }
      }
    };
    reqPermissions();
    dynamicIslandService.init();
    return () => {
      dynamicIslandService.destroy();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DarkTheme}>
          <StatusBar barStyle="light-content" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'default',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="nowPlaying"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="album/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="artist/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="playlist/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="genre/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="likedSongs"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
