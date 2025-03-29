import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  LogBox,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { RadarChart } from "@salmonco/react-native-radar-chart";
import { LineChart } from "react-native-chart-kit";
import dayjs from 'dayjs';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';

// Create shimmer component
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient as any);

// Suppress log notifications
LogBox.ignoreAllLogs();

// Declare ErrorUtils on global object
declare const global: {
  ErrorUtils?: {
    setGlobalHandler: (callback: (error: Error, isFatal: boolean) => void) => void;
  };
};

// Override global error handler to hide error overlays
if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Optionally log error to your service
    // console.log("Caught global error: ", error);
    // Do nothing to hide error overlays
  });
}

interface MoodData {
  mood_type: string;
  intensity: number;
  tracked_at: string;
}

// Network Modal Component
const NetworkModal = ({ visible, onRetry }: { visible: boolean; onRetry: () => void }) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={() => {}}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Network Issue</Text>
        <Text style={styles.networkModalText}>
          Seems like your internet connection is slow or unavailable. This may affect app functionality.
        </Text>
        <TouchableOpacity
          style={[styles.modalButton, styles.submitButton, { alignSelf: 'center', marginTop: 20 }]}
          onPress={onRetry}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

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
  const [isLoading, setIsLoading] = useState(true);
  const [nameLoading, setNameLoading] = useState(true);
  const [moodDataLoading, setMoodDataLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [isNetworkModalVisible, setIsNetworkModalVisible] = useState(false);
  const [networkState, setNetworkState] = useState<{isConnected: boolean | null, type: string | null}>({ 
    isConnected: true, 
    type: null 
  });

  // Define getMoodData inside the component
  const getMoodData = async () => {
    setMoodDataLoading(true);
    const weekData = await fetchLatestMoodTrackerData();
    const monthData = await fetchMonthlyMoodTrackerData();
    setMoodData(weekData);
    setMonthlyMoodData(monthData);
    setMoodDataLoading(false);
  };

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected,
        type: state.type
      });
      
      // Check for poor connection
      if (state.isConnected === false) {
        setIsNetworkModalVisible(true);
      } else if (state.isConnected && state.type === 'cellular') {
        // Check for slow cellular connection
        // @ts-ignore - Handle cellularGeneration which may not be present in all connection types
        const generation = state.details?.cellularGeneration;
        if (generation === '2g' || generation === '3g') {
          setIsNetworkModalVisible(true);
        } else {
          setIsNetworkModalVisible(false);
        }
      } else {
        setIsNetworkModalVisible(false);
      }
    });

    // Return function will be called when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  const checkNetworkAndRetry = async () => {
    // Manually fetch current network state
    const state = await NetInfo.fetch();
    setNetworkState({
      isConnected: state.isConnected,
      type: state.type
    });
    
    if (state.isConnected) {
      setIsNetworkModalVisible(false);
      // Reload data
      getMoodData();
      getUserName();
      getUserRating();
      fetchAppointments();
    }
  };

  useEffect(() => {
    LogBox.ignoreAllLogs(); // Disable all log notifications
    
    getMoodData();

    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mood_tracker' },
        (payload) => {
          console.log('At home page: Change received!', payload);
          getMoodData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.user.id]);

  const getUserName = async () => {
    setNameLoading(true);
    const fetchedName = await fetchUserName();
    setName(fetchedName);
    setNameLoading(false);
  };

  const getUserRating = async () => {
    setRatingLoading(true);
    const { data, error } = await supabase
      .from('app_ratings')
      .select('rating, feedback')
      .eq('user_id', session?.user.id)
      .single();

    if (data) {
      setUserRating(data);
    }
    setRatingLoading(false);
  };

  const fetchAppointments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No session found");
      return;
    }
  
    const userId = session.user.id;
    const currentDate = dayjs().format('YYYY-MM-DD'); // Get the current date in the format 'YYYY-MM-DD'
  
    console.log('Fetching appointments for user ID:', userId); // Add this line to log the user ID
  
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        appointment_id,
        user_id,
        counselor_id,
        availability_schedule_id,
        form_id,
        response_id,
        status,
        appointment_type,
        availability_schedules (
          date,
          start_time,
          end_time
        ),
        users!appointments_user_id_fkey (
          name
        )
      `)
      .eq('status', 'pending')
      .eq('user_id', userId)
      .gte('availability_schedules.date', currentDate); // Filter appointments by date
  
    if (error) {
      console.error('Error fetching appointments:', error.message);
      return;
    }
  
    console.log('Fetched appointments:', data); // Add this line to log the fetched appointments
    // setAppointments(data); // Uncomment and implement setAppointments if needed
  };

  useEffect(() => {
    if (session?.user.id) {
      setIsLoading(true);
      Promise.all([
        getUserName(),
        getUserRating(),
        fetchAppointments()
      ]).finally(() => {
        setIsLoading(false);
      });
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
      .order("tracked_at", { ascending: false }); // change order to descending
      // .limit(6); // remove or adjust limit as needed
  
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
      setUserRating(data?.[0] as { rating: number; feedback: string } || { rating, feedback });
      setShowRatingModal(false);
      alert('Thank you for your feedback!');
    }
  };

  const screenWidth = Dimensions.get("window").width;
  const formattedDate = new Date().toDateString();

  const radarChartData = moodData ? (() => {
    const recentMoods = moodData.slice(0,6); // only the last 6 mood entries
    const moodGroups = recentMoods.reduce((acc, mood) => {
      if (!acc[mood.mood_type]) {
        acc[mood.mood_type] = { sum: 0, count: 0 };
      }
      acc[mood.mood_type].sum += mood.intensity;
      acc[mood.mood_type].count += 1;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);
    
    return Object.entries(moodGroups).map(([mood_type, data]) => {
      // Calculate average intensity and normalize to a 0-5 scale
      const avgIntensity = data.sum / data.count;
      // If intensity > 5, normalize it to fit within maxValue of 5
      const normalizedValue = avgIntensity > 5 ? 5 : avgIntensity;
      
      return {
        label: mood_type,
        value: Math.round(normalizedValue * 10) / 10,
        // Store original value for display purposes if needed
        originalValue: Math.round(avgIntensity * 10) / 10
      };
    });
  })() : [];

  const getDayAverages = (moodData: MoodData[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData = days.reduce((acc, day) => {
      acc[day] = { moods: {} as Record<string, { sum: number; count: number }> };
      return acc;
    }, {} as Record<string, { moods: Record<string, { sum: number; count: number }> }>);
  
    // If moodData is null or empty, return an array of zeros
    if (!moodData || moodData.length === 0) {
      return { values: days.map(() => 0), types: days.map(() => '') };
    }
  
    moodData.forEach(mood => {
      const date = new Date(mood.tracked_at);
      const day = days[date.getDay()];
      if (dayData[day]) {
        if (!dayData[day].moods[mood.mood_type]) {
          dayData[day].moods[mood.mood_type] = { sum: 0, count: 0 };
        }
        dayData[day].moods[mood.mood_type].sum += mood.intensity;
        dayData[day].moods[mood.mood_type].count += 1;
      }
    });
    
    // For each day, find the most frequent mood
    const values: number[] = [];
    const types: string[] = [];
    
    days.forEach(day => {
      if (Object.keys(dayData[day].moods).length === 0) {
        values.push(0);
        types.push('');
        return;
      }
      
      let highestAvg = 0;
      let highestType = '';
      
      Object.entries(dayData[day].moods).forEach(([moodType, data]) => {
        const avg = data.sum / data.count;
        if (avg > highestAvg) {
          highestAvg = avg;
          highestType = moodType;
        }
      });
      
      values.push(Math.round(highestAvg));
      types.push(highestType);
    });
    
    return { values, types };
  };

  const lineChartData = moodData && moodData.length > 0
  ? (() => {
      const { values, types } = getDayAverages(moodData);
      return {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
          {
            data: values,
            color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
            strokeWidth: 3,
          }
        ],
        types
      };
    })()
  : {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [
        {
          data: [0, 0, 0, 0, 0, 0, 0],
          color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
          strokeWidth: 3,
        }
      ],
      types: ['', '', '', '', '', '', '']
    };

  const getMonthlyAverages = (monthlyData: MoodData[]) => {
    // Return array of zeros if no data
    if (!monthlyData || monthlyData.length === 0) {
      return { values: [0, 0, 0, 0], types: ['', '', '', ''] };
    }
  
    const weeklyData: { [key: number]: { moods: Record<string, { sum: number; count: number }> } } = {
      1: { moods: {} },
      2: { moods: {} },
      3: { moods: {} },
      4: { moods: {} }
    };
  
    monthlyData.forEach(mood => {
      const date = new Date(mood.tracked_at);
      const week = Math.ceil(date.getDate() / 7);
      if (week <= 4) {
        if (!weeklyData[week].moods[mood.mood_type]) {
          weeklyData[week].moods[mood.mood_type] = { sum: 0, count: 0 };
        }
        weeklyData[week].moods[mood.mood_type].sum += mood.intensity;
        weeklyData[week].moods[mood.mood_type].count += 1;
      }
    });
    
    // For each week, find the highest intensity mood
    const values: number[] = [];
    const types: string[] = [];
    
    [1, 2, 3, 4].forEach(week => {
      if (Object.keys(weeklyData[week].moods).length === 0) {
        values.push(0);
        types.push('');
        return;
      }
      
      let highestAvg = 0;
      let highestType = '';
      
      Object.entries(weeklyData[week].moods).forEach(([moodType, data]) => {
        const avg = data.sum / data.count;
        if (avg > highestAvg) {
          highestAvg = avg;
          highestType = moodType;
        }
      });
      
      values.push(Math.round(highestAvg));
      types.push(highestType);
    });
    
    return { values, types };
  };

  const monthlyChartData = monthlyMoodData && monthlyMoodData.length > 0 
  ? (() => {
      const { values, types } = getMonthlyAverages(monthlyMoodData);
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          data: values,
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }],
        types
      };
    })()
  : {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [0, 0, 0, 0],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }],
      types: ['', '', '', '']
    };

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

  // Render shimmer components
  const renderWelcomeShimmer = () => (
    <View style={styles.header}>
      <Text style={styles.title}>
        Mental<Text style={styles.highlight}>Help</Text>
      </Text>
      <Text style={styles.subtitle}>Your mental health companion</Text>
      <ShimmerPlaceholder
        style={{ width: 200, height: 20, borderRadius: 4, alignSelf: 'center', marginTop: 10 }}
        shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
      />
    </View>
  );

  const renderSummaryCardShimmer = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>This Week</Text>
        <ShimmerPlaceholder
          style={{ width: '80%', height: 30, borderRadius: 8, marginVertical: 10 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
        <ShimmerPlaceholder
          style={{ width: '60%', height: 24, borderRadius: 4, marginTop: 8 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
        <ShimmerPlaceholder
          style={{ width: '40%', height: 18, borderRadius: 4, marginTop: 10 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>This Month</Text>
        <ShimmerPlaceholder
          style={{ width: '80%', height: 30, borderRadius: 8, marginVertical: 10 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
        <ShimmerPlaceholder
          style={{ width: '60%', height: 24, borderRadius: 4, marginTop: 8 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
        <ShimmerPlaceholder
          style={{ width: '40%', height: 18, borderRadius: 4, marginTop: 10 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
      </View>
    </View>
  );

  const renderChartShimmer = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Mood Distribution</Text>
      <ShimmerPlaceholder
        style={{ width: screenWidth - 80, height: 220, borderRadius: 8, alignSelf: 'center' }}
        shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
      />
    </View>
  );

  const renderMoodEntryShimmer = (index: number) => (
    <View key={index} style={styles.moodItemCard}>
      <View style={[styles.moodIndicator, { backgroundColor: '#e0e0e0' }]} />
      <View style={styles.moodItemContent}>
        <ShimmerPlaceholder
          style={{ width: '60%', height: 20, borderRadius: 4 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
        <View style={styles.moodIntensityContainer}>
          <ShimmerPlaceholder
            style={{ width: '30%', height: 14, borderRadius: 4, marginVertical: 6 }}
            shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
          />
          <View style={styles.intensityBarContainer}>
            <ShimmerPlaceholder
              style={{ width: '70%', height: 8, borderRadius: 4 }}
              shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
            />
          </View>
          <ShimmerPlaceholder
            style={{ width: '20%', height: 14, borderRadius: 4, alignSelf: 'flex-end', marginTop: 4 }}
            shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
          />
        </View>
        <ShimmerPlaceholder
          style={{ width: '40%', height: 12, borderRadius: 4, marginTop: 8 }}
          shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
        />
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {nameLoading ? renderWelcomeShimmer() : (
        <View style={styles.header}>
          <Text style={styles.title}>
            Mental<Text style={styles.highlight}>Help</Text>
          </Text>
          <Text style={styles.subtitle}>Your mental health companion</Text>
          <Text style={styles.welcome}>
            Welcome back, <Text style={styles.userName}>{name}</Text>
          </Text>
        </View>
      )}

      {moodDataLoading ? renderSummaryCardShimmer() : (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>This Week</Text>
            {weeklyMoodSummary ? (
              <>
                <Text style={[styles.moodHighlight, { backgroundColor: getEmotionColor(weeklyMoodSummary.mood) }]}>
                  {weeklyMoodSummary.mood}
                </Text>
                <View style={styles.intensityContainer}>
                  <Text style={styles.intensityLabel}>Intensity</Text>
                  <View style={styles.intensityBadge}>
                    <Text style={styles.intensityText}>{weeklyMoodSummary.intensity}</Text>
                  </View>
                </View>
                <Text style={styles.scoreText}>
                  Score: {weeklyMoodSummary.score}/10
                </Text>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No data available</Text>
              </View>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>This Month</Text>
            {monthlyMoodSummary ? (
              <>
                <Text style={[styles.moodHighlight, { backgroundColor: getEmotionColor(monthlyMoodSummary.mood) }]}>
                  {monthlyMoodSummary.mood}
                </Text>
                <View style={styles.intensityContainer}>
                  <Text style={styles.intensityLabel}>Intensity</Text>
                  <View style={styles.intensityBadge}>
                    <Text style={styles.intensityText}>{monthlyMoodSummary.intensity}</Text>
                  </View>
                </View>
                <Text style={styles.scoreText}>
                  Score: {monthlyMoodSummary.score}/10
                </Text>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No data available</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {moodDataLoading ? renderChartShimmer() : (
        radarChartData.length > 0 ? (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Mood Distribution</Text>
            <View style={styles.chartWrapper}>
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
                dataStroke="rgba(52, 211, 153, 0.8)"
                dataStrokeWidth={2}
              />
            </View>
            <View style={styles.legendContainer}>
              {radarChartData.map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.legendItem}
                  onPress={() => {
                    alert(`${item.label}: ${item.originalValue}/10${item.originalValue > 5 ? ' (scaled down in chart)' : ''}`);
                  }}
                >
                  <View style={[styles.legendColor, { backgroundColor: getEmotionColor(item.label) }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null
      )}
 
      <View style={styles.sectionDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.sectionTitle}>{formattedDate}</Text>
        <View style={styles.dividerLine} />
      </View>

      {moodDataLoading ? renderChartShimmer() : (
        lineChartData && lineChartData.datasets && lineChartData.datasets[0].data.some(value => !isNaN(value)) && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Weekly Mood Trends</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={lineChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#34d399"
                  }
                }}
                style={styles.chart}
                bezier
                onDataPointClick={(data) => {
                  const label = lineChartData.labels[data.index];
                  const value = data.value;
                  const moodType = lineChartData.types[data.index];
                  alert(`${label}: ${moodType ? `${moodType} (${value}/10)` : 'No data'}`);
                }}
              />
            </View>
            <View style={styles.legendContainer}>
              {Array.from(new Set(lineChartData.types)).filter(type => type).map((type, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: getEmotionColor(type) }]} />
                  <Text style={styles.legendText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )
      )}

      {moodDataLoading ? renderChartShimmer() : (
        monthlyChartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Mood Trends</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={monthlyChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#8641f4"
                  }
                }}
                style={styles.chart}
                bezier
                onDataPointClick={(data) => {
                  const label = monthlyChartData.labels[data.index];
                  const value = data.value;
                  const moodType = monthlyChartData.types[data.index];
                  alert(`${label}: ${moodType ? `${moodType} (${value}/10)` : 'No data'}`);
                }}
              />
            </View>
            <View style={styles.legendContainer}>
              {Array.from(new Set(monthlyChartData.types)).filter(type => type).map((type, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: getEmotionColor(type) }]} />
                  <Text style={styles.legendText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )
      )}

      <View style={styles.sectionDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.sectionTitle}>Recent Mood Entries</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.moodList}>
        {moodDataLoading ? (
          // Render 3 shimmer placeholders for mood entries
          Array(3).fill(0).map((_, index) => renderMoodEntryShimmer(index))
        ) : (
          moodData && moodData.length > 0 ? (
            moodData.slice(0, 6).map((mood, index) => (
              <View key={index} style={styles.moodItemCard}>
                <View style={[styles.moodIndicator, { backgroundColor: getEmotionColor(mood.mood_type) }]} />
                <View style={styles.moodItemContent}>
                  <Text style={styles.moodText}>{mood.mood_type}</Text>
                  <View style={styles.moodIntensityContainer}>
                    <Text style={styles.moodIntensityLabel}>Intensity</Text>
                    <View style={styles.intensityBarContainer}>
                      <View 
                        style={[
                          styles.intensityBar, 
                          { width: `${(mood.intensity / 10) * 100}%`, backgroundColor: getEmotionColor(mood.mood_type) }
                        ]} 
                      />
                    </View>
                    <Text style={styles.moodIntensityValue}>{mood.intensity}/10</Text>
                  </View>
                  <Text style={styles.moodDate}>
                    {new Date(mood.tracked_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noEntriesContainer}>
              <Text style={styles.noEntriesText}>No mood entries yet</Text>
              <Text style={styles.noEntriesSubtext}>Track your first mood to see data here</Text>
            </View>
          )
        )}
      </View>

      {ratingLoading ? (
        <ShimmerPlaceholder
          style={[styles.ratingButton, { width: '90%', height: 50, marginTop: 24, marginBottom: 12 }]}
          shimmerColors={['#4eebc0', '#34d399', '#4eebc0']}
        />
      ) : (
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
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={submitRating}
        rating={rating}
        setRating={setRating}
        feedback={feedback}
        setFeedback={setFeedback}
      />

      <NetworkModal 
        visible={isNetworkModalVisible}
        onRetry={checkNetworkAndRetry}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 5,
    fontFamily: "System",
  },
  highlight: {
    color: "#fff",
    backgroundColor: "#34d399",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  subtitle: {
    fontSize: 18,
    color: "#64748b",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "System",
  },
  welcome: {
    fontSize: 18,
    color: "#475569",
    textAlign: "center",
    fontFamily: "System",
  },
  userName: {
    fontWeight: "bold",
    color: "#1C7F56",
  },
  dateText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "System",
    marginTop: 4,
    textAlign: "center",
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginVertical: 15,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    width: '48%',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: "System",
  },
  moodHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginVertical: 8,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  intensityContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  intensityLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontFamily: "System",
  },
  intensityBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  intensityText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontFamily: "System",
  },
  noDataContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: "System",
  },
  chartContainer: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginVertical: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#1e293b",
    fontFamily: "System",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  sectionTitle: {
    paddingHorizontal: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    fontFamily: "System",
  },
  moodList: {
    width: "90%",
  },
  moodItemCard: {
    flexDirection: 'row',
    backgroundColor: "#fff",
    padding: 0,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  moodIndicator: {
    width: 8,
    height: 'auto',
  },
  moodItemContent: {
    flex: 1,
    padding: 16,
  },
  moodText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 8,
    fontFamily: "System",
  },
  moodIntensityContainer: {
    marginVertical: 8,
  },
  moodIntensityLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
    fontFamily: "System",
  },
  intensityBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    width: '100%',
    marginBottom: 4,
  },
  intensityBar: {
    height: '100%',
    borderRadius: 4,
  },
  moodIntensityValue: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    fontFamily: "System",
  },
  moodDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    fontFamily: "System",
  },
  noEntriesContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noEntriesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    fontFamily: "System",
  },
  noEntriesSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: "System",
  },
  ratingButton: {
    backgroundColor: '#34d399',
    padding: 16,
    borderRadius: 12,
    width: '90%',
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#155e3e',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ratingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: "System",
  },
  currentRating: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    fontFamily: "System",
  },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: '#1e293b',
    },
    starsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
    },
    star: {
      fontSize: 40,
      color: '#cbd5e1',
      marginHorizontal: 5,
    },
    starSelected: {
      color: '#f59e0b',
    },
    feedbackInput: {
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 8,
      padding: 10,
      marginBottom: 20,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      marginHorizontal: 5,
    },
    cancelButton: {
      backgroundColor: '#ef4444',
    },
    submitButton: {
      backgroundColor: '#34d399',
    },
    buttonText: {
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    legendContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 15,
      paddingHorizontal: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 10,
      marginVertical: 5,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 5,
    },
    legendText: {
      fontSize: 14,
      color: '#334155',
      fontFamily: "System",
    },
    networkModalText: {
      fontSize: 16,
      color: '#475569',
      textAlign: 'center',
      lineHeight: 22,
      marginTop: 10,
      fontFamily: "System",
    },
  });