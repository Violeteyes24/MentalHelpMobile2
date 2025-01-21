import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from 'expo-router'

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

export default function CounselorList({ navigation }: any) {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    fetchCounselors();
  }, []);

  async function fetchCounselors() {
    let { data, error } = await supabase
      .from("users")
      .select("name, contact_number")
      .eq("user_type", "counselor");


    if (error) console.error(error);
    else setCounselors(data || []);
    setLoading(false);
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item}>
      {/* Image Placeholder */}
      <Image
        source={{
          uri: "https://static.vecteezy.com/system/resources/thumbnails/036/594/092/small_2x/man-empty-avatar-photo-placeholder-for-social-networks-resumes-forums-and-dating-sites-male-and-female-no-photo-images-for-unfilled-user-profile-free-vector.jpg",
        }} // Placeholder image URL
        style={styles.image}
      />
      {/* Name and Contact Number */}
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.contact}>{item.contact_number}</Text>
      </View>
    </TouchableOpacity>
    /*
      After clicking this button, I want to redirect this to the counselor's availability schedule
      do I need to create page inside /(tabs) that is [id]? and make it dynamic routing ? 

      I have a template of availability.tsx and have a calendar UI already as well as the "selected date" functionality.

      So i want after selecting the date, the availability time of that counselor should be displayed below the calendar UI

      This page needs to be scrollable since it will contain:
      1. Photo (place holder)
      2. Name
      3. Contact Number
      4. Credentials
      5. Short Biography
      6. Calendar UI 
      7. the availability time list after clicking a date from calendar UI
      8. Button to book an appointment

      note: these are listed as name, format, type respectively:

      table: availability_schedules
        - availability_schedule_id uuid string
        - counselor_id uuid string Foreign Key, REFERENCES(users)
        - start_time time without time zone string
        - end_time time without time zone string
        - date date string
        - is_available boolean boolean

      table: users (there are many things but these are the ones that I would use)
        - name varchar
        - contact number varchar
        - credentials text
        - short_biography text

      Don't worry because there is a relationship between availability_schedules and users
      FK (counselor_id) REFERENCES (users) 
      
    */
  );


  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6ee7b7" />
      </View>
    );
  }

  return (
    <View style={{ marginTop: "10%" }}>
      <View>
        <Text style={styles.title}>Counselor's List</Text>
      </View>
      <FlatList
        data={counselors} // The list of users with `user_type = counselor`
        keyExtractor={(item) => item.id}
        renderItem={renderItem} // Renders each counselor row
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity onPress={() => router.push('/app/(tabs)/availability') }>
        <Text> Test button go to availability </Text> 
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  item: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  role: {
    fontSize: 14,
    color: "#555",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25, // Makes the image circular
    marginRight: 16,
  },
  details: {
    flex: 1, // Ensures the name and contact stretch properly
  },
  contact: {
    fontSize: 14,
    color: "#555",
  },
  title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
        textAlign: 'center',
    },
});

/*
To do: 

- availability of counselors
- once availability is clicked, display details 
- contains book appointment
- interface of the upcoming appointment and a cancel / reschedule
- validations for appointment logic

*/
