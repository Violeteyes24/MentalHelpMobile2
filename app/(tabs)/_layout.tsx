// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Drawer from '../../components/navbars/drawer';
import BottomNavBar from '../../components/navbars/bottomNavBar';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];

  const toggleDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: drawerOpen ? width : width * 0.4,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(!drawerOpen));
  };

  const closeDrawer = () => {
    if (drawerOpen) {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDrawerOpen(false));
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: drawerOpen ? 'none' : 'flex' }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            href: '/(tabs)/'
          }}
        />
        <Tabs.Screen
          name="moodtracker"
          options={{
            title: 'MoodTracker',
            href: '/(tabs)/moodtracker'
          }}
        />
        <Tabs.Screen
          name="appointment"
          options={{
            title: 'Appointments',
            href: '/(tabs)/appointment'
          }}
        />
        <Tabs.Screen
          name="chatbot"
          options={{
            title: 'Chatbot',
            href: '/(tabs)/chatbot'
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: '/(tabs)/profile'
          }}
        />
      </Tabs>
      <Drawer
        toggleDrawer={toggleDrawer}
        closeDrawer={closeDrawer}
        slideAnim={slideAnim}
        drawerOpen={drawerOpen}
        navigateToProfile={() => router.push('/(tabs)/profile')}
        navigateToMessages={() => router.push('/(tabs)/messages')}
        navigateToNotifications={() => router.push('/(tabs)/notifications')}
      />
      <BottomNavBar
        drawerOpen={drawerOpen}
        navigateToHome={() => router.push('/(tabs)/')}
        navigateToMoodTracker={() => router.push('/(tabs)/moodtracker')}
        navigateToChatbot={() => router.push('/(tabs)/chatbot')}
        navigateToAppointment={() => router.push('/(tabs)/appointment')}
      />
    </>
  );
}