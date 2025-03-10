import React, { useEffect, useState } from "react";
import { LogBox } from "react-native"; // Add LogBox import
// Suppress log notifications for this page
LogBox.ignoreAllLogs();

// If desired, override the global error handler here as well
declare const global: {
  ErrorUtils?: {
    setGlobalHandler: (callback: (error: Error, isFatal: boolean) => void) => void;
  };
};
if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Do nothing to hide error overlays
  });
}

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
import { useAuth } from "../../context/AuthContext";
import { MaterialIcons } from "@expo/vector-icons"; // Import icons

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

export default function CounselorList() {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [allCounselors, setAllCounselors] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("COECS");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    fetchCounselors();
  }, []);

  useEffect(() => {
    // filter local data based on selectedDepartment
    setCounselors(
      allCounselors.filter(
        (counselor: any) => counselor.department_assigned === selectedDepartment
      )
    );
  }, [selectedDepartment, allCounselors]);

  async function handleNewMessage(counselor_id: string) {
    const { data, error } = await supabase
      .from("conversations")
      .insert([
        {
          conversation_type: "active",
          created_by: session?.user.id,
          user_id: counselor_id,
        },
      ])
      .select();
    if (data) {
      router.push(`/messaging/${data[0].conversation_id}`);
    }
  }

  async function fetchCounselors() {
    let { data, error } = await supabase
      .from("users")
      .select("user_id, name, contact_number, department_assigned") // added field
      .eq("user_type", "counselor");

    if (error) console.error(error);
    else {
      setAllCounselors(data || []);
      // Initial filter based on default selectedDepartment
      setCounselors((data || []).filter(
        (counselor: any) => counselor.department_assigned === selectedDepartment
      ));
    }
    setLoading(false);
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.user_id} // Updated key from item.id to item.user_id
      style={styles.item}
      onPress={() => {
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
      <TouchableOpacity
        style={styles.messageButton}
        onPress={(e) => {
          e.stopPropagation(); // Prevent triggering the parent TouchableOpacity
          handleNewMessage(item.user_id);
        }}
      >
        <MaterialIcons name="message" size={24} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6ee7b7" />
      </View>
    );
  }

  // array of default department filter values
  const departments = ["COECS", "CBA", "CHS", "COED", "COL", "IBED", "CAS"];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Counselor's List</Text>
        {/* Filter buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {departments.map((dep) => (
            <TouchableOpacity
              key={dep}
              style={[
                styles.filterButton,
                selectedDepartment === dep && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedDepartment(dep)}
            >
              <Text style={[
                styles.filterText,
                selectedDepartment === dep && styles.filterTextActive,
              ]}>{dep}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.list}>
        {counselors.map((item) => renderItem({ item }))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginTop: 60,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#6ee7b7",
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  contact: {
    fontSize: 14,
    color: "#666",
  },
  messageButton: {
    backgroundColor: "#6ee7b7",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#333",
    marginBottom: 10,
  },
  // styles for filter buttons
  filterContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#6ee7b7",
  },
  filterText: {
    color: "#333",
    fontSize: 14,
  },
  filterTextActive: {
    color: "#fff",
  },
});