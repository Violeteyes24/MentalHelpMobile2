import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

function AppContent() {
  const { session, isLoading } = useAuth();

  // Debugging logs for session state
  useEffect(() => {
    console.log('Session in AppContent:', session);
    if (!session) {
      console.log('No session detected.');
    } else if (!session.user) {
      console.log('Session exists but no user found:', session);
    } else {
      console.log('Valid session and user detected:', session.user);
    }
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
        // Navigate to auth if session is null, undefined, or invalid
        <Stack.Screen name="Auth" options={{ headerShown: false }} />
      ) : (
        // Navigate to (tabs) if session and user are valid
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
