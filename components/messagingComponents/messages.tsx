import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  message_content: string;
  sent_at: string;
}

interface PredefinedMessage {
  id: string;
  message_text: string;
  next_message_id: string | null;
}

export default function Messages() {
  console.log("Messages component is rendered");

  const { id } = useLocalSearchParams(); // Get selected user ID from the route
  const [messages, setMessages] = useState<Message[]>([]);
  const [predefinedOptions, setPredefinedOptions] = useState<PredefinedMessage[]>([]);

  useEffect(() => {
    console.log("useEffect called with id:", id);
    fetchMessages();
    
    const allChannel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('Change received!', payload);
          fetchMessages(); // Refresh messages on any change
        }
      )
      .subscribe();

    const insertChannel = supabase.channel('custom-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('Insert received!', payload);
          fetchMessages(); // Refresh messages on insert
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up channels");
      supabase.removeChannel(allChannel);
      supabase.removeChannel(insertChannel);
    };
  }, [id]);

  async function fetchMessages() {
    if (!id) {
      console.log("No ID found");
      return;
    }

    console.log("Fetching messages for ID:", id);

    // Fetch conversation between logged-in user and the selected user
    const { data, error } = await supabase
      .from("messages")
      .select("*, predefined_messages(message_content)")
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      console.log("this is the messages.tsx and this is the data of fetchMessages function", data);
      setMessages(data || []);
      fetchPredefinedOptions();
    }
  }

  async function fetchPredefinedOptions() {
    console.log("Fetching predefined options");
    // Fetch predefined options for the current conversation
    const { data, error } = await supabase
      .from("predefined_messages")
      .select("*")
      .limit(2); // Limit to 2 for testing purposes

    if (error) {
      console.error("Error fetching predefined messages:", error);
    } else {
      console.log("Fetched predefined options:", data);
      setPredefinedOptions(data || []);
    }
  }

  async function sendMessage(selectedMessage: PredefinedMessage) {
    console.log("Sending message:", selectedMessage);
    // Insert new message into the database
    const { error } = await supabase.from("messages").insert([
      {
        sender_id: id, // User selecting the message
        receiver_id: id, // Assuming a predefined flow
        message_content: selectedMessage.message_text,
        sent_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Error sending message:", error);
    } else {
      fetchMessages(); // Refresh messages after sending
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender_id === id ? styles.selfMessage : styles.otherMessage,
      ]}
      key={item.message_id} // Ensure unique key for each message
    >
      {item.sender_id !== id && (
        <Image
          source={{ uri: "https://via.placeholder.com/40" }}
          style={styles.avatar}
        />
      )}
      <Text style={styles.messageText}>{item.message_content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id}
        inverted
      />

      <View style={styles.optionsContainer}>
        {predefinedOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionButton}
            onPress={() => sendMessage(option)}
          >
            <Text style={styles.optionText}>{option.message_text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20, backgroundColor: "#f8f8f8" },
  messageContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginBottom: 10,
    marginHorizontal: 10,
  },
  selfMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#6ee7b7",
    padding: 10,
    borderRadius: 10,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#d1d1d1",
    padding: 10,
    borderRadius: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  messageText: { fontSize: 16, color: "#333" },
  optionsContainer: { padding: 10, borderTopWidth: 1, borderColor: "#e1e1e1" },
  optionButton: {
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
    marginVertical: 5,
  },
  optionText: { color: "#fff", textAlign: "center" },
});
