import React, { useState, useCallback, useMemo, useEffect } from "react";
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
  Pressable,
  ActivityIndicator,
} from "react-native";
import PieChart from "react-native-pie-chart/v3api";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'expo-linear-gradient';
import OpenAI from "openai";

// Create shimmer component with a workaround for Expo's LinearGradient
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient as any);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const { session } = useAuth();
  const [userData, setUserData] = useState<any>(null);

  // Fetch user data on component mount
  useEffect(() => {
    if (session?.user.id) {
      fetchUserData();
    }
    
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [session]);

  async function fetchUserData() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", session?.user.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
      } else {
        setUserData(data);
      }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
    }
  }

  const emotionColors: { [key: string]: string } = {
    Happy: "#FFC107", // Yellow (more vibrant)
    Afraid: "#2196F3", // Blue (more vibrant)
    Angry: "#F44336", // Red (more vibrant)
    Stressed: "#4CAF50", // Green (more vibrant)
    Confused: "#795548", // Brown (more vibrant)
    Disappointed: "#FF9800", // Orange (more vibrant)
  };

  // Set emotion value without any jitter
  const setEmotionValue = useCallback((emotion: string, value: number) => {
    const boundedValue = Math.min(10, Math.max(1, value));
    setEmotions(prev => ({
      ...prev,
      [emotion]: boundedValue
    }));
  }, []);

  // Increment emotion value
  const incrementEmotion = useCallback((emotion: string) => {
    setEmotions(prev => {
      const currentValue = prev[emotion];
      return {
        ...prev,
        [emotion]: Math.min(10, currentValue + 1)
      };
    });
  }, []);

  // Decrement emotion value
  const decrementEmotion = useCallback((emotion: string) => {
    setEmotions(prev => {
      const currentValue = prev[emotion];
      return {
        ...prev,
        [emotion]: Math.max(1, currentValue - 1)
      };
    });
  }, []);

  const widthAndHeight = 250;

  // Calculate the total value of all emotions for percentage calculation
  const totalEmotionValue = useMemo(() => 
    Object.values(emotions).reduce((sum, value) => sum + value, 0),
    [emotions]
  );

  // Create series data with percentages for the pie chart
  const series = useMemo(() => 
    Object.entries(emotions).map(([emotion, value]) => ({
      value: Math.min(10, Math.max(1, value)),
      color: emotionColors[emotion],
      name: emotion,
      percentage: Math.round((value / totalEmotionValue) * 100)
    })), 
    [emotions, emotionColors, totalEmotionValue]
  );

  // Prepare the series data with proper structure for the PieChart
  const pieChartSeries = useMemo(() => 
    series.map(item => item.value),
  [series]);

  const pieChartColors = useMemo(() => 
    series.map(item => item.color),
  [series]);

  // Get intensity range label
  const getIntensityRange = (value: number): string => {
    if (value >= 8) return "High";
    if (value >= 4) return "Moderate";
    return "Low";
  };

  // Generate AI suggestions based on mood data
  async function generateSuggestions() {
    try {
      setGeneratingSuggestions(true);
      
      // Identify primary emotion only
      const sortedEmotions = Object.entries(emotions)
        .sort(([, a], [, b]) => b - a)
        .map(([emotion, intensity]) => ({ emotion, intensity }));
      
      const primaryEmotion = sortedEmotions[0];
      
      // Create a simplified prompt for the AI
      const prompt = `You are a mental health assistant providing a brief suggestion based on a user's primary emotion.

Primary emotion: ${primaryEmotion.emotion} (${primaryEmotion.intensity}/10, ${getIntensityRange(primaryEmotion.intensity)} intensity)

User name: ${userData?.name || 'User'}

Provide a SINGLE SHORT PARAGRAPH (maximum 3-4 sentences) with practical advice for someone experiencing ${primaryEmotion.emotion.toLowerCase()} at this intensity level. Be supportive and concise. The total response must be under 80 words.`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      });

      const suggestionText = response.choices[0]?.message?.content || 
        "Unable to generate suggestions at this time. Please try again later.";
      
      setSuggestions(suggestionText);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setSuggestions("Sorry, there was an error generating suggestions. Please try again later.");
    } finally {
      setGeneratingSuggestions(false);
    }
  }

  async function insertMoodTrackerData() {
    try {
      setLoading(true);

      const insertData = Object.entries(emotions).map(
        ([mood_type, intensity]) => ({
          mood_type,
          intensity: Math.min(10, Math.max(1, intensity)),
          user_id: session?.user.id,
          tracked_at: new Date().toISOString(), // Add current timestamp with timezone
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
        <Text style={styles.subtitle}>Set the value for each emotion</Text>

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
                style={{ width: 80, height: 20, marginBottom: 10 }}
                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                visible={!isInitialLoading}
              />
              <ShimmerPlaceholder
                style={{ width: '100%', height: 40, borderRadius: 10 }}
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

  // Create a numeric display with + and - buttons
  const renderEmotionControl = (emotion: string, value: number) => {
    return (
      <View key={emotion} style={styles.sliderContainer}>
        <Text style={styles.emotionLabel}>{emotion}</Text>
        <View style={styles.controlContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: emotionColors[emotion] + '40' }]}
            onPress={() => decrementEmotion(emotion)}
            disabled={value <= 1}
          >
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
          
          {/* Bar indicator */}
          <View style={styles.barContainer}>
            {Array.from({ length: 10 }).map((_, index) => (
              <Pressable
                key={index}
                style={[
                  styles.barSegment,
                  { 
                    backgroundColor: index < value ? emotionColors[emotion] : '#e0e0e0',
                    opacity: index < value ? 1 : 0.5
                  }
                ]}
                onPress={() => setEmotionValue(emotion, index + 1)}
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: emotionColors[emotion] + '40' }]}
            onPress={() => incrementEmotion(emotion)}
            disabled={value >= 10}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
          
          <Text style={[styles.valueText, { color: emotionColors[emotion] }]}>
            {value}
          </Text>
        </View>
      </View>
    );
  };

  // Create a color swatch with label and percentage
  const renderColorSwatch = (item: { color: string, name: string, percentage: number }) => (
    <View key={item.name} style={styles.swatchContainer}>
      <View style={[styles.colorSwatch, { backgroundColor: item.color }]} />
      <Text style={styles.swatchLabel}>{item.name}</Text>
      <Text style={styles.swatchPercentage}>{item.percentage}%</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mood Tracker</Text>
        <Text style={styles.subtitle}>Set the value for each emotion</Text>

        <View style={styles.pieChartCard}>
          <View style={styles.pieChartContainer}>
            <PieChart
              widthAndHeight={widthAndHeight}
              series={pieChartSeries}
              sliceColor={pieChartColors}
              coverRadius={0.45}
              coverFill={'#FFF'}
            />
          </View>
          
          <View style={styles.legendContainer}>
            {series.map(renderColorSwatch)}
          </View>
          
          <View style={styles.intensityLegendContainer}>
            <Text style={styles.intensityLegendTitle}>Intensity Ranges:</Text>
            <View style={styles.intensityLegendRow}>
              <View style={[styles.intensityIndicator, styles.lowIndicator]} />
              <Text style={styles.intensityLegendText}>Low (1-3)</Text>
              
              <View style={[styles.intensityIndicator, styles.moderateIndicator]} />
              <Text style={styles.intensityLegendText}>Moderate (4-7)</Text>
              
              <View style={[styles.intensityIndicator, styles.highIndicator]} />
              <Text style={styles.intensityLegendText}>High (8-10)</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          {Object.entries(emotions).map(([emotion, value]) => renderEmotionControl(emotion, value))}
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
                {emotion}: {value} ({getIntensityRange(value)})
              </Text>
            ))}
            
            {!showSuggestions ? (
              <TouchableOpacity
                onPress={() => {
                  setShowSuggestions(true);
                  generateSuggestions();
                }}
                style={styles.suggestionButton}
                disabled={generatingSuggestions}
              >
                <Text style={styles.suggestionButtonText}>
                  See Suggestions
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>AI Suggestions</Text>
                {generatingSuggestions ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#34d399" />
                    <Text style={styles.loadingText}>Generating suggestions...</Text>
                  </View>
                ) : (
                  <Text style={styles.suggestionsText}>{suggestions}</Text>
                )}
              </View>
            )}
            
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setShowSuggestions(false);
                setSuggestions("");
              }}
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
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 15,
    marginHorizontal: 5,
  },
  sliderContainer: {
    marginVertical: 12,
  },
  emotionLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  controlContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  barContainer: {
    flex: 1,
    height: 30,
    flexDirection: "row",
    marginHorizontal: 10,
    borderRadius: 15,
    overflow: "hidden",
  },
  barSegment: {
    flex: 1,
    height: "100%",
    marginHorizontal: 1,
  },
  valueText: {
    fontSize: 18,
    fontWeight: "bold",
    width: 30,
    textAlign: "center",
    marginLeft: 5,
  },
  pieChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  button: {
    backgroundColor: "#34d399",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
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
    fontSize: 16,
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
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    marginVertical: 6,
    color: "#444",
  },
  closeButton: {
    marginTop: 25,
    backgroundColor: "#34d399",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
    width: "80%",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  pieChartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    marginTop: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  swatchContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 8,
    width: '30%',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: '#555',
  },
  swatchPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  intensityLegendContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  intensityLegendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  intensityLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  intensityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  intensityLegendText: {
    fontSize: 12,
    color: '#555',
    marginRight: 10,
  },
  lowIndicator: {
    backgroundColor: '#F44336',
  },
  moderateIndicator: {
    backgroundColor: '#FFC107',
  },
  highIndicator: {
    backgroundColor: '#4CAF50',
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: 15,
    marginBottom: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  suggestionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
    textAlign: 'left',
  },
  suggestionButton: {
    marginTop: 20,
    backgroundColor: '#4ade80',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
    width: "80%",
  },
  suggestionButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
});

export default EmotionAnalysis;
