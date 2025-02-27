// /components/BottomNavBar.tsx
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Icon } from '@rneui/themed';
import { useMemo } from 'react';

// components/BottomNavBar.tsx
interface BottomNavBarProps {
    navigateToHome: () => void;
    navigateToMoodTracker: () => void;
    navigateToChatbot: () => void;
    navigateToAppointment: () => void;
    drawerOpen: boolean;
    activeTab?: 'home' | 'mood' | 'chat' | 'appointment';
}

const BottomNavBar = ({ 
    navigateToHome, 
    navigateToMoodTracker, 
    navigateToChatbot, 
    navigateToAppointment, 
    drawerOpen,
    activeTab = 'home'
}: BottomNavBarProps) => {
    // Define the nav items for cleaner rendering
    const navItems = useMemo(() => [
        {
            id: 'home',
            icon: 'heart',
            label: 'Home',
            onPress: navigateToHome,
            isActive: activeTab === 'home'
        },
        {
            id: 'mood',
            icon: 'smile-o',
            label: 'Mood',
            onPress: navigateToMoodTracker,
            isActive: activeTab === 'mood'
        },
        {
            id: 'chat',
            icon: 'comments',
            label: 'Chat',
            onPress: navigateToChatbot,
            isActive: activeTab === 'chat'
        },
        {
            id: 'appointment',
            icon: 'calendar',
            label: 'Appointment',
            onPress: navigateToAppointment,
            isActive: activeTab === 'appointment'
        }
    ], [activeTab, navigateToHome, navigateToMoodTracker, navigateToChatbot, navigateToAppointment]);

    return (
        <Animated.View 
            style={[
                styles.navBar,
                { 
                    display: drawerOpen ? 'none' : 'flex',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 5
                }
            ]}
        >
            {navItems.map(item => (
                <TouchableOpacity 
                    key={item.id}
                    style={[
                        styles.navItem,
                        item.isActive && styles.activeNavItem
                    ]} 
                    onPress={item.onPress}
                >
                    <View style={styles.iconContainer}>
                        <Icon 
                            name={item.icon} 
                            type="font-awesome" 
                            color={item.isActive ? '#34d399' : '#fff'} 
                            size={24} 
                        />
                        {item.isActive && <View style={styles.activeIndicator} />}
                    </View>
                    <Text style={[
                        styles.navText,
                        item.isActive && styles.activeNavText
                    ]}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    navBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: '#6ee7b7',
        height: 70,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    navItem: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    activeNavItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    iconContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        width: 32,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -4,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34d399',
    },
    navText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
        fontWeight: '500',
    },
    activeNavText: {
        color: '#34d399',
        fontWeight: '700',
    },
});

export default BottomNavBar;