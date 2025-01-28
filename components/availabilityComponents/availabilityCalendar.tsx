import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import { Calendar } from "react-native-calendars";
import { createClient } from "@supabase/supabase-js";
import { Icon } from "@rneui/themed";

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
      // console.log(data);
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

async function handleBooking(slot: any) {
  Alert.alert(
    "Confirm Booking", // Title
    `Do you want to book the slot: ${slot.start_time} - ${slot.end_time}?`, // Message
    [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => console.log("Booking canceled"), // Optional: Log or take action
      },
      {
        text: "Confirm",
        onPress: async () => {
          console.log("Booking slot:", slot);
          // Proceed with booking logic
          const { data, error } = await supabase
            .from("availability_schedules")
            .update({ is_available: false })
            .eq("counselor_id", counselorId)
            .eq("availability_schedule_id", slot.availability_schedule_id)
            .select();

          if (error) {
            console.error("Error updating availability:", error);
            Alert.alert("Error", "Failed to book the slot. Please try again.");
          } else {
            console.log("Availability updated successfully:", data);
            Alert.alert(
              "Success",
              `You successfully booked the slot: ${slot.start_time} - ${slot.end_time}`
            );
          }
        },
      },
    ],
    { cancelable: true } // Allow dismissal by tapping outside
  );
}


  const convertTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number); // Split hours and minutes
    const ampm = hours >= 12 ? "PM" : "AM"; // Determine AM or PM
    const hour12 = hours % 12 || 12; // Convert 0 or 12 to 12 for 12-hour format
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
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
          <View style={styles.card}>
            <Text style={styles.credentials}>
              Credentials: {counselorDetails.credentials}
            </Text>
            <Text style={styles.bio}>Biography: {counselorDetails.short_biography}</Text>
          </View>
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
      <Text style={styles.scheduleNotice}>{selectedDate}</Text>
      <Text style={styles.scheduleNotice}>Schedule (Red is unavailable)</Text>
    </View>
  );

  const renderSlot = ({ item }: { item: any }) => (
    <View style={[styles.slot, !item.is_available && styles.unavailable]}>
      <View style={styles.slotRow}>
        <Text style={styles.timeText}>
          {convertTo12Hour(item.start_time)} - {convertTo12Hour(item.end_time)}
        </Text>
        {item.is_available && (
          <TouchableOpacity onPress={() => handleBooking(item)}>
            <Icon name="event-available" size={24} color="#368a73" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={availability}
      keyExtractor={(item) => item.availability_schedule_id}
      renderItem={renderSlot}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { marginBottom: 20, marginTop: 40 },
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
  scheduleNotice: {
    marginTop: 16,
    marginBottom: 0,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },
  bookButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#368a73",
    borderRadius: 5,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  bookIcon: {
    marginTop: 8,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent", // Optional for better alignment
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Ensures the icon is at the end
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600", // Makes the time more prominent
    color: "#000", // Adjust color if needed
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,  // For Android shadow
  },
});
