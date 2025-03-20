import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SectionList } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from "../../context/AuthContext";

const supabase = createClient(
  "https://ybpoanqhkokhdqucwchy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicG9hbnFoa29raGRxdWN3Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MDg2MTUsImV4cCI6MjA0OTk4NDYxNX0.pxmpPITVIItZ_pcChUmmx06C8CkMfg5E80ukMGfPZkU"
);

// Add a custom date formatting function
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Add a function to convert 24-hour time to 12-hour format
const convert24To12Hour = (time24: string): string => {
  if (!time24) return '';
  
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  
  if (isNaN(hour)) return time24;
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${hour12}:${minuteStr} ${period}`;
};

// Define interfaces for the data types we'll be working with
interface User {
  name: string;
}

interface AvailabilitySchedule {
  date: string;
  start_time: string;
  end_time: string;
}

// Regular notification interface
interface Notification {
  notification_id: string;
  user_id: string;
  notification_content: string;
  sent_at: string;
  sender_name?: string;
  status: string;
}

// Interface for appointment notifications
interface AppointmentNotification {
  id: string;
  type: 'rescheduled' | 'cancelled' | 'group_added';
  content: string;
  date: string; // For sorting
  appointmentDate?: string;
  appointmentTime?: string;
  counselorName: string;
  groupMembers?: string[];
}

// Interface for SectionList data
interface NotificationSection {
  title: string;
  data: (Notification | AppointmentNotification)[];
  type: 'regular' | 'appointment';
}

const NotificationUI: React.FC = () => {
  const [regularNotifications, setRegularNotifications] = useState<Notification[]>([]);
  const [appointmentNotifications, setAppointmentNotifications] = useState<AppointmentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointment' | 'regular'>('appointment');

  useEffect(() => {
    if (session?.user.id) {
      fetchRegularNotifications();
      fetchAppointmentNotifications();
      setupSubscriptions();
    }
  }, [session?.user.id]);

  const setupSubscriptions = () => {
    // console.log('Setting up real-time subscriptions');
    
    // Subscription for regular notifications
    const notificationsChannel = supabase.channel('notifications-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          // console.log('Notification change received!', payload);
          
          if (payload.new.user_id === session?.user.id) {
            await fetchRegularNotifications();
          }
        }
      )
      .subscribe((status) => {
        // console.log(`Notifications subscription: ${status}`);
      });

    // Subscription for appointments table
    const appointmentsChannel = supabase.channel('appointments-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        async (payload) => {
          // console.log('Appointment change received!', payload);
          
          // For inserts or updates
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // If user is involved
            if (payload.new && payload.new.user_id === session?.user.id) {
              // console.log('Appointment update involves current user');
              await fetchAppointmentNotifications();
            }
          }
          
          // For deletions - refresh anyway to be safe
          if (payload.eventType === 'DELETE' && payload.old) {
            // console.log('Appointment deleted - refreshing');
            await fetchAppointmentNotifications();
          }
        }
      )
      .subscribe((status) => {
        // console.log(`Appointments subscription: ${status}`);
      });

    // Subscription for group appointments
    const groupAppointmentsChannel = supabase.channel('group-appointments-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'groupappointments' },
        async (payload) => {
          // console.log('Group appointment insert received!', payload);
          
          // If the inserted record has the current user's ID, refresh appointment notifications
          if (payload.new.user_id === session?.user.id) {
            // console.log('Group appointment added');
            await fetchAppointmentNotifications();
          }
        }
      )
      .subscribe((status) => {
        // console.log(`Group appointments subscription: ${status}`);
      });

    // Cleanup subscriptions
    return () => {
      // console.log('Cleaning up subscriptions');
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(groupAppointmentsChannel);
    };
  };

  // Test function to manually refresh the data (only for debugging)
  const debugRefresh = async () => {
    await fetchAppointmentNotifications();
  };

  const fetchRegularNotifications = async () => {
    try {
      setLoading(true);
      // console.log('Fetching regular notifications');
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          notification_id,
          user_id,
          notification_content,
          status,
          sent_at
        `)
        .eq('user_id', session?.user.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      
      // console.log('Fetched regular notifications:', data);
      
      const formattedNotifications: Notification[] = (data || []).map((item: any) => {
        return {
          notification_id: item.notification_id,
          user_id: item.user_id,
          notification_content: item.notification_content,
          sent_at: item.sent_at,
          sender_name: "Director",
          status: item.status
        };
      });
      
      setRegularNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching regular notifications:', error);
      // Alert.alert('Error', 'Failed to fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentNotifications = async () => {
    try {
      setLoading(true);
      if (!session?.user.id) return;
      
      // console.log('Fetching appointment notifications');
      const appointmentNotifications: AppointmentNotification[] = [];

      // Debug appointments table structure (commented out for production)
      // const { data: appointmentSample, error: sampleError } = await supabase
      //   .from('appointments')
      //   .select('*')
      //   .limit(1);
      
      // 1. Fetch CANCELLED appointments
      const { data: cancelledAppointments, error: cancelledError } = await supabase
        .from('appointments')
        .select(`
          appointment_id,
          status,
          counselor_id,
          availability_schedule_id
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'cancelled');

      if (cancelledError) {
        console.error('Error fetching cancelled appointments:', cancelledError);
      } else {
        // console.log('Cancelled appointments fetched:', cancelledAppointments?.length || 0);
        
        // Process each cancelled appointment
        for (const appointment of (cancelledAppointments || [])) {
          try {
            // Get counselor details
            const { data: counselorData, error: counselorError } = await supabase
              .from('users')
              .select('name')
              .eq('user_id', appointment.counselor_id)
              .single();
              
            if (counselorError) {
              console.error('Error fetching counselor:', counselorError);
              continue;
            }
            
            // Get availability details
            const { data: availabilityData, error: availabilityError } = await supabase
              .from('availability_schedules')
              .select('date, start_time, end_time')
              .eq('availability_schedule_id', appointment.availability_schedule_id)
              .single();
              
            if (availabilityError) {
              console.error('Error fetching availability:', availabilityError);
              continue;
            }
            
            // Now we can safely construct the notification
            appointmentNotifications.push({
              id: appointment.appointment_id,
              type: 'cancelled',
              content: `Your appointment on ${formatDate(new Date(availabilityData.date))} at ${convert24To12Hour(availabilityData.start_time)} has been cancelled by ${counselorData.name}.`,
              date: availabilityData.date + 'T' + availabilityData.start_time, // Use availability date+time for sorting
              appointmentDate: availabilityData.date,
              appointmentTime: `${convert24To12Hour(availabilityData.start_time)} - ${convert24To12Hour(availabilityData.end_time)}`,
              counselorName: counselorData.name
            });
          } catch (err) {
            console.error('Error processing cancelled appointment:', err);
          }
        }
      }

      // 2. Fetch RESCHEDULED appointments
      const { data: rescheduledAppointments, error: rescheduledError } = await supabase
        .from('appointments')
        .select(`
          appointment_id,
          status,
          counselor_id,
          availability_schedule_id
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'rescheduled');

      if (rescheduledError) {
        console.error('Error fetching rescheduled appointments:', rescheduledError);
      } else {
        // console.log('Rescheduled appointments fetched:', rescheduledAppointments?.length || 0);
        
        // Process each rescheduled appointment
        for (const appointment of (rescheduledAppointments || [])) {
          try {
            // Get counselor details
            const { data: counselorData, error: counselorError } = await supabase
              .from('users')
              .select('name')
              .eq('user_id', appointment.counselor_id)
              .single();
              
            if (counselorError) {
              console.error('Error fetching counselor:', counselorError);
              continue;
            }
            
            // Get availability details
            const { data: availabilityData, error: availabilityError } = await supabase
              .from('availability_schedules')
              .select('date, start_time, end_time')
              .eq('availability_schedule_id', appointment.availability_schedule_id)
              .single();
              
            if (availabilityError) {
              console.error('Error fetching availability:', availabilityError);
              continue;
            }
            
            // Now we can safely construct the notification
            appointmentNotifications.push({
              id: appointment.appointment_id,
              type: 'rescheduled',
              content: `Your appointment has been rescheduled by ${counselorData.name}. New schedule: ${formatDate(new Date(availabilityData.date))} at ${convert24To12Hour(availabilityData.start_time)}.`,
              date: availabilityData.date + 'T' + availabilityData.start_time, // Use availability date+time for sorting
              appointmentDate: availabilityData.date,
              appointmentTime: `${convert24To12Hour(availabilityData.start_time)} - ${convert24To12Hour(availabilityData.end_time)}`,
              counselorName: counselorData.name
            });
          } catch (err) {
            console.error('Error processing rescheduled appointment:', err);
          }
        }
      }

      // 3. Fetch GROUP appointments for the user - simplified query first
      const { data: groupAppointments, error: groupError } = await supabase
        .from('groupappointments')
        .select(`
          g_appointment_id,
          appointment_id,
          user_id
        `)
        .eq('user_id', session.user.id);

      if (groupError) {
        console.error('Error fetching group appointments:', groupError);
      } else {
        // console.log('Group appointments fetched:', groupAppointments?.length || 0);
        
        // Process each group appointment
        for (const groupAppointment of (groupAppointments || [])) {
          try {
            // Get appointment details
            const { data: appointmentData, error: appointmentError } = await supabase
              .from('appointments')
              .select(`
                counselor_id,
                availability_schedule_id
              `)
              .eq('appointment_id', groupAppointment.appointment_id)
              .single();
              
            if (appointmentError) {
              console.error('Error fetching appointment:', appointmentError);
              continue;
            }
            
            // Get counselor details
            const { data: counselorData, error: counselorError } = await supabase
              .from('users')
              .select('name')
              .eq('user_id', appointmentData.counselor_id)
              .single();
              
            if (counselorError) {
              console.error('Error fetching counselor:', counselorError);
              continue;
            }
            
            // Get availability details
            const { data: availabilityData, error: availabilityError } = await supabase
              .from('availability_schedules')
              .select('date, start_time, end_time')
              .eq('availability_schedule_id', appointmentData.availability_schedule_id)
              .single();
              
            if (availabilityError) {
              console.error('Error fetching availability:', availabilityError);
              continue;
            }
            
            // Get group members
            const { data: groupMembers, error: membersError } = await supabase
              .from('groupappointments')
              .select(`
                users:users!inner(name)
              `)
              .eq('appointment_id', groupAppointment.appointment_id)
              .neq('user_id', session.user.id);
              
            if (membersError) {
              console.error('Error fetching group members:', membersError);
              continue;
            }
            
            const memberNames = groupMembers
              ?.map(member => {
                if (member.users && typeof member.users === 'object') {
                  return (member.users as any).name;
                }
                return null;
              })
              .filter(Boolean) || [];
            
            // Now we can safely construct the notification for group appointments, using availability data instead of sent_at for dates
            appointmentNotifications.push({
              id: groupAppointment.g_appointment_id,
              type: 'group_added',
              content: `You have been added to a group appointment on ${formatDate(new Date(availabilityData.date))} by ${counselorData.name}.${memberNames.length > 0 ? ` (${memberNames.length} other participants)` : ' You are currently the only participant.'}`,
              date: availabilityData.date + 'T' + availabilityData.start_time, // Use availability date+time for sorting instead of group appointment's sent_at
              appointmentDate: availabilityData.date,
              appointmentTime: `${convert24To12Hour(availabilityData.start_time)} - ${convert24To12Hour(availabilityData.end_time)}`,
              counselorName: counselorData.name,
              groupMembers: memberNames
            });
          } catch (err) {
            console.error('Error processing group appointment:', err);
          }
        }
      }

      // Sort by date, newest first
      appointmentNotifications.sort((a, b) => {
        try {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } catch (err) {
          console.error('Error sorting dates:', err);
          return 0;
        }
      });

      // console.log(`Total appointment notifications: ${appointmentNotifications.length}`);
      if (appointmentNotifications.length > 0) {
        // console.log('First appointment notification sample:', appointmentNotifications[0]);
      }
      
      setAppointmentNotifications(appointmentNotifications);
    } catch (error) {
      console.error('Error fetching appointment notifications:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Get icon based on notification type
  const getAppointmentNotificationIcon = (type: string) => {
    switch(type) {
      case 'rescheduled':
        return '🔄';
      case 'cancelled':
        return '❌';
      case 'group_added':
        return '👥';
      default:
        return '📢';
    }
  };

  // Render a regular notification
  const renderRegularNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <View style={styles.senderContainer}>
          <Text style={styles.notificationIcon}>📢</Text>
          <Text style={styles.sender}>Director</Text>
        </View>
        <Text style={styles.time}>{formatNotificationTime(item.sent_at)}</Text>
      </View>
      <View style={styles.messageContent}>
        <Text style={styles.messageText}>{item.notification_content}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render an appointment notification
  const renderAppointmentNotification = ({ item }: { item: AppointmentNotification }) => (
    <TouchableOpacity style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <View style={styles.senderContainer}>
          <Text style={styles.notificationIcon}>{getAppointmentNotificationIcon(item.type)}</Text>
          <Text style={styles.sender}>{item.counselorName}</Text>
        </View>
        <Text style={styles.time}>{formatNotificationTime(item.date)}</Text>
      </View>
      <View style={styles.messageContent}>
        <Text style={styles.messageText}>{item.content}</Text>
        
        {item.appointmentDate && item.appointmentTime && (
          <View style={styles.appointmentDetailsContainer}>
            <Text style={styles.appointmentDetails}>
              Date: {item.appointmentDate} • Time: {item.appointmentTime}
            </Text>
          </View>
        )}
        
        {item.type === 'group_added' && item.groupMembers && item.groupMembers.length > 0 && (
          <TouchableOpacity 
            style={styles.viewParticipantsButton}
            onPress={() => {
              Alert.alert(
                `Group Participants (${(item.groupMembers || []).length})`,
                (item.groupMembers || []).map(member => `• ${member}`).join('\n'),
                [{ text: "OK" }]
              );
            }}
          >
            <Text style={styles.viewParticipantsText}>View Participants</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  // Determine what to render based on item type
  const renderItem = ({ item, section }: { item: any, section: NotificationSection }) => {
    if (section.type === 'regular') {
      return renderRegularNotification({ item: item as Notification });
    } else {
      return renderAppointmentNotification({ item: item as AppointmentNotification });
    }
  };

  // Handle refresh with better error handling
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRegularNotifications().catch(err => {
          console.error('Error refreshing regular notifications:', err);
          return null; // Continue despite errors
        }),
        fetchAppointmentNotifications().catch(err => {
          console.error('Error refreshing appointment notifications:', err);
          return null; // Continue despite errors
        })
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
      Alert.alert(
        'Refresh Issue',
        'There was a problem refreshing notifications. Pull down to try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getSections = (): NotificationSection[] => {
    if (activeTab === 'appointment' && appointmentNotifications.length > 0) {
      return [{
        title: 'Appointment Updates',
        data: appointmentNotifications,
        type: 'appointment'
      }];
    } else if (activeTab === 'regular' && regularNotifications.length > 0) {
      return [{
        title: 'Notifications',
        data: regularNotifications,
        type: 'regular'
      }];
    }
    return [];
  };

  const sections = getSections();
  const hasNotifications = sections.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.container}>
        <Text style={styles.title}>Notifications</Text>

        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'appointment' && styles.activeToggle]}
            onPress={() => setActiveTab('appointment')}
          >
            <Text style={[styles.toggleText, activeTab === 'appointment' && styles.activeToggleText]}>
              Appointment Updates
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'regular' && styles.activeToggle]}
            onPress={() => setActiveTab('regular')}
          >
            <Text style={[styles.toggleText, activeTab === 'regular' && styles.activeToggleText]}>
              Notifications
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingIndicator}>
            <Text>Loading notifications...</Text>
          </View>
        )}
        {!hasNotifications ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No notifications yet</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => {
              if ('notification_id' in item) {
                return item.notification_id;
              } else {
                return item.id;
              }
            }}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={loading}
            stickySectionHeadersEnabled={false}
          />
        )}
      </View>
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
  debugSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  debugButton: {
    backgroundColor: '#e0f2fe', 
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  debugButtonText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  messageList: {
    padding: 15,
  },
  sectionHeader: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 8,
    marginTop: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4b5563",
    letterSpacing: 0.5,
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
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sender: {
    fontWeight: "700",
    fontSize: 16,
    color: "#34d399",
  },
  messageContent: {
    padding: 15,
  },
  messageText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    marginBottom: 12,
  },
  time: {
    fontSize: 12,
    color: "#9ca3af",
  },
  appointmentDetailsContainer: {
    backgroundColor: '#f0f7ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  appointmentDetails: {
    fontSize: 14,
    color: '#5e81ac',
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
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugInfo: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  debugTextSmall: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  debugButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewParticipantsButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewParticipantsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeToggle: {
    backgroundColor: '#1f2937',
  },
  toggleText: {
    fontSize: 14,
    color: '#1f2937',
  },
  activeToggleText: {
    color: '#ffffff',
  },
});

export default NotificationUI;