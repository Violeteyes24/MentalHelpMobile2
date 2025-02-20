import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Messages from "../../../components/messagingComponents/messages";

export default function MessagingPage() {
  const { id } = useLocalSearchParams();

  useEffect(() => {
    // console.log(`User navigated to MessagingPage with ID: ${id}`);
  }, [id]);

  return (
    <View style={{ flex: 1 }}>
      <Messages />
    </View>
  );
}