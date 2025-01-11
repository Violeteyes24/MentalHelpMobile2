// /components/BottomNavBar.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';

interface BottomNavBarProps {
    navigateToHome: () => void; // Explicitly type as a function that returns void
    navigateToMoodTracker: () => void;
    navigateToChatbot: () => void;
    navigateToAppointment: () => void;
}

const BottomNavBar = ({ navigateToHome, navigateToMoodTracker, navigateToChatbot, navigateToAppointment }: BottomNavBarProps) => {
    return (
        <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem} onPress={navigateToHome}>
                <Icon name="heart" type="font-awesome" color="#fff" size={24} />
                <Text style={styles.navText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={navigateToMoodTracker}>
                <Icon name="smile-o" type="font-awesome" color="#fff" size={24} />
                <Text style={styles.navText}>Mood</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={navigateToChatbot}>
                <Icon name="comments" type="font-awesome" color="#fff" size={24} />
                <Text style={styles.navText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={navigateToAppointment}>
                <Icon name="calendar" type="font-awesome" color="#fff" size={24} />
                <Text style={styles.navText}>Appointments</Text>
            </TouchableOpacity>
        </View>
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
    },
    navItem: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    navText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
    },
});

export default BottomNavBar;
