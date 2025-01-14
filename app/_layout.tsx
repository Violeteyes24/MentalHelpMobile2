import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { View, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

  }, []);

  if (isLoading) {
    return ( // This showed up
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text> 
      </View>
    );
  }

  return (
    <Stack>
      {session?.user ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : ( // it showed up this instead, my index.tsx or (tabs). so Its authenticated by default (?)
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        // but it did not go to Auth ? 
      )}
    </Stack>
  );
}
