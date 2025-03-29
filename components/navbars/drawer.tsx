import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Pressable } from 'react-native';
import { Icon } from '@rneui/themed';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DrawerProps {
  navigateToAccount: () => void;
  navigateToMessages: () => void;
  navigateToNotifications: () => void;
  navigateToLogIn: () => void;
  toggleDrawer: () => void;
  closeDrawer: () => void;
  slideAnim: Animated.Value;
  drawerOpen: boolean;
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
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  
  // Fade animation for overlay
  const fadeAnim = slideAnim.interpolate({
    inputRange: [-width * 0.6, 0],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        console.log("Successfully logged out");
        signOut(); // Update the session state
        navigateToLogIn(); // Navigate to the login page
      }
    } catch (err) {
      console.error("Unexpected error during sign out:", err);
    }
  };

  const menuItems = [
    { icon: 'user', label: 'Profile', onPress: navigateToAccount },
    { icon: 'message-circle', label: 'Messages', onPress: navigateToMessages },
    { icon: 'bell', label: 'Notifications', onPress: navigateToNotifications },
  ];

  return (
    <>
      <TouchableOpacity
        style={[styles.menuButton, { top: insets.top + 10 }]}
        activeOpacity={0.7}
        onPress={toggleDrawer}
      >
        <Icon
          name={drawerOpen ? "x" : "menu"}
          type="feather"
          size={24}
          color="#333"
        />
      </TouchableOpacity>

      {drawerOpen && (
        <Animated.View 
          style={[
            styles.overlay, 
            { opacity: fadeAnim }
          ]}
        >
          <Pressable style={styles.overlayPressable} onPress={closeDrawer} />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.drawer, 
          { 
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20
          }
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Menu</Text>
        </View>

        <View style={styles.drawerContent}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.drawerItemContainer} 
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Icon name={item.icon} type="feather" size={20} color="#555" />
              <Text style={styles.drawerItem}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.drawerFooter}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Icon name="log-out" type="feather" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '70%',
    backgroundColor: '#FFFFFF',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  drawerContent: {
    flex: 1,
    paddingVertical: 10,
  },
  drawerItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  drawerItem: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
    color: '#333',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 15,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1,
  },
  overlayPressable: {
    width: '100%',
    height: '100%',
  },
});

export default Drawer;