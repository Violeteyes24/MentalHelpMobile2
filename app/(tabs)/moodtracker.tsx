import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
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
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center" }}>
        Mood Tracker
      </Text>

      <Text style={{ fontSize: 18, textAlign: "center", marginVertical: 16 }}>
        Swipe the slider for each emotion
      </Text>

      {Object.keys(emotions).map((emotion) => (
        <View
          key={emotion}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 10,
          }}
        >
          <Text style={{ width: 90, fontSize: 14 }}>{emotion}:</Text>
          <Slider
            style={{ width: 275 }}
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

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <PieChart widthAndHeight={widthAndHeight} series={series} />
        <View style={{ marginTop: "5%", alignItems: "center" }}>
          <Button
            title="See Results"
            onPress={() => insertMoodTrackerData()}
            color="#34d399"
          />
        </View>
      </View>

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
