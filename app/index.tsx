// app/(tabs)/Auth.tsx
import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Modal, TouchableOpacity, ImageBackground, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input, Icon } from '@rneui/themed'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

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
    const [showPassword, setShowPassword] = useState(false)
    const [activeTab, setActiveTab] = useState('signin') // 'signin' or 'signup'
    const router = useRouter();

    const openModal = () => setOtpModalVisible(true);
    const closeModal = () => setOtpModalVisible(false);

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Please enter your email and password');
            return;
        }
        
        setLoading(true);
        
        try {
            // Regular password sign-in
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                Alert.alert('Sign In Error', error.message);
            } else {
                // Password login successful
                router.push('/(tabs)');
            }
        } catch (err) {
            Alert.alert('Error', 'An error occurred during sign-in');
        }
        
        setLoading(false);
    }

    async function requestOtp() {
        if (!email) {
            Alert.alert('Please enter your email address');
            return;
        }
        
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
                Alert.alert('OTP Error', error.message);
            } else {
                Alert.alert('OTP Sent', 'A 6-digit code has been sent to your email. Please check your inbox.');
                openModal();
            }
        } catch (err) {
            Alert.alert('Error', 'An error occurred while sending OTP');
        }
        
        setLoading(false);
    }

    async function signUpWithEmail() {
        if (!email || !password) {
            Alert.alert('Please enter your email and password');
            return;
        }
        
        if (password.length < 6) {
            Alert.alert('Password Error', 'Password must be at least 6 characters');
            return;
        }
        
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
                Alert.alert('Sign Up Error', error.message);
            } else {
                Alert.alert('Success', 'Verification email sent. Please check your inbox to complete registration.');
                setActiveTab('signin');
            }
        } catch (err) {
            Alert.alert('Error', 'An error occurred during sign up');
        }
        
        setLoading(false);
    }

    async function verifyOtp() {
        if (otp.length !== 6) {
            Alert.alert('Please enter a valid 6-digit code');
            return;
        }
        
        setLoading(true);
        
        try {
            // Verify the OTP code entered by the user
            const { data, error } = await supabase.auth.verifyOtp({
                email, // The email address the OTP was sent to
                token: otp, // The OTP code entered by the user
                type: 'email' // The type of verification
            });

            if (error) {
                Alert.alert('Verification Failed', error.message);
            } else {
                closeModal();
                Alert.alert('Success', 'Verification successful!');
                router.push('/(tabs)');
            }
        } catch (err) {
            Alert.alert('Error', 'An error occurred during verification');
        }
        
        setLoading(false);
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoid}
            >
                <ScrollView contentContainerStyle={styles.scrollView}>
                    <View style={styles.container}>
                        {/* Logo/Branding Section */}
                        <View style={styles.brandingContainer}>
                            <Text style={styles.title}>
                                <Text style={styles.gradientText}>Mental</Text>
                                <Text style={styles.markedText}>Help</Text>
                            </Text>
                            <Text style={styles.subtitle}>Your mental health companion</Text>
                        </View>
                        
                        {/* Tab Toggle */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[
                                    styles.tabButton, 
                                    activeTab === 'signin' && styles.activeTabButton
                                ]}
                                onPress={() => setActiveTab('signin')}
                            >
                                <Text style={[
                                    styles.tabText, 
                                    activeTab === 'signin' && styles.activeTabText
                                ]}>Sign In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    styles.tabButton, 
                                    activeTab === 'signup' && styles.activeTabButton
                                ]}
                                onPress={() => setActiveTab('signup')}
                            >
                                <Text style={[
                                    styles.tabText, 
                                    activeTab === 'signup' && styles.activeTabText
                                ]}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Form Content */}
                        <View style={styles.formContainer}>
                            <View style={styles.inputContainer}>
                                <Input
                                    label="Email"
                                    leftIcon={{ type: 'font-awesome', name: 'envelope', color: '#34d399' }}
                                    onChangeText={(text) => setEmail(text)}
                                    value={email}
                                    placeholder="email@address.com"
                                    autoCapitalize={'none'}
                                    keyboardType="email-address"
                                    containerStyle={styles.input}
                                    labelStyle={styles.inputLabel}
                                />
                            </View>
                            
                            {/* Only show password field for password signin or signup */}
                            {(activeTab === 'signin' || activeTab === 'signup') && (
                                <View style={styles.inputContainer}>
                                    <Input
                                        label="Password"
                                        leftIcon={{ type: 'font-awesome', name: 'lock', color: '#34d399' }}
                                        rightIcon={{ 
                                            type: 'font-awesome', 
                                            name: showPassword ? 'eye-slash' : 'eye', 
                                            color: '#888',
                                            onPress: () => setShowPassword(!showPassword)
                                        }}
                                        onChangeText={(text) => setPassword(text)}
                                        value={password}
                                        secureTextEntry={!showPassword}
                                        placeholder="Password"
                                        autoCapitalize={'none'}
                                        containerStyle={styles.input}
                                        labelStyle={styles.inputLabel}
                                    />
                                </View>
                            )}
                            
                            {/* Sign In Section */}
                            {activeTab === 'signin' && (
                                <>
                                    <View style={styles.buttonContainer}>
                                        <Button 
                                            title="Sign in with Password" 
                                            disabled={loading} 
                                            onPress={signInWithEmail} 
                                            buttonStyle={styles.primaryButton}
                                            titleStyle={styles.buttonText}
                                            disabledStyle={styles.disabledButton}
                                            loading={loading}
                                            loadingProps={{ color: 'white' }}
                                            icon={{ 
                                                name: 'sign-in', 
                                                type: 'font-awesome', 
                                                color: 'white', 
                                                size: 16, 
                                                style: { marginRight: 10 } 
                                            }}
                                        />
                                    </View>
                                    
                                    <Text style={styles.orText}>OR</Text>
                                    
                                    <View style={styles.buttonContainer}>
                                        <Button 
                                            title="Sign in with OTP Code" 
                                            disabled={loading} 
                                            onPress={requestOtp} 
                                            buttonStyle={styles.secondaryButton}
                                            titleStyle={styles.secondaryButtonText}
                                            disabledStyle={styles.disabledButton}
                                            loading={loading}
                                            icon={{ 
                                                name: 'key', 
                                                type: 'font-awesome', 
                                                color: '#34d399', 
                                                size: 16, 
                                                style: { marginRight: 10 } 
                                            }}
                                        />
                                    </View>
                                </>
                            )}
                            
                            {/* Sign Up Section */}
                            {activeTab === 'signup' && (
                                <View style={styles.buttonContainer}>
                                    <Button 
                                        title="Create Account" 
                                        disabled={loading} 
                                        onPress={signUpWithEmail} 
                                        buttonStyle={styles.primaryButton}
                                        titleStyle={styles.buttonText}
                                        disabledStyle={styles.disabledButton}
                                        loading={loading}
                                        loadingProps={{ color: 'white' }}
                                        icon={{ 
                                            name: 'user-plus', 
                                            type: 'font-awesome', 
                                            color: 'white', 
                                            size: 16, 
                                            style: { marginRight: 10 } 
                                        }}
                                    />
                                </View>
                            )}
                        </View>
                        
                        {/* Footer Section */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                By continuing, you agree to our{' '}
                                <Text style={styles.textLink}>Terms of Service</Text> and{' '}
                                <Text style={styles.textLink}>Privacy Policy</Text>
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            
            {/* OTP Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isOtpModalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Enter Verification Code</Text>
                        <Text style={styles.modalSubtitle}>We've sent a 6-digit code to your email</Text>
                        
                        <Input
                            onChangeText={(text) => setOtp(text)}
                            value={otp}
                            placeholder="000000"
                            autoCapitalize={'none'}
                            keyboardType="number-pad"
                            maxLength={6}
                            containerStyle={styles.otpInput}
                            inputStyle={styles.otpInputText}
                            textAlign="center"
                        />
                        
                        <View style={styles.modalButtonContainer}>
                            <Button 
                                title="Verify" 
                                disabled={loading || otp.length !== 6} 
                                onPress={verifyOtp} 
                                buttonStyle={styles.primaryButton}
                                titleStyle={styles.buttonText}
                                disabledStyle={styles.disabledButton}
                                loading={loading}
                                containerStyle={styles.modalButton}
                            />
                            
                            <Button 
                                title="Cancel" 
                                onPress={closeModal} 
                                buttonStyle={styles.cancelButton}
                                titleStyle={styles.cancelButtonText}
                                containerStyle={styles.modalButton}
                            />
                        </View>
                        
                        <TouchableOpacity style={styles.resendContainer} onPress={requestOtp}>
                            <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    brandingContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    gradientText: {
        color: '#000',
        fontWeight: '800',
    },
    markedText: {
        paddingHorizontal: 8,
        color: '#fff',
        backgroundColor: '#34d399',
        borderRadius: 4,
        overflow: 'hidden',
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTabButton: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#64748b',
    },
    activeTabText: {
        color: '#34d399',
        fontWeight: '600',
    },
    formContainer: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        paddingHorizontal: 0,
    },
    inputLabel: {
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 8,
    },
    buttonContainer: {
        marginTop: 8,
    },
    primaryButton: {
        backgroundColor: '#34d399',
        borderRadius: 8,
        paddingVertical: 12,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#34d399',
        borderRadius: 8,
        paddingVertical: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#34d399',
    },
    disabledButton: {
        backgroundColor: '#94a3b8',
        opacity: 0.6,
    },
    orText: {
        textAlign: 'center',
        marginVertical: 16,
        color: '#94a3b8',
        fontWeight: '500',
    },
    footer: {
        marginTop: 8,
    },
    footerText: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: 14,
    },
    textLink: {
        color: '#34d399',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
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
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 24,
        textAlign: 'center',
    },
    otpInput: {
        width: '100%',
        marginBottom: 24,
    },
    otpInputText: {
        fontSize: 24,
        letterSpacing: 8,
        fontWeight: '700',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
    },
    modalButton: {
        width: '48%',
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        paddingVertical: 12,
    },
    cancelButtonText: {
        color: '#64748b',
        fontSize: 16,
        fontWeight: '600',
    },
    resendContainer: {
        marginTop: 16,
        paddingVertical: 8,
    },
    resendText: {
        color: '#34d399',
        fontWeight: '500',
    },
});