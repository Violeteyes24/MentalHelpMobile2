import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  SafeAreaView,
  Alert,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
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
    Happy: "#FFFF00",
    Afraid: "#0000FF",
    Angry: "#FF0000",
    Stressed: "#008000",
    Confused: "#A52A2A",
    Disappointed: "#FFA500",
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

  const widthAndHeight = 250;

  const series = Object.entries(emotions).map(([emotion, value]) => ({
    value: Math.min(10, Math.max(1, Math.round(value))),
    color: emotionColors[emotion],
  }));

  async function insertMoodTrackerData() {
    try {
      setLoading(true);

      if (!session?.user.id) {
        throw new Error("No user session found");
      }

      // Prepare the data
      const now = new Date().toISOString();
      const insertData = Object.entries(emotions).map(
        ([mood_type, intensity]) => ({
          mood_type,
          intensity: Math.min(10, Math.max(1, Math.round(intensity))),
          user_id: session.user.id,
          tracked_at: now
        })
      );

      console.log("Data to Insert:", insertData);

      // Single insert operation
      const { data, error } = await supabase
        .from("mood_tracker")
        .insert(insertData);

      if (error) {
        console.error("Insert Error Details:", {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // If successful
      console.log("Insert Success");
      Alert.alert(
        "Success",
        "Your mood has been tracked successfully!",
        [{ text: "OK", onPress: () => setModalVisible(true) }]
      );
      
    } catch (error) {
      console.error("Error in insertMoodTrackerData:", error);
      if (error instanceof Error) {
        Alert.alert(
          "Error",
          `Failed to save mood: ${error.message}. Please try again.`
        );
      } else {
        Alert.alert(
          "Error",
          "An unknown error occurred while saving your mood."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mood Tracker</Text>
        <Text style={styles.subtitle}>Swipe the slider for each emotion</Text>

        <View style={styles.pieChartContainer}>
          <PieChart widthAndHeight={widthAndHeight} series={series} />
          
        </View>
        <View style={styles.card}>
          {Object.keys(emotions).map((emotion) => (
            <View key={emotion} style={styles.sliderContainer}>
              <Text style={styles.emotionLabel}>{emotion}:</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                value={emotions[emotion]}
                onValueChange={(value) => handleSliderChange(emotion, value)}
                thumbTintColor={emotionColors[emotion]}
                minimumTrackTintColor={emotionColors[emotion]}
                maximumTrackTintColor="#000000"
              />
            </View>
          ))}
          <TouchableOpacity
            onPress={insertMoodTrackerData}
            style={styles.button}
          >
            <Text style={styles.buttonText}>See Results</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Mood Tracker Results</Text>
            {Object.entries(emotions).map(([emotion, value]) => (
              <Text key={emotion} style={styles.modalText}>
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
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 15
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  emotionLabel: {
    width: 90,
    fontSize: 14,
  },
  slider: {
    width: 250,
  },
  pieChartContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  button: {
    backgroundColor: "#34d399",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginVertical: 5,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#34d399",
    borderRadius: 5,
    padding: 10,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default EmotionAnalysis;
