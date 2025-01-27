import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      
  });

  //  useEffect(() => {
  //    if (!session) {
  //      router.push("/");
  //    }
  //  }, [session]);

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    console.log("Auth state changed:", session);
    setSession(session);
  });

  return () => {
    subscription.unsubscribe(); };
}, []);


  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };


  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/*
Ways to sign out:

1. stop server
2. npm clean cache --force
3. code error, does not make your session null but would redirect you to login (happens in my moodtracker.tsx)
*/