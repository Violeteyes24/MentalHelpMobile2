import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

export default function AvailabilityCalendar({
  counselorId,
}: {
  counselorId: string;
}) {
  const [availability, setAvailability] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [counselorDetails, setCounselorDetails] = useState<any>(null);

  useEffect(() => {
    fetchAvailability();
    fetchCounselorDetails();
  }, [selectedDate]);

  async function fetchAvailability() {
    const { data, error } = await supabase
      .from("availability_schedules")
      .select("*")
      .eq("counselor_id", counselorId)
      .eq("date", selectedDate);

    if (error) console.error(error);
    else setAvailability(data || []);
  }

  async function fetchCounselorDetails() {
    const { data, error } = await supabase
      .from("users")
      .select("name, contact_number, credentials, short_biography")
      .eq("user_id", counselorId)
      .single();

    if (error) console.error(error);
    else setCounselorDetails(data);
  }

  const handleDayPress = (day: any) => setSelectedDate(day.dateString);

  return (
    <View style={styles.container}>
      {counselorDetails && (
        <>
          <Image
            source={{
              uri: "https://static.vecteezy.com/system/resources/thumbnails/036/594/092/small_2x/man-empty-avatar-photo-placeholder-for-social-networks-resumes-forums-and-dating-sites-male-and-female-no-photo-images-for-unfilled-user-profile-free-vector.jpg",
            }}
            style={styles.image}
          />
          <Text style={styles.name}>{counselorDetails.name}</Text>
          <Text style={styles.contact}>{counselorDetails.contact_number}</Text>
          <Text style={styles.credentials}>{counselorDetails.credentials}</Text>
          <Text style={styles.bio}>{counselorDetails.short_biography}</Text>
        </>
      )}
      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          [selectedDate]: {
            selected: true,
            marked: true,
            selectedColor: "blue",
          },
        }}
      />
      <FlatList
        data={availability}
        keyExtractor={(item) => item.availability_schedule_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.slot, !item.is_available && styles.unavailable]}
          >
            <Text>
              {item.start_time} - {item.end_time}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  image: { width: 100, height: 100, borderRadius: 50, alignSelf: "center" },
  name: { fontSize: 20, fontWeight: "bold", textAlign: "center" },
  contact: { textAlign: "center", marginBottom: 10 },
  credentials: { fontWeight: "600", marginBottom: 5 },
  bio: { fontSize: 14, marginBottom: 10 },
  slot: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#c8e6c9",
    borderRadius: 5,
  },
  unavailable: { backgroundColor: "#ffcdd2" },
});
