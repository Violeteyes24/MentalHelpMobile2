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
  Dimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import PieChart from "react-native-pie-chart";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'expo-linear-gradient';

// Create shimmer component with a workaround for Expo's LinearGradient
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient as any);

const EmotionAnalysis: React.FC = () => {
  const [emotions, setEmotions] = useState<{ [key: string]: number }>({
    Happy: 10,
    Afraid: 5,
    Angry: 3,
    Stressed: 2,
    Confused: 4,
    Disappointed: 1,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // New state for initial loading
  const { session } = useAuth();

  // Simulate initial loading - in a real app, you would set this after data fetching
  React.useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const emotionColors: { [key: string]: string } = {
    Happy: "#FFFF00",
    Afraid: "#0000FF",
    Angry: "#FF0000",
    Stressed: "#008000",
    Confused: "#A52A2A",
    Disappointed: "#FFA500",
  };

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

  // Render shimmer for the mood tracker while loading
  const renderShimmerView = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mood Tracker</Text>
        <Text style={styles.subtitle}>Swipe the slider for each emotion</Text>

        {/* Shimmer for pie chart */}
        <View style={styles.pieChartContainer}>
          <ShimmerPlaceholder
            style={{
              width: widthAndHeight,
              height: widthAndHeight,
              borderRadius: widthAndHeight / 2,
            }}
            shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
            visible={!isInitialLoading}
          />
        </View>
        
        <View style={styles.card}>
          {/* Shimmer for each slider */}
          {Array(6).fill(0).map((_, index) => (
            <View key={index} style={styles.sliderContainer}>
              <ShimmerPlaceholder
                style={{ width: 80, height: 20, marginRight: 10 }}
                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                visible={!isInitialLoading}
              />
              <ShimmerPlaceholder
                style={{ flex: 1, height: 20, borderRadius: 10 }}
                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                visible={!isInitialLoading}
              />
            </View>
          ))}
          
          {/* Shimmer for button */}
          <ShimmerPlaceholder
            style={{
              height: 50,
              borderRadius: 25,
              width: '100%',
              marginTop: 16
            }}
            shimmerColors={['#a7f3d0', '#34d399', '#a7f3d0']}
            visible={!isInitialLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Show shimmer while loading
  if (isInitialLoading) {
    return renderShimmerView();
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
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "See Results"}
            </Text>
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
    width: Dimensions.get("window").width * 0.7, // changed: slider now adjusts to device width
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
