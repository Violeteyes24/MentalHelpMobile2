import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from "../../context/AuthContext";

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

// Type for the raw database response
interface RawNotification {
  notification_id: string;
  user_id: string;
  notification_content: string;
  sent_at: string;
  user: {
    name: string;
  };
}

// Interface for our component state
interface Notification {
  notification_id: string;
  user_id: string;
  notification_content: string;
  sent_at: string;
  userName: string;
}

const NotificationUI: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.user.id) {
      fetchNotifications();

      // Set up real-time subscription using the correct channel format
      const channel = supabase.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          async (payload) => {
            console.log('Change received!', payload);
            
            if (payload.eventType === 'INSERT' && payload.new.user_id === session.user.id) {
              const { data: newNotification, error } = await supabase
                .from('notifications')
                .select(`
                  notification_id,
                  user_id,
                  notification_content,
                  sent_at,
                  user:users!inner(name)
                `)
                .eq('notification_id', payload.new.notification_id)
                .single();

              if (!error && newNotification) {
                const formattedNotification: Notification = {
                  notification_id: (newNotification as any).notification_id,
                  user_id: (newNotification as any).user_id,
                  notification_content: (newNotification as any).notification_content,
                  sent_at: (newNotification as any).sent_at,
                  userName: (newNotification as any).user?.name || 'System Message'
                };
                
                console.log('Adding new notification:', formattedNotification);
                setNotifications(prev => [formattedNotification, ...prev]);
              }
            }
          }
        )
        .subscribe();

      // Cleanup subscription
      return () => {
        console.log('Cleaning up subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user.id]);

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const fetchNotifications = async () => {
    console.log('Fetching notifications for user:', session?.user.id);
    
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        notification_id,
        user_id,
        notification_content,
        sent_at,
        user:users!inner(name)
      `)
      .eq('user_id', session?.user.id)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to fetch notifications. Please try again.');
    } else {
      console.log('Fetched notifications:', data);
      
      // Transform the data to match our expected format
      const formattedNotifications: Notification[] = (data || []).map((item: any) => ({
        notification_id: item.notification_id,
        user_id: item.user_id,
        notification_content: item.notification_content,
        sent_at: item.sent_at,
        userName: item.user?.name || 'System Message'
      }));
      
      setNotifications(formattedNotifications);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={styles.messageContainer}>
      <View style={styles.messageContent}>
        <Text style={styles.sender}>Director</Text>
        <Text style={styles.messageText}>{item.notification_content}</Text>
        <Text style={styles.time}>{formatNotificationTime(item.sent_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.notification_id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchNotifications}
          refreshing={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginVertical: 20,
    letterSpacing: 0.5,
  },
  messageList: {
    padding: 15,
  },
  messageContainer: {
    backgroundColor: "#ffffff",
    marginBottom: 12,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  messageContent: {
    padding: 15,
  },
  sender: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
    color: "#34d399",
  },
  messageText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: "#9ca3af",
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    fontStyle: 'italic',
  },
});

export default NotificationUI;