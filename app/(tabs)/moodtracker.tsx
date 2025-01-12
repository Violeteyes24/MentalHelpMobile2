import React, { useState } from 'react';
import { View, Text, Button, SafeAreaView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import PieChart from 'react-native-pie-chart';

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
                        maximumValue={100}
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
                    <Button title="See Results" onPress={() => { }} color="#34d399" />
                </View>
            </View>

        </SafeAreaView>
    );
};

export default EmotionAnalysis;
