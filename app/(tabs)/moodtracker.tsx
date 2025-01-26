import React, { useState, useEffect } from "react";
import { View, Text, Button, SafeAreaView, Alert } from "react-native";
import Slider from "@react-native-community/slider";
import PieChart from "react-native-pie-chart";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const EmotionAnalysis: React.FC = () => {
  const [emotions, setEmotions] = useState<{ [key: string]: number }>({
    Happy: 5,
    Afraid: 5,
    Angry: 5,
    Stressed: 5,
    Confused: 5,
    Disappointed: 5,
  });

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
      [emotion]: Math.min(10, Math.max(1, value)), // Clamp to 1-10
    }));
  };

  const widthAndHeight = 250;

  // Prepare series with both `value` and `color` for PieChart
  const series = Object.entries(emotions).map(([emotion, value]) => ({
    value: Math.round(value), // Ensure the value is a whole number
    color: emotionColors[emotion], // Use the color corresponding to the emotion
  }));

  const sliceColor = Object.entries(emotions).map(
    ([emotion]) => emotionColors[emotion]
  );

  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    console.log("Session in Mood Tracker UseEffect", session);
  }, []);

async function insertMoodTrackerData() {
  try {
    setLoading(true);

    // Prepare and clamp the values before insertion
    const insertData = Object.entries(emotions).map(
      ([mood_type, intensity]) => ({
        mood_type,
        intensity: Math.min(10, Math.max(1, Math.round(intensity))), // Clamp to 1-10
        user_id: session?.user.id, // Add user ID
      })
    );

    console.log("Data to Insert:", insertData);

    // Insert into the database and request the inserted rows
    const { data, error } = await supabase
      .from("mood_tracker")
      .insert(insertData)
      .select(); // Explicitly request inserted rows
      console.log(insertData);
      
    if (error) {
      console.error("Insert Error:", error);
      throw error;
    }

    console.log("Insert Success:", data); // Now this will contain the inserted rows
  } catch (error) {
    if (error instanceof Error) {
      Alert.alert("Error", error.message);
    }
  } finally {
    setLoading(false);
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
            minimumValue={1} // Set minimum value to 1
            maximumValue={10} // Set maximum value to 10
            value={emotions[emotion]}
            onValueChange={(value) => handleSliderChange(emotion, value)}
            thumbTintColor={emotionColors[emotion]}
            minimumTrackTintColor={emotionColors[emotion]}
            maximumTrackTintColor="#000000"
          />
        </View>
      ))}

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <PieChart
          widthAndHeight={widthAndHeight}
          series={series}
          cover={0.45}
        />
        <View style={{ marginTop: "5%", alignItems: "center" }}>
          <Button
            title="See Results"
            onPress={() => insertMoodTrackerData()}
            color="#34d399"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EmotionAnalysis;
