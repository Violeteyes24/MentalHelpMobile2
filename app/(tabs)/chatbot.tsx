import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
// both questions & responses will be stored @supabase and create simple algorithm to generate questions based on user input.
const questions = [
    "How are you feeling today?",
    "Would you like to schedule an appointment with a counselor?",
    "Would you like to update your mood tracker?",
]; 

const responses: { [key: string]: string } = {
    "How are you feeling today?": "I'm here to listen! Can you share a bit more about how you're feeling?",
    "Would you like to schedule an appointment with a counselor?": "I can help with that! Please contact our support to find available slots.",
    "Would you like to update your mood tracker?": "Sure! Please go to the mood tracker section to log your mood.",
};

const Chatbot = () => {
    const [chatLog, setChatLog] = useState<{ question: string, response: string }[]>([]);

    const handleQuestionPress = (question: string) => {
        const response = responses[question];
        setChatLog([...chatLog, { question, response }]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mental Health Chatbot</Text>
            {/* options and response should be contextually appropriate based on  */}
            {/* 1. Mood Tracker data  */}
            {/* 2. Demographics */}
            <ScrollView style={styles.chatLog} contentContainerStyle={styles.chatLogContent}>
                {chatLog.map((log, index) => (
                    <View key={index} style={styles.messageContainer}>
                        <Text style={styles.userMessage}>You: {log.question}</Text> 
                        <Text style={styles.botMessage}>Bot: {log.response}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.buttonContainer}>
                {questions.map((question, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.questionButton}
                        onPress={() => handleQuestionPress(question)}
                    >
                        <Text style={styles.questionText}>{question}</Text>
                    </TouchableOpacity>
                ))}
                {/* Extract frequent topic and send to database ('reports') */}
            </View>
        </View>
    );
};

export default Chatbot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: "10%",
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  chatLog: {
    flex: 1,
    marginBottom: 20,
  },
  chatLogContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginBottom: 15,
  },
  userMessage: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  botMessage: {
    fontSize: 16,
    color: "#333",
    backgroundColor: "#E8E8E8",
    padding: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  questionButton: {
    backgroundColor: "#6ee7b7",
    padding: 12,
    borderRadius: 8,
    margin: 4,
    width: "30%",
    // Use flexbox to make the buttons horizontal
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between", // Space buttons evenly
    alignItems: "center", // Center text vertically
    marginBottom: "1%",
  },
  questionText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
});
