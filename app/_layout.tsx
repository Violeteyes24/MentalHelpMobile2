import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Slot } from 'expo-router';
import { useRouter } from 'expo-router';

function AppContent() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // Debugging logs for session state
  useEffect(() => {

    // console.log('Session in AppContent:', session);
    if (!session) { // no session
      console.log('No session detected.');
    } else if (!session.user) { // not user session
      console.log('Session exists but no user found:', session);
    } else {
      console.log('Valid session and user detected:', session.user);
    }

  }, [session]);

    useEffect(() => {
      if (!session) {
        router.push("/");
      }
      console.log("Session in AppContent:", session);
    }, [session]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

return (
  <Stack screenOptions={{ headerShown: false }}>
    {!session || !session.user ? (
      <Stack.Screen name="index" options={{ headerShown: false }} />
    ) : (
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    )}
  </Stack>
);

}

export default function App() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}

    /*
      After clicking this button, I want to redirect this to the counselor's availability schedule
      do I need to create page inside /(tabs) that is [id]? and make it dynamic routing ? 

      I have a template of availability.tsx and have a calendar UI already as well as the "selected date" functionality.

      So i want after selecting the date, the availability time of that counselor should be displayed below the calendar UI

      This page needs to be scrollable since it will contain:
      1. Photo (place holder)
      2. Name
      3. Contact Number
      4. Credentials
      5. Short Biography
      6. Calendar UI 
      7. the availability time list after clicking a date from calendar UI
      8. Button to book an appointment

      note: these are listed as name, format, type respectively:

      table: availability_schedules
        - availability_schedule_id uuid string
        - counselor_id uuid string Foreign Key, REFERENCES(users)
        - start_time time without time zone string
        - end_time time without time zone string
        - date date string
        - is_available boolean boolean

      table: users (there are many things but these are the ones that I would use)
        - name varchar
        - contact number varchar
        - credentials text
        - short_biography text

      Don't worry because there is a relationship between availability_schedules and users
      FK (counselor_id) REFERENCES (users) 
      
    */
   
/*
To do: 

- availability of counselors
- once availability is clicked, display details 
- contains book appointment
- interface of the upcoming appointment and a cancel / reschedule
- validations for appointment logic

*/

