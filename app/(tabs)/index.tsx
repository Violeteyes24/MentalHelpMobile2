import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { RadarChart } from "@salmonco/react-native-radar-chart";
import { LineChart } from "react-native-chart-kit";

interface MoodData {
  mood_type: string;
  intensity: number;
  tracked_at: string;
}

const RatingModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  rating, 
  setRating, 
  feedback, 
  setFeedback 
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  rating: number;
  setRating: (rating: number) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
}) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Rate Your Experience</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
            >
              <Text style={[styles.star, rating >= star && styles.starSelected]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.feedbackInput}
          placeholder="Additional feedback (optional)"
          value={feedback}
          onChangeText={setFeedback}
          multiline
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={onSubmit}
          >
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function HomeScreen() {
  const { session } = useAuth();
  const [moodData, setMoodData] = useState<MoodData[] | null>(null);
  const [name, setName] = useState("User");
  const [monthlyMoodData, setMonthlyMoodData] = useState<MoodData[] | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [userRating, setUserRating] = useState<{ rating: number; feedback: string } | null>(null);

  useEffect(() => {
    const getMoodData = async () => {
      const weekData = await fetchLatestMoodTrackerData();
      const monthData = await fetchMonthlyMoodTrackerData();
      setMoodData(weekData);
      setMonthlyMoodData(monthData);
    };

    getMoodData();

    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mood_tracker' },
        (payload) => {
          console.log('Change received!', payload);
          getMoodData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.user.id]);

  const getUserName = async () => {
    const fetchedName = await fetchUserName();
    setName(fetchedName);
  };

  const getUserRating = async () => {
    const { data, error } = await supabase
      .from('app_ratings')
      .select('rating, feedback')
      .eq('user_id', session?.user.id)
      .single();

    if (data) {
      setUserRating(data);
    }
  };

  useEffect(() => {
    if (session?.user.id) {
      getUserName();
      getUserRating();
    }
  }, [session?.user.id]);

  async function fetchLatestMoodTrackerData(): Promise<MoodData[] | null> {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
  
    let { data: mood_tracker, error } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity, tracked_at")
      .eq("user_id", session?.user.id)
      .gte("tracked_at", startOfWeek.toISOString())
      .lte("tracked_at", endOfWeek.toISOString())
      .order("tracked_at", { ascending: true });
  
    if (error) {
      console.error("Error fetching mood tracker data:", error);
      return null;
    }
    return mood_tracker || null;
  }

  async function fetchMonthlyMoodTrackerData(): Promise<MoodData[] | null> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let { data: mood_tracker, error } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity, tracked_at")
      .eq("user_id", session?.user.id)
      .gte("tracked_at", startOfMonth.toISOString())
      .lte("tracked_at", endOfMonth.toISOString())
      .order("tracked_at", { ascending: true });

    if (error) {
      console.error("Error fetching monthly mood tracker data:", error);
      return null;
    }
    return mood_tracker || null;
  }

  async function fetchUserName() {
    const { data: user, error } = await supabase
      .from("users")
      .select("name")
      .eq("user_id", session?.user.id)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
      return "User";
    }
    return user.name;
  }

  const submitRating = async () => {
    if (!rating || rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5');
      return;
    }

    const { data, error } = await supabase
      .from('app_ratings')
      .upsert({
        user_id: session?.user.id,
        rating,
        feedback
      })
      .select();

    if (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    } else {
      setUserRating({ rating, feedback });
      setShowRatingModal(false);
      alert('Thank you for your feedback!');
    }
  };

  const screenWidth = Dimensions.get("window").width;

  const radarChartData = moodData ? (() => {
    const moodGroups = moodData.reduce((acc, mood) => {
      if (!acc[mood.mood_type]) {
        acc[mood.mood_type] = { sum: 0, count: 0 };
      }
      acc[mood.mood_type].sum += mood.intensity;
      acc[mood.mood_type].count += 1;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    return Object.entries(moodGroups).map(([mood_type, data]) => ({
      label: mood_type,
      value: Math.round((data.sum / data.count) * 10) / 10
    }));
  })() : [];

  const getDayAverages = (moodData: MoodData[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayAverages = days.reduce((acc, day) => {
      acc[day] = { sum: 0, count: 0 };
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    moodData.forEach(mood => {
      const date = new Date(mood.tracked_at);
      const day = days[date.getDay()];
      if (dayAverages[day]) {
        dayAverages[day].sum += mood.intensity;
        dayAverages[day].count += 1;
      }
    });

    return days.map(day => {
      const dayData = dayAverages[day];
      return dayData.count === 0 ? 0 : Math.round((dayData.sum / dayData.count) * 10) / 10;
    });
  };

  const lineChartData = moodData
    ? {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
          {
            data: getDayAverages(moodData),
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      }
    : null;

  const getMonthlyAverages = (monthlyData: MoodData[]) => {
    if (!monthlyData || monthlyData.length === 0) return [];

    const weeklyAverages: { [key: number]: { sum: number; count: number } } = {
      1: { sum: 0, count: 0 },
      2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 }
    };

    monthlyData.forEach(mood => {
      const date = new Date(mood.tracked_at);
      const week = Math.ceil(date.getDate() / 7);
      if (week <= 4) {
        weeklyAverages[week].sum += mood.intensity;
        weeklyAverages[week].count += 1;
      }
    });

    return Object.values(weeklyAverages).map(data => 
      data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : 0
    );
  };

  const monthlyChartData = monthlyMoodData ? {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      data: getMonthlyAverages(monthlyMoodData),
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
      strokeWidth: 2
    }]
  } : null;

  const getMostIntenseMood = (moodData: MoodData[] | null) => {
    if (!moodData || moodData.length === 0) return null;

    // Group moods by type and calculate total intensity and frequency
    const moodAnalysis = moodData.reduce((acc, mood) => {
      if (!acc[mood.mood_type]) {
        acc[mood.mood_type] = {
          totalIntensity: 0,
          occurrences: 0,
          maxIntensity: 0
        };
      }
      acc[mood.mood_type].totalIntensity += mood.intensity;
      acc[mood.mood_type].occurrences += 1;
      acc[mood.mood_type].maxIntensity = Math.max(acc[mood.mood_type].maxIntensity, mood.intensity);
      return acc;
    }, {} as Record<string, { totalIntensity: number; occurrences: number; maxIntensity: number }>);

    // Calculate weighted scores for each mood
    const moodScores = Object.entries(moodAnalysis).map(([mood, data]) => {
      const averageIntensity = data.totalIntensity / data.occurrences;
      // Weight based on both frequency and intensity
      const frequencyWeight = data.occurrences / moodData.length;
      const intensityWeight = averageIntensity / 5; // normalize to 0-1 scale
      const weightedScore = (frequencyWeight + intensityWeight) * 5; // Scale to 0-10

      return {
        mood,
        score: Math.min(10, weightedScore * 2), // Ensure max is 10
        maxIntensity: data.maxIntensity,
        frequency: data.occurrences
      };
    });

    // Find the mood with the highest weighted score
    const dominantMood = moodScores.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );

    return {
      mood: dominantMood.mood,
      score: Math.round(dominantMood.score * 10) / 10,
      intensity: dominantMood.score >= 7.5 ? 'Very High' :
                dominantMood.score >= 5 ? 'High' :
                dominantMood.score >= 2.5 ? 'Moderate' : 'Low'
    };
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      'Happy': '#34d399',
      'Afraid': '#818cf8',
      'Angry': '#ef4444',
      'Stressed': '#f59e0b',
      'Confused': '#a78bfa',
      'Disappointed': '#6b7280'
    };
    return colors[emotion] || '#6b7280';
  };

  const weeklyMoodSummary = getMostIntenseMood(moodData);
  const monthlyMoodSummary = getMostIntenseMood(monthlyMoodData);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Mental<Text style={styles.highlight}>Help</Text>
      </Text>
      <Text style={styles.subtitle}>Your mental health companion</Text>
      <Text style={styles.welcome}>
        Welcome {name}! We're here to support you.
      </Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This Week's Dominant Mood</Text>
          {weeklyMoodSummary ? (
            <>
              <Text style={[styles.moodHighlight, { backgroundColor: getEmotionColor(weeklyMoodSummary.mood) }]}>
                {weeklyMoodSummary.mood}
              </Text>
              <Text style={styles.summaryText}>
                Intensity: {weeklyMoodSummary.intensity}
              </Text>
              <Text style={styles.summarySubtext}>
                ({weeklyMoodSummary.score}/10)
              </Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This Month's Dominant Mood</Text>
          {monthlyMoodSummary ? (
            <>
              <Text style={[styles.moodHighlight, { backgroundColor: getEmotionColor(monthlyMoodSummary.mood) }]}>
                {monthlyMoodSummary.mood}
              </Text>
              <Text style={styles.summaryText}>
                Intensity: {monthlyMoodSummary.intensity}
              </Text>
              <Text style={styles.summarySubtext}>
                ({monthlyMoodSummary.score}/10)
              </Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>
      </View>

      {radarChartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Latest Mood Distribution</Text>
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
          />
        </View>
      )}

      {lineChartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weekly Mood Trends</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundGradientFrom: "#f9f9f9",
              backgroundGradientTo: "#f9f9f9",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={styles.chart}
          />
        </View>
      )}

      {monthlyChartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Monthly Mood Trends</Text>
          <LineChart
            data={monthlyChartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundGradientFrom: "#f9f9f9",
              backgroundGradientTo: "#f9f9f9",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#8641f4"
              }
            }}
            style={styles.chart}
            bezier
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.ratingButton}
        onPress={() => setShowRatingModal(true)}
      >
        <Text style={styles.ratingButtonText}>
          {userRating ? 'Update Your Rating' : 'Rate Our App'}
        </Text>
        {userRating && (
          <Text style={styles.currentRating}>
            Your rating: {userRating.rating}/5
          </Text>
        )}
      </TouchableOpacity>

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={submitRating}
        rating={rating}
        setRating={setRating}
        feedback={feedback}
        setFeedback={setFeedback}
      />

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
  welcome: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C7F56",
    textAlign: "center",
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginVertical: 10,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    width: '48%',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  moodHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  star: {
    fontSize: 40,
    color: '#ddd',
    marginHorizontal: 5,
  },
  starSelected: {
    color: '#FFD700',
  },
  feedbackInput: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
    width: '45%',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#34d399',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingButton: {
    backgroundColor: '#34d399',
    padding: 15,
    borderRadius: 12,
    width: '90%',
    marginVertical: 10,
    alignItems: 'center',
  },
  ratingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentRating: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
});
