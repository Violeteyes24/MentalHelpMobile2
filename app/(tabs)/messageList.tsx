import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

type Message = {
  sender_id: string;
  message_content: string;
  conversation_id: string;
  sender_name?: string;
  created_at?: string;
};

type AggregatedConversation = {
  sender_name: string;
  conversation_ids: string[];
  message_contents: string[];
  sender_ids: string[];
  latestConversationId: string;
  count: number;
};

/**
 * Transforms an array of conversations by aggregating entries with the same sender_name
 */
function aggregateConversationsBySender(conversations: Message[]): AggregatedConversation[] {
  // Create a map to group conversations by sender name
  const conversationMap = new Map<string, AggregatedConversation>();

  // Process each conversation
  for (const conversation of conversations) {
    // Skip conversations without sender names
    if (!conversation.sender_name) continue;

    const senderName = conversation.sender_name;

    // If this sender is not in our map yet, create a new entry
    if (!conversationMap.has(senderName)) {
      conversationMap.set(senderName, {
        sender_name: senderName,
        conversation_ids: [conversation.conversation_id],
        message_contents: [conversation.message_content],
        sender_ids: [conversation.sender_id],
        latestConversationId: conversation.conversation_id,
        count: 1
      });
    } else {
      // Update existing entry
      const currentEntry = conversationMap.get(senderName)!;
      
      // Add the conversation details to existing entry if not already present
      if (!currentEntry.conversation_ids.includes(conversation.conversation_id)) {
        currentEntry.conversation_ids.push(conversation.conversation_id);
        currentEntry.message_contents.push(conversation.message_content);
        currentEntry.count += 1;
      }
      
      // Only add unique sender IDs
      if (!currentEntry.sender_ids.includes(conversation.sender_id)) {
        currentEntry.sender_ids.push(conversation.sender_id);
      }
    }
  }

  // Convert map values to array
  return Array.from(conversationMap.values());
}

export default function MessageList() {
  const [conversations, setConversations] = useState<Message[]>([]);
  const [aggregatedConversations, setAggregatedConversations] = useState<AggregatedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    fetchConversations();

    const channels = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          console.log("Change received!", payload);
          fetchConversations(); // Refetch conversations on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  // Transform raw conversations into aggregated conversations
  useEffect(() => {
    const aggregated = aggregateConversationsBySender(conversations);
    setAggregatedConversations(aggregated);
  }, [conversations]);

  async function fetchConversations() {
    setLoading(true);
    try {
      const currentUserId = session?.user.id;
      if (!currentUserId) return;

      // Query the conversation_list_view
      let { data, error } = await supabase
        .from("conversation_list_view")
        .select("*")
        .or(`user_id.eq.${currentUserId},created_by.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
      } else {
        // Adapt the data to match your Message type
        const formattedConversations = data.map((conversation) => ({
          conversation_id: conversation.conversation_id,
          sender_id: conversation.created_by || "",
          message_content: `${
            conversation.conversation_type || "Conversation"
          }`, // You might want to fetch the last message instead
          sender_name:
            conversation.user_id === currentUserId
              ? conversation.creator_name
              : conversation.user_name,
          created_at: conversation.created_at,
        }));

        setConversations(formattedConversations);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }: { item: AggregatedConversation }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        console.log(
          `Navigating to messaging page with latest conversation ID: ${item.latestConversationId}`
        );
        router.push(`/messaging/${item.latestConversationId}`);
      }}
    >
      <Image
        source={{
          uri: "https://static.vecteezy.com/system/resources/thumbnails/036/594/092/small_2x/man-empty-avatar-photo-placeholder-for-social-networks-resumes-forums-and-dating-sites-male-and-female-no-photo-images-for-unfilled-user-profile-free-vector.jpg",
        }}
        style={styles.avatar}
      />
      <View style={styles.messageContainer}>
        <Text style={styles.name}>{item.sender_name}</Text>
        <Text style={styles.message}>
          {item.count > 1
            ? `${item.count} conversations`
            : item.message_contents[0]}
        </Text>
      </View>
      {item.count > 1 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6ee7b7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      {aggregatedConversations.length === 0 ? (
        <View style={styles.noMessagesContainer}>
          <Text style={styles.noMessagesText}>No messages found</Text>
        </View>
      ) : (
        <FlatList
          data={aggregatedConversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.sender_name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginVertical: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  messageContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  message: {
    fontSize: 16,
    color: "#666",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  noMessagesText: {
    fontSize: 18,
    color: "#999",
  },
  badgeContainer: {
    backgroundColor: "#6ee7b7",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});