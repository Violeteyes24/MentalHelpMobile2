import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import Slider from "@react-native-community/slider";
import PieChart from "react-native-pie-chart";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const EmotionAnalysis: React.FC = () => {
  const [emotions, setEmotions] = useState<{ [key: string]: number }>({
    Happy: 10,
    Afraid: 5,
    Angry: 3,
    Stressed: 2,
    Confused: 4,
    Disappointed: 1,
  });

  const emotionColors: { [key: string]: string } = {
    Happy: "#FFD700", // Gold
    Afraid: "#1E90FF", // Dodger Blue
    Angry: "#FF4500", // Orange Red
    Stressed: "#32CD32", // Lime Green
    Confused: "#8B4513", // Saddle Brown
    Disappointed: "#FFA500", // Orange
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  const handleSliderChange = (emotion: string, value: number) => {
    setEmotions((prevState) => ({
      ...prevState,
      [emotion]: value,
    }));
  };

  const widthAndHeight = 280; // Increased for better visualization

  const series = Object.entries(emotions).map(([emotion, value]) => ({
    value: Math.min(10, Math.max(1, Math.round(value))),
    color: emotionColors[emotion],
  }));

  async function insertMoodTrackerData() {
    try {
      setLoading(true);

      const insertData = Object.entries(emotions).map(
        ([mood_type, intensity]) => ({
          mood_type,
          intensity: Math.min(10, Math.max(1, Math.round(intensity))),
          user_id: session?.user.id,
        })
      );

      console.log("Data to Insert:", insertData);

      const { data, error } = await supabase
        .from("mood_tracker")
        .insert(insertData)
        .select();

      if (error) {
        console.error("Insert Error:", error);
        throw error;
      }

      console.log("Insert Success:", data);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
      setModalVisible(true); // Show modal after insertion
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Mood Tracker</Text>
      <Text style={styles.subHeaderText}>
        Adjust sliders to track your mood
      </Text>

      {Object.keys(emotions).map((emotion) => (
        <View key={emotion} style={styles.sliderContainer}>
          <Text
            style={[styles.emotionLabel, { color: emotionColors[emotion] }]}
          >
            {emotion}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            value={emotions[emotion]}
            onValueChange={(value) => handleSliderChange(emotion, value)}
            thumbTintColor={emotionColors[emotion]}
            minimumTrackTintColor={emotionColors[emotion]}
            maximumTrackTintColor="#ccc"
          />
          <Text style={styles.valueText}>{Math.round(emotions[emotion])}</Text>
        </View>
      ))}

      <View style={styles.chartContainer}>
        <PieChart widthAndHeight={widthAndHeight} series={series} />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => insertMoodTrackerData()}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Saving..." : "See Results"}
        </Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Mood Tracker Results</Text>
            {Object.entries(emotions).map(([emotion, value]) => (
              <Text
                key={emotion}
                style={[styles.modalText, { color: emotionColors[emotion] }]}
              >
                {emotion}: {Math.min(10, Math.max(1, Math.round(value)))}
              </Text>
            ))}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  subHeaderText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 3,
    paddingVertical: 10,
  },
  emotionLabel: {
    width: 90,
    fontSize: 16,
    fontWeight: "bold",
  },
  slider: {
    flex: 1,
  },
  valueText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  chartContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#34d399",
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 20,
    alignItems: "center",
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalText: {
    fontSize: 18,
    marginVertical: 5,
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#34d399",
    borderRadius: 5,
    padding: 10,
    width: "80%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default EmotionAnalysis;
