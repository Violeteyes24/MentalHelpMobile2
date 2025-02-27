import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

export default function CounselorList() {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCounselors();
  }, []);

  async function fetchCounselors() {
    let { data, error } = await supabase
      .from("users")
      .select("user_id, name, contact_number")
      .eq("user_type", "counselor");

    if (error) console.error(error);
    else setCounselors(data || []);
    // console.log("Data of Counselors:", JSON.stringify(data, null, 2)); // Pretty print the objects
    // is this the right console.log ? I don't understand why it is null, but on my app, it displays the counselor's name, and number, fetchcounselor is working correctly.
    setLoading(false);
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.item}
      onPress={() => {
        console.log("Navigating to:", item.user_id); // Check if user_id is available
        router.push(`/availability/${item.user_id}`);
      }}
    >
      <Image
        source={{
          uri: "https://static.vecteezy.com/system/resources/thumbnails/036/594/092/small_2x/man-empty-avatar-photo-placeholder-for-social-networks-resumes-forums-and-dating-sites-male-and-female-no-photo-images-for-unfilled-user-profile-free-vector.jpg",
        }}
        style={styles.image}
      />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.contact}>{item.contact_number}</Text>
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
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ marginTop: "10%" }}>
        <Text style={styles.title}>Counselor's List</Text>
        <FlatList
          data={counselors}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  item: {
    flexDirection: "row",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  image: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  details: { flex: 1 },
  name: { fontSize: 18, fontWeight: "bold" },
  contact: { fontSize: 14, color: "#555" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center" },
});
