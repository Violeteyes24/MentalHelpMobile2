import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Auth from './Auth';
import { View, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Redirect } from 'expo-router';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false); // Track if component is mounted

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Set mounted to true when the component is mounted
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Redirect only after the component is mounted and the session is available
  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Auth />;
}
