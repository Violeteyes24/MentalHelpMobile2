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
import dayjs from 'dayjs';
import { Icon } from "@rneui/themed";

interface MoodData {
  mood_type: string;
  intensity: number;
  tracked_at: string;
}

interface AppointmentData {
  appointment_id: string;
  appointment_type: string;
  status: string;
  reason?: string;
  availability_schedules: {
    date: string;
    start_time: string;
    end_time: string;
  }[];
  users: {
    name: string;
  };
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
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentData[]>([]);

  useEffect(() => {
    const getMoodData = async () => {
      console.log('Fetching mood data for user:', session?.user.id);
      const weekData = await fetchLatestMoodTrackerData();
      const monthData = await fetchMonthlyMoodTrackerData();
      console.log('Week data fetched:', weekData);
      console.log('Month data fetched:', monthData);
      setMoodData(weekData);
      setMonthlyMoodData(monthData);
    };

    if (session?.user.id) {
      getMoodData();

      const channel = supabase.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mood_tracker' },
          (payload) => {
            console.log('Mood tracker change received:', payload); // needs to trigger a re-fetch of mood data
            getMoodData();
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up mood tracker subscription');
        channel.unsubscribe();
      };
    }
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

  const fetchUpcomingAppointments = async () => {
    const currentDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        appointment_id,
        appointment_type,
        status,
        reason,
        availability_schedules (
          date,
          start_time,
          end_time
        ),
        users!appointments_counselor_id_fkey (
          name
        )
      `)
      .eq('user_id', session?.user.id)
      .eq('status', 'pending')
      .gte('availability_schedules.date', currentDate)
      .order('availability_schedules(date)', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming appointments:', error);
    } else {
      setUpcomingAppointments(data?.filter(appointment => appointment.availability_schedules && appointment.availability_schedules.length > 0
        ) as unknown as AppointmentData[] || []);
    }
  };

  useEffect(() => {
    if (session?.user.id) {
      getUserName();
      getUserRating();
      fetchAppointments(); // Fetch appointments when the session user id is available
      fetchUpcomingAppointments(); // Add this line
    }
  }, [session?.user.id]);

  async function fetchLatestMoodTrackerData(): Promise<MoodData[] | null> {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log('Fetching weekly mood data between:', {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString()
    });
  
    let { data: mood_tracker, error } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity, tracked_at")
      .eq("user_id", session?.user.id)
      .gte("tracked_at", startOfWeek.toISOString())
      .lte("tracked_at", endOfWeek.toISOString())
      .order("tracked_at", { ascending: false });
  
    if (error) {
      console.error("Error fetching weekly mood tracker data:", error);
      return null;
    }
    
    console.log('Weekly mood data fetched:', mood_tracker);
    return mood_tracker || null;
  }

  async function fetchMonthlyMoodTrackerData(): Promise<MoodData[] | null> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('Fetching monthly mood data between:', {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString()
    });

    let { data: mood_tracker, error } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity, tracked_at")
      .eq("user_id", session?.user.id)
      .gte("tracked_at", startOfMonth.toISOString())
      .lte("tracked_at", endOfMonth.toISOString())
      .order("tracked_at", { ascending: false });

    if (error) {
      console.error("Error fetching monthly mood tracker data:", error);
      return null;
    }

    console.log('Monthly mood data fetched:', mood_tracker);
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

  const convertTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const renderUpcomingAppointments = () => (
    <>
      <View style={styles.sectionDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.appointmentsList}>
        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map((appointment) => (
            <View key={appointment.appointment_id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Icon name="event" size={20} color="#4a90e2" />
                <Text style={styles.appointmentDate}>
                  {new Date(appointment.availability_schedules[0].date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.appointmentDetails}>
                <Text style={styles.appointmentTime}>
                  {convertTo12Hour(appointment.availability_schedules[0].start_time)} -
                  {convertTo12Hour(appointment.availability_schedules[0].end_time)}
                </Text>
                <Text style={styles.appointmentCounselor}>
                  with {appointment.users.name}
                </Text>
                {appointment.reason && (
                  <Text style={styles.appointmentReason}>
                    Reason: {appointment.reason}
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noAppointmentsContainer}>
            <Text style={styles.noAppointmentsText}>No upcoming appointments</Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Mental<Text style={styles.highlight}>Help</Text>
        </Text>
        <Text style={styles.subtitle}>Your mental health companion</Text>
        <Text style={styles.welcome}>
          Welcome back, <Text style={styles.userName}>{name}</Text>
        </Text>
      </View>

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

      {radarChartData.length > 0 && (
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
        </View>
      )}

      {lineChartData && (
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
                decimalPlaces: 1,
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
            />
          </View>
        </View>
      )}

      {monthlyChartData && (
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
                decimalPlaces: 1,
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
            />
          </View>
        </View>
      )}

      {renderUpcomingAppointments()}

      <View style={styles.sectionDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.sectionTitle}>Recent Mood Entries</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.moodList}>
        {moodData && moodData.length > 0 ? (
          moodData.map((mood, index) => (
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
                        { width: `${(mood.intensity / 5) * 100}%`, backgroundColor: getEmotionColor(mood.mood_type) }
                      ]}
                    />
                  </View>
                  <Text style={styles.moodIntensityValue}>{mood.intensity}/5</Text>
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
        )}
      </View>

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
  appointmentsList: {
    width: '90%',
    marginBottom: 20,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  appointmentDetails: {
    marginLeft: 28,
  },
  appointmentTime: {
    fontSize: 15,
    color: '#4a90e2',
    fontWeight: '500',
    marginBottom: 4,
  },
  appointmentCounselor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noAppointmentsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});