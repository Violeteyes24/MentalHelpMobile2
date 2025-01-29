import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { RadarChart } from "@salmonco/react-native-radar-chart";
import { LineChart } from "react-native-chart-kit";

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
      const data = await fetchLatestMoodTrackerData();
      setMoodData(data);
    };
    getMoodData();
  }, []);

  async function fetchLatestMoodTrackerData(): Promise<MoodData[] | null> {
    let { data: mood_tracker, error } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity")
      .order("tracked_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Error fetching mood tracker data:", error);
      return null;
    } else if (mood_tracker && mood_tracker.length > 0) {
      console.log("Latest mood data:", mood_tracker);
      return mood_tracker;
    } else {
      console.log("No mood tracker data found.");
      return null;
    }
  }

  const screenWidth = Dimensions.get("window").width;

  const radarChartData = moodData
    ? moodData.map((mood) => ({ label: mood.mood_type, value: mood.intensity }))
    : [];

  const lineChartData = moodData
    ? {
        labels: moodData.map((_, index) => `Entry ${index + 1}`),
        datasets: [
          {
            data: moodData.map((mood) => mood.intensity),
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      }
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Mental<Text style={styles.highlight}>Help</Text>
      </Text>
      <Text style={styles.subtitle}>Your mental health companion</Text>

      {radarChartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Mood Distribution</Text>
          <RadarChart
            data={radarChartData}
            maxValue={5}
            gradientColor={{
              startColor: "#34d399",
              endColor: "#e1ede3",
              count: 5,
            }}
            stroke={["#A3D9A5", "#68C48E", "#34D399", "#1C7F56", "#0B5A3B"]}
            strokeWidth={[1, 1, 1, 1, 1]}
            strokeOpacity={[1, 1, 1, 1, 0.2]}
            labelColor="#433D3A"
            dataFillColor="#34d399"
            dataFillOpacity={0.8}
            dataStroke="salmon"
            dataStrokeWidth={2}
            // isCircle
          />
        </View>
      )}

      {lineChartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Mood Trends Over Time</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 40}
            height={250}
            chartConfig={{
              backgroundGradientFrom: "#f9f9f9",
              backgroundGradientTo: "#f9f9f9",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={styles.chart}
          />
        </View>
      )}

      <View style={styles.moodList}>
        {moodData && moodData.length > 0 ? (
          moodData.map((mood, index) => (
            <View key={index} style={styles.moodItem}>
              <Text style={styles.moodText}>{mood.mood_type}</Text>
              <Text style={styles.moodIntensity}>
                Intensity: {mood.intensity}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No mood data available</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingVertical: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
  },
  highlight: {
    color: "#fff",
    backgroundColor: "#34d399",
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  chartContainer: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginVertical: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  chart: {
    borderRadius: 16,
  },
  moodList: {
    width: "90%",
  },
  moodItem: {
    backgroundColor: "#e0f2f1",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  moodText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C7F56",
  },
  moodIntensity: {
    fontSize: 16,
    color: "#555",
  },
  noDataText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 10,
  },
});
