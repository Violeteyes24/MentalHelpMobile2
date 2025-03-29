// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Drawer from '../../components/navbars/drawer';
import BottomNavBar from '../../components/navbars/bottomNavBar';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];

  // Determine active tab based on current path
  const getActiveTab = useCallback(() => {
    if (pathname.includes('/moodtracker')) return 'mood';
    if (pathname.includes('/chatbot')) return 'chat';
    if (pathname.includes('/counselorList')) return 'appointment';
    return 'home'; // default
  }, [pathname]);

  const activeTab = getActiveTab();

  const toggleDrawer = useCallback(() => {
    const toValue = drawerOpen ? width : width * 0.4;
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(!drawerOpen));
  }, [drawerOpen, slideAnim]);

  const closeDrawer = useCallback(() => {
    if (drawerOpen) {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDrawerOpen(false));
    }
  }, [drawerOpen, slideAnim]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    closeDrawer();
  }, [router, closeDrawer]);

  useEffect(() => {
    if (!session) {
      router.dismissAll();
      // router.push('index');
    }
      // console.log("Session in (tabs)/_layout:", session);
  }, [session]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: drawerOpen ? "none" : "flex",
            // Add additional styling if needed
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e2e2e2",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            // Add icon options if needed
          }}
        />
        <Tabs.Screen
          name="moodtracker"
          options={{
            title: "MoodTracker",
            tabBarLabel: "Mood",
          }}
        />
        <Tabs.Screen
          name="counselorList"
          options={{
            title: "counselorList",
            tabBarLabel: "counselorList",
          }}
        />
        <Tabs.Screen
          name="chatbot"
          options={{
            title: "Chatbot",
            tabBarLabel: "Chat",
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "account",
            tabBarLabel: "account",
          }}
        />
        <Tabs.Screen
          name="availability/[id]"
          options={{
            title: "Availability Details",
            tabBarButton: () => null, // Hide from tab bar
          }}
        />

        <Tabs.Screen
          name="messaging/[id]"
          options={{
            title: "Messaging Details",
            tabBarButton: () => null, // Hide from tab bar
          }}
        />
        {/* <Tabs.Screen name="../../app" /> */}
      </Tabs>

      <Drawer
        toggleDrawer={toggleDrawer}
        closeDrawer={closeDrawer}
        slideAnim={slideAnim}
        drawerOpen={drawerOpen}
        navigateToAccount={() => navigate("/(tabs)/account")}
        navigateToMessages={() => navigate("/(tabs)/messageList")}
        navigateToNotifications={() => navigate("/(tabs)/notifications")}
        navigateToLogIn={() => router.replace("/")}
        // to do, log out.
      />

      <BottomNavBar
        drawerOpen={drawerOpen}
        navigateToHome={() => navigate("/(tabs)/")}
        navigateToMoodTracker={() => navigate("/(tabs)/moodtracker")}
        navigateToChatbot={() => navigate("/(tabs)/chatbot")}
        navigateToAppointment={() => navigate("/(tabs)/counselorList")}
        activeTab={activeTab}
      />
    </>
  );
}
