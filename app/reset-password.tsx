import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { Button, Input } from '@rneui/themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);

  const params = useLocalSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    // Check for deep link parameters
    const checkDeepLink = async () => {
      try {
        setVerifyingToken(true);
        const url = await Linking.getInitialURL();
        console.log("Initial URL:", url);
        
        let token = null;
        
        // First check URL parameters from direct navigation
        if (params.token) {
          console.log("Found token in params:", params.token);
          token = params.token as string;
        }
        // Then try to extract token from the deep link URL
        else if (url) {
          console.log("Attempting to extract token from URL:", url);
          
          // Try various formats for token extraction
          // Format 1: ?token=XXX
          let regex = /[?&]token=([^&]+)/;
          let match = url.match(regex);
          if (match && match[1]) {
            token = match[1];
            console.log("Extracted token from query params:", token);
          } 
          // Format 2: #access_token=XXX (hash fragment)
          else {
            const hashMatch = url.match(/#access_token=([^&]+)/);
            if (hashMatch && hashMatch[1]) {
              token = hashMatch[1];
              console.log("Extracted token from hash fragment:", token);
            }
            // Format 3: /auth/v1/verify?token=XXX
            else {
              const verifyMatch = url.match(/\/auth\/v1\/verify\?token=([^&]+)/);
              if (verifyMatch && verifyMatch[1]) {
                token = verifyMatch[1];
                console.log("Extracted token from verify URL:", token);
              }
            }
          }
        }
        
        if (token) {
          console.log("Found token, attempting to verify");
          setAccessToken(token);
          
          // Try to set access token for session
          try {
            // First attempt to directly use the token for a session
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: ''
            });
            
            if (sessionError) {
              console.error("Error setting session:", sessionError.message);
              
              // If direct session setting failed, try via getUser
              const { data: userData, error: userError } = await supabase.auth.getUser(token);
              
              if (userError) {
                console.error("Error getting user:", userError.message);
                setTokenVerified(false);
              } else {
                console.log("User verified via getUser");
                setTokenVerified(true);
              }
            } else {
              console.log("Session set successfully");
              setTokenVerified(true);
            }
          } catch (sessionErr) {
            console.error("Session error:", sessionErr);
            setTokenVerified(false);
          }
        } else {
          console.log("No token found in URL parameters");
          // If no token found, show error
          Alert.alert(
            "Missing Reset Token",
            "No password reset token was found. Please request a new password reset link.",
            [
              { 
                text: "Back to Login", 
                onPress: () => router.replace("/") 
              }
            ]
          );
          setTokenVerified(false);
        }
      } catch (error) {
        console.error("Deep link error:", error);
        Alert.alert("Error", "Failed to process password reset link");
        setTokenVerified(false);
      } finally {
        setVerifyingToken(false);
      }
    };

    checkDeepLink();
  }, [params]);

  async function handlePasswordReset() {
    if (!accessToken && !tokenVerified) {
      Alert.alert("Error", "No access token available. Please request a new password reset link.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }

    setLoading(true);
    
    try {
      // Use the token to update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Success",
        "Your password has been updated successfully. You can now log in with your new password.",
        [
          { 
            text: "Go to Login", 
            onPress: () => router.replace("/") 
          }
        ]
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      Alert.alert("Error", error.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (verifyingToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#34d399" />
          <Text style={styles.loaderText}>Verifying reset token...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tokenVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Invalid Reset Link</Text>
          <Text style={styles.description}>
            The password reset link you used is invalid or has expired. Please request a new one.
          </Text>
          <Button
            title="Back to Login"
            onPress={() => router.replace("/")}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.description}>
          Please enter your new password below
        </Text>

        <View style={styles.inputContainer}>
          <Input
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            rightIcon={{
              type: 'font-awesome',
              name: showPassword ? 'eye-slash' : 'eye',
              color: '#888',
              onPress: () => setShowPassword(!showPassword),
            }}
            containerStyle={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Input
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            rightIcon={{
              type: 'font-awesome',
              name: showPassword ? 'eye-slash' : 'eye',
              color: '#888',
              onPress: () => setShowPassword(!showPassword),
            }}
            containerStyle={styles.input}
            autoCapitalize="none"
          />
        </View>

        <Button
          title={loading ? "Updating..." : "Reset Password"}
          onPress={handlePasswordReset}
          buttonStyle={styles.button}
          titleStyle={styles.buttonText}
          loading={loading}
          disabled={loading}
        />

        <Button
          title="Cancel"
          onPress={() => router.replace("/")}
          buttonStyle={styles.cancelButton}
          titleStyle={styles.cancelButtonText}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    paddingHorizontal: 0,
  },
  button: {
    backgroundColor: '#34d399',
    borderRadius: 8,
    height: 50,
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    height: 50,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
}); 