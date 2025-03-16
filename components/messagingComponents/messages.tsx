import React, { useEffect, useState, useRef } from "react";
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

  const { id } = useLocalSearchParams(); // Get conversation ID from the route
  const [messages, setMessages] = useState<Message[]>([]);
  const [predefinedOptions, setPredefinedOptions] = useState<PredefinedMessage[]>([]);
  const { session } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  // Create ref for FlatList to handle scrolling
  const flatListRef = useRef<FlatList>(null);

  console.log("Current user ID:", session?.user.id);
  console.log("Conversation ID: ", id);

  useEffect(() => {
    fetchMessages(); // This will call fetchConversationDetails which will call fetchAllMessagesWithRecipient
    fetchPredefinedOptions();
    
    // Set up listeners for real-time updates for all message changes
    const messagesChannel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          console.log("Message change received!", payload);
          // Reinitiate the full fetch process to get all updated messages
          if (recipientId) {
            fetchAllMessagesWithRecipient(recipientId);
          } else {
            fetchMessages(); // This will identify the recipient and then fetch all messages
          }
        }
      )
      .subscribe();

    // Set up listeners for conversation changes
    const conversationsChannel = supabase
      .channel("conversations-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          console.log("Conversation change received!", payload);
          // This could be a new conversation between the same users
          if (recipientId) {
            fetchAllMessagesWithRecipient(recipientId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [id]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100); // Small delay to ensure the list has rendered
    }
  }, [messages]);

  // Function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  async function fetchConversationDetails() {
    if (!id || !session?.user.id) {
      console.log("No conversation ID or user ID found");
      return;
    }

    // Get the conversation details to find the recipient
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("conversation_id", id)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      return;
    }

    if (!conversationData) {
      console.log("No conversation found");
      return;
    }

    // Determine who the recipient is (the other person in the conversation)
    const otherUserId = conversationData.created_by === session.user.id 
      ? conversationData.user_id 
      : conversationData.created_by;
    
    setRecipientId(otherUserId);
    console.log("Identified recipient ID:", otherUserId);

    // Fetch recipient's details
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name, user_type")
      .eq("user_id", otherUserId)
      .single();

    if (userError) {
      console.error("Error fetching user details:", userError);
      return;
    }

    if (userData) {
      setUserName(userData.name);
      console.log("Recipient name:", userData.name);
    }
    
    // After finding the recipient, fetch all messages between them
    fetchAllMessagesWithRecipient(otherUserId);
  }

  async function fetchAllMessagesWithRecipient(recipientId: string) {
    if (!session?.user.id || !recipientId) {
      console.error("Missing current user ID or recipient ID");
      return;
    }
    
    console.log("Fetching all conversations between", session.user.id, "and", recipientId);
    
    try {
      // First, get all conversations between these two users
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("conversation_id")
        .or(`and(user_id.eq.${session.user.id},created_by.eq.${recipientId}),and(user_id.eq.${recipientId},created_by.eq.${session.user.id})`);
      
      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        return;
      }
      
      if (!conversationsData || conversationsData.length === 0) {
        console.log("No conversations found between these users");
        setMessages([]);
        return;
      }
      
      console.log("Found conversations:", conversationsData);
      
      // Extract conversation IDs
      const conversationIds = conversationsData.map(c => c.conversation_id);
      
      // Now fetch all messages from these conversations
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          message_id,
          sender_id,
          sent_at,
          message_content,
          conversation_id,
          users:sender_id (
            name
          )
        `)
        .in("conversation_id", conversationIds)
        .order("sent_at", { ascending: true });
      
      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        return;
      }
      
      console.log("Raw messages data from all conversations:", messagesData);
      console.log("Total messages retrieved:", messagesData ? messagesData.length : 0);
      
      if (!messagesData || messagesData.length === 0) {
        console.log("No messages found in any conversation");
        setMessages([]);
        return;
      }
      
      const formattedMessages = messagesData.map((msg: any) => {
        const formattedMsg = {
          message_id: msg.message_id,
          sender_id: msg.sender_id,
          message_content: msg.message_content,
          sent_at: msg.sent_at,
          sender_name: msg.users?.name || 'Unknown User'
        };
        return formattedMsg;
      });
      
      console.log("All formatted messages:", formattedMessages);
      setMessages(formattedMessages);
      
      // If we already have userName from fetchConversationDetails, don't override it
      if (!userName && formattedMessages.length > 0) {
        // Set correspondent name from messages as fallback
        const correspondent = formattedMessages.find(
          (msg) => msg.sender_id !== session?.user.id
        );
        if (correspondent) {
          setUserName(correspondent.sender_name);
        }
      }
    } catch (error) {
      console.error("Error in fetchAllMessagesWithRecipient:", error);
    }
  }

  async function fetchMessages() {
    if (!id || !session?.user.id) {
      console.log("No ID found");
      return;
    }

    console.log("Fetching messages for conversation:", id);

    try {
      // We'll just fetch conversation details, which will in turn call fetchAllMessagesWithRecipient
      // This way we ensure we have the recipient ID first
      await fetchConversationDetails();
      
    } catch (catchError) {
      console.error("Exception in fetchMessages:", catchError);
    }
  }

 async function fetchPredefinedOptions() {
   try {
     console.log("Fetching predefined messages...");
     const { data, error } = await supabase
       .from("predefined_messages")
       .select("*")
       .limit(5);  // Increased from 2 to 5 to get more options

     if (error) {
       console.error("Error fetching predefined messages:", error);
       return;
     }

     console.log("Predefined messages data:", data);
     
     if (!data || data.length === 0) {
       console.log("No predefined messages found");
       // Add fallback messages if none found in database
       setPredefinedOptions([
         { id: "default1", message_content: "Hello, how are you?", next_message_id: null },
         { id: "default2", message_content: "I need some help.", next_message_id: null }
       ]);
       return;
     }
     
     setPredefinedOptions(data);
     console.log("Updated predefinedOptions state:", data);
   } catch (error) {
     console.error("Exception in fetchPredefinedOptions:", error);
     // Set fallback options in case of error
     setPredefinedOptions([
       { id: "fallback1", message_content: "Hello", next_message_id: null },
       { id: "fallback2", message_content: "I need assistance", next_message_id: null }
     ]);
   }
 }

  async function sendMessage(selectedMessage: PredefinedMessage) {
    console.log("Sending message:", selectedMessage);
    if (!session?.user.id || !id || !recipientId) {
      console.error("Missing user ID or conversation ID or recipient ID for sending message");
      return;
    }

    try {
      // Insert new message into the database
      const { error, data } = await supabase.from("messages").insert([
        {
          sender_id: session?.user.id,
          sent_at: new Date().toISOString(),
          received_at: null,
          is_read: false,
          conversation_id: id, // Using the current conversation ID for the new message
          message_type: "text",
          read_at: null,
          is_delivered: false,
          message_content: selectedMessage.message_content,
          // Include message_content_id only if it exists in your schema and predefined message
          // message_content_id: selectedMessage.id,
        },
      ])
      .select();
    
      console.log("Message sent response:", data);
      
      if (error) {
        console.error("Error sending message:", error);
      } else {
        console.log("Message sent successfully!");
        // Wait a moment to ensure the database has time to process before fetching again
        setTimeout(() => {
          // Fetch all messages between the users again to include this new message
          fetchAllMessagesWithRecipient(recipientId);
        }, 500);
      }
    } catch (sendError) {
      console.error("Exception in sendMessage:", sendError);
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

  // Display empty state if no messages
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No messages yet. Start the conversation by sending a message below.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{userName || 'Conversation'}</Text>
      
      {/* Debug information */}
      <Text style={styles.debugText}>
        Current Conversation: {id} | Total Messages: {messages.length}
      </Text>
      
      <FlatList
        ref={flatListRef}
        style={styles.chatLog}
        contentContainerStyle={styles.chatLogContent}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id}
        ListEmptyComponent={renderEmptyComponent}
        onContentSizeChange={scrollToBottom} // Scroll to bottom when content size changes
        onLayout={scrollToBottom} // Scroll to bottom on initial layout
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
    flexGrow: 1, // Ensure content can grow to allow scrolling
    justifyContent: 'flex-end', // Keep content at the bottom when not enough to fill screen
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
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
  debugText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    marginBottom: 10,
    textAlign: 'center',
  },
});
