import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Icon } from '@rneui/themed';
import { useMemo, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

// components/BottomNavBar.tsx
interface BottomNavBarProps {
    navigateToHome: () => void;
    navigateToMoodTracker: () => void;
    navigateToChatbot: () => void;
    navigateToAppointment: () => void;
    drawerOpen: boolean;
    activeTab: 'home' | 'mood' | 'chat' | 'appointment';
}

const BottomNavBar = ({ 
    navigateToHome, 
    navigateToMoodTracker, 
    navigateToChatbot, 
    navigateToAppointment, 
    drawerOpen,
    activeTab
}: BottomNavBarProps) => {
    // Animation refs for the active indicator
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    // Animate when activeTab changes
    useEffect(() => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            })
        ]).start();
    }, [activeTab]);

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
                { display: drawerOpen ? 'none' : 'flex' }
            ]}
        >
            <LinearGradient
                colors={['#6ee7b7', '#4ade80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                {navItems.map(item => (
                    <TouchableOpacity 
                        key={item.id}
                        style={styles.navItem} 
                        onPress={item.onPress}
                        activeOpacity={0.7}
                    >
                        <Animated.View style={[
                            styles.iconContainer,
                            item.isActive && styles.activeIconContainer,
                            item.isActive && { transform: [{ scale: scaleAnim }] }
                        ]}>
                            <Icon 
                                name={item.icon} 
                                type="font-awesome" 
                                color={item.isActive ? '#10b981' : '#fff'} 
                                size={22} 
                            />
                        </Animated.View>
                        <Text style={[
                            styles.navText,
                            item.isActive && styles.activeNavText
                        ]}>
                            {item.label}
                        </Text>
                        {item.isActive && (
                            <View style={styles.activeIndicatorContainer}>
                                <View style={styles.activeIndicator} />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    navBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 8,
    },
    gradient: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        height: Platform.OS === 'ios' ? 84 : 70, // Add extra height for iOS
        paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Add padding for iOS devices with home indicator
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    navItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        position: 'relative',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        width: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 4,
    },
    activeIconContainer: {
        backgroundColor: '#ffffff',
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    activeIndicatorContainer: {
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    activeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ffffff',
        marginTop: 3,
    },
    navText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        fontWeight: '600',
    },
    activeNavText: {
        color: '#ffffff',
        fontWeight: '700',
    },
});

export default BottomNavBar;