import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { StyleSheet, View, Alert, Text } from 'react-native'
import { Button, Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'expo-router'

export default function Account() {

    const { session } = useAuth();
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState('')
    const router = useRouter()
    const navigateToHome = () => router.push('/(tabs)/');

    useEffect(() => {
        if (session) getProfile()
          console.log(session);
    }, [session])

    async function getProfile() {
        try {
          setLoading(true);

          if (!session?.user) throw new Error("No user on the session!");

          const { data, error, status } = await supabase
            .from("users")
            .select(`name`)
            .eq("user_id", session?.user.id)
            .single();
          
          if (error && status !== 406) {
            throw error;
          }

          if (data) {
            setName(data.name);
            console.log(data); // not reading the data
          }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert(error.message)
            }
        } finally {
            setLoading(false)
        }
    }

    async function updateProfile({
        name,

    }: {
        name: string
    }) {
        try {
            setLoading(true)
            if (!session?.user) throw new Error('No user on the session!')

            const updates = {
                id: session?.user.id,
                name,
                updated_at: new Date(),
            }

            const { error } = await supabase.from('users').upsert(updates)

            if (error) {
                throw error
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert(error.message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Input label="Email" value={session?.user?.email} disabled />
        </View>
        <View style={styles.verticallySpaced}>
          <Input
            label="Name"
            value={name || ""}
            onChangeText={(text) => setName(text)}
          />
        </View>
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Button
            title={loading ? "Loading ..." : "Update"}
            onPress={() => updateProfile({ name })}
            disabled={loading}
            color="#34d399"
          />
        </View>

        {/* <View style={styles.verticallySpaced}>
          <Link href="/app">
            <Button
              title="Sign Out"
              onPress={async () => {
                await supabase.auth.signOut();
                console.log('Sign Out Button Pressed')
              }}
              color="#34d399"
            />
          </Link>
        </View> */}

        <View style={styles.verticallySpaced}>
                <Button title="Home" onPress={() => navigateToHome } color='#34d399' />
            </View>
      </View>
    );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginTop: "-3%",
    // marginBottom: "5%",
  },
});