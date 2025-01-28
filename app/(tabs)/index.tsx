import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface MoodData {
  mood_type: string;
  intensity: number;
}

export default function HomeScreen() {
  const { session } = useAuth();
  console.log(session);
  const [moodData, setMoodData] = useState<MoodData[] | null>(null);

  useEffect(() => {
    const getMoodData = async () => {
      const data = await fetchLatestMoodTrackerData(); // Fetch latest mood data
      setMoodData(data); // Update the state with the fetched data
    };

    getMoodData();
  }, []); // Empty array ensures this runs once when the component mounts

  async function fetchLatestMoodTrackerData(): Promise<MoodData[] | null> {
    let { data: mood_tracker, error } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity")
      .order("tracked_at", { ascending: false }) // Order by creation date, descending
      .limit(6); // Fetch the latest 6 entries

    if (error) {
      console.error("Error fetching mood tracker data:", error);
      return null;
    } else if (mood_tracker && mood_tracker.length > 0) {
      console.log("Latest mood data:", mood_tracker); // Log the 6 latest entries
      return mood_tracker; // Return the latest 6 entries
    } else {
      console.log("No mood tracker data found.");
      return null; // Return null if no data found
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        <Text style={styles.gradientText}>Mental</Text>
        <Text style={styles.markedText}>Help</Text>
      </Text>
      <Text style={styles.subtitle}>Your mental health companion</Text>
      <View>
        <Text style={styles.headerFont}>Your mood for today</Text>
      </View>
      <View>
        {moodData && moodData.length > 0 ? (
          moodData.map((mood, index) => (
            <View key={index} style={styles.moodItem}>
              <Text style={styles.moodText}>Mood Type: {mood.mood_type}</Text>
              <Text style={styles.moodText}>Intensity: {mood.intensity}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.moodText}>No mood data available</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
  },
  gradientText: {
    color: "#000",
    backgroundColor: "transparent",
  },
  markedText: {
    paddingHorizontal: 8,
    color: "#fff",
    backgroundColor: "#34d399",
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  headerFont: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
  },
  moodText: {
    fontSize: 18,
    marginTop: 10,
    color: "black",
  },
  moodItem: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    width: "90%",
  },
});
/*
TO DO:
1. Based on mood type and intensity, calculate the overall mood for the day.
2. Display the overall mood for the day in a creative, separate component.
 */