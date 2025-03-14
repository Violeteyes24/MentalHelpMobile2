import React, { useEffect, useState } from "react";
import { LogBox } from "react-native";
LogBox.ignoreAllLogs();

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
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";

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
  
  // New states for appointments
  const [modalVisible, setModalVisible] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  useEffect(() => {
    fetchCounselors();
  }, []);

  useEffect(() => {
    setCounselors(
      allCounselors.filter(
        (counselor: any) => counselor.department_assigned === selectedDepartment
      )
    );
  }, [selectedDepartment, allCounselors]);

  async function handleNewMessage(counselor_id: string) {
    const now = new Date().toISOString();
    let { data: appointmentData, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
      *,
      availability_schedules (
        start_time,
        end_time,
        date
      )
      `)
      .eq("user_id", session?.user.id)
      .eq("counselor_id", counselor_id)
      .gt("availability_schedules.date", now);

    if (appointmentError) console.error(appointmentError);
    if (!appointmentData || appointmentData.length === 0) {
      return alert("You must have a future appointment with this counselor to message.");
    }

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
      .select("user_id, name, contact_number, department_assigned")
      .eq("user_type", "counselor");

    if (error) console.error(error);
    else {
      setAllCounselors(data || []);
      setCounselors((data || []).filter(
        (counselor: any) => counselor.department_assigned === selectedDepartment
      ));
    }
    setLoading(false);
  }

  // Function to fetch upcoming appointments
  async function fetchUpcomingAppointments() {
    if (!session?.user.id) return;
    
    setAppointmentsLoading(true);
    const now = new Date().toISOString();
    
    let { data, error } = await supabase
      .from("appointments")
      .select(`
        appointment_id,
        status,
        appointment_type,
        counselor_id,
        users:counselor_id (name),
        availability_schedules (
          availability_schedule_id,
          date,
          start_time,
          end_time
        )
      `)
      .eq("user_id", session.user.id)
      .neq("status", "cancelled") // Exclude cancelled appointments
      .not("availability_schedules", "is", null)
      .gt("availability_schedules.date", now.split('T')[0])
      // Updated ordering with foreignTable option
      .order("date", { foreignTable: "availability_schedules", ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error);
      Alert.alert("Error", "Failed to load your appointments");
    } else {
      setAppointments(data || []);
    }
    setAppointmentsLoading(false);
  }

  // Update the cancellation function to also update availability
  async function handleCancelAppointment(appointmentId: string, scheduleId: string, counselorId: string) {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            // Cancel the appointment
            const { error } = await supabase
              .from("appointments")
              .update({ status: "cancelled" })
              .eq("appointment_id", appointmentId);
            if (error) {
              console.error("Error cancelling appointment:", error);
              Alert.alert("Error", "Failed to cancel appointment");
            } else {
              // Update the availability to be available
              const { error: schedError } = await supabase
                .from("availability_schedules")
                .update({ is_available: true })
                .eq("availability_schedule_id", scheduleId);
              if (schedError) {
                console.error("Error updating availability:", schedError);
                Alert.alert("Error", "Failed to update availability");
              } else {
                Alert.alert("Success", "Appointment cancelled successfully");
                router.push(`/availability/${counselorId}`);
              }
            }
          }
        }
      ]
    );
  }

  // Format the date and time for display
  function formatDateTime(date: string, startTime: string, endTime: string) {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    
    // Format time from HH:MM:SS to HH:MM AM/PM
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    return `${formattedDate}, ${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.user_id}
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
          e.stopPropagation();
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

  const departments = ["COECS", "CBA", "CHS", "COED", "COL", "IBED", "CAS"];

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Counselor's List</Text>
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

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          fetchUpcomingAppointments();
          setModalVisible(true);
        }}
      >
        <Text style={{ color: "white", fontSize: 12 }}>Upcoming Appointments</Text>
        <MaterialIcons name="event" size={24} color="white" />
      </TouchableOpacity>

      {/* Appointments Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upcoming Appointments</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {appointmentsLoading ? (
              <ActivityIndicator size="large" color="#6ee7b7" style={styles.modalLoader} />
            ) : appointments.length > 0 ? (
              <ScrollView style={styles.appointmentsList}>
                {appointments.map((appointment) => (
                  <View key={appointment.appointment_id} style={styles.appointmentItem}>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentCounselor}>
                        {appointment.users?.name || "Unknown Counselor"}
                      </Text>
                      <Text style={styles.appointmentDateTime}>
                        {appointment.availability_schedules
                          ? formatDateTime(
                              appointment.availability_schedules.date,
                              appointment.availability_schedules.start_time,
                              appointment.availability_schedules.end_time
                            )
                          : "Schedule not available"}
                      </Text>
                      <Text style={[
                        styles.appointmentStatus,
                        { color: appointment.status === "confirmed" ? "#4CAF50" : "#FF9800" }
                      ]}>
                        Status: {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.appointmentActions}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.cancelButton]}
                        // Pass appointment id, availability_schedule id, and counselor id to cancellation function
                        onPress={() => handleCancelAppointment(
                          appointment.appointment_id,
                          appointment.availability_schedules.availability_schedule_id,
                          appointment.counselor_id
                        )}
                      >
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noAppointments}>
                <MaterialIcons name="event-busy" size={48} color="#ccc" />
                <Text style={styles.noAppointmentsText}>No upcoming appointments</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Existing styles
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
  
  // New styles for the FAB and Appointments Modal
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#001F3F",
    width: "auto",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    padding: 12,
},
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalLoader: {
    padding: 40,
  },
  appointmentsList: {
    padding: 16,
  },
  appointmentItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentInfo: {
    marginBottom: 12,
  },
  appointmentCounselor: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  appointmentDateTime: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  appointmentStatus: {
    fontSize: 14,
    fontWeight: "bold",
  },
  appointmentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  noAppointments: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noAppointmentsText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
});