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
import { useAuth } from "../../context/AuthContext";
import ReasonModal from './ReasonModal';

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
  const { session } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability();
    }
    fetchCounselorDetails();

    const appointmentChannel = supabase
      .channel("custom-appointments-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          console.log("Appointment change received!", payload);
          if (selectedDate) {
            fetchAvailability();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentChannel);
    };
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

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    fetchAvailability();
  };

  async function handleBooking(slot: any) {
    setSelectedSlot(slot);
    setIsModalVisible(true);
  }

  async function handleConfirm(reason: string, isGroupEligible: boolean) {
    setIsModalVisible(false);
    if (selectedSlot) {
      const slot = selectedSlot;
      console.log("Booking slot:", slot);
      
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
        if (data) {
          const { data: appointmentData, error: appointmentError } = await supabase
            .from("appointments")
            .insert([
              {
                user_id: session?.user.id,
                counselor_id: counselorId,
                availability_schedule_id: slot.availability_schedule_id,
                appointment_type: "individual",
                reason: reason,
                is_group_eligible: isGroupEligible,
              },
            ]);

          if (appointmentError) {
            console.log("Error creating appointment:", appointmentError);
            Alert.alert("Error", "Failed to create the appointment. Please try again.");
          } else {
            console.log("Appointment created successfully:", appointmentData);
            Alert.alert(
              "Success",
              `You successfully booked the slot: ${slot.start_time} - ${slot.end_time}`
            );
            fetchAvailability();
          }
        }
      }
    }
  }

  const convertTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {counselorDetails && (
        <View style={styles.counselorInfoContainer}>
          <View style={styles.profileHeader}>
            <Image
              source={{
                uri: "https://static.vecteezy.com/system/resources/thumbnails/036/594/092/small_2x/man-empty-avatar-photo-placeholder-for-social-networks-resumes-forums-and-dating-sites-male-and-female-no-photo-images-for-unfilled-user-profile-free-vector.jpg",
              }}
              style={styles.image}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{counselorDetails.name}</Text>
              <Text style={styles.contact}>{counselorDetails.contact_number}</Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Credentials</Text>
            <Text style={styles.credentials}>{counselorDetails.credentials}</Text>
            
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text style={styles.bio}>{counselorDetails.short_biography}</Text>
          </View>
        </View>
      )}
      
      <View style={styles.calendarContainer}>
        <Text style={styles.calendarTitle}>Select a Date</Text>
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            [selectedDate]: {
              selected: true,
              marked: true,
              selectedColor: "#4a90e2",
            },
          }}
          theme={{
            selectedDayBackgroundColor: '#4a90e2',
            todayTextColor: '#4a90e2',
            arrowColor: '#4a90e2',
            dotColor: '#4a90e2',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
          }}
        />
      </View>
      
      {selectedDate && (
        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateTitle}>
            Availability for {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#c8e6c9'}]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#ffcdd2'}]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderSlot = ({ item }: { item: any }) => (
    <View style={[styles.slot, !item.is_available && styles.unavailable]}>
      <View style={styles.slotRow}>
        <View style={styles.timeContainer}>
          <Icon 
            name="access-time" 
            size={18} 
            color={item.is_available ? "#368a73" : "#b71c1c"} 
            style={styles.timeIcon}
          />
          <Text style={[styles.timeText, !item.is_available && styles.unavailableText]}>
            {convertTo12Hour(item.start_time)} - {convertTo12Hour(item.end_time)}
          </Text>
        </View>
        {item.is_available ? (
          <TouchableOpacity 
            style={styles.bookButton} 
            onPress={() => handleBooking(item)}
          >
            <Text style={styles.bookButtonText}>Book</Text>
            <Icon name="event-available" size={16} color="#fff" style={styles.bookIcon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.bookedTag}>
            <Text style={styles.bookedText}>Booked</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="event-busy" size={50} color="#ccc" />
      <Text style={styles.emptyText}>
        {selectedDate 
          ? "No availability for this date" 
          : "Select a date to view availability"}
      </Text>
    </View>
  );

  return (
    <>
      <FlatList
        data={availability}
        keyExtractor={(item) => item.availability_schedule_id}
        renderItem={renderSlot}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={selectedDate ? renderEmptyList : null}
        contentContainerStyle={styles.container}
      />
      <ReasonModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  header: { 
    marginBottom: 20, 
  },
  counselorInfoContainer: {
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  image: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    borderWidth: 2,
    borderColor: '#4a90e2',
  },
  nameContainer: {
    marginLeft: 16,
    flex: 1,
  },
  name: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: '#333',
  },
  contact: { 
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  selectedDateContainer: {
    marginTop: 8,
    marginBottom: 16, 
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  credentials: { 
    fontSize: 14, 
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 8,
  },
  bio: { 
    fontSize: 14, 
    color: '#555',
    lineHeight: 20,
  },
  slot: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  unavailable: { 
    backgroundColor: '#ffebee', 
    borderLeftColor: '#ef5350',
  },
  unavailableText: {
    color: '#666',
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#368a73",
    borderRadius: 8,
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 6,
  },
  bookIcon: {
    marginTop: 0,
  },
  bookedTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bookedText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});