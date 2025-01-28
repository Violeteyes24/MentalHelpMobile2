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
      const data = await fetchLatestMoodTrackerData(); // Fetch latest mood data
      setMoodData(data); // Update the state with the fetched data
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

  // Format radarChartData based on the documentation example
  const radarChartData = moodData
    ? moodData.map((mood) => ({
        label: mood.mood_type, // Mood type as label
        value: mood.intensity, // Intensity as value
      }))
    : [];

  const lineChartData = moodData
    ? {
        labels: moodData.map((_, index) => `Entry ${index + 1}`),
        datasets: [
          {
            data: moodData.map((mood) => mood.intensity),
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      }
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        <Text style={styles.gradientText}>Mental</Text>
        <Text style={styles.markedText}>Help</Text>
      </Text>
      <Text style={styles.subtitle}>Your mental health companion</Text>

      {/* Radar Chart */}
      {radarChartData.length > 0 && (
        <View>
          <Text style={styles.chartTitle}>Mood Distribution (Radar Chart)</Text>
          <RadarChart
            data={radarChartData}
            maxValue={5} // Set the maximum value (based on the mood intensity scale)
            gradientColor={{
              startColor: "#FF9432", // Customize gradient color
              endColor: "#FFF8F1",
              count: 5,
            }}
            stroke={["#FFE8D3", "#FFE8D3", "#FFE8D3", "#FFE8D3", "#ff9532"]} // Customize strokes
            strokeWidth={[0.5, 0.5, 0.5, 0.5, 1]} // Set stroke width
            strokeOpacity={[1, 1, 1, 1, 0.13]} // Set stroke opacity
            labelColor="#433D3A" // Set label color
            dataFillColor="#FF9432" // Set data fill color
            dataFillOpacity={0.8} // Set data fill opacity
            dataStroke="salmon" // Set data stroke color
            dataStrokeWidth={2} // Set data stroke width
            isCircle // Set the chart to be circular
          />
        </View>
      )}

      {/* Line Chart */}
      {lineChartData && (
        <View>
          <Text style={styles.chartTitle}>
            Mood Trends Over Time (Line Graph)
          </Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 30}
            height={250}
            chartConfig={{
              backgroundColor: "#f9f9f9",
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
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 10,
    textAlign: "center",
    color: "#333",
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
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
