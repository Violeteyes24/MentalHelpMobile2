import React, { useState, useEffect } from 'react';
import { View, Text, Button, SafeAreaView, Alert, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import PieChart from 'react-native-pie-chart';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext'

const EmotionAnalysis: React.FC = () => {
    const [emotions, setEmotions] = useState<{ [key: string]: number }>({
        Happy: 10,
        Afraid: 20,
        Angry: 30,
        Stressed: 40,
        Confused: 50,
        Disappointed: 60,
    });

    const emotionColors: { [key: string]: string } = {
        Happy: '#FFFF00',
        Afraid: '#0000FF',
        Angry: '#FF0000',
        Stressed: '#008000',
        Confused: '#A52A2A',
        Disappointed: '#FFA500',
    };

    const handleSliderChange = (emotion: string, value: number) => {
        setEmotions((prevState) => ({
            ...prevState,
            [emotion]: value,
        }));
    };

    const widthAndHeight = 250;

    const series = Object.entries(emotions).map(([emotion, value]) => ({
        value: value,
        color: emotionColors[emotion],
    }));

    const [loading, setLoading] = useState(true);
    const { session } = useAuth();

    useEffect(() => {
        console.log("Session in Mood Tracker UseEffect", session);
        
    }, [])

    async function insertMoodTrackerData() {
    try {
        setLoading(true);

        const insertData = Object.entries(emotions).map(
        ([mood_type, intensity]) => ({
            mood_type,
            intensity,
            user_id: session?.user.id,
        })
        );

        const { data, error } = await supabase
        .from("mood_tracker")
        .insert(insertData);

        if (error) {
        console.error("Insert Error:", error);
        throw error;
        }

        console.log("Insert Success:", data);
    } catch (error) {
        if (error instanceof Error) {
        Alert.alert("Error", error.message);
        }
    } finally {
        setLoading(false);
    }
    }

    return (
        <SafeAreaView style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Mood Tracker</Text>

            <Text style={{ fontSize: 18, textAlign: 'center', marginVertical: 16 }}>
                Swipe the color for each emotion
            </Text>

            {Object.keys(emotions).map((emotion) => (
                <View key={emotion} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
                    <Text style={{ width: 90, fontSize: 14 }}>{emotion}:</Text>
                    <Slider
                        style={{ width: 275 }}
                        minimumValue={0}
                        maximumValue={10}
                        value={emotions[emotion]}
                        onValueChange={(value) => handleSliderChange(emotion, value)}
                        thumbTintColor={emotionColors[emotion]}
                        minimumTrackTintColor={emotionColors[emotion]}
                        maximumTrackTintColor="#000000"
                    />
                </View>
            ))}

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <PieChart widthAndHeight={widthAndHeight} series={series} />
                <View style={{ marginTop: '5%', alignItems: 'center' }}>
                    <Button title="See Results" onPress={() => insertMoodTrackerData() } color="#34d399" />
                </View>
            </View>

        </SafeAreaView>
    );
};

export default EmotionAnalysis;
