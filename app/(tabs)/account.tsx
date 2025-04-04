import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { StyleSheet, View, Alert, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, Dimensions } from "react-native";
import { Button, Input } from "@rneui/themed";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Link } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function Account() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false); // Initialize as false
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false); // Fixed dropdown state
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showYearLevelDropdown, setShowYearLevelDropdown] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  
  // Change password state variables
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const router = useRouter();
  const navigateToHome = () => router.push("/(tabs)/");

  // Changed to use a proper URL for your Supabase instance
  const SUPABASE_URL = "https://ybpoanqhkokhdqucwchy.supabase.co"; // Replace with your actual URL
  
  useEffect(() => {
    if (session?.user?.id) {
      // console.log("User ID in useEffect:", session.user.id);
      getProfile();
    } else {
      // console.log("No valid session or user ID found");
    }
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);

      if (!session?.user?.id) {
        throw new Error("No user ID available!");
      }

      // console.log("Fetching profile for user ID:", session.user.id);
      
      const { data, error, status } = await supabase
        .from("users")
        .select(
          `name, username, address, contact_number, birthday, gender, department, program, program_year_level, short_biography, credentials, profile_image_url`
        )
        .eq("user_id", session.user.id)
        .single();

      console.log("Query response:", { data, error, status });

      if (error) {
        if (status !== 406) {
          // Status 406 usually means no data found, which we handle differently
          throw error;
        }
        // console.log("No profile data found, may need to create a new one");
      }

      if (data) {
        // console.log("Profile data:", data);
        setName(data.name || "");
        setUserName(data.username || "");
        setAddress(data.address || "");
        setContactNumber(data.contact_number || "");
        
        // Handle birthday formatting more safely
        if (data.birthday) {
          const birthdayDate = new Date(data.birthday);
          if (!isNaN(birthdayDate.getTime())) {
            setBirthday(birthdayDate.toISOString().split("T")[0]);
          }
        }
        
        setGender(data.gender || "");
        setDepartment(data.department || "");
        setProgram(data.program || "");
        setProgramYearLevel(data.program_year_level ? String(data.program_year_level) : "");
        setShortBiography(data.short_biography || "");
        setCredentials(data.credentials || "");
        
        if (data.profile_image_url) {
          // Check if the URL is a valid web URL (not a local file URI)
          if (data.profile_image_url.startsWith('http')) {
            // console.log("Setting profile image:", data.profile_image_url);
            setProfileImageUrl(data.profile_image_url);
          } else {
            // console.log("Invalid image URL format, setting to null:", data.profile_image_url);
            setProfileImageUrl(null);
          }
        }
      }
    } catch (error) {
      // console.error("Error fetching profile:", error instanceof Error ? error.message : 'An unknown error occurred');
      Alert.alert("Error", "Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  interface UpdateProfileParams {
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
  }: UpdateProfileParams) {
    try {
      setLoading(true);
      
      if (!session?.user?.id) {
        throw new Error("No user ID available!");
      }

      // Fetch user_type first to preserve it
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("user_type")
        .eq("user_id", session.user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user type:", fetchError.message);
        // Continue anyway, but log the error
      }

      let imageUrl = profileImageUrl;

      // Handle image upload if a new image was selected
      if (imageFile) {
        try {
          // console.log("Preparing to upload image:", imageFile);
          
          // Create file info
          const fileInfo = await FileSystem.getInfoAsync(imageFile);
          if (!fileInfo.exists) {
            throw new Error("File doesn't exist");
          }
          
          // Create a unique filename
          const fileExt = imageFile.split('.').pop() || 'jpg';
          const fileName = `users/${session.user.id}-${Date.now()}.${fileExt}`;
          // console.log("Uploading to:", fileName);

          // Create FormData (simpler approach with less memory usage)
          const formData = new FormData();
          formData.append('file', {
            uri: imageFile,
            name: fileName,
            type: `image/${fileExt}`
          } as any);

          // Upload using fetch directly to Supabase API
          const response = await fetch(
            `${SUPABASE_URL}/storage/v1/object/profile_pictures/${fileName}`, 
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'x-upsert': 'true'
              },
              body: formData
            }
          );
          
          if (!response.ok) {
            const errorData = await response.text();
            console.error('Upload response error:', errorData);
            throw new Error(`Upload failed with status ${response.status}`);
          }
          
          // Generate the public URL
          const { data: urlData } = await supabase
            .storage
            .from('profile_pictures')
            .getPublicUrl(fileName);
          
          if (urlData && urlData.publicUrl) {
            imageUrl = urlData.publicUrl;
            // console.log("New image URL:", imageUrl);
          } else {
            throw new Error("Failed to get image URL");
          }
        } catch (imgError) {
          console.error("Image processing error:", imgError);
          Alert.alert('Error', 'Failed to process image. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Format birthday correctly
      let formattedBirthday = null;
      if (birthday) {
        const birthdayDate = new Date(birthday);
        if (!isNaN(birthdayDate.getTime())) {
          formattedBirthday = birthdayDate.toISOString();
        }
      }

      // Convert program_year_level to number if it's a valid number
      const yearLevelNumber = program_year_level ? parseInt(program_year_level, 10) : null;

      // Prepare update object
      const updates: {
        user_id: string;
        name: string;
        username: string;
        address: string;
        contact_number: string;
        birthday: string | null;
        gender: string;
        department: string;
        program: string;
        program_year_level: number | null;
        short_biography: string;
        credentials: string;
        profile_image_url: string | null;
        user_type?: string;
      } = {
        user_id: session.user.id,
        name,
        username,
        address,
        contact_number,
        birthday: formattedBirthday,
        gender,
        department,
        program,
        program_year_level: yearLevelNumber,
        short_biography,
        credentials,
        profile_image_url: imageUrl,
      };

      // Only include user_type if we were able to fetch it
      if (userData?.user_type) {
        updates.user_type = userData.user_type;
      }

      // console.log("Updating profile with:", updates);

      const { error } = await supabase.from("users").upsert(updates);

      if (error) {
        console.error("Update Error:", error.message);
        throw error;
      }

      // Clear the imageFile state after successful update
      setImageFile(null);
      
      Alert.alert("Success", "Profile updated successfully!");
      
      // Refresh the profile data
      getProfile();
    } catch (error) {
      console.error("Profile update error:", error instanceof Error ? error.message : error);
      Alert.alert("Error", error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false); // Always reset loading state
    }
  }

  const pickImage = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'You must be logged in to update your profile picture');
      return;
    }

    try {
      // Check permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }
  
      // Launch image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pic
        quality: 0.7, // Reduced quality for better upload performance
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Just store the URI in state for now, don't upload yet
        setImageFile(result.assets[0].uri);
        
        // Set temporary preview
        setProfileImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };
  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
  const programOptions = ["BSIT", "BSCS", "BSN", "BSCE", "BSTM", "BSFM", "BSA"];
  const departmentOptions = ['COECS', 'CBA', 'COL', 'IBED', 'CHS', 'CAS'];
  const yearLevelOptions = ["1","2","3","4","5"];

  // Add change password function
  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }

    setChangePasswordLoading(true);

    try {
      // First verify the current password is correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session?.user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert("Error", "Current password is incorrect");
        setChangePasswordLoading(false);
        return;
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Alert.alert("Error", updateError.message);
      } else {
        Alert.alert("Success", "Password updated successfully");
        // Clear the form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowChangePasswordForm(false);
      }
    } catch (error) {
      console.error("Password change error:", error);
      Alert.alert("Error", "Failed to update password");
    }

    setChangePasswordLoading(false);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileImageContainer}>
        {profileImageUrl ? (
          <View>
            <TouchableOpacity onPress={() => setShowFullImage(true)}>
              <Image 
                source={{ uri: profileImageUrl }} 
                style={styles.profileImage} 
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={(e) => {
                  console.error("Image load error:", e.nativeEvent.error);
                  setProfileImageUrl(null);
                }}
              />
              {imageLoading && (
                <ActivityIndicator 
                  style={StyleSheet.absoluteFill} 
                  size="small" 
                  color="#34d399"
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
          </View>
        )}
        <TouchableOpacity onPress={pickImage} style={styles.changeImageButton}>
          <Text style={styles.changeImageButtonText}>Change Profile Image</Text>
        </TouchableOpacity>
      </View>

      {/* Add the Modal component here */}
      <Modal
        visible={showFullImage}
        transparent={true}
        onRequestClose={() => setShowFullImage(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowFullImage(false)}
        >
          <View style={styles.modalContent}>
            <Image 
              source={{ uri: profileImageUrl || undefined }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFullImage(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={styles.inputField}
            value={session?.user?.email || ""}
            disabled
            disabledInputStyle={styles.disabledInput}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Name</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={styles.inputField}
            value={name || ""}
            onChangeText={(text) => setName(text)}
            placeholder="Enter your full name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={styles.inputField}
            value={username || ""}
            onChangeText={(text) => setUserName(text)}
            placeholder="Choose a username"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Address</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={styles.inputField}
            value={address || ""}
            onChangeText={(text) => setAddress(text)}
            placeholder="Enter your address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Contact Number</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={styles.inputField}
            value={contact_number || ""}
            onChangeText={(text) => setContactNumber(text)}
            placeholder="Enter your contact number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Birthday</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Input
              inputStyle={styles.input}
              inputContainerStyle={styles.inputField}
              value={birthday || ""}
              placeholder="YYYY-MM-DD"
              editable={false}
              rightIcon={{ 
                type: 'font-awesome', 
                name: 'calendar', 
                color: '#34d399',
                onPress: () => setShowDatePicker(true)
              }}
            />
          </TouchableOpacity>
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

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Gender</Text>
          <TouchableOpacity 
            onPress={() => setShowGenderDropdown(!showGenderDropdown)}
            style={styles.dropdownTrigger}
          >
            <Input
              inputStyle={styles.input}
              inputContainerStyle={styles.inputField}
              value={gender || ""}
              placeholder="Select gender"
              editable={false}
              rightIcon={{ 
                type: 'font-awesome', 
                name: showGenderDropdown ? 'chevron-up' : 'chevron-down', 
                color: '#34d399',
                onPress: () => setShowGenderDropdown(!showGenderDropdown)
              }}
            />
          </TouchableOpacity>
          
          {showGenderDropdown && (
            <View style={styles.dropdown}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownItem,
                    gender === option && styles.selectedItem
                  ]}
                  onPress={() => {
                    setGender(option);
                    setShowGenderDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    gender === option && styles.selectedText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Department</Text>
          <TouchableOpacity 
            onPress={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
            style={styles.dropdownTrigger}
          >
            <Input
              inputStyle={styles.input}
              inputContainerStyle={styles.inputField}
              value={department || ""}
              placeholder="Select a department"
              editable={false}
              rightIcon={{ 
                type: 'font-awesome', 
                name: showDepartmentDropdown ? 'chevron-up' : 'chevron-down', 
                color: '#34d399',
                onPress: () => setShowDepartmentDropdown(!showDepartmentDropdown)
              }}
            />
          </TouchableOpacity>
          
          {showDepartmentDropdown && (
            <View style={styles.dropdown}>
              {departmentOptions.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.dropdownItem,
                    department === dept && styles.selectedItem
                  ]}
                  onPress={() => {
                    setDepartment(dept);
                    setShowDepartmentDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    department === dept && styles.selectedText
                  ]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Program</Text>
          <TouchableOpacity 
            onPress={() => setShowProgramDropdown(!showProgramDropdown)}
            style={styles.dropdownTrigger}
          >
            <Input
              inputStyle={styles.input}
              inputContainerStyle={styles.inputField}
              value={program || ""}
              placeholder="Select a program"
              editable={false}
              rightIcon={{ 
                type: 'font-awesome', 
                name: showProgramDropdown ? 'chevron-up' : 'chevron-down', 
                color: '#34d399',
                onPress: () => setShowProgramDropdown(!showProgramDropdown)
              }}
            />
          </TouchableOpacity>
          
          {showProgramDropdown && (
            <View style={styles.dropdown}>
              {programOptions.map((prog) => (
                <TouchableOpacity
                  key={prog}
                  style={[
                    styles.dropdownItem,
                    program === prog && styles.selectedItem
                  ]}
                  onPress={() => {
                    setProgram(prog);
                    setShowProgramDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    program === prog && styles.selectedText
                  ]}>
                    {prog}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Program Year Level</Text>
          <TouchableOpacity 
            onPress={() => setShowYearLevelDropdown(!showYearLevelDropdown)}
            style={styles.dropdownTrigger}
          >
            <Input
              inputStyle={styles.input}
              inputContainerStyle={styles.inputField}
              value={program_year_level || ""}
              placeholder="Select year level"
              editable={false}
              rightIcon={{ 
                type: 'font-awesome', 
                name: showYearLevelDropdown ? 'chevron-up' : 'chevron-down', 
                color: '#34d399',
                onPress: () => setShowYearLevelDropdown(!showYearLevelDropdown)
              }}
            />
          </TouchableOpacity>
          
          {showYearLevelDropdown && (
            <View style={styles.dropdown}>
              {yearLevelOptions.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.dropdownItem,
                    program_year_level === level && styles.selectedItem
                  ]}
                  onPress={() => {
                    setProgramYearLevel(level);
                    setShowYearLevelDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    program_year_level === level && styles.selectedText
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Short Biography</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={[styles.inputField, styles.multilineInput]}
            value={short_biography || ""}
            onChangeText={(text) => setShortBiography(text)}
            placeholder="Tell us about yourself"
            multiline={true}
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Credentials</Text>
          <Input
            inputStyle={styles.input}
            inputContainerStyle={[styles.inputField, styles.multilineInput]}
            value={credentials || ""}
            onChangeText={(text) => setCredentials(text)}
            placeholder="List your credentials"
            multiline={true}
            numberOfLines={3}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Updating..." : "Update Profile"}
            onPress={() => {
              // Validate birthday format
              if (birthday && isNaN(new Date(birthday).getTime())) {
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
            buttonStyle={styles.updateButton}
            titleStyle={styles.buttonText}
            disabledStyle={styles.disabledButton}
            loading={loading}
            loadingProps={{ color: 'white' }}
          />
        </View>

        {/* Change Password Section */}
        <View style={styles.changePasswordSection}>
          <TouchableOpacity 
            style={styles.changePasswordToggle}
            onPress={() => setShowChangePasswordForm(!showChangePasswordForm)}
          >
            <Text style={styles.changePasswordToggleText}>
              {showChangePasswordForm ? "Hide Password Change" : "Change Password"}
            </Text>
          </TouchableOpacity>

          {showChangePasswordForm && (
            <View style={styles.changePasswordForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <Input
                  inputStyle={styles.input}
                  inputContainerStyle={styles.inputField}
                  value={currentPassword}
                  onChangeText={(text) => setCurrentPassword(text)}
                  placeholder="Enter current password"
                  secureTextEntry={!showCurrentPassword}
                  rightIcon={{ 
                    type: 'font-awesome', 
                    name: showCurrentPassword ? 'eye-slash' : 'eye', 
                    color: '#34d399',
                    onPress: () => setShowCurrentPassword(!showCurrentPassword)
                  }}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <Input
                  inputStyle={styles.input}
                  inputContainerStyle={styles.inputField}
                  value={newPassword}
                  onChangeText={(text) => setNewPassword(text)}
                  placeholder="Enter new password"
                  secureTextEntry={!showNewPassword}
                  rightIcon={{ 
                    type: 'font-awesome', 
                    name: showNewPassword ? 'eye-slash' : 'eye', 
                    color: '#34d399',
                    onPress: () => setShowNewPassword(!showNewPassword)
                  }}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <Input
                  inputStyle={styles.input}
                  inputContainerStyle={styles.inputField}
                  value={confirmNewPassword}
                  onChangeText={(text) => setConfirmNewPassword(text)}
                  placeholder="Confirm new password"
                  secureTextEntry={!showConfirmPassword}
                  rightIcon={{ 
                    type: 'font-awesome', 
                    name: showConfirmPassword ? 'eye-slash' : 'eye', 
                    color: '#34d399',
                    onPress: () => setShowConfirmPassword(!showConfirmPassword)
                  }}
                />
              </View>

              <Button
                title={changePasswordLoading ? "Updating..." : "Update Password"}
                onPress={changePassword}
                disabled={changePasswordLoading}
                buttonStyle={styles.passwordButton}
                titleStyle={styles.buttonText}
                disabledStyle={styles.disabledButton}
                loading={changePasswordLoading}
                loadingProps={{ color: 'white' }}
              />
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            title="Back to Home" 
            onPress={navigateToHome} 
            buttonStyle={styles.homeButton}
            titleStyle={styles.buttonText}
            icon={{
              name: 'home',
              type: 'font-awesome',
              size: 15,
              color: 'white',
            }}
            iconRight
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#34d399',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  formContainer: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 20,
    zIndex: 100,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  noImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#34d399',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  noImageText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
  },
  changeImageButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#34d399',
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  changeImageButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 10,
    marginBottom: 2,
  },
  input: {
    fontSize: 16,
    color: '#1f2937',
    paddingLeft: 5,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    height: 50,
  },
  disabledInput: {
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 10,
  },
  dropdownTrigger: {
    width: '100%',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: -12,
    marginHorizontal: 10,
    marginBottom: 10,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#e6fffa',
  },
  dropdownText: {
    fontSize: 16,
    color: '#4b5563',
  },
  selectedText: {
    color: '#34d399',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  updateButton: {
    backgroundColor: '#34d399',
    borderRadius: 8,
    height: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  homeButton: {
    backgroundColor: '#4b5563',
    borderRadius: 8,
    height: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#34d399',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordSection: {
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  changePasswordToggle: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changePasswordToggleText: {
    color: '#34d399',
    fontWeight: '600',
    fontSize: 16,
  },
  changePasswordForm: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  passwordButton: {
    backgroundColor: '#34d399',
    borderRadius: 8,
    height: 50,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
});