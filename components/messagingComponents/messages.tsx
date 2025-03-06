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
import { ScrollView as HScrollView } from 'react-native';

interface Message {
  message_id: string;
  sender_id: string;
  message_content: string;
  sent_at: string;
  sender_name?: string;
}

interface PredefinedMessage {
  id: string;
  message_content: string;
  next_message_id: string | null;
}

export default function Messages() {
  // console.log("Messages component is rendered");

  const { id } = useLocalSearchParams(); // Get selected user ID from the route
  const [messages, setMessages] = useState<Message[]>([]);
  const [predefinedOptions, setPredefinedOptions] = useState<PredefinedMessage[]>([]);
  const { session } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);

  console.log("Current user ID:", session?.user.id);
  console.log("page id: ", id);
useEffect(() => {
  console.log("useEffect triggered with id:", id);
  fetchMessages();
  fetchPredefinedOptions(); // Ensure this runs on component mount
  // Removed fetchUserName call for consistency with MessageList
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
  if (!id || !session?.user.id) {
    console.log("No ID found");
    return;
  }

  let { data, error } = await supabase
    .from("messages")
    .select(`
      message_id,
      sender_id,
      sent_at,
      message_content,
      users:sender_id (
        name
      )
    `)
    .eq("conversation_id", id)
    .order("sent_at", { ascending: false });

  console.log("Raw messages:", data);

  const formattedMessages = (data || []).map((msg: any) => ({
    message_id: msg.message_id,
    sender_id: msg.sender_id,
    message_content: msg.message_content,
    sent_at: msg.sent_at,
    sender_name: msg.users?.name || 'Unknown User'
  }));

  setMessages(formattedMessages);

  // Set correspondent name similar to MessageList by selecting the first message not from current user.
  const correspondent = formattedMessages.find(
    (msg) => msg.sender_id !== session?.user.id
  );
  setUserName(correspondent ? correspondent.sender_name : "Unknown User");
}

 async function fetchPredefinedOptions() {
  //  console.log("Fetching predefined options");
   const { data, error } = await supabase
     .from("predefined_messages")
     .select("*")
     .limit(2);

   if (error) {
     console.error("Error fetching predefined messages:", error);
   } else {
    //  console.log("Fetched predefined options:", data);
     setPredefinedOptions(data || []);
     console.log("Updated predefinedOptions state:", predefinedOptions); // This might still log an empty array due to async nature
   }
 }

  async function sendMessage(selectedMessage: PredefinedMessage) {
    console.log("Sending message:", selectedMessage);
    // Insert new message into the database
    const { error, data } = await supabase.from("messages").insert([
      {
        sender_id: session?.user.id, // User selecting the message
        // receiver_id: id, // Send to the selected user
        sent_at: new Date().toISOString(),
        received_at: null,
        is_read: false,
        conversation_id: id,
        message_type: "text",
        read_at: null,
        is_delivered: false,
        message_content: selectedMessage.message_content, // Use message_content_id instead of message_content
      },
    ]
  )
  .select()
  
    console.log("Message sent:", data);
    console.log("Error sending message:", error);
    if (error) {
      console.error("Error sending message:", error);
    } else {
      fetchMessages(); // Refresh messages after sending
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageWrapper}>
      {item.sender_id === session?.user.id ? (
        <View style={styles.userMessageContainer}>
          <Text style={styles.userMessage}>{item.message_content}</Text>
          <Text style={styles.timestamp}>{new Date(item.sent_at).toLocaleTimeString()}</Text>
        </View>
      ) : (
        <View style={[styles.botMessageContainer, styles.botMessageShadow]}>
          <Text style={styles.senderName}>{item.sender_name}</Text>
          <Text style={styles.botMessage}>{item.message_content}</Text>
          <Text style={[styles.timestamp, styles.botTimestamp]}>
            {new Date(item.sent_at).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{userName || 'Messages'}</Text>
      <FlatList
        style={styles.chatLog}
        contentContainerStyle={styles.chatLogContent}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id}
        inverted
      />

      {/* Predefined Messages Carousel */}
      <View style={styles.carouselContainer}>
        <HScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {predefinedOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => sendMessage(option)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{option.message_content}</Text>
            </TouchableOpacity>
          ))}
        </HScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: "7%",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
    marginTop: "10%",
  },
  chatLog: {
    flex: 1,
    marginBottom: 20,
  },
  chatLogContent: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  messageWrapper: {
    marginBottom: 20,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#6ee7b7",
    padding: 15,
    borderRadius: 20,
    borderBottomRightRadius: 5,
    maxWidth: "80%",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    paddingBottom: 8,
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    maxWidth: "80%",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    paddingBottom: 8,
  },
  botMessageShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userMessage: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  botMessage: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingTop: 2,
  },
  botTimestamp: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  carouselContainer: {
    height: 100,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 5,
  },
  carousel: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: "#6ee7b7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 5,
    height: 60,
    minWidth: 150,
    maxWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  optionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    textAlign: 'center',
  },
});
