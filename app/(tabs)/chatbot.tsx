import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from "../../config/config";
import { useAuth } from "../../context/AuthContext";
import OpenAI from "openai";
import { ScrollView as HScrollView } from 'react-native';

// Define color palette for easy theming
const colors = {
  primary: "#4ade80",
  primaryDark: "#34d399",
  primaryLight: "#a7f3d0",
  background: "#f9fafb",
  cardBg: "#ffffff",
  text: "#1f2937",
  textLight: "#6b7280",
  textInverted: "#ffffff",
  border: "#e5e7eb",
  shadow: "#000000",
};

export type ChatbotView = {
  chat_question_id: string;
  chat_answer_id: string;
  chatbot_question: string;
  chatbot_answer: string;
  dynamic_response_openai: string;
  user_id: string;
  timestamp: string;
};

const openai = new OpenAI({
  apiKey: Config.OPENAI_API_KEY,
});

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  // Convert to Philippines timezone
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

// Helper function to group chat messages by date
const groupChatByDate = (chatLog: ChatbotView[]): Record<string, ChatbotView[]> => {
  const grouped: Record<string, ChatbotView[]> = {};
  
  chatLog.forEach(log => {
    const date = new Date(log.timestamp);
    const dateKey = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(log);
  });
  
  return grouped;
};

const Chatbot = () => {
  const { session } = useAuth();
  const [chatLog, setChatLog] = useState<ChatbotView[]>([]);
  const [userData, setUserData] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasDisagreed, setHasDisagreed] = useState(false);
  
  // Group chat logs by date
  const groupedChatLog = groupChatByDate(chatLog);

  useEffect(() => {
    const checkAndInitialize = async () => {
      // For testing: uncomment the next line to reset terms acceptance
      // await AsyncStorage.removeItem('chatbotTermsAccepted');
      
      const hasAccepted = await AsyncStorage.getItem('chatbotTermsAccepted');
      console.log('Initial terms check:', hasAccepted);
      
      if (!hasAccepted) {
        setShowTerms(true);
      }
    };

    checkAndInitialize();
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: chatData, error: chatError } = await supabase
        .from("chatbot_view")
        .select("*")
        .eq("user_id", session?.user.id)
        .order("timestamp", { ascending: true });

      if (chatError) {
        console.error('Error fetching chat data:', chatError);
      } else {
        setChatLog(chatData || []);
        console.log('Initial chat data length:', chatData?.length);
      }

      // Check terms based on chat data
      const hasAccepted = await AsyncStorage.getItem('chatbotTermsAccepted');
      if (!hasAccepted && (!chatData || chatData.length === 0)) {
        console.log('Setting show terms to true');
        setShowTerms(true);
      }

      // Fetch other data
      await Promise.all([
        fetchUserData(),
        fetchMoodData(),
        fetchQuestions(),
      ]);
    } catch (error) {
      console.error('Error in initial data fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this for testing purposes
  const resetTerms = async () => {
    await AsyncStorage.removeItem('chatbotTermsAccepted');
    setShowTerms(true);
  };

  async function fetchChatLog() {
    const { data, error } = await supabase
      .from("chatbot_view")
      .select("*")
      .eq("user_id", session?.user.id)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Error fetching chat log:", error);
    } else {
      console.log("Fetched chat log:", data);
      setChatLog(data || []);
      
      // Check terms right after setting chat log
      if (data?.length === 0) {
        const hasAccepted = await AsyncStorage.getItem('chatbotTermsAccepted');
        if (!hasAccepted) {
          setShowTerms(true);
        }
      }
    }
  }

  // Modified handleAcceptTerms to reset disagreement state
  const handleAcceptTerms = async () => {
    try {
      await AsyncStorage.setItem('chatbotTermsAccepted', 'true');
      setHasDisagreed(false); // Allow chatbot usage after agreeing
      setShowTerms(false);
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
    }
  };

  // New handler for disagreeing to terms
  const handleDisagreeTerms = () => {
    setHasDisagreed(true);
    setShowTerms(false);
  };

  async function fetchUserData() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", session?.user.id)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
    } else {
      // console.log("Fetched user data:", data);
      setUserData(data);
    }
  }

  async function fetchMoodData() {
    const { data, error } = await supabase
      .from("mood_tracker")
      .select("*")
      .eq("user_id", session?.user.id)
      .order("tracked_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Error fetching mood data:", error);
    } else {
      console.log("Fetched mood data:", JSON.stringify(data, null, 2));
      setMoodData(data as any);
    }
  }

  async function fetchQuestions() {
    const { data, error } = await supabase
      .from("chatbot_questions")
      .select("chat_question_id, chatbot_question");
      // .eq("user_id", session?.user.id);

    if (error) {
      console.error("Error fetching questions:", error);
    } else {
      // console.log("Fetched questions:", data);
      setQuestions(
        data.map(
          (q: { chat_question_id: string; chatbot_question: string }) => ({
            id: q.chat_question_id,
            question: q.chatbot_question,
          })
        )
      );
    }
  }

  // Modify handleQuestionPress to check for disagreement
  async function handleQuestionPress(question: string) {
    if (isGenerating) return;
    if (hasDisagreed) {
      Alert.alert("Please agree to terms and conditions");
      return;
    }
    
    setIsGenerating(true);
    const currentTimestamp = new Date().toISOString();
    
    try {
      const questionId = questions.find((q) => q.question === question)?.id;
      const answerId = await fetchAnswerId(questionId || "");

      if (!questionId || !answerId) {
        console.error("Question or Answer ID not found");
        return;
      }

      // First get the predefined answer
      const { data: predefinedAnswer, error: answerError } = await supabase
        .from("chatbot_answers")
        .select("chatbot_answer")
        .eq("chat_question_id", questionId)
        .single();

      if (answerError) {
        console.error("Error fetching predefined answer:", answerError);
        return;
      }

      // Then get the AI response
      const aiResponse = await generateResponse(question);
      const trimmedAiResponse = aiResponse.trim();

      // Insert into chatbot table with both responses
      const { error } = await supabase.from("chatbot").insert([
        {
          user_id: session?.user.id,
          chat_question_id: questionId,
          chat_answer_id: answerId,
          conversation_date: currentTimestamp,
          dynamic_response_openai: trimmedAiResponse
        },
      ]);

      const newLog = { 
        chat_question_id: questionId, 
        chat_answer_id: answerId, 
        chatbot_question: question, 
        chatbot_answer: predefinedAnswer.chatbot_answer,
        dynamic_response_openai: trimmedAiResponse,
        user_id: session?.user.id || "", 
        timestamp: currentTimestamp
      };

      if (error) console.log("Error inserting chat log:", error);
      else setChatLog([...chatLog, newLog]);
    } catch (error) {
      console.error("Error handling question:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  async function fetchAnswerId(chatbot_question_id: string) {
    const { data, error } = await supabase
      .from("chatbot_answers")
      .select("chat_answer_id")
      .eq("chat_question_id", chatbot_question_id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching answer ID:", error);
      return null;
    }

    if (!data) {
      console.error(
        "No answer ID found for chatbot_question_id:",
        chatbot_question_id
      );
      return null;
    }
    
    return data.chat_answer_id;
  }

  async function analyzeConversationContext() {
    // Get all previous conversations for this user
    const { data: conversationHistory, error } = await supabase
      .from("chatbot_view")
      .select("chatbot_question, chatbot_answer, dynamic_response_openai")
      .eq("user_id", session?.user.id)
      .order("timestamp", { ascending: true });
  
    if (error) {
      console.error("Error fetching conversation history:", error);
      return null;
    }
  
    // Combine all conversations into a single context string
    const conversationContext = conversationHistory?.map(conv => 
      `User: ${conv.chatbot_question}\nBot: ${conv.chatbot_answer}\n${conv.dynamic_response_openai || ''}`
    ).join('\n\n');
  
    // Analyze frequent topics using OpenAI
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Analyze the following conversation history and identify the main recurring themes or topics. Focus on mental health related patterns and concerns. Provide a brief summary of the key themes."
          },
          {
            role: "user",
            content: conversationContext
          }
        ]
      });
  
      return response.choices[0]?.message?.content || null;
    } catch (err) {
      console.error("Error analyzing conversation context:", err);
      return null;
    }
  }
  
  async function generateResponse(question: string) {
    const questionId = questions.find((q) => q.question === question)?.id;
  
    if (!questionId) {
      console.error("Question ID not found for question:", question);
      return "Sorry, I couldn't find an answer to your question.";
    }
  
    let responseText = "";
  
    // Fetch predefined answer
    const { data: predefinedAnswer, error } = await supabase
      .from("chatbot_answers")
      .select("chatbot_answer")
      .eq("chat_question_id", questionId)
      .single();
  
    if (predefinedAnswer) {
      console.log("Fetched predefined answer:", predefinedAnswer);
      responseText += predefinedAnswer.chatbot_answer + " ";
    } else if (error && error.code !== "PGRST116") {
      console.log("No predefined answer found for question:", error);
    }
  
    // Get conversation context analysis
    const conversationContext = await analyzeConversationContext();
    console.log("Conversation context:", conversationContext);
  
    console.log("Proceeding to OpenAI API call");
  
    const prompt = `You are a mental health chat bot and is expected to assist the user, reply in a short and meaningful message.
      
  Previous Conversation Context and Themes:
  ${conversationContext || 'No previous context available'}
  
  User Data: ${JSON.stringify(userData)}
  Recent Mood History (Last 6 entries): ${JSON.stringify(moodData)}
  Question: ${question}
  
  Based on the user's conversation history, current question, mood patterns from their last 6 mood entries, and personal data, provide a personalized and contextually relevant response. Consider any trends or changes in their mood when responding. Call the user by their name if available.
  
  Response:`;
  
    try {
      console.log("Sending request to OpenAI with prompt:", prompt);
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      });
  
      responseText += response.choices[0]?.message?.content || "";
  
      console.log("Generated response from OpenAI:", responseText.trim());
      return responseText.trim();
    } catch (err) {
      console.error("Error generating response from OpenAI:", err);
      return responseText.trim() + " Sorry, there was an error generating a dynamic response.";
    }
  }
  
  return (
    <View style={styles.container}>
      <Modal
        visible={showTerms}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                Please read and accept the following terms before using the Mental Health Chatbot:
                {'\n\n'}
                1. This chatbot is designed to provide basic mental health support and information only.
                {'\n\n'}
                2. The chatbot may make mistakes and should not be considered as a replacement for professional mental health services.
                {'\n\n'}
                3. If you are experiencing severe mental health issues, please seek immediate professional help.
                {'\n\n'}
                4. The responses provided are generated using AI and should be used as general guidance only.
                {'\n\n'}
                5. In case of emergency, contact your local mental health crisis hotline or emergency services.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptTerms}
            >
              <Text style={styles.acceptButtonText}>I Understand and Accept</Text>
            </TouchableOpacity>
            {/* Added Disagree Button */}
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: "#ef4444", marginTop: 10 }]}
              onPress={handleDisagreeTerms}
            >
              <Text style={styles.acceptButtonText}>I Disagree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.chatHeader}>
        <Text style={styles.title}>Mental Health Chatbot</Text>
      </View>
      <Text style={styles.subtitle}>Your personal wellness companion</Text>
      
      <TouchableOpacity onPress={resetTerms}>
        <Text style={styles.termsLink}>View Terms and Conditions</Text>
      </TouchableOpacity>
      
      {/* Chat Messages */}
      <ScrollView
        style={styles.chatLog}
        contentContainerStyle={styles.chatLogContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : chatLog.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              No conversations yet. Try asking one of the questions below.
            </Text>
          </View>
        ) : (
          Object.entries(groupedChatLog).map(([date, logs]) => (
            <View key={date}>
              <Text style={styles.chatDate}>{date}</Text>
              {logs.map((log, index) => (
                <View key={index} style={styles.messageWrapper}>
                  <View style={styles.userMessageContainer}>
                    <Text style={styles.messageHeader}>You</Text>
                    <Text style={styles.userMessage}>{log.chatbot_question}</Text>
                    <Text style={styles.timestamp}>{formatTimestamp(log.timestamp).split(',')[1]}</Text>
                  </View>
                  <View style={[styles.botMessageContainer, styles.botMessageShadow]}>
                    <Text style={[styles.messageHeader, styles.botMessageHeader]}>Bot</Text>
                    <Text style={styles.botMessage}>
                      <Text style={styles.predefinedResponse}>{log.chatbot_answer}</Text>
                      {log.dynamic_response_openai && (
                        <Text style={styles.dynamicResponse}>
                          {'\n\n'}{log.dynamic_response_openai}
                        </Text>
                      )}
                    </Text>
                    <Text style={[styles.timestamp, styles.botTimestamp]}>{formatTimestamp(log.timestamp).split(',')[1]}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
        
        {isGenerating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating response...</Text>
          </View>
        )}
      </ScrollView>

      {/* Question Carousel */}
      <View style={styles.carouselContainer}>
        <HScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {questions.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.questionButton,
                (isGenerating || hasDisagreed) && styles.questionButtonDisabled
              ]}
              onPress={() => handleQuestionPress(question.question)}
              disabled={isGenerating || hasDisagreed}
              activeOpacity={(isGenerating || hasDisagreed) ? 1 : 0.7}
            >
              <Text style={styles.questionText}>{question.question}</Text>
            </TouchableOpacity>
          ))}
        </HScrollView>
      </View>
    </View>
  );
};

export default Chatbot;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: "5%", 
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: 16,
  },
  chatLog: {
    flex: 1,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chatLogContent: {
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  messageWrapper: {
    marginBottom: 24,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: "85%",
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    paddingBottom: 12,
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: "85%",
    borderColor: colors.border,
    borderWidth: 1,
    paddingBottom: 12,
  },
  botMessageShadow: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userMessage: {
    fontSize: 16,
    color: colors.textInverted,
    fontWeight: "500",
    lineHeight: 22,
  },
  botMessage: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  predefinedResponse: {
    fontWeight: "600",
    fontSize: 16,
    color: colors.text,
  },
  dynamicResponse: {
    fontStyle: 'italic',
    color: colors.textLight,
    fontSize: 15,
    lineHeight: 22,
  },
  carouselContainer: {
    height: 110,
    marginBottom: 10,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  carousel: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
  },
  questionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 6,
    height: 75,
    minWidth: 160,
    maxWidth: 220,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  questionText: {
    color: colors.textInverted,
    fontWeight: "600",
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  botTimestamp: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textLight,
    marginBottom: 20,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptButtonText: {
    color: colors.textInverted,
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsLink: {
    color: colors.primaryDark,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textLight,
    fontSize: 14,
  },
  questionButtonDisabled: {
    opacity: 0.5,
  },
  messageHeader: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
    color: colors.textInverted,
  },
  botMessageHeader: {
    color: colors.primary,
  },
  chatDate: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textLight,
    marginVertical: 15,
    backgroundColor: colors.primaryLight,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyChatText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});