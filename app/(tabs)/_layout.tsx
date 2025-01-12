import { Tabs } from 'expo-router';
import { useState, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Drawer from '../components/navbars/drawer';
import BottomNavBar from '../components/navbars/drawer';

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

  const navigateToHome = () => router.push('/(tabs)/index.tsx');
  const navigateToMoodTracker = () => router.push('/(tabs)/moodtracker');
  const navigateToChatbot = () => router.push('/(tabs)/chatbot');
  const navigateToAppointment = () => router.push('/(tabs)/appointment');

  return (
    <>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="moodtracker" options={{ title: 'MoodTracker' }} />
        <Tabs.Screen name="appointment" options={{ title: 'Appointments' }} />
        <Tabs.Screen name="chatbot" options={{ title: 'Chatbot' }} />
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
        navigateToHome={navigateToHome}
        navigateToMoodTracker={navigateToMoodTracker}
        navigateToChatbot={navigateToChatbot}
        navigateToAppointment={navigateToAppointment}
      />
    </>
  );
}
