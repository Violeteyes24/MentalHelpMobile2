import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { supabase } from "../../lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from "../../config/config";
import { useAuth } from "../../context/AuthContext";
import OpenAI from "openai";
import { ScrollView as HScrollView } from 'react-native';

export type ChatbotView = {
  chat_question_id: string;
  chat_answer_id: string;
  chatbot_question: string;
  chatbot_answer: string;
  dynamic_response_openai: string; // Add this field
  user_id: string;
  timestamp: string;
};

const openai = new OpenAI({
  apiKey: Config.OPENAI_API_KEY,
});
console.log(Config.OPENAI_API_KEY);

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

const Chatbot = () => {
  const { session } = useAuth();
  const [chatLog, setChatLog] = useState<ChatbotView[]>([]);
  const [userData, setUserData] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      const { data: chatData } = await supabase
        .from("chatbot_view")
        .select("*")
        .eq("user_id", session?.user.id)
        .order("timestamp", { ascending: true });

      setChatLog(chatData || []);
      console.log('Initial chat data length:', chatData?.length);

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

  const handleAcceptTerms = async () => {
    try {
      await AsyncStorage.setItem('chatbotTermsAccepted', 'true');
      setShowTerms(false);
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
    }
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
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching mood data:", error);
    } else {
      // console.log("Fetched mood data:", data);
      setMoodData(data);
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

  async function handleQuestionPress(question: string) {
    const currentTimestamp = new Date().toISOString();
    console.log("Question pressed:", question);
    const response = await generateResponse(question);
    const trimmedResponse = response.trim();

    const questionId = questions.find((q) => q.question === question)?.id;
    const answerId = await fetchAnswerId(questionId || "");

    if (!questionId) {
      console.error("Question ID not found for question:", question);
      return;
    }

    if (!answerId) {
      console.error("Question ID not found for response:", questionId);
      return;
    }

    console.log("Question ID:", questionId, "Answer ID:", answerId);

    // Insert into chatbot table with dynamic_response_openai
    const { error } = await supabase.from("chatbot").insert([
      {
        user_id: session?.user.id,
        chat_question_id: questionId,
        chat_answer_id: answerId,
        conversation_date: currentTimestamp, // Use current timestamp
        dynamic_response_openai: trimmedResponse // Store the OpenAI response
      },
    ]);

    const newLog = { 
      chat_question_id: questionId, 
      chat_answer_id: answerId, 
      chatbot_question: question, 
      chatbot_answer: trimmedResponse, 
      dynamic_response_openai: trimmedResponse, // Add this field
      user_id: session?.user.id || "", 
      timestamp: currentTimestamp // Use current timestamp
    };

    if (error) console.log("Error inserting chat log:", error);
    else setChatLog([...chatLog, newLog]);
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
  
    const prompt = `You are a mental health chat bot and is expected to assist the user.
      
  Previous Conversation Context and Themes:
  ${conversationContext || 'No previous context available'}
  
  User Data: ${JSON.stringify(userData)}
  Mood Data: ${JSON.stringify(moodData)}
  Question: ${question}
  
  Based on the user's conversation history, current question, and personal data, provide a personalized and contextually relevant response. Call the user by their name if available.
  
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
          </View>
        </View>
      </Modal>

      <Text style={styles.title}>Mental Health Chatbot</Text>
      <TouchableOpacity onPress={resetTerms}>
        <Text style={styles.termsLink}>View Terms and Conditions</Text>
      </TouchableOpacity>
      
      {/* Chat Messages */}
      <ScrollView
        style={styles.chatLog}
        contentContainerStyle={styles.chatLogContent}
      >
        {chatLog.map((log, index) => (
          <View key={index} style={styles.messageWrapper}>
            <View style={styles.userMessageContainer}>
              <Text style={styles.userMessage}>You: {log.chatbot_question}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(log.timestamp)}</Text>
            </View>
            <View style={[styles.botMessageContainer, styles.botMessageShadow]}>
              <Text style={styles.botMessage}>
                <Text style={styles.predefinedResponse}>Bot: {log.chatbot_answer}</Text>
                {log.dynamic_response_openai && (
                  <Text style={styles.dynamicResponse}>
                    {'\n\n'}Additional Response: {log.dynamic_response_openai}
                  </Text>
                )}
              </Text>
              <Text style={[styles.timestamp, styles.botTimestamp]}>{formatTimestamp(log.timestamp)}</Text>
            </View>
          </View>
        ))}
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
              style={styles.questionButton}
              onPress={() => handleQuestionPress(question.question)}
              activeOpacity={0.7}
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
  container: { flex: 1, padding: "7%", backgroundColor: "#fff" },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
  },
  chatLog: {
    flex: 1,
    marginBottom: 20,
  },
  chatLogContent: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  messageWrapper: {
    marginBottom: 20,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#6ee7b7",
    padding: 15,
    borderRadius: 20,
    borderBottomRightRadius: 5,
    maxWidth: "80%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    paddingBottom: 8, // Add some padding for the timestamp
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    maxWidth: "80%",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    paddingBottom: 8, // Add some padding for the timestamp
  },
  botMessageShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userMessage: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  botMessage: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  predefinedResponse: {
    fontWeight: "500",
  },
  dynamicResponse: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 15,
  },
  carouselContainer: {
    height: 100,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 5,
  },
  carousel: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  questionButton: {
    backgroundColor: "#6ee7b7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 5,
    height: 60,
    minWidth: 150,
    maxWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  questionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingTop: 2,
  },
  botTimestamp: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 20,
  },
  acceptButton: {
    backgroundColor: '#6ee7b7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsLink: {
    color: '#34d399',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
});
