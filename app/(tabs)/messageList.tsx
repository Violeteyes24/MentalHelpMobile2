import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";
import { useState, useEffect } from "react";

type Message = {
  name: string;
  message: string;
};

export default function MessageList() {
  const [messages, setMessages] = useState<Message[]>([]);

  async function fetchMessages() {
    let { data, error } = await supabase
      .from("messages")
      .select("*");

    // if (error) {
    //   console.error(error);
    // } else {
    //   setMessages(data);
    // }
  }

  useEffect(() => {
    fetchMessages();
  }, []);

  const exampleDATA: Message[] = [
    {
      name: 'Zachary Legaria',
      message: 'How are you'
    },
    {
      name: 'Rezelle June',
      message: 'Mo balhin ta A ? '
    },
    {
      name: 'Jelah Marie',
      message: 'Ganahan ko mo balhin A, hayst'
    }
  ];

  const renderItem = ({ item }: { item: Message }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <Image
        source={{
          uri: "https://static.vecteezy.com/system/resources/thumbnails/036/594/092/small_2x/man-empty-avatar-photo-placeholder-for-social-networks-resumes-forums-and-dating-sites-male-and-female-no-photo-images-for-unfilled-user-profile-free-vector.jpg",
        }}
        style={styles.avatar}
      />
      <View style={styles.messageContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.message}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Message List</Text>
      <FlatList
        data={exampleDATA}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333"
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
    elevation: 2
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15
  },
  messageContainer: {
    flex: 1
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333"
  },
  message: {
    fontSize: 16,
    color: "#666"
  }
});
