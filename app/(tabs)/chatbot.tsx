import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Config } from "../../config/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: Config.OPENAI_API_KEY,
});
console.log(Config.OPENAI_API_KEY);

const Chatbot = () => {
  const { session } = useAuth();
  const [chatLog, setChatLog] = useState<
    { question: string; response: string }[]
  >([]);
  const [userData, setUserData] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);

  useEffect(() => {
    fetchChatLog();
    fetchUserData();
    fetchMoodData();
    fetchQuestions();

    const channel = supabase
      .channel("chatbot-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot" },
        () => fetchChatLog()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchChatLog() {
    const { data, error } = await supabase
      .from("chatbot")
      .select("*")
      .eq("user_id", session?.user.id)
      .order("conversation_date", { ascending: true });

    if (error) {
      console.error("Error fetching chat log:", error);
    } else {
      console.log("Fetched chat log:", data);
      setChatLog(data || []);
    }
  }

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
    console.log("Question pressed:", question);
    const response = await generateResponse(question);
    const trimmedResponse = response.trim();
    const newLog = { question, response: trimmedResponse };

    const questionId = questions.find((q) => q.question === question)?.id;
    const answerId = await fetchAnswerId(trimmedResponse);

    if (!questionId) {
      console.error("Question ID not found for question:", question);
      return;
    }

    if (!answerId) {
      console.error("Answer ID not found for response:", trimmedResponse);
      return;
    }

    console.log("Question ID:", questionId, "Answer ID:", answerId);

    const { error } = await supabase.from("chatbot").insert([
      {
        user_id: session?.user.id,
        chat_question_id: questionId,
        chat_answer_id: answerId,
        conversation_date: new Date().toISOString(),
      },
    ]);

    if (error) console.log("Error inserting chat log:", error);
    else setChatLog([...chatLog, newLog]);
  }

  async function fetchAnswerId(answer: string) {
    const { data, error } = await supabase
      .from("chatbot_answers")
      .select("chat_answer_id")
      .eq("chatbot_answer", answer)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching answer ID:", error);
      return null;
    }

    if (!data) {
      console.error("No answer ID found for answer:", answer);
      return null;
    }

    return data.chat_answer_id;
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

    console.log("Proceeding to OpenAI API call");

    const prompt = `You are a mental health chat bot and is expected to assist the user. Please generate dynamic responses according to the data here: User Data: ${JSON.stringify(
      userData
    )}\nMood Data: ${JSON.stringify(
      moodData
    )}\nQuestion: ${question}\nResponse:`;

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
      <Text style={styles.title}>Mental Health Chatbot</Text>
      <ScrollView
        style={styles.chatLog}
        contentContainerStyle={styles.chatLogContent}
      >
        {chatLog.map((log, index) => (
          <View key={index} style={styles.messageWrapper}>
            <View style={styles.userMessageContainer}>
              <Text style={styles.userMessage}>You: {log.question}</Text>
            </View>
            <View style={styles.botMessageContainer}>
              <Text style={styles.botMessage}>Bot: {log.response}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {questions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={styles.questionButton}
            onPress={() => handleQuestionPress(question.question)}
            activeOpacity={0.7} // Smooth press effect
          >
            <Text style={styles.questionText}>{question.question}</Text>
          </TouchableOpacity>
        ))}
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
  chatLog: { flex: 1, marginBottom: 20 },
  chatLogContent: { paddingVertical: 10 },
  messageWrapper: { marginBottom: 15 },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#6ee7b7",
    padding: 12,
    borderRadius: 12,
    maxWidth: "75%",
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    maxWidth: "75%",
    borderColor: "#B0BEC5",
    borderWidth: 1,
  },
  userMessage: { fontSize: 16, color: "#ffffff", fontWeight: "bold" },
  botMessage: { fontSize: 16, color: "#333" },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingTop: 10,
  },
  questionButton: {
    backgroundColor: "#6ee7b7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    margin: 6,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Shadow effect for Android
  },

  questionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
