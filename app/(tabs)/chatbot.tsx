import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { REACT_APP_OPENAI_API_KEY } from "../../.env"

console.log(REACT_APP_OPENAI_API_KEY);

const questions = [
  "How are you feeling today?",
  "Would you like to schedule an appointment with a counselor?",
  "Would you like to update your mood tracker?",
];

const responses: { [key: string]: string } = {
  "How are you feeling today?":
    "I'm here to listen! Can you share a bit more about how you're feeling?",
  "Would you like to schedule an appointment with a counselor?":
    "I can help with that! Please contact our support to find available slots.",
  "Would you like to update your mood tracker?":
    "Sure! Please go to the mood tracker section to log your mood.",
};

const Chatbot = () => {
  const [chatLog, setChatLog] = useState<
    { question: string; response: string }[]
  >([]);

  const handleQuestionPress = (question: string) => {
    const response = responses[question];
    setChatLog([...chatLog, { question, response }]);
  };

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
            onPress={() => handleQuestionPress(question)}
            activeOpacity={0.7} // Smooth press effect
          >
            <Text style={styles.questionText}>{question}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default Chatbot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: "7%",
    backgroundColor: "#fff",
  },
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
    paddingVertical: 10,
  },
  messageWrapper: {
    marginBottom: 15,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#6ee7b7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 5,
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
  userMessage: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "bold",
  },
  botMessage: {
    fontSize: 16,
    color: "#333",
  },
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
