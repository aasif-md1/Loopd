import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { House, MagnifyingGlass, Books } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Layout } from '@/src/theme';
import { MiniPlayer } from '@/src/components/player/MiniPlayer';
import { DesktopSidebar } from '@/src/components/desktop/DesktopSidebar';
import { DesktopPlayerBar } from '@/src/components/desktop/DesktopPlayerBar';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
  const barHeight = Layout.tabBarHeight + bottomInset;

  return (
    <View style={styles.container}>
      <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>
        {/* Left Desktop Sidebar when on Laptop/PC */}
        {isDesktop && <DesktopSidebar />}

        {/* Tab / View Content */}
        <View style={styles.contentArea}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: '#FFFFFF',
              tabBarInactiveTintColor: Colors.textSecondary,
              tabBarStyle: isDesktop
                ? { display: 'none' }
                : {
                    backgroundColor: 'rgba(18,18,18,0.96)',
                    borderTopColor: Colors.divider,
                    borderTopWidth: 1,
                    height: barHeight,
                    paddingBottom: bottomInset,
                    paddingTop: 8,
                    elevation: 8,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                  },
              tabBarLabelStyle: {
                fontFamily: Typography.fonts.semiBold,
                fontSize: 11,
                marginTop: 2,
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
                tabBarIcon: ({ color, focused }) => (
                  <House size={28} color={color as string} weight={focused ? 'fill' : 'regular'} />
                ),
              }}
            />
            <Tabs.Screen
              name="search"
              options={{
                title: 'Search',
                tabBarIcon: ({ color, focused }) => (
                  <MagnifyingGlass size={28} color={color as string} weight={focused ? 'fill' : 'regular'} />
                ),
              }}
            />
            <Tabs.Screen
              name="library"
              options={{
                title: 'Your Library',
                tabBarIcon: ({ color, focused }) => (
                  <Books size={28} color={color as string} weight={focused ? 'fill' : 'regular'} />
                ),
              }}
            />
          </Tabs>
        </View>
      </View>

      {/* On Mobile: Floating MiniPlayer; On Desktop: Full Desktop Player Bar */}
      {isDesktop ? <DesktopPlayerBar /> : <MiniPlayer />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainLayout: {
    flex: 1,
  },
  desktopLayout: {
    flexDirection: 'row',
    paddingBottom: 90, // space for desktop player bar
  },
  contentArea: {
    flex: 1,
    height: '100%',
  },
});

