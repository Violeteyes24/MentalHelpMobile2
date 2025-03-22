import { LogBox } from "react-native";
LogBox.ignoreAllLogs(); // Disable all log notifications

// app/(tabs)/Auth.tsx
import React, { useState, useEffect } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Modal, TouchableOpacity, ImageBackground, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input, Icon } from '@rneui/themed'
import { useRouter } from 'expo-router'
import LinearGradient from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder'

// Create shimmer component with a workaround for Expo's LinearGradient
const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient as any);

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
    // Added confirmPassword state variable
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [otp, setOtp] = useState('')
    const [isOtpModalVisible, setOtpModalVisible] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [activeTab, setActiveTab] = useState('signin') // 'signin' or 'signup'
    const [timer, setTimer] = useState(0)
    const router = useRouter();
    const [initialLoading, setInitialLoading] = useState(true)

    // New state variables for additional sign up fields
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [address, setAddress] = useState('')
    const [contactNumber, setContactNumber] = useState('')
    const [birthday, setBirthday] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [department, setDepartment] = useState('')
    const [program, setProgram] = useState('')
    const [programYearLevel, setProgramYearLevel] = useState('')
    const [isDeptModalVisible, setDeptModalVisible] = useState(false)
    const [isProgramModalVisible, setProgramModalVisible] = useState(false)
    const [isYearModalVisible, setYearModalVisible] = useState(false)
    const [currentSignupStep, setCurrentSignupStep] = useState(1) // For multi-step form
    const [gender, setGender] = useState('')
    const [isGenderModalVisible, setGenderModalVisible] = useState(false)

    useEffect(() => {
        // Check if user is already authenticated
        const checkAuth = async () => {
            setInitialLoading(true);
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                // User is authenticated, redirect to tabs
                router.push('/(tabs)');
            }
            setInitialLoading(false);
        };
        
        checkAuth();
    }, []);

    const openModal = () => {
        setOtpModalVisible(true);
        setTimer(60);
        const interval = setInterval(() => {
            setTimer((currentTimer) => {
                if (currentTimer <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return currentTimer - 1;
            });
        }, 1000);
    };

    const closeModal = () => {
        setOtpModalVisible(false);
        setTimer(0);
        setOtp('');
    };

    const onDateChange = (event: any, selectedDate: any) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setBirthday(selectedDate);
        }
    };

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
        if (!email || !password || !name) {
            Alert.alert('Please enter your email, password, and full name')
            return;
        }
        // Added password match validation for sign up
        if(password !== confirmPassword){
            Alert.alert('Password Error', 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Password Error', 'Password must be at least 6 characters')
            return;
        }
        
        setLoading(true);
        
        try {
            // Sign up with email and password along with additional user data (including gender)
            console.log('Attempting to sign up with:', { email, name, username });
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: 'expo-user-management://confirm-email', // Deep link for React Native
                    data: {
                        name,
                        username,
                        address,
                        contact_number: contactNumber,
                        birthday: birthday ? birthday.toISOString().split('T')[0] : null,
                        gender,
                        department,
                        program,
                        program_year_level: programYearLevel ? parseInt(programYearLevel) : null,
                    }
                }
            });

            if (error) {
                console.error('Sign up error:', error);
                Alert.alert('Sign Up Error', error.message);
            } else {
                console.log('Sign up successful, user data:', data);
                // Insert new user record into the public.users table using the returned user id.
                const userId = data.user?.id;
                if (userId) {
                    console.log('Inserting user record with ID:', userId);
                    // Use upsert instead of insert to handle potential duplicates
                    const { error: insertError } = await supabase
                        .from('users')
                        .upsert({
                            user_id: userId,
                            user_type: 'user',
                            name,
                            username,
                            address,
                            contact_number: contactNumber,
                            birthday: birthday ? birthday.toISOString().split('T')[0] : null,
                            gender,
                            department: department,
                            program,
                            program_year_level: programYearLevel ? parseInt(programYearLevel) : null,
                        }, {
                            onConflict: 'user_id'
                        });
                    if (insertError) {
                        console.error('Insert error:', insertError);
                        Alert.alert('Insert Error', `Database error: ${insertError.message}`);
                    } else {
                        console.log('User inserted successfully');
                        Alert.alert(
                            'Verification Email Sent',
                            'Please check your email for the confirmation link. After confirming, you can sign in.',
                            [
                                {
                                    text: 'Resend Email',
                                    onPress: () => resendConfirmationEmail(email)
                                },
                                {
                                    text: 'OK',
                                    style: 'default'
                                }
                            ]
                        );
                        setActiveTab('signin');
                    }
                } else {
                    console.error('User ID missing after sign-up');
                    Alert.alert('Error', 'User id missing after sign-up.');
                }
            }
        } catch (err) {
            console.error('Unexpected error during sign up:', err);
            Alert.alert('Error', 'An error occurred during sign up');
        }
        
        setLoading(false);
    }

    // Add new function to resend confirmation email
    async function resendConfirmationEmail(email: string) {
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email
            });
            
            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Success', 'Confirmation email has been resent. Please check your inbox.');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to resend confirmation email');
        }
    }

    async function verifyOtp() {
        if (timer === 0) {
            Alert.alert('OTP Expired', 'Please request a new OTP code');
            return;
        }
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

    // Function to navigate between signup steps
    const navigateStep = (direction: any) => {
        const nextStep = currentSignupStep + direction;
        if (nextStep > 0 && nextStep <= 2) {
            setCurrentSignupStep(nextStep);
        }
    }

    // Format date as YYYY-MM-DD for display
    const formatDate = (date: any) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    };

    // Render shimmer component for the form loading state
    const renderLoadingShimmer = () => (
        <View style={styles.container}>
            <View style={styles.brandingContainer}>
                <ShimmerPlaceholder
                    style={{ width: 200, height: 60, borderRadius: 8, marginBottom: 8 }}
                    shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                />
                <ShimmerPlaceholder
                    style={{ width: 250, height: 24, borderRadius: 4 }}
                    shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                />
            </View>
            
            <ShimmerPlaceholder
                style={{ width: '100%', height: 50, borderRadius: 8, marginVertical: 24 }}
                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
            />
            
            <View style={styles.formContainer}>
                <ShimmerPlaceholder
                    style={{ width: '100%', height: 70, borderRadius: 8, marginBottom: 16 }}
                    shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                />
                <ShimmerPlaceholder
                    style={{ width: '100%', height: 70, borderRadius: 8, marginBottom: 16 }}
                    shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                />
                <ShimmerPlaceholder
                    style={{ width: '100%', height: 50, borderRadius: 8, marginTop: 16 }}
                    shimmerColors={['#4eebc0', '#34d399', '#4eebc0']}
                />
            </View>
        </View>
    );

    // Add new function to render shimmer buttons
    const renderButtonShimmer = () => (
        <ShimmerPlaceholder
            style={{ height: 50, borderRadius: 8, marginBottom: 16 }}
            shimmerColors={['#4eebc0', '#34d399', '#4eebc0']}
        />
    );

    if (initialLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                {renderLoadingShimmer()}
            </SafeAreaView>
        );
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
                                onPress={() => {
                                    setActiveTab('signup');
                                    setCurrentSignupStep(1);
                                }}
                            >
                                <Text style={[
                                    styles.tabText, 
                                    activeTab === 'signup' && styles.activeTabText
                                ]}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Form Content */}
                        <View style={styles.formContainer}>
                            {/* Common fields for both sign in and sign up */}
                            {(activeTab === 'signin' || (activeTab === 'signup' && currentSignupStep === 1)) && (
                                <>
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
                                    {/* Added Confirm Password Field for Signup */}
                                    {activeTab === 'signup' && (
                                        <View style={styles.inputContainer}>
                                            <Input
                                                label="Confirm Password"
                                                leftIcon={{ type: 'font-awesome', name: 'lock', color: '#34d399' }}
                                                rightIcon={{ 
                                                    type: 'font-awesome', 
                                                    name: showPassword ? 'eye-slash' : 'eye', 
                                                    color: '#888',
                                                    onPress: () => setShowPassword(!showPassword)
                                                }}
                                                onChangeText={(text) => setConfirmPassword(text)}
                                                value={confirmPassword}
                                                secureTextEntry={!showPassword}
                                                placeholder="Confirm Password"
                                                autoCapitalize={'none'}
                                                containerStyle={styles.input}
                                                labelStyle={styles.inputLabel}
                                            />
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Sign Up Step 1 Fields */}
                            {activeTab === 'signup' && currentSignupStep === 1 && (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Input
                                            label="Full Name"
                                            leftIcon={{ type: 'font-awesome', name: 'user', color: '#34d399' }}
                                            onChangeText={(text) => setName(text)}
                                            value={name}
                                            placeholder="John Doe"
                                            containerStyle={styles.input}
                                            labelStyle={styles.inputLabel}
                                        />
                                    </View>
                                    <View style={styles.inputContainer}>
                                        <Input
                                            label="Username"
                                            leftIcon={{ type: 'font-awesome', name: 'at', color: '#34d399' }}
                                            onChangeText={(text) => setUsername(text)}
                                            value={username}
                                            placeholder="johndoe"
                                            containerStyle={styles.input}
                                            labelStyle={styles.inputLabel}
                                        />
                                    </View>

                                    {/* Row for birthday picker */}
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Birthday</Text>
                                        {loading ? (
                                            <ShimmerPlaceholder
                                                style={{ height: 50, borderRadius: 8 }}
                                                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                            />
                                        ) : (
                                            <TouchableOpacity 
                                                style={styles.datePickerButton}
                                                onPress={() => setShowDatePicker(true)}
                                            >
                                                <Icon type="font-awesome" name="calendar" color="#34d399" size={16} />
                                                <Text style={styles.dateText}>{formatDate(birthday)}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={birthday}
                                            mode="date"
                                            display="default"
                                            onChange={onDateChange}
                                            maximumDate={new Date()}
                                        />
                                    )}

                                    <View style={styles.buttonContainer}>
                                        {loading ? renderButtonShimmer() : (
                                            <Button 
                                                title="Next" 
                                                onPress={() => navigateStep(1)} 
                                                buttonStyle={styles.primaryButton}
                                                titleStyle={styles.buttonText}
                                                icon={{ 
                                                    name: 'arrow-right', 
                                                    type: 'font-awesome', 
                                                    color: 'white', 
                                                    size: 16, 
                                                    style: { marginLeft: 10 } 
                                                }}
                                                iconRight
                                            />
                                        )}
                                    </View>
                                </>
                            )}

                            {/* Sign Up Step 2 Fields */}
                            {activeTab === 'signup' && currentSignupStep === 2 && (
                                <>
                                    <View style={styles.inputRow}>
                                        <Text style={styles.stepIndicator}>Step 2 of 2</Text>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Input
                                            label="Contact Number"
                                            leftIcon={{ type: 'font-awesome', name: 'phone', color: '#34d399' }}
                                            onChangeText={(text) => setContactNumber(text)}
                                            value={contactNumber}
                                            placeholder="09123456789"
                                            keyboardType="phone-pad"
                                            containerStyle={styles.input}
                                            labelStyle={styles.inputLabel}
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Input
                                            label="Address"
                                            leftIcon={{ type: 'font-awesome', name: 'map-marker', color: '#34d399' }}
                                            onChangeText={(text) => setAddress(text)}
                                            value={address}
                                            placeholder="123 Main St"
                                            containerStyle={styles.input}
                                            labelStyle={styles.inputLabel}
                                        />
                                    </View>
                                    
                                    {/* New Gender Input */}
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Gender</Text>
                                        {loading ? (
                                            <ShimmerPlaceholder
                                                style={{ height: 50, borderRadius: 8 }}
                                                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                            />
                                        ) : (
                                            <TouchableOpacity 
                                                style={styles.dropdown}
                                                onPress={() => setGenderModalVisible(true)}
                                            >
                                                <Text style={styles.dropdownValue}>{gender || 'Select Gender'}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    
                                    {/* School Information Container */}
                                    <View style={styles.schoolInfoContainer}>
                                        <Text style={styles.sectionTitle}>School Information</Text>
                                        
                                        <View style={styles.dropdownRow}>
                                            {loading ? (
                                                <>
                                                    <ShimmerPlaceholder
                                                        style={[{ height: 50, borderRadius: 8 }, styles.dropdown]}
                                                        shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                                    />
                                                    <ShimmerPlaceholder
                                                        style={[{ height: 50, borderRadius: 8 }, styles.dropdown]}
                                                        shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <TouchableOpacity 
                                                        onPress={() => setDeptModalVisible(true)} 
                                                        style={styles.dropdown}
                                                    >
                                                        <Text style={styles.dropdownLabel}>Department</Text>
                                                        <Text style={styles.dropdownValue}>{department || 'Select'}</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        onPress={() => setYearModalVisible(true)} 
                                                        style={styles.dropdown}
                                                    >
                                                        <Text style={styles.dropdownLabel}>Year Level</Text>
                                                        <Text style={styles.dropdownValue}>{programYearLevel || 'Select'}</Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>

                                        {loading ? (
                                            <ShimmerPlaceholder
                                                style={[{ height: 50, borderRadius: 8 }, styles.fullWidthDropdown]}
                                                shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                            />
                                        ) : (
                                            <TouchableOpacity 
                                                onPress={() => setProgramModalVisible(true)} 
                                                style={[styles.dropdown, styles.fullWidthDropdown]}
                                            >
                                                <Text style={styles.dropdownLabel}>Program</Text>
                                                <Text style={styles.dropdownValue}>{program || 'Select Program'}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.buttonRow}>
                                        {loading ? (
                                            <>
                                                <ShimmerPlaceholder
                                                    style={[{ height: 50, borderRadius: 8 }, styles.halfButton]}
                                                    shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                                />
                                                <ShimmerPlaceholder
                                                    style={[{ height: 50, borderRadius: 8 }, styles.halfButton]}
                                                    shimmerColors={['#4eebc0', '#34d399', '#4eebc0']}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Button 
                                                    title="Back" 
                                                    onPress={() => navigateStep(-1)} 
                                                    buttonStyle={styles.secondaryButton}
                                                    titleStyle={styles.secondaryButtonText}
                                                    containerStyle={styles.halfButton}
                                                    icon={{ 
                                                        name: 'arrow-left', 
                                                        type: 'font-awesome', 
                                                        color: '#34d399', 
                                                        size: 16, 
                                                        style: { marginRight: 10 } 
                                                    }}
                                                />
                                                
                                                <Button 
                                                    title="Create Account" 
                                                    disabled={loading} 
                                                    onPress={signUpWithEmail} 
                                                    buttonStyle={styles.primaryButton}
                                                    titleStyle={styles.buttonText}
                                                    disabledStyle={styles.disabledButton}
                                                    loading={loading}
                                                    containerStyle={styles.halfButton}
                                                    loadingProps={{ color: 'white' }}
                                                    icon={{ 
                                                        name: 'user-plus', 
                                                        type: 'font-awesome', 
                                                        color: 'white', 
                                                        size: 16, 
                                                        style: { marginRight: 10 } 
                                                    }}
                                                />
                                            </>
                                        )}
                                    </View>
                                </>
                            )}
                            
                            {/* Sign In Section */}
                            {activeTab === 'signin' && (
                                <>
                                    <View style={styles.buttonContainer}>
                                        {loading ? renderButtonShimmer() : (
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
                                        )}
                                    </View>
                                    
                                    <Text style={styles.orText}>OR</Text>
                                    
                                    <View style={styles.buttonContainer}>
                                        {loading ? renderButtonShimmer() : (
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
                                        )}
                                    </View>
                                </>
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
                            disabled={loading}
                        />
                        
                        <View style={styles.modalButtonContainer}>
                            {loading ? (
                                <>
                                    <ShimmerPlaceholder
                                        style={[{ height: 50, borderRadius: 8 }, styles.modalButton]}
                                        shimmerColors={['#4eebc0', '#34d399', '#4eebc0']}
                                    />
                                    <ShimmerPlaceholder
                                        style={[{ height: 50, borderRadius: 8 }, styles.modalButton]}
                                        shimmerColors={['#f5f5f5', '#e0e0e0', '#f5f5f5']}
                                    />
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </View>
                        
                        {timer > 0 ? (
                            <Text style={styles.timerText}>Code expires in {timer}s</Text>
                        ) : (
                            <TouchableOpacity style={styles.resendContainer} onPress={requestOtp} disabled={loading}>
                                <Text style={[styles.resendText, loading && { opacity: 0.5 }]}>Didn't receive a code? Resend</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Department Dropdown Modal */}
            <Modal transparent visible={isDeptModalVisible} animationType="slide" onRequestClose={() => setDeptModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalView}>
                  <Text style={styles.modalTitle}>Select Department</Text>
                  {["COECS", "CAS", "IBED", "COED", "CHS", "COL", "CBA"].map((dept) => (
                    <TouchableOpacity 
                      key={dept} 
                      style={styles.modalOption}
                      onPress={() => { 
                        setDepartment(dept); 
                        setDeptModalVisible(false); 
                      }}
                    >
                      <Text style={styles.modalOptionText}>{dept}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Modal>

            {/* Program Dropdown Modal */}
            <Modal transparent visible={isProgramModalVisible} animationType="slide" onRequestClose={() => setProgramModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalView}>
                  <Text style={styles.modalTitle}>Select Program</Text>
                  {["BSIT", "BSN", "BSA", "BSTM", "BSCS", "BSED", "BSCE"].map((prog) => (
                    <TouchableOpacity 
                      key={prog} 
                      style={styles.modalOption}
                      onPress={() => { 
                        setProgram(prog); 
                        setProgramModalVisible(false); 
                      }}
                    >
                      <Text style={styles.modalOptionText}>{prog}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Modal>

            {/* Program Year Level Dropdown Modal */}
            <Modal transparent visible={isYearModalVisible} animationType="slide" onRequestClose={() => setYearModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalView}>
                  <Text style={styles.modalTitle}>Select Year Level</Text>
                  {[1,2,3,4].map((year) => (
                    <TouchableOpacity 
                      key={year}
                      style={styles.modalOption} 
                      onPress={() => { 
                        setProgramYearLevel(year.toString()); 
                        setYearModalVisible(false); 
                      }}
                    >
                      <Text style={styles.modalOptionText}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Modal>

            {/* New Gender Dropdown Modal */}
            <Modal transparent visible={isGenderModalVisible} animationType="slide" onRequestClose={() => setGenderModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalView}>
                  <Text style={styles.modalTitle}>Select Gender</Text>
                  {["Male", "Female", "Others"].map((item) => (
                    <TouchableOpacity 
                      key={item} 
                      style={styles.modalOption}
                      onPress={() => { 
                        setGender(item); 
                        setGenderModalVisible(false); 
                      }}
                    >
                      <Text style={styles.modalOptionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
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
        marginBottom: 30,
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
        marginBottom: 10, // Reduced from 16
    },
    input: {
        paddingHorizontal: 0,
    },
    inputLabel: {
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 6, // Reduced from 8
    },
    stepIndicator: {
        color: '#64748b',
        fontWeight: '500',
        fontSize: 14,
        marginBottom: 10,
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
        fontSize: 14,
        fontWeight: '500',
    },
    timerText: {
        marginTop: 16,
        color: '#64748b',
        fontSize: 14,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    dateText: {
        marginLeft: 10,
        color: '#64748b',
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    halfButton: {
        width: '48%',
    },
    schoolInfoContainer: {
        marginVertical: 10,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 12,
    },
    dropdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dropdown: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        width: '48%',
    },
    fullWidthDropdown: {
        width: '100%',
    },
    dropdownLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    dropdownValue: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    modalOption: {
        width: '100%',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#334155',
        textAlign: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
});