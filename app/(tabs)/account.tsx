import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { StyleSheet, View, Alert, Text, ScrollView } from "react-native";
import { Button, Input } from "@rneui/themed";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Link } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker"; // Added import for DateTimePicker

export default function Account() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [username, setUserName] = useState("");
  const [address, setAddress] = useState("");
  const [contact_number, setContactNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [short_biography, setShortBiography] = useState("");
  const [credentials, setCredentials] = useState("");
  const [program_year_level, setProgramYearLevel] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false); // State to control DatePicker visibility

  const router = useRouter();
  const navigateToHome = () => router.push("/(tabs)/");

  useEffect(() => {
    console.log("Session in useEffect:", session);
    if (session) getProfile();
    console.log(session);
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);

      if (!session?.user) throw new Error("No user on the session!");

      const { data, error, status } = await supabase
        .from("users")
        .select(
          `name, username, address, contact_number, birthday, gender, department, program, program_year_level, short_biography, credentials`
        )
        .eq("user_id", session?.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setName(data.name);
        setUserName(data.username);
        setAddress(data.address);
        setContactNumber(data.contact_number);
        setBirthday(
          data.birthday
            ? new Date(data.birthday).toISOString().split("T")[0]
            : ""
        );
        setGender(data.gender);
        setDepartment(data.department);
        setProgram(data.program);
        setProgramYearLevel(data.program_year_level);
        setShortBiography(data.short_biography);
        setCredentials(data.credentials);
        console.log(data);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    name,
    username,
    address,
    contact_number,
    birthday,
    gender,
    department,
    program,
    program_year_level,
    short_biography,
    credentials,
  }: {
    name: string;
    username: string;
    address: string;
    contact_number: string;
    birthday: string;
    gender: string;
    department: string;
    program: string;
    program_year_level: string;
    short_biography: string;
    credentials: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error("No user on the session!");

      const updates = {
        id: session?.user.id,
        name,
        username,
        address,
        contact_number,
        birthday: new Date(birthday).toISOString(),
        gender,
        department,
        program,
        program_year_level,
        short_biography,
        credentials,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("users").upsert(updates);

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
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
      <View style={styles.verticallySpaced}>
        <Input
          label="Username"
          value={username || ""}
          onChangeText={(text) => setUserName(text)}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Address"
          value={address || ""}
          onChangeText={(text) => setAddress(text)}
        />
      </View>
      <View>
        <Input
          label="Contact Number"
          value={contact_number || ""}
          onChangeText={(text) => setContactNumber(text)}
        />
      </View>
      <View>
        <Input
          label="Birthday"
          value={birthday || ""}
          placeholder="YYYY-MM-DD"
          onFocus={() => setShowDatePicker(true)} // Show the DatePicker on focus
        />
        {showDatePicker && (
          <DateTimePicker
            value={birthday ? new Date(birthday) : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setBirthday(date.toISOString().split("T")[0]);
              }
            }}
          />
        )}
      </View>
      <View>
        <Input
          label="Gender"
          value={gender || ""}
          onChangeText={(text) => setGender(text)}
        />
      </View>
      <View>
        <Input
          label="Department"
          value={department || ""}
          onChangeText={(text) => setDepartment(text)}
        />
      </View>
      <View>
        <Input
          label="Program"
          value={program || ""}
          onChangeText={(text) => setProgram(text)}
        />
      </View>
      <View>
        <Input
          label="Program Year Level"
          value={program_year_level || ""}
          onChangeText={(text) => setProgramYearLevel(text)}
        />
      </View>
      <View>
        <Input
          label="Short Biography"
          value={short_biography || ""}
          onChangeText={(text) => setShortBiography(text)}
        />
      </View>
      <View>
        <Input
          label="Credentials"
          value={credentials || ""}
          onChangeText={(text) => setCredentials(text)}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? "Loading ..." : "Update"}
          onPress={() => {
            if (isNaN(new Date(birthday).getTime())) {
              Alert.alert(
                "Error",
                "Please provide a valid birthday in YYYY-MM-DD format."
              );
              return;
            }

            updateProfile({
              name,
              username,
              address,
              contact_number,
              birthday,
              gender,
              department,
              program,
              program_year_level,
              short_biography,
              credentials,
            });
          }}
          disabled={loading}
          color="#34d399"
        />
      </View>

      {/* <View style={[styles.verticallySpaced, { alignItems: "center" }]}>
        <Link href="/app">
          <Button
            title="Sign Out"
            onPress={async () => {
              await supabase.auth.signOut();
              console.log("Sign Out Button Pressed");
            }}
            color="#34d399"
            style={{ width: "100%" }}
          />
        </Link>
      </View> */}

      <View style={[styles.verticallySpaced, styles.mb]}>
        <Button title="Home" onPress={() => navigateToHome()} color="#34d399" />
      </View>
    </ScrollView>
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
  mb: {
    marginBottom: 40,
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
