// /components/Drawer.tsx
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Pressable } from 'react-native';
import { Icon } from '@rneui/themed';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';

interface DrawerProps {
  navigateToAccount: () => void; // Explicitly type as a function that returns void
  navigateToMessages: () => void;
  navigateToNotifications: () => void;
  navigateToLogIn: () => void;
  toggleDrawer: () => void;
  closeDrawer: () => void;
  slideAnim: Animated.Value; // Assuming this is an Animated.Value from react-native
  drawerOpen: boolean; // Explicitly type as a boolean
}

const Drawer = ({
  navigateToAccount,
  navigateToMessages,
  navigateToNotifications,
  navigateToLogIn,
  toggleDrawer,
  closeDrawer,
  slideAnim,
  drawerOpen,
}: DrawerProps) => {
  const router = useRouter();
  return (
    <>
      {/* Menu Icon */}
      <View style={{ position: "absolute", top: "5%", right: "5%" }}>
        <Icon
          name="menu"
          type="feather"
          size={28}
          color="#000"
          onPress={toggleDrawer}
        />
      </View>

      {/* Overlay */}
      {drawerOpen && (
        <Pressable style={styles.overlay} onPress={closeDrawer}></Pressable>
      )}

      {/* Sliding Drawer */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        <TouchableOpacity onPress={navigateToAccount}>
          <Text style={styles.drawerItem}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={navigateToMessages}>
          <Text style={styles.drawerItem}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={navigateToNotifications}>
          <Text style={styles.drawerItem}>Notifications</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Link
            href= {{ pathname: '/' }}
            onPress= {() => {
              console.log('Logging out...');
              supabase.auth.signOut();
            }}
          >
            <Text style={[styles.drawerItem, styles.logout]}>Logout</Text>
          </Link>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '60%',
        backgroundColor: '#ffffff',
        opacity: 1,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 1,
    },
    drawerItem: {
        fontSize: 18,
        fontWeight: '600',
        marginVertical: 15,
        color: '#000',
    },
    logout: {
        color: 'red',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 0,
    },
});

export default Drawer;
