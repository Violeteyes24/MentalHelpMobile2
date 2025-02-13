import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from "../../context/AuthContext";

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

interface Notification {
  notification_id: string;
  user_id: string;
  notification_content: string;
  sent_at: string;
  user: {
    name: string;
  };
}

const NotificationUI: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { session } = useAuth();
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        notification_id,
        user_id,
        notification_content,
        sent_at,
        user:users(name)
      `)
      .eq('user_id', session?.user.id)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to fetch notifications. Please try again.');
    } else {
      setNotifications(data || []);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity style={styles.messageContainer}>
        <View style={styles.messageContent}>
          <Text style={styles.sender}>{item.user?.name || 'Unknown'}</Text>
          <Text style={styles.messageText}>{item.notification_content}</Text>
        </View>
        <Text style={styles.time}>{new Date(item.sent_at).toLocaleTimeString()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.notification_id}
        contentContainerStyle={styles.messageList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 20,
  },
  messageList: {
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#ffffff",
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageContent: {
    flex: 1,
  },
  sender: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  time: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginTop: '5%',
    marginBottom: '5%'
  },
});

export default NotificationUI;
