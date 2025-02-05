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
import { useAuth } from "../../context/AuthContext";

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
  const { session } = useAuth();

useEffect(() => {
  console.log("useEffect triggered with id:", id);
  fetchMessages();
  fetchPredefinedOptions(); // Ensure this runs on component mount

  const allChannel = supabase
    .channel("custom-all-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      (payload) => {
        console.log("Change received!", payload);
        fetchMessages();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(allChannel);
  };
}, [id]);


  async function fetchMessages() {
    if (!id) {
      console.log("No ID found");
      return;
    }

    // console.log("Fetching messages for ID:", id);
    const currentUserId = session?.user.id;
    // Fetch conversation between logged-in user and the selected user
    let { data, error } = await supabase
      .from("messages")
      .select(
        `
                    sender_id,
                    receiver_id,
                    sent_at,
                    predefined_messages (
                        message_content
                    )
                `
      )
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("sent_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      // console.log("this is the messages.tsx and this is the data of fetchMessages function", data);
      const formattedMessages =
        data?.map((msg: any) => ({
          message_id: msg.message_id || Math.random().toString(), // Ensure a unique key if message_id is missing
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          message_content:
            msg.predefined_messages?.message_content || "No content available", // Fallback for null values
          sent_at: msg.sent_at,
        })) || [];

      setMessages(formattedMessages || []);
      fetchPredefinedOptions();
    }
  }

 async function fetchPredefinedOptions() {
   console.log("Fetching predefined options");
   const { data, error } = await supabase
     .from("predefined_messages")
     .select("*")
     .limit(2);

   if (error) {
     console.error("Error fetching predefined messages:", error);
   } else {
     console.log("Fetched predefined options:", data);
     setPredefinedOptions(data || []);
     console.log("Updated predefinedOptions state:", predefinedOptions); // This might still log an empty array due to async nature
   }
 }

  async function sendMessage(selectedMessage: PredefinedMessage) {
    console.log("Sending message:", selectedMessage);
    // Insert new message into the database
    const { error } = await supabase.from("messages").insert([
      {
        sender_id: session?.user.id, // User selecting the message
        receiver_id: id, // Send to the selected user
        sent_at: new Date().toISOString(),
        received_at: null,
        is_read: false,
        conversation_id: null,
        message_type: "text",
        read_at: null,
        is_delivered: false,
        message_content_id: selectedMessage.id, // Use message_content_id instead of message_content
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
