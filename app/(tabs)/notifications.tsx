import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';

interface Message {
    id: string;
    sender: string;
    text: string;
    time: string;
}

const messages: Message[] = [
    { id: '1', sender: 'John Doe', text: 'Hey, I just sent you the file.', time: '10:05 AM' },
    { id: '2', sender: 'Jane Smith', text: 'Can you review the report?', time: '10:15 AM' },
    { id: '3', sender: 'John Doe', text: 'Sure, I will do it shortly!', time: '10:20 AM' },
    { id: '4', sender: 'Jane Smith', text: 'Thanks!', time: '10:30 AM' },
];

const NotificationUI: React.FC = () => {
    const renderItem = ({ item }: { item: Message }) => {
        return (
            <View style={styles.messageContainer}>
                <View style={styles.messageContent}>
                    <Text style={styles.sender}>{item.sender}</Text>
                    <Text style={styles.messageText}>{item.text}</Text>
                </View>
                <Text style={styles.time}>{item.time}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messageList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: 20,
    },
    messageList: {
        paddingBottom: 20,
    },
    messageContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#ffffff',
        marginBottom: 10,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    messageContent: {
        flex: 1,
    },
    sender: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
    },
    messageText: {
        fontSize: 16,
        color: '#333',
    },
    time: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 5,
    },
});

export default NotificationUI;
