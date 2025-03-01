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
};

export default function MessageList() {
  const [conversations, setConversations] = useState<Message[]>([]);
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

  const renderItem = ({ item }: { item: Message }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        console.log(
          `Navigating to messaging page with user ID: ${item.conversation_id}`
        );
        router.push(`/messaging/${item.conversation_id}`); // Navigate to dynamic route
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
        <Text style={styles.message}>{item.message_content}</Text>
      </View>
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
      {conversations.length === 0 ? (
        <View style={styles.noMessagesContainer}>
          <Text style={styles.noMessagesText}>No messages found</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.conversation_id}
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
});
