import React from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
interface Message {
    id: string;
    text: string;
    sender: 'self' | 'other';
}

const messages: Message[] = [
    { id: '1', text: 'Hey, how are you?', sender: 'other' },
    { id: '2', text: 'I am good, how about you?', sender: 'self' },
    { id: '3', text: 'All good, just working on a project!', sender: 'self' },
    { id: '4', text: 'Sounds great! Keep it up!', sender: 'other' },
];

const MessageUI: React.FC = () => {
    const router = useRouter();
    const renderItem = ({ item }: { item: Message }) => {
        return (
            <View style={[styles.messageContainer, item.sender === 'self' ? styles.selfMessage : styles.otherMessage]}>
                {item.sender === 'other' && <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.avatar} />}
                <Text style={styles.messageText}>{item.text}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>

                Messages
            </Text>
            <FlatList
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                inverted
                contentContainerStyle={styles.messageList}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                />
                <TouchableOpacity style={styles.sendButton}>
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
            <View>
            <TouchableOpacity
              onPress={() => router.push('./messageList')}
            >
              <Text>
              Go To MessageList page
              </Text>
            </TouchableOpacity>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: "#f8f8f8",
    marginBottom: "5%",
  },
  messageList: {
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginBottom: 10,
    marginHorizontal: 10,
  },
  selfMessage: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  otherMessage: {
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  messageText: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#d1d1d1",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  textInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    paddingHorizontal: 10,
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    backgroundColor: "#6ee7b7",
    borderRadius: 20,
  },
  sendText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginTop: '5%'
  },
});

export default MessageUI;
