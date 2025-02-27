// app/(tabs)/Auth.tsx
import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Modal } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'
import { useRouter } from 'expo-router'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})

export default function Auth() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [otp, setOtp] = useState('')
    const [isOtpModalVisible, setOtpModalVisible] = useState(false)
    const router = useRouter();

    const openModal = () => setOtpModalVisible(true);
    const closeModal = () => setOtpModalVisible(false);

    async function signInWithEmail() {
        setLoading(true);
        
        try {
            // Regular password sign-in
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                Alert.alert(error.message);
            } else {
                // Password login successful
                router.push('/(tabs)');
            }
        } catch (err) {
            Alert.alert('An error occurred during sign-in');
        }
        
        setLoading(false);
    }

    async function requestOtp() {
        setLoading(true);
        
        try {
            // Request OTP - this will send a 6-digit code to the email
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    // Setting this to false means it won't create a new user if one doesn't exist
                    shouldCreateUser: false
                }
            });
            
            if (error) {
                Alert.alert(error.message);
            } else {
                Alert.alert('6-digit OTP code sent to your email. Please check your inbox.');
                openModal();
            }
        } catch (err) {
            Alert.alert('An error occurred while sending OTP');
        }
        
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        
        try {
            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    // This ensures the user needs to verify their email
                    emailRedirectTo: window.location.origin,
                }
            });

            if (error) {
                Alert.alert(error.message);
            } else {
                Alert.alert('Verification email sent. Please check your inbox to complete registration.');
            }
        } catch (err) {
            Alert.alert('An error occurred during sign up');
        }
        
        setLoading(false);
    }

    async function verifyOtp() {
        setLoading(true);
        
        try {
            // Verify the OTP code entered by the user
            const { data, error } = await supabase.auth.verifyOtp({
                email, // The email address the OTP was sent to
                token: otp, // The OTP code entered by the user
                type: 'email' // The type of verification
            });

            if (error) {
                Alert.alert(`Verification failed: ${error.message}`);
            } else {
                closeModal();
                Alert.alert('Verification successful!');
                router.push('/(tabs)');
            }
        } catch (err) {
            Alert.alert('An error occurred during verification');
        }
        
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.title}>
                    <Text style={styles.gradientText}>Mental</Text>
                    <Text style={styles.markedText}>Help</Text>
                </Text>
                <Text style={styles.subtitle}>Your mental health companion</Text>
            </View>

            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Input
                    label="Email"
                    leftIcon={{ type: 'font-awesome', name: 'envelope' }}
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize={'none'}
                />
            </View>
            <View style={styles.verticallySpaced}>
                <Input
                    label="Password"
                    leftIcon={{ type: 'font-awesome', name: 'lock' }}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Password"
                    autoCapitalize={'none'}
                />
            </View>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Button title="Sign in with Password" disabled={loading} onPress={() => signInWithEmail()} color={'#34d399'} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Sign in with OTP Code" disabled={loading} onPress={() => requestOtp()} color={'#34d399'} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Sign up" disabled={loading} onPress={() => signUpWithEmail()} color={'#34d399'} />
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isOtpModalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Enter 6-Digit OTP Code</Text>
                    <Input
                        label="OTP Code"
                        onChangeText={(text) => setOtp(text)}
                        value={otp}
                        placeholder="Enter 6-digit code"
                        autoCapitalize={'none'}
                        keyboardType="number-pad"
                        maxLength={6}
                    />
                    <Button title="Verify OTP" disabled={loading} onPress={() => verifyOtp()} color={'#34d399'} />
                    <Button title="Close" onPress={closeModal} color={'#d34d39'} />
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: '50%',
        padding: 12,
    },
    verticallySpaced: {
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: 'stretch',
    },
    mt20: {
        marginTop: 20,
    },
    gradientText: {
        color: '#000',
        backgroundColor: 'transparent',
    },
    markedText: {
        paddingHorizontal: 8,
        color: '#fff',
        backgroundColor: '#34d399',
        borderRadius: 4,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#1f2937',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
})

// finally otp worked